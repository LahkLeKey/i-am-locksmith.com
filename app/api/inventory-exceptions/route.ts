import {
  listInventoryExceptions,
  reconcileInventoryException,
} from '@/lib/inventory/exceptions-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type ReconcileActionType = 'adjustment'|'receipt'|'reservation_correction';

type ReconcileExceptionBody = {
  sku?: string;
  location?: string;
  actionType?: ReconcileActionType;
  quantity?: number;
  reasonCode?: string;
  note?: string | null;
  correlationId?: string | null;
};

function isReconcileActionType(value: unknown): value is ReconcileActionType {
  return value === 'adjustment' || value === 'receipt' ||
      value === 'reservation_correction';
}

async function authorize(permission: 'inventory.read'|'inventory.adjust') {
  const context = await getAuthorizationContext();

  if (!context) {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (!context.orgId) {
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'}, {status: 400}),
    };
  }

  const decision = await authorizePermission(permission);

  if (decision.state === 'unauthenticated') {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (decision.state === 'forbidden') {
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  }

  return {orgId: context.orgId, userId: context.userId};
}

export async function GET() {
  const authResult = await authorize('inventory.read');

  if ('error' in authResult) {
    return authResult.error;
  }

  const exceptions = await listInventoryExceptions(authResult.orgId);

  return NextResponse.json({exceptions});
}

export async function POST(request: Request) {
  const authResult = await authorize('inventory.adjust');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: ReconcileExceptionBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const sku = body.sku?.trim();
  const location = body.location?.trim();
  const reasonCode = body.reasonCode?.trim();

  if (!sku || !location || !reasonCode || !isReconcileActionType(body.actionType)) {
    return NextResponse.json(
        {
          error:
              'sku, location, actionType, and reasonCode are required',
        },
        {status: 400});
  }

    const quantity = body.quantity;

      if (typeof quantity !== 'number' || !Number.isFinite(quantity) ||
        !Number.isInteger(quantity) ||
      quantity <= 0) {
    return NextResponse.json(
        {error: 'quantity must be a whole number greater than 0'},
        {status: 400});
  }

  try {
    const result = await reconcileInventoryException(authResult.orgId, {
      actionType: body.actionType,
      sku,
      location,
      quantity,
      reasonCode,
      note: body.note?.trim() || null,
      correlationId: body.correlationId?.trim() || null,
      actorUserId: authResult.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const typedError = error as Error&{code?: string};

    if (typedError.code === 'INVALID_RECONCILIATION_INPUT') {
      return NextResponse.json(
          {error: typedError.message || 'Invalid reconciliation payload'},
          {status: 400});
    }

    return NextResponse.json(
        {error: 'Unable to reconcile inventory exception'},
        {status: 500});
  }
}
