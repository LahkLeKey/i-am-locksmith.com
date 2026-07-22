import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData} from '@/lib/dashboard/snapshotMutations';
import type {JobQueueItem, JobQueuePriority, JobQueueStatus} from '@/lib/dashboard/types';
import {createInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {NextResponse} from 'next/server';

type CreateJobRequest = {
  customerName?: string;
  site?: string;
  priority?: JobQueuePriority;
  requiredSkus?: string[];
  scheduledFor?: string | null;
};

type UpdateJobRequest = {
  id?: string;
  customerName?: string;
  site?: string;
  status?: JobQueueStatus;
  priority?: JobQueuePriority;
  etaMinutes?: number | null;
  scheduledFor?: string | null;
  inventoryAction?: 'reserve' | 'create_inventory';
  inventorySku?: string;
  reserveQuantity?: number;
  createInventory?: {
    itemName?: string;
    serviceLines?: string[];
    location?: string;
    onHand?: number;
    reorderPoint?: number;
    suggestedOrderQty?: number;
    supplier?: string;
    severity?: string;
    compatibilityNote?: string;
  };
};

type DeleteJobRequest = {
  id?: string;
};

const ALLOWED_PRIORITIES: JobQueuePriority[] =
    ['low', 'normal', 'high', 'urgent'];
const ALLOWED_STATUSES: JobQueueStatus[] =
    ['queued', 'scheduled', 'in_progress', 'blocked'];

function buildJobId(): string {
  return `JOB-${Date.now().toString().slice(-6)}`;
}

function isJobPriority(value: unknown): value is JobQueuePriority {
  return typeof value === 'string' &&
      ALLOWED_PRIORITIES.includes(value as JobQueuePriority);
}

function isJobStatus(value: unknown): value is JobQueueStatus {
  return typeof value === 'string' &&
      ALLOWED_STATUSES.includes(value as JobQueueStatus);
}

function normalizeSkus(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
}

async function authorize(permission: 'jobs.create'|'jobs.update') {
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

  return {orgId: context.orgId};
}

async function authorizeInventory(
    permission: 'inventory.reserve'|'inventory.adjust') {
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

  return {orgId: context.orgId};
}

export async function POST(request: Request) {
  const authResult = await authorize('jobs.create');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: CreateJobRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const customerName = body.customerName?.trim();
  const site = body.site?.trim();

  if (!customerName || !site) {
    return NextResponse.json(
        {error: 'customerName and site are required'}, {status: 400});
  }

  if (body.priority && !isJobPriority(body.priority)) {
    return NextResponse.json({error: 'Invalid priority'}, {status: 400});
  }

  const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
  const data = await getDashboardDataForSnapshot(snapshot);

  const nextJob: JobQueueItem = {
    id: buildJobId(),
    customerName,
    site,
    priority: body.priority ?? 'normal',
    status: 'queued',
    scheduledFor: body.scheduledFor ?? null,
    etaMinutes: null,
    requiredSkus: normalizeSkus(body.requiredSkus),
  };

  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    jobsQueue: [nextJob, ...data.jobsQueue],
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json(
      {ok: true, message: `Created ${nextJob.id}`, job: nextJob});
}

export async function PATCH(request: Request) {
  let body: UpdateJobRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!body.id) {
    return NextResponse.json({error: 'id is required'}, {status: 400});
  }

  if (body.inventoryAction === 'reserve') {
    const authResult = await authorizeInventory('inventory.reserve');

    if ('error' in authResult) {
      return authResult.error;
    }

    const inventorySku = body.inventorySku?.trim();
    const reserveQuantity = body.reserveQuantity;

    if (!inventorySku) {
      return NextResponse.json(
          {error: 'inventorySku is required'}, {status: 400});
    }

    if (!Number.isFinite(reserveQuantity) || !reserveQuantity ||
        reserveQuantity <= 0) {
      return NextResponse.json(
          {error: 'reserveQuantity must be greater than 0'}, {status: 400});
    }

    const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
    const data = await getDashboardDataForSnapshot(snapshot);
    const jobIndex = data.jobsQueue.findIndex((job) => job.id === body.id);

    if (jobIndex < 0) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    const parts = await listInventoryParts(authResult.orgId);
    const part = parts.find(
        (entry) => entry.sku.toLowerCase() === inventorySku.toLowerCase());

    if (!part) {
      return NextResponse.json(
          {error: `No part found for SKU ${inventorySku}`}, {status: 404});
    }

    if (part.onHand < reserveQuantity) {
      return NextResponse.json(
          {error: `Only ${part.onHand} on hand for ${part.sku}`},
          {status: 400});
    }

    await updateInventoryPart(part.id, {onHand: part.onHand - reserveQuantity});

    const current = data.jobsQueue[jobIndex];
    const nextRequiredSkus = current.requiredSkus.includes(part.sku) ?
        current.requiredSkus :
        [...current.requiredSkus, part.sku];
    const nextJobs = [...data.jobsQueue];
    nextJobs[jobIndex] = {...current, requiredSkus: nextRequiredSkus};

    await persistDashboardData(snapshot.id, {
      ...data,
      generatedAt: new Date().toISOString(),
      jobsQueue: nextJobs,
    });

    return NextResponse.json({
      ok: true,
      message: `Reserved ${reserveQuantity} of ${part.sku} for ${current.id}`,
      job: nextJobs[jobIndex],
    });
  }

  if (body.inventoryAction === 'create_inventory') {
    const authResult = await authorizeInventory('inventory.adjust');

    if ('error' in authResult) {
      return authResult.error;
    }

    const inventorySku = body.inventorySku?.trim();
    const draft = body.createInventory;

    if (!inventorySku || !draft?.itemName?.trim() || !draft?.location?.trim() ||
        !draft?.supplier?.trim() || !draft?.compatibilityNote?.trim()) {
      return NextResponse.json(
          {
            error:
                'inventorySku, itemName, location, supplier, and compatibilityNote are required'
          },
          {status: 400});
    }

    if (!Number.isFinite(draft.onHand) || draft.onHand! < 0 ||
        !Number.isFinite(draft.reorderPoint) || draft.reorderPoint! < 0 ||
        !Number.isFinite(draft.suggestedOrderQty) ||
        draft.suggestedOrderQty! < 0) {
      return NextResponse.json(
          {
            error:
                'onHand, reorderPoint, and suggestedOrderQty must be non-negative numbers'
          },
          {status: 400});
    }

    const parts = await listInventoryParts(authResult.orgId);
    const existing = parts.find(
        (entry) => entry.sku.toLowerCase() === inventorySku.toLowerCase());

    if (existing) {
      return NextResponse.json(
          {error: `Part ${inventorySku} already exists`}, {status: 409});
    }

    const serviceLines = Array.isArray(draft.serviceLines) ?
        draft.serviceLines
            .map((entry) => typeof entry === 'string' ? entry.trim() : '')
            .filter((entry) => entry.length > 0) :
        ['mobile', 'shop'];

    const createdPart = await createInventoryPart(authResult.orgId, {
      sku: inventorySku,
      itemName: draft.itemName.trim(),
      serviceLines,
      location: draft.location.trim(),
      onHand: draft.onHand!,
      reorderPoint: draft.reorderPoint!,
      suggestedOrderQty: draft.suggestedOrderQty!,
      supplier: draft.supplier.trim(),
      severity: (draft.severity?.trim() || 'medium'),
      compatibilityNote: draft.compatibilityNote.trim(),
    });

    const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
    const data = await getDashboardDataForSnapshot(snapshot);
    const jobIndex = data.jobsQueue.findIndex((job) => job.id === body.id);

    if (jobIndex < 0) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    const current = data.jobsQueue[jobIndex];
    const nextRequiredSkus = current.requiredSkus.includes(createdPart.sku) ?
        current.requiredSkus :
        [...current.requiredSkus, createdPart.sku];
    const nextJobs = [...data.jobsQueue];
    nextJobs[jobIndex] = {...current, requiredSkus: nextRequiredSkus};

    await persistDashboardData(snapshot.id, {
      ...data,
      generatedAt: new Date().toISOString(),
      jobsQueue: nextJobs,
    });

    return NextResponse.json({
      ok: true,
      message: `Created inventory part ${createdPart.sku} for ${current.id}`,
      job: nextJobs[jobIndex],
      part: createdPart,
    });
  }

  const authResult = await authorize('jobs.update');

  if ('error' in authResult) {
    return authResult.error;
  }

  if (body.status && !isJobStatus(body.status)) {
    return NextResponse.json({error: 'Invalid status'}, {status: 400});
  }

  if (body.priority && !isJobPriority(body.priority)) {
    return NextResponse.json({error: 'Invalid priority'}, {status: 400});
  }

  if (body.customerName !== undefined && !body.customerName.trim()) {
    return NextResponse.json(
        {error: 'customerName cannot be empty'}, {status: 400});
  }

  if (body.site !== undefined && !body.site.trim()) {
    return NextResponse.json({error: 'site cannot be empty'}, {status: 400});
  }

  if (body.etaMinutes !== undefined && body.etaMinutes !== null &&
      (!Number.isFinite(body.etaMinutes) || body.etaMinutes < 0)) {
    return NextResponse.json({error: 'Invalid etaMinutes'}, {status: 400});
  }

  const snapshot = await getOrCreateOrgSnapshot(authResult.orgId);
  const data = await getDashboardDataForSnapshot(snapshot);

  const index = data.jobsQueue.findIndex((job) => job.id === body.id);

  if (index < 0) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }

  const current = data.jobsQueue[index];
  const updated: JobQueueItem = {
    ...current,
    customerName: body.customerName?.trim() ?? current.customerName,
    site: body.site?.trim() ?? current.site,
    status: body.status ?? current.status,
    priority: body.priority ?? current.priority,
    etaMinutes: body.etaMinutes === undefined ? current.etaMinutes :
                                                body.etaMinutes,
    scheduledFor: body.scheduledFor === undefined ? current.scheduledFor :
                                                    body.scheduledFor,
  };

  const nextJobs = [...data.jobsQueue];
  nextJobs[index] = updated;

  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    jobsQueue: nextJobs,
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json(
      {ok: true, message: `Updated ${updated.id}`, job: updated});
}

export async function DELETE(request: Request) {
  const authResult = await authorize('jobs.update');

  if ('error' in authResult) {
    return authResult.error;
  }

  let body: DeleteJobRequest;

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

  const nextJobs = data.jobsQueue.filter((job) => job.id !== body.id);

  if (nextJobs.length === data.jobsQueue.length) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }

  const next = {
    ...data,
    generatedAt: new Date().toISOString(),
    jobsQueue: nextJobs,
  };

  await persistDashboardData(snapshot.id, next);

  return NextResponse.json({ok: true, message: `Deleted ${body.id}`});
}
