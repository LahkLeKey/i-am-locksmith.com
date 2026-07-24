import {
  createReplenishmentRequest,
  listOpenReplenishmentRequests,
  receiveReplenishmentRequest,
} from '@/lib/inventory/replenishment-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CreateRequestBody = {
  sku?: string;
  location?: string;
  supplier?: string;
  requestedQuantity?: number;
  orderingNotes?: string | null;
};

type ReceiveRequestBody = {
  requestId?: string;
  receivedQuantity?: number;
  receivingNotes?: string | null;
};

async function authorize(
  permission: 'inventory.read'|'inventory.adjust'|'inventory.receive') {
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

  const requests = await listOpenReplenishmentRequests(authResult.orgId);
  return NextResponse.json({requests});
}

export async function POST(request: Request) {
  const authResult = await authorize('inventory.adjust');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CreateRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const sku = body.sku?.trim();
  const location = body.location?.trim();
  const supplier = body.supplier?.trim();
  const requestedQuantity = body.requestedQuantity;

  if (!sku || !location || !supplier) {
    return NextResponse.json(
        {error: 'sku, location, and supplier are required'}, {status: 400});
  }

  if (!Number.isFinite(requestedQuantity) || !requestedQuantity ||
      requestedQuantity <= 0) {
    return NextResponse.json(
        {error: 'requestedQuantity must be greater than 0'}, {status: 400});
  }

  if (!Number.isInteger(requestedQuantity)) {
    return NextResponse.json(
        {error: 'requestedQuantity must be a whole number'}, {status: 400});
  }

  const created = await createReplenishmentRequest(authResult.orgId, {
    sku,
    location,
    supplier,
    requestedQuantity,
    orderingNotes: body.orderingNotes?.trim() || null,
    requestedByUserId: authResult.userId,
  });

  return NextResponse.json({ok: true, request: created}, {status: 201});
}

export async function PATCH(request: Request) {
  const authResult = await authorize('inventory.receive');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: ReceiveRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const requestId = body.requestId?.trim();
  const receivedQuantity = body.receivedQuantity;

  if (!requestId) {
    return NextResponse.json({error: 'requestId is required'}, {status: 400});
  }

  if (receivedQuantity !== undefined &&
      (!Number.isFinite(receivedQuantity) || !Number.isInteger(receivedQuantity) ||
       receivedQuantity <= 0)) {
    return NextResponse.json(
        {error: 'receivedQuantity must be a whole number greater than 0'},
        {status: 400});
  }

  try {
    const received = await receiveReplenishmentRequest(authResult.orgId, {
      requestId,
      receivedQuantity,
      receivingNotes: body.receivingNotes?.trim() || null,
      receivedByUserId: authResult.userId,
    });

    return NextResponse.json({ok: true, ...received});
  } catch (error) {
    const typedError = error as Error&{code?: string};

    if (typedError.code === 'REPLENISHMENT_REQUEST_NOT_FOUND') {
      return NextResponse.json(
          {error: 'Replenishment request not found or no longer open'},
          {status: 404});
    }

    if (typedError.code === 'INVALID_RECEIVE_QUANTITY') {
      return NextResponse.json(
          {error: typedError.message || 'Invalid received quantity'},
          {status: 400});
    }

    return NextResponse.json(
        {error: 'Unable to receive replenishment request'},
        {status: 500});
  }
}
