import {createInventoryPart, deleteInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CreatePartRequest = {
  sku?: string;
  itemName?: string;
  estimatedUnitCost?: number;
  serviceLines?: string[];
  location?: string;
  onHand?: number;
  reorderPoint?: number;
  suggestedOrderQty?: number;
  supplier?: string;
  severity?: string;
  compatibilityNote?: string;
};

type UpdatePartRequest = Partial<CreatePartRequest>&{id?: string};

function normalizeServiceLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => typeof entry === 'string' ? entry.trim() : '')
      .filter((entry) => entry.length > 0);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

async function authorize(permission: 'inventory.read'|'inventory.adjust') {
  const context = await getAuthorizationContext();

  if (!context) {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (!context.orgId) {
    return {
      error: NextResponse.json(
          {error: 'No active organization selected'}, {status: 400})
    };
  }

  const decision = await authorizePermission(permission);

  if (decision.state === 'unauthenticated') {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (decision.state === 'forbidden') {
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  }

  return {orgId: context.orgId};
}

export async function GET() {
  const authResult = await authorize('inventory.read');

  if ('error' in authResult) {
    return authResult.error;
  }

  const parts = await listInventoryParts(authResult.orgId);
  return NextResponse.json({parts});
}

export async function POST(request: Request) {
  const authResult = await authorize('inventory.adjust');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CreatePartRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const sku = body.sku?.trim();
  const itemName = body.itemName?.trim();
  const location = body.location?.trim();
  const supplier = body.supplier?.trim();
  const compatibilityNote = body.compatibilityNote?.trim();

  if (!sku || !itemName || !location || !supplier || !compatibilityNote) {
    return NextResponse.json(
        {
          error:
              'sku, itemName, location, supplier, and compatibilityNote are required'
        },
        {status: 400});
  }

  if (!isNonNegativeNumber(body.onHand) ||
      !isNonNegativeNumber(body.estimatedUnitCost) ||
      !isNonNegativeNumber(body.reorderPoint) ||
      !isNonNegativeNumber(body.suggestedOrderQty)) {
    return NextResponse.json(
        {
          error:
              'estimatedUnitCost, onHand, reorderPoint, and suggestedOrderQty must be non-negative numbers'
        },
        {status: 400});
  }

  const serviceLines = normalizeServiceLines(body.serviceLines);
  if (serviceLines.length === 0) {
    return NextResponse.json(
        {error: 'serviceLines is required'}, {status: 400});
  }

  const part = await createInventoryPart(authResult.orgId, {
    sku,
    itemName,
    estimatedUnitCost: body.estimatedUnitCost,
    serviceLines,
    location,
    onHand: body.onHand,
    reorderPoint: body.reorderPoint,
    suggestedOrderQty: body.suggestedOrderQty,
    supplier,
    severity: body.severity?.trim() || 'medium',
    compatibilityNote,
  });

  return NextResponse.json({ok: true, part}, {status: 201});
}

export async function PATCH(request: Request) {
  const authResult = await authorize('inventory.adjust');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: UpdatePartRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  const updateData: Record<string, unknown> = {};

  if (body.sku) updateData.sku = body.sku.trim();
  if (body.itemName) updateData.itemName = body.itemName.trim();
  if (body.location) updateData.location = body.location.trim();
  if (body.supplier) updateData.supplier = body.supplier.trim();
  if (body.compatibilityNote)
    updateData.compatibilityNote = body.compatibilityNote.trim();
  if (body.severity) updateData.severity = body.severity.trim();
  if (body.serviceLines)
    updateData.serviceLines = normalizeServiceLines(body.serviceLines);
  if (isNonNegativeNumber(body.onHand)) updateData.onHand = body.onHand;
  if (isNonNegativeNumber(body.estimatedUnitCost))
    updateData.estimatedUnitCost = body.estimatedUnitCost;
  if (isNonNegativeNumber(body.reorderPoint))
    updateData.reorderPoint = body.reorderPoint;
  if (isNonNegativeNumber(body.suggestedOrderQty))
    updateData.suggestedOrderQty = body.suggestedOrderQty;

  const part = await updateInventoryPart(body.id, updateData);
  return NextResponse.json({ok: true, part});
}

export async function DELETE(request: Request) {
  const authResult = await authorize('inventory.adjust');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: {id?: string};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  await deleteInventoryPart(body.id);
  return NextResponse.json({ok: true});
}