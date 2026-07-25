import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/jobs/repository', () => ({
                                   getJobRecord: vi.fn(),
                                 }));

vi.mock('@/lib/invoices/repository', () => ({
                                       closeInvoiceBackedJob: vi.fn(),
                                       markJobReadyForPayment: vi.fn(),
                                     }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {closeInvoiceBackedJob, markJobReadyForPayment} from '@/lib/invoices/repository';
import {getJobRecord} from '@/lib/jobs/repository';

import {POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCloseInvoiceBackedJob = vi.mocked(closeInvoiceBackedJob);
const mockedMarkJobReadyForPayment = vi.mocked(markJobReadyForPayment);
const mockedGetJobRecord = vi.mocked(getJobRecord);

describe('jobs closeout api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedCloseInvoiceBackedJob.mockReset();
    mockedMarkJobReadyForPayment.mockReset();
    mockedGetJobRecord.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });

    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedGetJobRecord.mockResolvedValue({
      id: 'JOB-1',
      status: 'in_progress',
    } as never);

    mockedMarkJobReadyForPayment.mockResolvedValue({
      id: 'invoice_1',
      invoiceNumber: 'INV-1',
      jobNumber: 'JOB-1',
      customerName: 'Acme',
      site: 'Denver',
      subtotal: 170,
      taxAmount: 0,
      totalAmount: 170,
      status: 'finalized',
      notes: 'Done',
      finalizedAt: new Date(),
      paidAt: null,
      payments: [],
      paidAmount: 0,
      balanceDue: 170,
    } as never);
  });

  it('marks a job ready for payment and creates its invoice', async () => {
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        action: 'ready_for_payment',
        actualPartCost: 90,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
        resolutionNotes: 'Done',
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedMarkJobReadyForPayment)
        .toHaveBeenCalledWith(
            'org_1', 'JOB-1', 'user_1',
            expect.objectContaining({finalTotal: 170}));
  });

  it('closes a ready-for-payment job', async () => {
    mockedGetJobRecord.mockResolvedValue({
      id: 'JOB-1',
      status: 'closed',
    } as never);
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', action: 'close'}),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedCloseInvoiceBackedJob).toHaveBeenCalledWith('org_1', 'JOB-1');
  });

  it('rejects final close when an invoice is missing', async () => {
    mockedCloseInvoiceBackedJob.mockRejectedValue(
        new Error('INVOICE_REQUIRED'));
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', action: 'close'}),
    });

    const response = await POST(request);

    expect(response?.status).toBe(409);
    await expect(response?.json()).resolves.toEqual({
      error: 'An invoice is required before closing the job',
    });
  });

  it('returns 400 for invalid numeric payload', async () => {
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: -1,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedMarkJobReadyForPayment).not.toHaveBeenCalled();
  });

  it('rejects closing out an already closed job', async () => {
    mockedGetJobRecord.mockResolvedValue({
      id: 'JOB-1',
      status: 'closed',
    } as never);
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: 90,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(409);
    expect(mockedMarkJobReadyForPayment).not.toHaveBeenCalled();
  });

  it('returns forbidden when permission denied', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: 90,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(403);
  });

  it('requires invoice creation permission before ready for payment',
     async () => {
       mockedAuthorizePermission.mockResolvedValueOnce({state: 'authorized'})
           .mockResolvedValueOnce({state: 'forbidden'});
       const request = new Request('http://localhost/api/jobs/closeout', {
         method: 'POST',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           id: 'JOB-1',
           action: 'ready_for_payment',
           actualPartCost: 90,
           actualLaborCost: 80,
           actualMinutes: 70,
           finalTotal: 170,
         }),
       });

       const response = await POST(request);

       expect(response?.status).toBe(403);
       expect(mockedMarkJobReadyForPayment).not.toHaveBeenCalled();
     });
});
