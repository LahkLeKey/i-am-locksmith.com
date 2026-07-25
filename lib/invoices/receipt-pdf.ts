import {PDFDocument, rgb, StandardFonts} from 'pdf-lib';

import type {InvoiceRecord} from './repository';

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPaymentMethod(method: string): string {
  return method.replaceAll('_', ' ').replace(
      /\b\w/g, (letter) => letter.toUpperCase());
}

export async function renderReceiptPdf(invoice: InvoiceRecord):
    Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Receipt ${invoice.invoiceNumber}`);
  document.setSubject(`Receipt for job ${invoice.jobNumber}`);
  document.setCreator('I Am Locksmith');

  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.35, 0.4, 0.48);
  const rule = rgb(0.86, 0.88, 0.91);
  const accent = rgb(0.06, 0.46, 0.43);
  let y = 730;

  page.drawText(
      'I AM LOCKSMITH', {x: 48, y, size: 11, font: bold, color: accent});
  page.drawText('RECEIPT', {x: 456, y, size: 11, font: bold, color: muted});
  y -= 34;
  page.drawText(
      invoice.invoiceNumber, {x: 48, y, size: 24, font: bold, color: ink});
  page.drawText(invoice.status === 'paid' ? 'PAID' : 'PAYMENT DUE', {
    x: 456,
    y: y + 5,
    size: 10,
    font: bold,
    color: invoice.status === 'paid' ? accent : muted,
  });
  y -= 30;
  page.drawLine(
      {start: {x: 48, y}, end: {x: 564, y}, thickness: 1, color: rule});
  y -= 28;

  const detailRows = [
    ['Customer', invoice.customerName],
    ['Service location', invoice.site],
    ['Job', invoice.jobNumber],
    ['Finalized', invoice.finalizedAt?.toLocaleString() ?? 'Pending'],
  ];
  for (const [label, value] of detailRows) {
    page.drawText(label, {x: 48, y, size: 9, font: regular, color: muted});
    page.drawText(value, {x: 180, y, size: 10, font: bold, color: ink});
    y -= 22;
  }

  y -= 8;
  page.drawLine(
      {start: {x: 48, y}, end: {x: 564, y}, thickness: 1, color: rule});
  y -= 28;
  const amountRows: Array<[string, number, boolean?]> = [
    ['Subtotal', invoice.subtotal],
    ['Tax', invoice.taxAmount],
    ['Total', invoice.totalAmount, true],
    ['Collected', invoice.paidAmount],
    ['Balance due', invoice.balanceDue, true],
  ];
  for (const [label, amount, emphasized] of amountRows) {
    const font = emphasized ? bold : regular;
    const size = emphasized ? 12 : 10;
    page.drawText(
        label, {x: 340, y, size, font, color: emphasized ? ink : muted});
    const value = formatUsd(amount);
    page.drawText(value, {
      x: 564 - font.widthOfTextAtSize(value, size),
      y,
      size,
      font,
      color: ink,
    });
    y -= emphasized ? 26 : 20;
  }

  y -= 12;
  page.drawText(
      'PAYMENT HISTORY', {x: 48, y, size: 9, font: bold, color: muted});
  y -= 22;
  if (invoice.payments.length === 0) {
    page.drawText(
        'No payments recorded.',
        {x: 48, y, size: 10, font: regular, color: muted});
    y -= 20;
  } else {
    for (const payment of invoice.payments) {
      const method = formatPaymentMethod(payment.method);
      const reference = payment.reference ? ` - ${payment.reference}` : '';
      page.drawText(
          `${payment.receivedAt.toLocaleDateString()}  ${method}${reference}`, {
            x: 48,
            y,
            size: 10,
            font: regular,
            color: ink,
          });
      const amount = formatUsd(payment.amount);
      page.drawText(amount, {
        x: 564 - regular.widthOfTextAtSize(amount, 10),
        y,
        size: 10,
        font: regular,
        color: ink,
      });
      y -= 20;
    }
  }

  if (invoice.notes) {
    y -= 12;
    page.drawText('NOTES', {x: 48, y, size: 9, font: bold, color: muted});
    y -= 18;
    page.drawText(
        invoice.notes.slice(0, 110),
        {x: 48, y, size: 9, font: regular, color: ink});
  }

  page.drawText('Generated from the recorded invoice and payment ledger.', {
    x: 48,
    y: 40,
    size: 8,
    font: regular,
    color: muted,
  });
  return document.save();
}