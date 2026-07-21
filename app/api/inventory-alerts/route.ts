import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData} from '@/lib/dashboard/snapshotMutations';
import type {ReplenishmentAlert, ReplenishmentSeverity} from '@/lib/dashboard/types';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CreateAlertRequest = {
  sku?: string;
  itemName?: string;
  location?: string;
  onHand?: number;
  reorderPoint?: number;
  suggestedOrderQty?: number;
  supplier?: string;
  etaDays?: number | null;
  severity?: ReplenishmentSeverity;
};

type UpdateAlertRequest = {
  id?: string;
  onHand?: number;
  reorderPoint?: number;
  suggestedOrderQty?: number;
  supplier?: string;
  etaDays?: number | null;
  severity?: ReplenishmentSeverity;
};

type DeleteAlertRequest = {
  id?: string;
};

const ALLOWED_SEVERITIES: ReplenishmentSeverity[] =
    ['low', 'medium', 'high', 'critical'];

function isSeverity(value: unknown): value is ReplenishmentSeverity {
  return typeof value === 'string' &&
      ALLOWED_SEVERITIES.includes(value as ReplenishmentSeverity);
}

function buildAlertId(): string {
  return `ALERT-${Date.now().toString().slice(-6)}`;
}

function resolveSeverity(
    onHand: number, reorderPoint: number): ReplenishmentSeverity {
  if (onHand <= 0) {
    return 'critical';
  }

  const ratio = reorderPoint <= 0 ? 1 : onHand / reorderPoint;

  if (ratio <= 0.25) {
    return 'critical';
  }

  if (ratio <= 0.5) {
    return 'high';
  }

  if (ratio <= 0.8) {
    return 'medium';
  }

  return 'low';
}

async function authorize() {
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

  const decision = await authorizePermission('inventory.adjust');

  if (decision.state === 'unauthenticated') {
    return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  }

  if (decision.state === 'forbidden') {
    return {error: NextResponse.json({error: 'Forbidden'}, {status: 403})};
  }

  return {orgId: context.orgId};
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export async function POST(request: Request) {
  const authResult = await authorize();

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CreateAlertRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const sku = body.sku?.trim();
  const itemName = body.itemName?.trim();
  const location = body.location?.trim();
  const supplier = body.supplier?.trim();

  if (!sku || !itemName || !location || !supplier) {
    return NextResponse.json(
        {error: 'sku, itemName, location, and supplier are required'},
        {status: 400});
  }

  if (!isNonNegativeNumber(body.onHand) ||
      !isNonNegativeNumber(body.reorderPoint)) {
    return NextResponse.json(
        {error: 'onHand and reorderPoint must be non-negative numbers'},
        {status: 400});
  }

  if (!isNonNegativeNumber(body.suggestedOrderQty)) {
    return NextResponse.json(
        {error: 'suggestedOrderQty must be a non-negative number'},
        {status: 400});
  }

  if (body.etaDays !== undefined && body.etaDays !== null &&
      !isNonNegativeNumber(body.etaDays)) {
    return NextResponse.json(
        {error: 'etaDays must be non-negative when provided'}, {status: 400});
  }

  if (body.severity && !isSeverity(body.severity)) {
    return NextResponse.json({error: 'Invalid severity'}, {status: 400});
  }

  const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
  const data = await getDashboardDataForSnapshot(snapshot);

  const nextAlert: ReplenishmentAlert = {
    id: buildAlertId(),
    sku,
    itemName,
    location,
    onHand: body.onHand,
    reorderPoint: body.reorderPoint,
    suggestedOrderQty: body.suggestedOrderQty,
    severity: body.severity ?? resolveSeverity(body.onHand, body.reorderPoint),
    supplier,
    etaDays: body.etaDays ?? null,
    createdAt: new Date().toISOString(),
  };

  const nextAlerts = [nextAlert, ...data.replenishmentAlerts];
  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    replenishmentAlerts: nextAlerts,
    lowStockSkus: nextAlerts.length,
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json(
      {ok: true, message: `Created ${nextAlert.id}`, alert: nextAlert});
}

export async function PATCH(request: Request) {
  const authResult = await authorize();

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: UpdateAlertRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  if (body.severity && !isSeverity(body.severity)) {
    return NextResponse.json({error: 'Invalid severity'}, {status: 400});
  }

  const numericFields = [
    ['onHand', body.onHand],
    ['reorderPoint', body.reorderPoint],
    ['suggestedOrderQty', body.suggestedOrderQty],
    ['etaDays', body.etaDays],
  ] as const;

  for (const [, value] of numericFields) {
    if (value !== undefined && value !== null && !isNonNegativeNumber(value)) {
      return NextResponse.json(
          {error: 'Numeric fields must be non-negative'}, {status: 400});
    }
  }

  const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
  const data = await getDashboardDataForSnapshot(snapshot);

  const index =
      data.replenishmentAlerts.findIndex((alert) => alert.id === body.id);

  if (index < 0) {
    return NextResponse.json({error: 'Alert not found'}, {status: 404});
  }

  const current = data.replenishmentAlerts[index];
  const onHand = body.onHand ?? current.onHand;
  const reorderPoint = body.reorderPoint ?? current.reorderPoint;
  const updated: ReplenishmentAlert = {
    ...current,
    onHand,
    reorderPoint,
    suggestedOrderQty: body.suggestedOrderQty ?? current.suggestedOrderQty,
    supplier: body.supplier?.trim() || current.supplier,
    etaDays: body.etaDays === undefined ? current.etaDays : body.etaDays,
    severity: body.severity ?? resolveSeverity(onHand, reorderPoint),
  };

  const nextAlerts = [...data.replenishmentAlerts];
  nextAlerts[index] = updated;

  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    replenishmentAlerts: nextAlerts,
    lowStockSkus: nextAlerts.length,
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json(
      {ok: true, message: `Updated ${updated.id}`, alert: updated});
}

export async function DELETE(request: Request) {
  const authResult = await authorize();

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: DeleteAlertRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
  const data = await getDashboardDataForSnapshot(snapshot);

  const nextAlerts =
      data.replenishmentAlerts.filter((alert) => alert.id !== body.id);

  if (nextAlerts.length === data.replenishmentAlerts.length) {
    return NextResponse.json({error: 'Alert not found'}, {status: 404});
  }

  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    replenishmentAlerts: nextAlerts,
    lowStockSkus: nextAlerts.length,
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json({ok: true, message: `Deleted ${body.id}`});
}
