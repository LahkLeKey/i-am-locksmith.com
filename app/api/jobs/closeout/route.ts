import {closeOutJobRecord} from '@/lib/jobs/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CloseoutRequest = {
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

  return {orgId: context.orgId};
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

  const job = await closeOutJobRecord(authResult.orgId, body.id, {
    actualPartCost: actualPartCost!,
    actualLaborCost: actualLaborCost!,
    actualMinutes: actualMinutes!,
    finalTotal: finalTotal!,
    resolutionNotes: body.resolutionNotes || null,
  });

  if (!job) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }

  return NextResponse.json({
    ok: true,
    message: `Closed out ${job.id}`,
    job,
  });
}
