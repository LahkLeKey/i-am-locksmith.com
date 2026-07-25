import {finalizeInvoiceFromJob, PAYMENT_METHODS, type PaymentMethod, recordInvoicePayment,} from '@/lib/invoices/repository';
import type {Permission} from '@/lib/rbac/policy';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type InvoiceRequest = {
  action?: 'finalize'|'record_payment';
  jobNumber?: string;
  invoiceId?: string;
  amount?: number;
  method?: string;
  reference?: string;
  notes?: string;
  receivedAt?: string;
};

async function authorize(permission: Permission) {
  const context = await getAuthorizationContext();
  if (!context)
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (!context.orgId)
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'}, {status: 400})
    };

  const decision = await authorizePermission(permission);
  if (decision.state === 'unauthenticated')
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (decision.state === 'forbidden')
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  return {orgId: context.orgId, userId: context.userId};
}

function domainError(error: unknown) {
  const code = error instanceof Error ? error.message : 'UNKNOWN';
  const responses: Record<string, [string, number]> = {
    JOB_NOT_FOUND: ['Job not found', 404],
    INVOICE_NOT_FOUND: ['Invoice not found', 404],
    INVOICE_EXISTS: ['This job already has an invoice', 409],
    JOB_NOT_FINALIZED: ['Close out the job before finalizing its invoice', 409],
    INVOICE_NOT_PAYABLE: ['This invoice cannot accept payments', 409],
    INVALID_PAYMENT_AMOUNT: [
      'Payment must be greater than zero and no more than the balance due', 400
    ],
  };
  const [message, status] =
      responses[code] ?? ['Unable to update invoice', 500];
  return NextResponse.json({error: message}, {status});
}

export async function POST(request: Request) {
  let body: InvoiceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (body.action === 'finalize') {
    const auth = await authorize('invoices.create');
    if ('error' in auth) return auth.error;
    if (!body.jobNumber)
      return NextResponse.json({error: 'jobNumber is required'}, {status: 400});

    try {
      return NextResponse.json({
        invoice: await finalizeInvoiceFromJob(
            auth.orgId, body.jobNumber, auth.userId)
      });
    } catch (error) {
      return domainError(error);
    }
  }

  if (body.action === 'record_payment') {
    const auth = await authorize('invoices.mark_paid');
    if ('error' in auth) return auth.error;
    const receivedAt = new Date(body.receivedAt ?? '');
    const method = body.method as PaymentMethod;
    if (!body.invoiceId || !Number.isFinite(body.amount) ||
        !PAYMENT_METHODS.includes(method) ||
        Number.isNaN(receivedAt.getTime())) {
      return NextResponse.json(
          {error: 'invoiceId, amount, method, and receivedAt are required'},
          {status: 400});
    }

    try {
      return NextResponse.json({
        invoice: await recordInvoicePayment(auth.orgId, body.invoiceId, {
          amount: body.amount!,
          method,
          reference: body.reference?.trim() || null,
          notes: body.notes?.trim() || null,
          receivedAt,
          recordedByUserId: auth.userId,
        }),
      });
    } catch (error) {
      return domainError(error);
    }
  }

  return NextResponse.json({error: 'Unknown invoice action'}, {status: 400});
}
