import {renderReceiptPdf} from '@/lib/invoices/receipt-pdf';
import {getInvoiceById} from '@/lib/invoices/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

export async function GET(
    request: Request,
    {params}: {params: Promise<{invoiceId: string}>},
) {
  const context = await getAuthorizationContext();
  if (!context) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  if (!context.orgId) {
    return NextResponse.json(
        {error: 'No active organization selected'}, {status: 400});
  }

  const decision = await authorizePermission('invoices.read');
  if (decision.state === 'unauthenticated') {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  if (decision.state === 'forbidden') {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  const {invoiceId} = await params;
  const invoice = await getInvoiceById(context.orgId, invoiceId);
  if (!invoice) {
    return NextResponse.json({error: 'Invoice not found'}, {status: 404});
  }

  const pdf = await renderReceiptPdf(invoice);
  const disposition = new URL(request.url).searchParams.get('preview') === '1' ?
      'inline' :
      'attachment';
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
          `${disposition}; filename="receipt-${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}