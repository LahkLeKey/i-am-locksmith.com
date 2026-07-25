import {PDFDocument} from 'pdf-lib';
import {describe, expect, it} from 'vitest';

import {renderReceiptPdf} from './receipt-pdf';
import type {InvoiceRecord} from './repository';

const invoice: InvoiceRecord = {
  id: 'invoice_1',
  invoiceNumber: 'INV-1001',
  jobNumber: 'JOB-1001',
  customerName: 'Acme Locks',
  site: '1 Main Street',
  subtotal: 125,
  taxAmount: 0,
  totalAmount: 125,
  status: 'paid',
  notes: 'Front door rekeyed.',
  finalizedAt: new Date('2026-07-25T12:00:00Z'),
  paidAt: new Date('2026-07-25T13:00:00Z'),
  payments: [{
    id: 'payment_1',
    amount: 125,
    method: 'card_external',
    reference: 'TERM-42',
    notes: null,
    receivedAt: new Date('2026-07-25T13:00:00Z'),
    recordedByUserId: 'user_1',
  }],
  paidAmount: 125,
  balanceDue: 0,
};

describe('receipt PDF', () => {
  it('creates a loadable one-page receipt with invoice metadata', async () => {
    const bytes = await renderReceiptPdf(invoice);
    const document = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toBe('Receipt INV-1001');
    expect(document.getSubject()).toBe('Receipt for job JOB-1001');
  });
});