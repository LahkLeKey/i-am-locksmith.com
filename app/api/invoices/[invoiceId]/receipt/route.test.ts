import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));
vi.mock('@/lib/invoices/repository', () => ({getInvoiceById: vi.fn()}));
vi.mock('@/lib/invoices/receipt-pdf', () => ({
                                        renderReceiptPdf: vi.fn(),
                                      }));

import {getInvoiceById} from '@/lib/invoices/repository';
import {renderReceiptPdf} from '@/lib/invoices/receipt-pdf';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';

import {GET} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedGetInvoiceById = vi.mocked(getInvoiceById);
const mockedRenderReceiptPdf = vi.mocked(renderReceiptPdf);

describe('invoice receipt route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedGetInvoiceById.mockReset();
    mockedRenderReceiptPdf.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedGetInvoiceById.mockResolvedValue({
      id: 'invoice_1',
      invoiceNumber: 'INV-1',
    } as never);
    mockedRenderReceiptPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  });

  it('returns an organization-scoped PDF attachment', async () => {
    const response = await GET(
        new Request('http://localhost/api/invoices/invoice_1/receipt'),
        {params: Promise.resolve({invoiceId: 'invoice_1'})});

    expect(response.status).toBe(200);
    expect(mockedGetInvoiceById).toHaveBeenCalledWith('org_1', 'invoice_1');
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition'))
        .toBe('attachment; filename="receipt-INV-1.pdf"');
    expect(new Uint8Array(await response.arrayBuffer()))
        .toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('returns the receipt inline for preview requests', async () => {
    const response = await GET(
        new Request(
            'http://localhost/api/invoices/invoice_1/receipt?preview=1'),
        {params: Promise.resolve({invoiceId: 'invoice_1'})});

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition'))
        .toBe('inline; filename="receipt-INV-1.pdf"');
  });

  it('returns not found without rendering a PDF', async () => {
    mockedGetInvoiceById.mockResolvedValue(null);

    const response = await GET(
        new Request('http://localhost/api/invoices/missing/receipt'),
        {params: Promise.resolve({invoiceId: 'missing'})});

    expect(response.status).toBe(404);
    expect(mockedRenderReceiptPdf).not.toHaveBeenCalled();
  });

  it('requires invoice read permission', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const response = await GET(
        new Request('http://localhost/api/invoices/invoice_1/receipt'),
        {params: Promise.resolve({invoiceId: 'invoice_1'})});

    expect(response.status).toBe(403);
    expect(mockedGetInvoiceById).not.toHaveBeenCalled();
  });
});