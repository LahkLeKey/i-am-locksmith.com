import {closeInvoiceBackedJob, markJobReadyForPayment} from '@/lib/invoices/repository';
import {getJobRecord} from '@/lib/jobs/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CloseoutRequest = {
  action?: 'ready_for_payment'|'close';
  id?: string;
  actualPartCost?: number;
  actualLaborCost?: number;
  actualMinutes?: number;
  finalTotal?: number;
  resolutionNotes?: string;
};

async function authorizeCloseout() {
  const context = await getAuthorizationContext();

  if (!context) {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (!context.orgId) {
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'},
          {status: 400},
          ),
    };
  }

  const decision = await authorizePermission('jobs.complete');

  if (decision.state === 'unauthenticated') {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (decision.state === 'forbidden') {
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  }

  return {orgId: context.orgId, userId: context.userId};
}

export async function POST(request: Request) {
  const authResult = await authorizeCloseout();

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CloseoutRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  if (body.action === 'close') {
    try {
      await closeInvoiceBackedJob(authResult.orgId, body.id);
      const job = await getJobRecord(authResult.orgId, body.id);
      return NextResponse.json({
        ok: true,
        message: `Closed ${body.id}`,
        job,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN';
      if (code === 'JOB_NOT_FOUND') {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }
      if (code === 'INVOICE_REQUIRED') {
        return NextResponse.json(
            {error: 'An invoice is required before closing the job'},
            {status: 409});
      }
      return NextResponse.json(
          {error: 'Only jobs ready for payment can be closed'}, {status: 409});
    }
  }

  const current = await getJobRecord(authResult.orgId, body.id);
  if (!current) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }
  if (current.status === 'closed' || current.status === 'completed') {
    return NextResponse.json(
        {error: 'Closed jobs are read-only. Reopen the job before editing it.'},
        {status: 409});
  }

  const invoiceDecision = await authorizePermission('invoices.create');
  if (invoiceDecision.state === 'unauthenticated') {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  if (invoiceDecision.state === 'forbidden') {
    return NextResponse.json(
        {error: 'Invoice creation permission is required'}, {status: 403});
  }

  const actualPartCost = body.actualPartCost;
  const actualLaborCost = body.actualLaborCost;
  const actualMinutes = body.actualMinutes;
  const finalTotal = body.finalTotal;

  if (!Number.isFinite(actualPartCost) || !Number.isFinite(actualLaborCost) ||
      !Number.isFinite(actualMinutes) || !Number.isFinite(finalTotal)) {
    return NextResponse.json(
        {
          error:
              'actualPartCost, actualLaborCost, actualMinutes, and finalTotal are required numbers'
        },
        {status: 400},
    );
  }

  if (actualPartCost! < 0 || actualLaborCost! < 0 || actualMinutes! < 0 ||
      finalTotal! < 0) {
    return NextResponse.json(
        {error: 'closeout values must be non-negative'},
        {status: 400},
    );
  }

  try {
    const invoice = await markJobReadyForPayment(
        authResult.orgId, body.id, authResult.userId, {
          actualPartCost: actualPartCost!,
          actualLaborCost: actualLaborCost!,
          actualMinutes: actualMinutes!,
          finalTotal: finalTotal!,
          resolutionNotes: body.resolutionNotes || null,
        });
    const job = await getJobRecord(authResult.orgId, body.id);
    return NextResponse.json({
      ok: true,
      message: `${body.id} is ready for payment`,
      job,
      invoice,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'JOB_NOT_FOUND') {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }
    if (code === 'INVOICE_EXISTS') {
      return NextResponse.json(
          {error: 'This job already has an invoice'}, {status: 409});
    }
    return NextResponse.json(
        {error: 'Only active jobs can be marked ready for payment'},
        {status: 409});
  }
}
