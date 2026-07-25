import type {JobQueuePriority, JobQueueStatus} from '@/lib/dashboard/types';
import {listInventorySkuLocationBalances, reserveInventoryForJob} from '@/lib/inventory/ledger-repository';
import {createInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';
import {createJobRecord, deleteJobRecord, getJobRecord, listJobRecords, reopenJobRecord, updateJobRecord} from '@/lib/jobs/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getTechnicianById} from '@/lib/technicians/repository';
import {NextResponse} from 'next/server';

type CreateJobRequest = {
  jobName?: string;
  customerName?: string;
  site?: string;
  latitude?: number | null;
  longitude?: number | null;
  priority?: JobQueuePriority;
  requiredSkus?: string[];
  inventorySelections?:
      Array<{sku?: string; location?: string; quantity?: number;}>;
  scheduledFor?: string | null;
  followUpNote?: string | null;
  assignedTechnicianIds?: string[];
  assignedTechnicianId?: string | null;
  quote?: {
    partEstimate?: number;
    laborEstimate?: number;
    estimatedMinutes?: number;
    estimatedTotal?: number;
    notes?: string;
  };
};

type QuotePayload = {
  partEstimate?: number;
  laborEstimate?: number;
  estimatedMinutes?: number;
  estimatedTotal?: number;
  notes?: string | null;
};

type UpdateJobRequest = {
  id?: string;
  jobName?: string;
  jobAction?: 'reopen';
  customerName?: string;
  site?: string;
  status?: JobQueueStatus;
  priority?: JobQueuePriority;
  etaMinutes?: number | null;
  scheduledFor?: string | null;
  followUpNote?: string | null;
  assignedTechnicianIds?: string[];
  assignedTechnicianId?: string | null;
  quote?: {
    partEstimate?: number;
    laborEstimate?: number;
    estimatedMinutes?: number;
    estimatedTotal?: number;
    notes?: string | null;
  };
  timeClockAction?: 'clock_in' | 'clock_out' | 'set_notes' | 'set_time_clock';
  timeClockNotes?: string | null;
  timeClockActionNote?: string | null;
  timeClockClockedInAt?: string | null;
  timeClockClockedOutAt?: string | null;
  timeClockBreakMinutes?: number | null;
  timeClockLedger?: Array<{
    id: string; action: 'clock_in' | 'clock_out'; at: string;
    note?: string | null;
  }>;
  inventoryAction?: 'reserve' | 'create_inventory';
  inventorySku?: string;
  inventoryLocation?: string;
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
const ALLOWED_STATUSES: JobQueueStatus[] = [
  'queued', 'scheduled', 'in_progress', 'blocked', 'ready_for_payment',
  'closed', 'completed'
];

function computePartEstimateFromSkus(
    requiredSkus: string[],
    inventoryParts: Awaited<ReturnType<typeof listInventoryParts>>): number {
  const normalized = requiredSkus.map((sku) => sku.toLowerCase());

  return Number(
      inventoryParts
          .filter((part) => normalized.includes(part.sku.toLowerCase()))
          .reduce((total, part) => total + part.estimatedUnitCost, 0)
          .toFixed(2));
}

function computeLaborEstimate(minutes: number, hourlyRate: number): number {
  return Number(((minutes / 60) * hourlyRate).toFixed(2));
}

function isJobPriority(value: unknown): value is JobQueuePriority {
  return typeof value === 'string' &&
      ALLOWED_PRIORITIES.includes(value as JobQueuePriority);
}

function isJobStatus(value: unknown): value is JobQueueStatus {
  return typeof value === 'string' &&
      ALLOWED_STATUSES.includes(value as JobQueueStatus);
}

function isFinalizedJob(status: JobQueueStatus): boolean {
  return status === 'ready_for_payment' || status === 'closed' ||
      status === 'completed';
}

function isValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude) &&
      latitude >= -90 && latitude <= 90 && typeof longitude === 'number' &&
      Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

async function rejectFinalizedJobMutation(orgId: string, jobId: string) {
  const current = await getJobRecord(orgId, jobId);
  if (!current) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }
  if (isFinalizedJob(current.status)) {
    return NextResponse.json(
        {
          error:
              'Invoiced jobs are read-only. Reopen the job before editing it.'
        },
        {status: 409});
  }
  return null;
}

function normalizeSkus(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
}

type JobInventorySelection = {
  sku: string; location: string; quantity: number;
};

function normalizeInventorySelections(value: unknown): JobInventorySelection[]|
    null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const selections = value.map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const candidate = entry as {
      sku?: unknown;
      location?: unknown;
      quantity?: unknown
    };
    if (typeof candidate.sku !== 'string' || !candidate.sku.trim() ||
        typeof candidate.location !== 'string' || !candidate.location.trim() ||
        typeof candidate.quantity !== 'number' ||
        !Number.isInteger(candidate.quantity) || candidate.quantity <= 0) {
      return null;
    }
    return {
      sku: candidate.sku.trim(),
      location: candidate.location.trim(),
      quantity: candidate.quantity,
    };
  });

  if (selections.some((selection) => selection === null)) return null;
  return selections as JobInventorySelection[];
}

function normalizeTimeClockLedger(value: unknown): Array<{
  id: string; action: 'clock_in' | 'clock_out'; at: string; note: string | null;
}>|null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized =
      value
          .map((entry) => {
            if (!entry || typeof entry !== 'object') {
              return null;
            }

            const candidate = entry as {
              id?: unknown;
              action?: unknown;
              at?: unknown;
              note?: unknown;
            };

            if (typeof candidate.id !== 'string' ||
                candidate.id.trim().length === 0) {
              return null;
            }

            if (candidate.action !== 'clock_in' &&
                candidate.action !== 'clock_out') {
              return null;
            }

            if (typeof candidate.at !== 'string' ||
                Number.isNaN(Date.parse(candidate.at))) {
              return null;
            }

            return {
              id: candidate.id,
              action: candidate.action,
              at: candidate.at,
              note: typeof candidate.note === 'string' ? candidate.note : null,
            };
          })
          .filter(
              (entry):
                  entry is {
                    id: string;
                    action: 'clock_in'|'clock_out';
                    at: string;
                    note: string|null;
                  } => entry !== null)
          .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));

  if (normalized.length !== value.length) {
    return null;
  }

  return normalized;
}

function validateQuoteDraft(
    quote: QuotePayload|undefined, options: {requireAll: boolean}): string|
    null {
  const values: Array<{key: string; value: number | undefined;}> = [
    {key: 'partEstimate', value: quote?.partEstimate},
    {key: 'laborEstimate', value: quote?.laborEstimate},
    {key: 'estimatedMinutes', value: quote?.estimatedMinutes},
    {key: 'estimatedTotal', value: quote?.estimatedTotal},
  ];

  if (options.requireAll) {
    const allPresent = values.every(({value}) => Number.isFinite(value));
    if (!allPresent) {
      return 'quote partEstimate, laborEstimate, estimatedMinutes, and estimatedTotal are required numbers';
    }
  }

  for (const {key, value} of values) {
    if (value === undefined) {
      continue;
    }

    if (!Number.isFinite(value)) {
      return `quote ${key} must be a number`;
    }

    if (value < 0) {
      return `quote ${key} must be non-negative`;
    }
  }

  return null;
}

async function authorize(permission: 'jobs.read'|'jobs.create'|'jobs.update') {
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

  const hasLatitude = body.latitude !== undefined && body.latitude !== null;
  const hasLongitude = body.longitude !== undefined && body.longitude !== null;
  if (hasLatitude !== hasLongitude ||
      (hasLatitude && !isValidCoordinates(body.latitude, body.longitude))) {
    return NextResponse.json(
        {error: 'latitude and longitude must be valid coordinates'},
        {status: 400});
  }

  if (body.priority && !isJobPriority(body.priority)) {
    return NextResponse.json({error: 'Invalid priority'}, {status: 400});
  }

  const quoteValidationError =
      validateQuoteDraft(body.quote, {requireAll: true});
  if (quoteValidationError) {
    return NextResponse.json({error: quoteValidationError}, {status: 400});
  }

  const assignedTechnicianIds = normalizeStringList(
      body.assignedTechnicianIds ??
      (body.assignedTechnicianId ? [body.assignedTechnicianId] : []));
  if (assignedTechnicianIds.length === 0) {
    return NextResponse.json(
        {error: 'assignedTechnicianIds is required'}, {status: 400});
  }

  const technicians:
      Array<NonNullable<Awaited<ReturnType<typeof getTechnicianById>>>> = [];
  for (const technicianId of assignedTechnicianIds) {
    const technician = await getTechnicianById(authResult.orgId, technicianId);
    if (!technician || !technician.isActive) {
      return NextResponse.json(
          {error: `Assigned technician not found: ${technicianId}`},
          {status: 404});
    }

    technicians.push(technician);
  }

  const primaryTechnician = technicians[0];

  const estimatedMinutes = Math.trunc(body.quote!.estimatedMinutes!);
  const inventorySelections =
      normalizeInventorySelections(body.inventorySelections);
  if (!inventorySelections) {
    return NextResponse.json(
        {
          error:
              'Each inventory selection requires a SKU, location, and positive whole quantity'
        },
        {status: 400});
  }
  const selectedSkuKeys =
      inventorySelections.map((selection) => selection.sku.toLowerCase());
  if (new Set(selectedSkuKeys).size !== selectedSkuKeys.length) {
    return NextResponse.json(
        {error: 'Select only one source location per SKU'}, {status: 400});
  }
  if (inventorySelections.length > 0) {
    const inventoryDecision = await authorizePermission('inventory.reserve');
    if (inventoryDecision.state === 'unauthenticated') {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    if (inventoryDecision.state === 'forbidden') {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }
  }
  const normalizedSkus = inventorySelections.length > 0 ?
      inventorySelections.map((selection) => selection.sku) :
      normalizeSkus(body.requiredSkus);
  const inventoryParts = await listInventoryParts(authResult.orgId);
  const inventoryBalances = inventorySelections.length > 0 ?
      await listInventorySkuLocationBalances(authResult.orgId) :
      [];
  let computedPartEstimate = 0;

  for (const selection of inventorySelections) {
    const part = inventoryParts.find(
        (candidate) =>
            candidate.sku.toLowerCase() === selection.sku.toLowerCase());
    const balance = inventoryBalances.find(
        (candidate) =>
            candidate.sku.toLowerCase() === selection.sku.toLowerCase() &&
            candidate.location.toLowerCase() ===
                selection.location.toLowerCase());
    if (!part || !balance) {
      return NextResponse.json(
          {error: `${selection.sku} is not stocked at ${selection.location}`},
          {status: 400});
    }
    if (balance.available < selection.quantity) {
      return NextResponse.json(
          {
            error: `Insufficient available stock of ${selection.sku} at ${
                selection.location}`
          },
          {status: 400});
    }
    computedPartEstimate += part.estimatedUnitCost * selection.quantity;
  }
  computedPartEstimate = inventorySelections.length > 0 ?
      Number(computedPartEstimate.toFixed(2)) :
      computePartEstimateFromSkus(normalizedSkus, inventoryParts);
  const computedLaborEstimate =
      Number(technicians
                 .reduce(
                     (total, technician) => total +
                         ((estimatedMinutes / 60) * technician.hourlyRate),
                     0,
                     )
                 .toFixed(2));
  const computedEstimatedTotal =
      Number((computedPartEstimate + computedLaborEstimate).toFixed(2));

  const nextJob = await createJobRecord(authResult.orgId, {
    jobName: body.jobName?.trim() || `${customerName} - ${site}`,
    customerName,
    site,
    latitude: hasLatitude ? body.latitude! : null,
    longitude: hasLongitude ? body.longitude! : null,
    priority: body.priority ?? 'normal',
    scheduledFor: body.scheduledFor ?? null,
    requiredSkus: normalizedSkus,
    followUpNote: body.followUpNote || null,
    assignedTechnicianIds,
    assignedTechnicianName: primaryTechnician.fullName,
    laborRate: primaryTechnician.hourlyRate,
    quote: {
      partEstimate: computedPartEstimate,
      laborEstimate: computedLaborEstimate,
      estimatedMinutes,
      estimatedTotal: computedEstimatedTotal,
      notes: body.quote?.notes || null,
    },
  });

  for (const selection of inventorySelections) {
    await reserveInventoryForJob(
        authResult.orgId, selection.sku, selection.location, {
          jobId: nextJob.id,
          jobNumber: nextJob.id,
          quantity: selection.quantity,
          note: `Reserved for ${nextJob.id}`,
        });
  }

  return NextResponse.json(
      {ok: true, message: `Created ${nextJob.id}`, job: nextJob});
}

export async function GET() {
  const authResult = await authorize('jobs.read');

  if ('error' in authResult) {
    return authResult.error;
  }

  const jobs = await listJobRecords(authResult.orgId);
  return NextResponse.json({ok: true, jobs});
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

  const jobId = body.id;

  if (body.jobAction === 'reopen') {
    const authResult = await authorize('jobs.update');
    if ('error' in authResult) return authResult.error;

    const current = await getJobRecord(authResult.orgId, jobId);
    if (!current) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }
    if (current.status !== 'closed' && current.status !== 'completed') {
      return NextResponse.json(
          {error: 'Only closed jobs can be reopened'}, {status: 409});
    }

    const reopened = await reopenJobRecord(authResult.orgId, jobId);
    if (!reopened) {
      return NextResponse.json({error: 'Unable to reopen job'}, {status: 409});
    }
    return NextResponse.json({
      ok: true,
      message: `Reopened ${reopened.id}`,
      job: reopened,
    });
  }

  if (body.inventoryAction === 'reserve') {
    const authResult = await authorizeInventory('inventory.reserve');

    if ('error' in authResult) {
      return authResult.error;
    }

    const finalizedResponse =
        await rejectFinalizedJobMutation(authResult.orgId, jobId);
    if (finalizedResponse) return finalizedResponse;

    const inventorySku = body.inventorySku?.trim();
    const inventoryLocation = body.inventoryLocation?.trim();
    const reserveQuantity = body.reserveQuantity;

    if (!inventorySku || !inventoryLocation) {
      return NextResponse.json(
          {error: 'inventorySku and inventoryLocation are required'},
          {status: 400});
    }

    if (!Number.isFinite(reserveQuantity) || !reserveQuantity ||
        reserveQuantity <= 0) {
      return NextResponse.json(
          {error: 'reserveQuantity must be greater than 0'}, {status: 400});
    }

    const current = await getJobRecord(authResult.orgId, jobId);

    if (!current) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    const parts = await listInventoryParts(authResult.orgId);
    const part = parts.find(
        (entry) => entry.sku.toLowerCase() === inventorySku.toLowerCase() &&
            entry.location.toLowerCase() === inventoryLocation.toLowerCase());

    if (!part) {
      return NextResponse.json(
          {
            error:
                `No part found for SKU ${inventorySku} at ${inventoryLocation}`
          },
          {status: 404});
    }

    const skuLocationBalances =
        await listInventorySkuLocationBalances(authResult.orgId);
    const balance = skuLocationBalances.find(
        (entry) => entry.sku.toLowerCase() === part.sku.toLowerCase() &&
            entry.location.toLowerCase() === part.location.toLowerCase());
    const availableQuantity = balance ? balance.available : part.onHand;

    if (availableQuantity < reserveQuantity) {
      return NextResponse.json(
          {error: `Only ${availableQuantity} available for ${part.sku}`},
          {status: 400});
    }

    await reserveInventoryForJob(authResult.orgId, part.sku, part.location, {
      jobId,
      quantity: reserveQuantity,
      note: `Reserved for job ${jobId}`,
    });

    const nextRequiredSkus = current.requiredSkus.includes(part.sku) ?
        current.requiredSkus :
        [...current.requiredSkus, part.sku];
    const computedPartEstimate =
        computePartEstimateFromSkus(nextRequiredSkus, parts);
    const laborEstimate = current.quote?.laborEstimate ?? 0;
    const computedEstimatedTotal =
        Number((computedPartEstimate + laborEstimate).toFixed(2));

    const updated = await updateJobRecord(
        authResult.orgId,
        jobId,
        {
          requiredSkus: nextRequiredSkus,
          quote: {
            partEstimate: computedPartEstimate,
            estimatedTotal: computedEstimatedTotal,
          },
        },
    );

    if (!updated) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    return NextResponse.json({
      ok: true,
      message: `Reserved ${reserveQuantity} of ${part.sku} for ${current.id}`,
      job: updated,
    });
  }

  if (body.inventoryAction === 'create_inventory') {
    const authResult = await authorizeInventory('inventory.adjust');

    if ('error' in authResult) {
      return authResult.error;
    }

    const finalizedResponse =
        await rejectFinalizedJobMutation(authResult.orgId, jobId);
    if (finalizedResponse) return finalizedResponse;

    const inventorySku = body.inventorySku?.trim();
    const draft = body.createInventory;

    if (!inventorySku || !draft?.itemName?.trim() || !draft?.location?.trim() ||
        !draft?.supplier?.trim() || !draft?.compatibilityNote?.trim()) {
      return NextResponse.json(
          {
            error:
                'inventorySku, itemName, location, supplier, and compatibilityNote are required'
          },
          {status: 400},
      );
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
          {status: 400},
      );
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
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => entry.length > 0) :
        ['mobile', 'shop'];

    const createdPartCost = 35;
    const createdPart = await createInventoryPart(authResult.orgId, {
      sku: inventorySku,
      itemName: draft.itemName.trim(),
      estimatedUnitCost: createdPartCost,
      serviceLines,
      location: draft.location.trim(),
      onHand: draft.onHand!,
      reorderPoint: draft.reorderPoint!,
      suggestedOrderQty: draft.suggestedOrderQty!,
      supplier: draft.supplier.trim(),
      severity: draft.severity?.trim() || 'medium',
      compatibilityNote: draft.compatibilityNote.trim(),
    });

    const current = await getJobRecord(authResult.orgId, jobId);

    if (!current) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    const nextRequiredSkus = current.requiredSkus.includes(createdPart.sku) ?
        current.requiredSkus :
        [...current.requiredSkus, createdPart.sku];
    const computedPartEstimate = computePartEstimateFromSkus(nextRequiredSkus, [
      ...parts,
      {
        ...createdPart,
        estimatedUnitCost: createdPartCost,
      },
    ]);
    const laborEstimate = current.quote?.laborEstimate ?? 0;
    const computedEstimatedTotal =
        Number((computedPartEstimate + laborEstimate).toFixed(2));

    const updated = await updateJobRecord(
        authResult.orgId,
        jobId,
        {
          requiredSkus: nextRequiredSkus,
          quote: {
            partEstimate: computedPartEstimate,
            estimatedTotal: computedEstimatedTotal,
          },
        },
    );

    if (!updated) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    return NextResponse.json({
      ok: true,
      message: `Created inventory part ${createdPart.sku} for ${current.id}`,
      job: updated,
      part: createdPart,
    });
  }

  if (body.timeClockAction) {
    const authResult = await authorize('jobs.update');

    if ('error' in authResult) {
      return authResult.error;
    }

    const finalizedResponse =
        await rejectFinalizedJobMutation(authResult.orgId, jobId);
    if (finalizedResponse) return finalizedResponse;

    const current = await getJobRecord(authResult.orgId, jobId);
    if (!current) {
      return NextResponse.json({error: 'Job not found'}, {status: 404});
    }

    if (body.timeClockAction === 'clock_in') {
      const ledger = [
        ...(current.timeClock?.ledger ?? []), {
          id: crypto.randomUUID(),
          action: 'clock_in' as const,
          at: new Date().toISOString(),
          note: body.timeClockActionNote?.trim() || null,
        }
      ];

      const updated = await updateJobRecord(authResult.orgId, jobId, {
        status: current.status === 'queued' ? 'in_progress' : undefined,
        timeClock: {
          clockedInAt: new Date().toISOString(),
          ledger,
        },
      });

      if (!updated) {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }

      return NextResponse.json(
          {ok: true, message: `Clocked in ${updated.id}`, job: updated});
    }

    if (body.timeClockAction === 'clock_out') {
      const ledger = [
        ...(current.timeClock?.ledger ?? []), {
          id: crypto.randomUUID(),
          action: 'clock_out' as const,
          at: new Date().toISOString(),
          note: body.timeClockActionNote?.trim() || null,
        }
      ];

      const updated = await updateJobRecord(authResult.orgId, jobId, {
        timeClock: {
          clockedOutAt: new Date().toISOString(),
          ledger,
        },
      });

      if (!updated) {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }

      return NextResponse.json(
          {ok: true, message: `Clocked out ${updated.id}`, job: updated});
    }

    if (body.timeClockAction === 'set_notes') {
      const updated = await updateJobRecord(authResult.orgId, jobId, {
        timeClock: {
          notes: body.timeClockNotes ?? null,
        },
      });

      if (!updated) {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }

      return NextResponse.json({
        ok: true,
        message: `Updated time notes for ${updated.id}`,
        job: updated
      });
    }

    if (body.timeClockAction === 'set_time_clock') {
      if (body.timeClockClockedInAt !== undefined &&
          body.timeClockClockedInAt !== null &&
          Number.isNaN(Date.parse(body.timeClockClockedInAt))) {
        return NextResponse.json(
            {error: 'timeClockClockedInAt must be a valid date string'},
            {status: 400});
      }

      if (body.timeClockClockedOutAt !== undefined &&
          body.timeClockClockedOutAt !== null &&
          Number.isNaN(Date.parse(body.timeClockClockedOutAt))) {
        return NextResponse.json(
            {error: 'timeClockClockedOutAt must be a valid date string'},
            {status: 400});
      }

      if (body.timeClockBreakMinutes !== undefined &&
          (body.timeClockBreakMinutes === null ||
           !Number.isFinite(body.timeClockBreakMinutes) ||
           body.timeClockBreakMinutes < 0)) {
        return NextResponse.json(
            {error: 'timeClockBreakMinutes must be a non-negative number'},
            {status: 400});
      }

      let nextLedger = current.timeClock?.ledger ?? [];
      if (body.timeClockLedger !== undefined) {
        const normalizedLedger = normalizeTimeClockLedger(body.timeClockLedger);
        if (!normalizedLedger) {
          return NextResponse.json(
              {
                error:
                    'timeClockLedger entries must include id, action, and valid at date values'
              },
              {status: 400});
        }
        nextLedger = normalizedLedger;
      }

      const currentClock = current.timeClock ?? {
        clockedInAt: null,
        clockedOutAt: null,
        breakMinutes: 0,
        elapsedMinutes: 0,
        notes: null,
        ledger: [],
      };

      const lastClockIn = [...nextLedger].reverse().find(
          (entry) => entry.action === 'clock_in');
      const lastClockOut = [...nextLedger].reverse().find(
          (entry) => entry.action === 'clock_out');

      const nextClockedInAt = body.timeClockClockedInAt !== undefined ?
          body.timeClockClockedInAt :
          (body.timeClockLedger !== undefined ? (lastClockIn?.at ?? null) :
                                                currentClock.clockedInAt);
      const nextClockedOutAt = body.timeClockClockedOutAt !== undefined ?
          body.timeClockClockedOutAt :
          (body.timeClockLedger !== undefined ? (lastClockOut?.at ?? null) :
                                                currentClock.clockedOutAt);
      const nextBreakMinutes = body.timeClockBreakMinutes === undefined ?
          currentClock.breakMinutes :
          body.timeClockBreakMinutes;

      const updated = await updateJobRecord(authResult.orgId, jobId, {
        timeClock: {
          clockedInAt: nextClockedInAt,
          clockedOutAt: nextClockedOutAt,
          breakMinutes: nextBreakMinutes,
          ledger: nextLedger,
        },
      });

      if (!updated) {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }

      return NextResponse.json({
        ok: true,
        message: `Updated time clock for ${updated.id}`,
        job: updated,
      });
    }
  }

  const authResult = await authorize('jobs.update');

  if ('error' in authResult) {
    return authResult.error;
  }

  const finalizedResponse =
      await rejectFinalizedJobMutation(authResult.orgId, jobId);
  if (finalizedResponse) return finalizedResponse;

  if (body.status && !isJobStatus(body.status)) {
    return NextResponse.json({error: 'Invalid status'}, {status: 400});
  }

  if (body.status === 'completed') {
    return NextResponse.json(
        {
          error:
              'Use /api/jobs/closeout to complete a job with actual costs and final totals'
        },
        {status: 400},
    );
  }

  if (body.status === 'ready_for_payment' || body.status === 'closed') {
    return NextResponse.json(
        {error: 'Use the closeout workflow for payment and close statuses'},
        {status: 400});
  }

  if (body.priority && !isJobPriority(body.priority)) {
    return NextResponse.json({error: 'Invalid priority'}, {status: 400});
  }

  if (body.customerName !== undefined && !body.customerName.trim()) {
    return NextResponse.json(
        {error: 'customerName cannot be empty'}, {status: 400});
  }

  if (body.jobName !== undefined && !body.jobName.trim()) {
    return NextResponse.json({error: 'jobName cannot be empty'}, {status: 400});
  }

  if (body.site !== undefined && !body.site.trim()) {
    return NextResponse.json({error: 'site cannot be empty'}, {status: 400});
  }

  if (body.etaMinutes !== undefined && body.etaMinutes !== null &&
      (!Number.isFinite(body.etaMinutes) || body.etaMinutes < 0)) {
    return NextResponse.json({error: 'Invalid etaMinutes'}, {status: 400});
  }

  if (body.quote) {
    const quoteValidationError =
        validateQuoteDraft(body.quote, {requireAll: false});
    if (quoteValidationError) {
      return NextResponse.json({error: quoteValidationError}, {status: 400});
    }
  }

  let assignedTechnicianIds: string[]|undefined;
  let assignedTechnicianName: string|null|undefined;
  let laborRate: number|null|undefined;
  let computedLaborEstimate: number|undefined;
  let computedEstimatedTotal: number|undefined;
  let currentJob: Awaited<ReturnType<typeof getJobRecord>>|null|undefined;

  const loadCurrentJob = async () => {
    if (currentJob !== undefined) {
      return currentJob;
    }

    currentJob = await getJobRecord(authResult.orgId, jobId);
    return currentJob;
  };

  if (body.assignedTechnicianIds !== undefined ||
      body.assignedTechnicianId !== undefined) {
    const nextTechnicianIds = normalizeStringList(
        body.assignedTechnicianIds ??
        (body.assignedTechnicianId ? [body.assignedTechnicianId] : []));
    assignedTechnicianIds = nextTechnicianIds;

    if (nextTechnicianIds.length > 0) {
      const technicians:
          Array<NonNullable<Awaited<ReturnType<typeof getTechnicianById>>>> =
              [];

      for (const technicianId of nextTechnicianIds) {
        const technician =
            await getTechnicianById(authResult.orgId, technicianId);
        if (!technician || !technician.isActive) {
          return NextResponse.json(
              {error: `Assigned technician not found: ${technicianId}`},
              {status: 404});
        }

        technicians.push(technician);
      }

      assignedTechnicianName = technicians[0]?.fullName ?? null;
      laborRate = technicians[0]?.hourlyRate ?? null;

      const current = await loadCurrentJob();
      if (!current) {
        return NextResponse.json({error: 'Job not found'}, {status: 404});
      }

      const estimateMinutesSource = body.quote?.estimatedMinutes === undefined ?
          (current.quote?.estimatedMinutes ?? 0) :
          body.quote.estimatedMinutes;
      const partEstimateSource = body.quote?.partEstimate === undefined ?
          (current.quote?.partEstimate ?? 0) :
          body.quote.partEstimate;
      const normalizedMinutes = Math.trunc(estimateMinutesSource);

      computedLaborEstimate =
          Number(technicians
                     .reduce(
                         (total, technician) => total +
                             computeLaborEstimate(normalizedMinutes,
                                                  technician.hourlyRate),
                         0,
                         )
                     .toFixed(2));
      computedEstimatedTotal =
          Number((partEstimateSource + computedLaborEstimate).toFixed(2));
    } else {
      assignedTechnicianName = null;
      laborRate = null;
    }
  }

  const quoteUpdate = body.quote || computedLaborEstimate !== undefined ||
          computedEstimatedTotal !== undefined ?
      {
        partEstimate: body.quote?.partEstimate,
        laborEstimate: computedLaborEstimate ?? body.quote?.laborEstimate,
        estimatedMinutes: body.quote?.estimatedMinutes === undefined ?
            undefined :
            Math.trunc(body.quote.estimatedMinutes),
        estimatedTotal: computedEstimatedTotal ?? body.quote?.estimatedTotal,
        notes: body.quote?.notes === undefined ? undefined :
                                                 body.quote.notes || null,
      } :
      undefined;

  const updated = await updateJobRecord(authResult.orgId, jobId, {
    jobName: body.jobName?.trim(),
    customerName: body.customerName?.trim(),
    site: body.site?.trim(),
    latitude: body.site === undefined ? undefined : null,
    longitude: body.site === undefined ? undefined : null,
    status: body.status,
    priority: body.priority,
    etaMinutes: body.etaMinutes,
    scheduledFor: body.scheduledFor,
    followUpNote: body.followUpNote === undefined ? undefined :
                                                    body.followUpNote || null,
    assignedTechnicianIds,
    assignedTechnicianName,
    laborRate,
    quote: quoteUpdate,
  });

  if (!updated) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }

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

  const finalizedResponse =
      await rejectFinalizedJobMutation(authResult.orgId, body.id);
  if (finalizedResponse) return finalizedResponse;

  const deleted = await deleteJobRecord(authResult.orgId, body.id);

  if (!deleted) {
    return NextResponse.json({error: 'Job not found'}, {status: 404});
  }

  return NextResponse.json({ok: true, message: `Deleted ${deleted.id}`});
}
