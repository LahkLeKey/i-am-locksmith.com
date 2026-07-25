import {prisma} from '@/lib/db/prisma';

export const INVOICE_STATUSES = ['draft', 'finalized', 'paid', 'void'] as const;
export const PAYMENT_METHODS =
    ['cash', 'card_external', 'check', 'bank_transfer', 'other'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type InvoicePaymentRecord = {
  id: string; amount: number; method: PaymentMethod; reference: string | null;
  notes: string | null;
  receivedAt: Date;
  recordedByUserId: string;
};

export type InvoiceRecord = {
  id: string; invoiceNumber: string; jobNumber: string; customerName: string;
  site: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  finalizedAt: Date | null;
  paidAt: Date | null;
  payments: InvoicePaymentRecord[];
  paidAmount: number;
  balanceDue: number;
};

export type RecordPaymentInput = {
  amount: number; method: PaymentMethod; reference: string | null;
  notes: string | null;
  receivedAt: Date;
  recordedByUserId: string;
};

export type ReadyForPaymentInput = {
  actualPartCost: number; actualLaborCost: number; actualMinutes: number;
  finalTotal: number;
  resolutionNotes: string | null;
};

function asInvoiceStatus(value: string): InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus) ?
      value as InvoiceStatus :
      'draft';
}

function asPaymentMethod(value: string): PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod) ?
      value as PaymentMethod :
      'other';
}

function toNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function toInvoiceRecord(
    row: Awaited<ReturnType<typeof findInvoiceRows>>[number]): InvoiceRecord {
  const payments =
      row.payments.map((payment) => ({
                         id: payment.id,
                         amount: toNumber(payment.amount),
                         method: asPaymentMethod(payment.method),
                         reference: payment.reference,
                         notes: payment.notes,
                         receivedAt: payment.receivedAt,
                         recordedByUserId: payment.recordedByUserId,
                       }));
  const totalAmount = toNumber(row.totalAmount);
  const paidAmount =
      Number(payments.reduce((total, payment) => total + payment.amount, 0)
                 .toFixed(2));

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    jobNumber: row.jobNumber,
    customerName: row.customerName,
    site: row.site,
    subtotal: toNumber(row.subtotal),
    taxAmount: toNumber(row.taxAmount),
    totalAmount,
    status: asInvoiceStatus(row.status),
    notes: row.notes,
    finalizedAt: row.finalizedAt,
    paidAt: row.paidAt,
    payments,
    paidAmount,
    balanceDue: Number(Math.max(0, totalAmount - paidAmount).toFixed(2)),
  };
}

function findInvoiceRows(orgId: string) {
  return prisma.invoice.findMany({
    where: {orgId},
    include: {payments: {orderBy: {receivedAt: 'asc'}}},
    orderBy: [{finalizedAt: 'desc'}, {createdAt: 'desc'}],
  });
}

export async function listInvoices(orgId: string): Promise<InvoiceRecord[]> {
  const rows = await findInvoiceRows(orgId);
  return rows.map(toInvoiceRecord);
}

export async function getInvoiceById(
    orgId: string, invoiceId: string): Promise<InvoiceRecord|null> {
  const row = await prisma.invoice.findFirst({
    where: {orgId, id: invoiceId},
    include: {payments: {orderBy: {receivedAt: 'asc'}}},
  });
  return row ? toInvoiceRecord(row) : null;
}

function buildInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `INV-${timestamp}${suffix}`;
}

export async function markJobReadyForPayment(
    orgId: string, jobNumber: string, finalizedByUserId: string,
    input: ReadyForPaymentInput): Promise<InvoiceRecord> {
  const invoice = await prisma.$transaction(async (client) => {
    const job = await client.jobRecord.findFirst({
      where: {orgId, jobNumber},
      include: {invoice: true},
    });

    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.invoice) throw new Error('INVOICE_EXISTS');
    if (job.status === 'closed' || job.status === 'completed' ||
        job.status === 'ready_for_payment') {
      throw new Error('JOB_NOT_ACTIVE');
    }

    const readyAt = new Date();
    await client.jobRecord.update({
      where: {id: job.id},
      data: {
        status: 'ready_for_payment',
        actualPartCost: input.actualPartCost,
        actualLaborCost: input.actualLaborCost,
        actualMinutes: input.actualMinutes,
        finalTotal: input.finalTotal,
        closeoutNotes: input.resolutionNotes,
      },
    });

    return client.invoice.create({
      data: {
        orgId,
        invoiceNumber: buildInvoiceNumber(),
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        site: job.site,
        subtotal: input.finalTotal,
        taxAmount: 0,
        totalAmount: input.finalTotal,
        status: 'finalized',
        notes: input.resolutionNotes,
        finalizedAt: readyAt,
        finalizedByUserId,
      },
      include: {payments: true},
    });
  });

  return toInvoiceRecord(invoice);
}

export async function closeInvoiceBackedJob(
    orgId: string, jobNumber: string): Promise<void> {
  await prisma.$transaction(async (client) => {
    const job = await client.jobRecord.findFirst({
      where: {orgId, jobNumber},
      include: {invoice: true},
    });

    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.status !== 'ready_for_payment') {
      throw new Error('JOB_NOT_READY_FOR_PAYMENT');
    }
    if (!job.invoice) throw new Error('INVOICE_REQUIRED');

    await client.jobRecord.update({
      where: {id: job.id},
      data: {status: 'closed', closedOutAt: new Date()},
    });
  });
}

export async function finalizeInvoiceFromJob(
    orgId: string,
    jobNumber: string,
    finalizedByUserId: string,
    ): Promise<InvoiceRecord> {
  const invoice = await prisma.$transaction(async (client) => {
    const job = await client.jobRecord.findFirst({
      where: {orgId, jobNumber},
      include: {invoice: true},
    });

    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.invoice) throw new Error('INVOICE_EXISTS');
    if ((job.status !== 'closed' && job.status !== 'completed') ||
        !job.closedOutAt || job.finalTotal === null) {
      throw new Error('JOB_NOT_FINALIZED');
    }

    return client.invoice.create({
      data: {
        orgId,
        invoiceNumber: buildInvoiceNumber(),
        jobId: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        site: job.site,
        subtotal: job.finalTotal,
        taxAmount: 0,
        totalAmount: job.finalTotal,
        status: 'finalized',
        notes: job.closeoutNotes,
        finalizedAt: new Date(),
        finalizedByUserId,
      },
      include: {payments: true},
    });
  });

  return toInvoiceRecord(invoice);
}

export async function recordInvoicePayment(
    orgId: string,
    invoiceId: string,
    input: RecordPaymentInput,
    ): Promise<InvoiceRecord> {
  const invoice = await prisma.$transaction(async (client) => {
    const current = await client.invoice.findFirst({
      where: {id: invoiceId, orgId},
      include: {payments: true},
    });

    if (!current) throw new Error('INVOICE_NOT_FOUND');
    if (current.status !== 'finalized' && current.status !== 'paid')
      throw new Error('INVOICE_NOT_PAYABLE');

    const paidAmount = current.payments.reduce(
        (total, payment) => total + toNumber(payment.amount), 0);
    const balanceDue =
        Number((toNumber(current.totalAmount) - paidAmount).toFixed(2));
    if (input.amount <= 0 || input.amount > balanceDue)
      throw new Error('INVALID_PAYMENT_AMOUNT');

    await client.invoicePayment.create({
      data: {
        orgId,
        invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        receivedAt: input.receivedAt,
        recordedByUserId: input.recordedByUserId,
      },
    });

    const isPaid = Math.abs(balanceDue - input.amount) < 0.005;
    return client.invoice.update({
      where: {id: invoiceId},
      data: isPaid ? {status: 'paid', paidAt: input.receivedAt} : {},
      include: {payments: {orderBy: {receivedAt: 'asc'}}},
    });
  });

  return toInvoiceRecord(invoice);
}
