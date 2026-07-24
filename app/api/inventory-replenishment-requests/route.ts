import {createReplenishmentRequest, listOpenReplenishmentRequests} from '@/lib/inventory/replenishment-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CreateRequestBody = {
  sku?: string;
  location?: string;
  supplier?: string;
  requestedQuantity?: number;
  orderingNotes?: string | null;
};

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
