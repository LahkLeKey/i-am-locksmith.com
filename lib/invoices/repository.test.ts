import {beforeEach, describe, expect, it, vi} from 'vitest';

const {transaction, invoiceFindMany} = vi.hoisted(() => ({
                                                    transaction: vi.fn(),
                                                    invoiceFindMany: vi.fn(),
                                                  }));

vi.mock('@/lib/db/prisma', () => ({
                             prisma: {
                               invoice: {findMany: invoiceFindMany},
                               $transaction: transaction,
                             },
                           }));

import {closeInvoiceBackedJob, finalizeInvoiceFromJob, markJobReadyForPayment, recordInvoicePayment} from './repository';

const payment = {
  id: 'payment_1',
  orgId: 'org_1',
  invoiceId: 'invoice_1',
  amount: 40,
  method: 'cash',
  reference: null,
  notes: null,
  receivedAt: new Date('2026-07-25T12:00:00Z'),
  recordedByUserId: 'user_1',
  createdAt: new Date('2026-07-25T12:00:00Z'),
};
const invoice = {
  id: 'invoice_1',
  orgId: 'org_1',
  invoiceNumber: 'INV-1',
  jobId: 'job_1',
  jobNumber: 'JOB-1',
  customerName: 'Acme',
  site: '1 Main St',
  subtotal: 100,
  taxAmount: 0,
  totalAmount: 100,
  status: 'finalized',
  notes: null,
  finalizedAt: new Date('2026-07-25T10:00:00Z'),
  finalizedByUserId: 'user_1',
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  payments: [],
};

function client(overrides: Record<string, unknown> = {}) {
  return {
    jobRecord: {findFirst: vi.fn(), update: vi.fn()},
    invoice: {create: vi.fn(), findFirst: vi.fn(), update: vi.fn()},
    invoicePayment: {create: vi.fn()},
    ...overrides,
  };
}

describe('invoice repository', () => {
  beforeEach(() => {
    transaction.mockReset();
    invoiceFindMany.mockReset();
    transaction.mockImplementation(async (callback) => callback(client()));
  });

  it('atomically marks a job ready for payment and creates its invoice',
     async () => {
       const database = client();
       database.jobRecord.findFirst.mockResolvedValue({
         id: 'job_1',
         orgId: 'org_1',
         jobNumber: 'JOB-1',
         customerName: 'Acme',
         site: '1 Main St',
         status: 'in_progress',
         invoice: null,
       });
       database.invoice.create.mockResolvedValue(invoice);
       transaction.mockImplementationOnce(
           async (callback) => callback(database));

       const result = await markJobReadyForPayment('org_1', 'JOB-1', 'user_1', {
         actualPartCost: 40,
         actualLaborCost: 60,
         actualMinutes: 45,
         finalTotal: 100,
         resolutionNotes: 'Complete',
       });

       expect(database.jobRecord.update).toHaveBeenCalledWith({
         where: {id: 'job_1'},
         data: expect.objectContaining({
           status: 'ready_for_payment',
           finalTotal: 100,
           closeoutNotes: 'Complete',
         }),
       });
       expect(database.invoice.create)
           .toHaveBeenCalledWith(expect.objectContaining({
             data: expect.objectContaining({
               jobId: 'job_1',
               totalAmount: 100,
               status: 'finalized',
             }),
           }));
       expect(result.invoiceNumber).toBe('INV-1');
     });

  it('closes a ready-for-payment job only when an invoice exists', async () => {
    const database = client();
    database.jobRecord.findFirst.mockResolvedValue({
      id: 'job_1',
      status: 'ready_for_payment',
      invoice,
    });
    transaction.mockImplementationOnce(async (callback) => callback(database));

    await closeInvoiceBackedJob('org_1', 'JOB-1');

    expect(database.jobRecord.update).toHaveBeenCalledWith({
      where: {id: 'job_1'},
      data: {status: 'closed', closedOutAt: expect.any(Date)},
    });
  });

  it('rejects final close when the job has no invoice', async () => {
    const database = client();
    database.jobRecord.findFirst.mockResolvedValue({
      id: 'job_1',
      status: 'ready_for_payment',
      invoice: null,
    });
    transaction.mockImplementationOnce(async (callback) => callback(database));

    await expect(closeInvoiceBackedJob('org_1', 'JOB-1'))
        .rejects.toThrow('INVOICE_REQUIRED');
    expect(database.jobRecord.update).not.toHaveBeenCalled();
  });

  it('finalizes a closed job into an immutable invoice snapshot', async () => {
    const database = client();
    database.jobRecord.findFirst.mockResolvedValue({
      id: 'job_1',
      orgId: 'org_1',
      jobNumber: 'JOB-1',
      customerName: 'Acme',
      site: '1 Main St',
      status: 'closed',
      closedOutAt: new Date(),
      finalTotal: 100,
      closeoutNotes: 'Complete',
      invoice: null,
    });
    database.invoice.create.mockResolvedValue(invoice);
    transaction.mockImplementationOnce(async (callback) => callback(database));

    await finalizeInvoiceFromJob('org_1', 'JOB-1', 'user_1');

    expect(database.jobRecord.findFirst).toHaveBeenCalledWith({
      where: {orgId: 'org_1', jobNumber: 'JOB-1'},
      include: {invoice: true},
    });
    expect(database.invoice.create)
        .toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            jobId: 'job_1',
            customerName: 'Acme',
            totalAmount: 100,
            status: 'finalized',
            finalizedByUserId: 'user_1',
          }),
        }));
  });

  it('rejects jobs without a completed closeout', async () => {
    const database = client();
    database.jobRecord.findFirst.mockResolvedValue({
      id: 'job_1',
      status: 'in_progress',
      closedOutAt: null,
      finalTotal: null,
      invoice: null,
    });
    transaction.mockImplementationOnce(async (callback) => callback(database));

    await expect(finalizeInvoiceFromJob('org_1', 'JOB-1', 'user_1'))
        .rejects.toThrow('JOB_NOT_FINALIZED');
    expect(database.invoice.create).not.toHaveBeenCalled();
  });

  it('records a partial payment without marking the invoice paid', async () => {
    const database = client();
    database.invoice.findFirst.mockResolvedValue(invoice);
    database.invoice.update.mockResolvedValue(
        {...invoice, payments: [payment]});
    transaction.mockImplementationOnce(async (callback) => callback(database));

    const result = await recordInvoicePayment('org_1', 'invoice_1', {
      amount: 40,
      method: 'cash',
      reference: null,
      notes: null,
      receivedAt: payment.receivedAt,
      recordedByUserId: 'user_1',
    });

    expect(database.invoice.findFirst).toHaveBeenCalledWith({
      where: {id: 'invoice_1', orgId: 'org_1'},
      include: {payments: true},
    });
    expect(database.invoice.update)
        .toHaveBeenCalledWith(expect.objectContaining({data: {}}));
    expect(result.balanceDue).toBe(60);
    expect(result.status).toBe('finalized');
  });

  it('marks the invoice paid when the remaining balance is settled',
     async () => {
       const database = client();
       database.invoice.findFirst.mockResolvedValue(
           {...invoice, payments: [payment]});
       const finalPayment = {...payment, id: 'payment_2', amount: 60};
       database.invoice.update.mockResolvedValue({
         ...invoice,
         status: 'paid',
         paidAt: finalPayment.receivedAt,
         payments: [payment, finalPayment]
       });
       transaction.mockImplementationOnce(
           async (callback) => callback(database));

       const result = await recordInvoicePayment('org_1', 'invoice_1', {
         amount: 60,
         method: 'check',
         reference: '1024',
         notes: null,
         receivedAt: finalPayment.receivedAt,
         recordedByUserId: 'user_1',
       });

       expect(database.invoice.update)
           .toHaveBeenCalledWith(expect.objectContaining({
             data: {status: 'paid', paidAt: finalPayment.receivedAt},
           }));
       expect(result.status).toBe('paid');
       expect(result.balanceDue).toBe(0);
     });

  it('rejects overpayment before writing a ledger entry', async () => {
    const database = client();
    database.invoice.findFirst.mockResolvedValue(
        {...invoice, payments: [payment]});
    transaction.mockImplementationOnce(async (callback) => callback(database));

    await expect(recordInvoicePayment('org_1', 'invoice_1', {
      amount: 61,
      method: 'cash',
      reference: null,
      notes: null,
      receivedAt: new Date(),
      recordedByUserId: 'user_1',
    })).rejects.toThrow('INVALID_PAYMENT_AMOUNT');
    expect(database.invoicePayment.create).not.toHaveBeenCalled();
  });
});
