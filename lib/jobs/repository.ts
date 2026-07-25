import type {JobQueueItem, JobQueuePriority, JobQueueStatus, TimeClockLedgerEntry,} from '@/lib/dashboard/types';
import {prisma} from '@/lib/db/prisma';

export type JobRecordInput = {
  customerId: string|null; serviceSiteId: string | null; jobName: string;
  customerName: string;
  site: string;
  latitude: number | null;
  longitude: number | null;
  priority: JobQueuePriority;
  scheduledFor: string | null;
  requiredSkus: string[];
  followUpNote: string | null;
  assignedTechnicianIds: string[];
  assignedTechnicianName: string | null;
  laborRate: number | null;
  quote: {
    partEstimate: number; laborEstimate: number; estimatedMinutes: number;
    estimatedTotal: number;
    notes: string | null;
  };
};

export type JobRecordUpdate = {
  jobName?: string;
  customerName?: string;
  site?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: JobQueueStatus;
  priority?: JobQueuePriority;
  etaMinutes?: number | null;
  scheduledFor?: string | null;
  followUpNote?: string | null;
  requiredSkus?: string[];
  assignedTechnicianIds?: string[];
  assignedTechnicianName?: string | null;
  laborRate?: number | null;
  quote?: {
    partEstimate?: number;
    laborEstimate?: number;
    estimatedMinutes?: number;
    estimatedTotal?: number;
    notes?: string | null;
  };
  timeClock?: {
    clockedInAt?: string | null;
    clockedOutAt?: string | null;
    breakMinutes?: number;
    notes?: string | null;
    ledger?: TimeClockLedgerEntry[];
  };
};

export type JobCloseoutInput = {
  actualPartCost: number; actualLaborCost: number; actualMinutes: number;
  finalTotal: number;
  resolutionNotes: string | null;
};

type JobRecordRow = {
  id: string; jobNumber: string; jobName: string; orgId: string;
  customerName: string;
  site: string;
  latitude: unknown;
  longitude: unknown;
  priority: string;
  status: string;
  scheduledFor: Date | null;
  etaMinutes: number | null;
  requiredSkus: unknown;
  followUpNote: string | null;
  assignedTechnicianIds: unknown;
  assignedTechnicianName: string | null;
  laborRate: unknown;
  partEstimate: unknown;
  laborEstimate: unknown;
  estimatedMinutes: number;
  estimatedTotal: unknown;
  quoteNotes: string | null;
  clockedInAt: Date | null;
  clockedOutAt: Date | null;
  breakMinutes: number;
  timeClockNotes: string | null;
  timeClockLedger: unknown;
  actualPartCost: unknown;
  actualLaborCost: unknown;
  actualMinutes: number | null;
  finalTotal: unknown;
  closedOutAt: Date | null;
  closeoutNotes: string | null;
};

type JobRecordClient = {
  jobRecord: {
    findMany: (args: {
      where: {orgId: string};
      orderBy: Array<{updatedAt?: 'desc'; createdAt?: 'desc'}>;
    }) => Promise<JobRecordRow[]>;
    findFirst: (args: {where: {orgId: string; jobNumber: string};}) =>
        Promise<JobRecordRow|null>;
    create: (args: {
      data: {
        jobNumber: string; jobName: string; orgId: string; customerName: string;
        customerId: string | null;
        serviceSiteId: string | null;
        site: string;
        latitude: number | null;
        longitude: number | null;
        priority: string;
        status: string;
        scheduledFor: Date | null;
        etaMinutes: number | null;
        requiredSkus: unknown;
        followUpNote: string | null;
        assignedTechnicianIds: unknown;
        assignedTechnicianName: string | null;
        laborRate: number | null;
        partEstimate: number;
        laborEstimate: number;
        estimatedMinutes: number;
        estimatedTotal: number;
        quoteNotes: string | null;
        clockedInAt: Date | null;
        clockedOutAt: Date | null;
        breakMinutes: number;
        timeClockNotes: string | null;
        timeClockLedger: unknown;
      };
    }) => Promise<JobRecordRow>;
    update: (args: {where: {id: string}; data: Record<string, unknown>;}) =>
        Promise<JobRecordRow>;
    delete: (args: {where: {id: string}}) => Promise<JobRecordRow>;
  };
};

function asStatus(value: string): JobQueueStatus {
  if (value === 'queued' || value === 'scheduled' || value === 'in_progress' ||
      value === 'blocked' || value === 'ready_for_payment' ||
      value === 'closed' || value === 'completed') {
    return value;
  }

  return 'queued';
}

function asPriority(value: string): JobQueuePriority {
  if (value === 'low' || value === 'normal' || value === 'high' ||
      value === 'urgent') {
    return value;
  }

  return 'normal';
}

function toFiniteMoney(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRequiredSkus(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
}

function toLedgerEntries(value: unknown): TimeClockLedgerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
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

        if ((candidate.action !== 'clock_in' &&
             candidate.action !== 'clock_out') ||
            typeof candidate.id !== 'string' ||
            typeof candidate.at !== 'string') {
          return null;
        }

        return {
          id: candidate.id,
          action: candidate.action,
          at: candidate.at,
          note: typeof candidate.note === 'string' ? candidate.note : null,
        } satisfies TimeClockLedgerEntry;
      })
      .filter((entry): entry is TimeClockLedgerEntry => entry !== null)
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
}

function computeElapsedMinutes(
    entries: TimeClockLedgerEntry[], breakMinutes: number): number {
  let openClockInAt: number|null = null;
  let totalMs = 0;

  for (const entry of entries) {
    const at = Date.parse(entry.at);
    if (!Number.isFinite(at)) {
      continue;
    }

    if (entry.action === 'clock_in') {
      openClockInAt = at;
      continue;
    }

    if (entry.action === 'clock_out' && openClockInAt !== null) {
      totalMs += Math.max(0, at - openClockInAt);
      openClockInAt = null;
    }
  }

  if (openClockInAt !== null) {
    totalMs += Math.max(0, Date.now() - openClockInAt);
  }

  const totalMinutes = Math.floor(totalMs / 60000);
  return Math.max(0, totalMinutes - breakMinutes);
}

function toJobQueueItem(row: JobRecordRow): JobQueueItem {
  const ledger = toLedgerEntries(row.timeClockLedger);
  const lastClockIn =
      [...ledger].reverse().find((entry) => entry.action === 'clock_in');
  const lastClockOut =
      [...ledger].reverse().find((entry) => entry.action === 'clock_out');

  return {
    id: row.jobNumber,
    jobName: row.jobName,
    customerName: row.customerName,
    site: row.site,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    priority: asPriority(row.priority),
    status: asStatus(row.status),
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    etaMinutes: row.etaMinutes,
    requiredSkus: toRequiredSkus(row.requiredSkus),
    followUpNote: row.followUpNote,
    assignedTechnician: toStringList(row.assignedTechnicianIds).length > 0 &&
            row.assignedTechnicianName ?
        {
          id: toStringList(row.assignedTechnicianIds)[0],
          fullName: row.assignedTechnicianName,
          laborRate: toFiniteMoney(row.laborRate),
        } :
        null,
    quote: {
      partEstimate: toFiniteMoney(row.partEstimate),
      laborEstimate: toFiniteMoney(row.laborEstimate),
      estimatedMinutes: row.estimatedMinutes,
      estimatedTotal: toFiniteMoney(row.estimatedTotal),
      notes: row.quoteNotes,
    },
    closeout: {
      actualPartCost: row.actualPartCost === null ?
          null :
          toFiniteMoney(row.actualPartCost),
      actualLaborCost: row.actualLaborCost === null ?
          null :
          toFiniteMoney(row.actualLaborCost),
      actualMinutes: row.actualMinutes,
      finalTotal: row.finalTotal === null ? null :
                                            toFiniteMoney(row.finalTotal),
      closedOutAt: row.closedOutAt ? row.closedOutAt.toISOString() : null,
      resolutionNotes: row.closeoutNotes,
    },
    timeClock: {
      clockedInAt: lastClockIn?.at ??
          (row.clockedInAt ? row.clockedInAt.toISOString() : null),
      clockedOutAt: lastClockOut?.at ??
          (row.clockedOutAt ? row.clockedOutAt.toISOString() : null),
      breakMinutes: row.breakMinutes,
      elapsedMinutes: computeElapsedMinutes(ledger, row.breakMinutes),
      notes: row.timeClockNotes,
      ledger,
    },
  };
}

async function getClient(): Promise<JobRecordClient> {
  return prisma as unknown as JobRecordClient;
}

function buildJobNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix =
      Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `JOB-${timestamp}${randomSuffix}`;
}

export async function getJobRecord(
    orgId: string, jobNumber: string): Promise<JobQueueItem|null> {
  const client = await getClient();
  const row = await client.jobRecord.findFirst({where: {orgId, jobNumber}});
  return row ? toJobQueueItem(row) : null;
}

export async function listJobRecords(orgId: string): Promise<JobQueueItem[]> {
  const client = await getClient();
  const rows = await client.jobRecord.findMany({
    where: {orgId},
    orderBy: [{updatedAt: 'desc'}, {createdAt: 'desc'}],
  });

  return rows.map(toJobQueueItem);
}

export async function createJobRecord(
    orgId: string, input: JobRecordInput): Promise<JobQueueItem> {
  const client = await getClient();
  const row = await client.jobRecord.create({
    data: {
      jobNumber: buildJobNumber(),
      customerId: input.customerId,
      serviceSiteId: input.serviceSiteId,
      jobName: input.jobName,
      orgId,
      customerName: input.customerName,
      site: input.site,
      latitude: input.latitude,
      longitude: input.longitude,
      priority: input.priority,
      status: 'queued',
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      etaMinutes: null,
      requiredSkus: input.requiredSkus,
      followUpNote: input.followUpNote,
      assignedTechnicianIds: input.assignedTechnicianIds,
      assignedTechnicianName: input.assignedTechnicianName,
      laborRate: input.laborRate,
      partEstimate: input.quote.partEstimate,
      laborEstimate: input.quote.laborEstimate,
      estimatedMinutes: input.quote.estimatedMinutes,
      estimatedTotal: input.quote.estimatedTotal,
      quoteNotes: input.quote.notes,
      clockedInAt: null,
      clockedOutAt: null,
      breakMinutes: 0,
      timeClockNotes: null,
      timeClockLedger: [],
    },
  });

  return toJobQueueItem(row);
}

export async function updateJobRecord(
    orgId: string, jobNumber: string,
    input: JobRecordUpdate): Promise<JobQueueItem|null> {
  const client = await getClient();
  const existing =
      await client.jobRecord.findFirst({where: {orgId, jobNumber}});
  if (!existing || existing.status === 'closed' ||
      existing.status === 'completed') {
    return null;
  }

  const row = await client.jobRecord.update({
    where: {id: existing.id},
    data: {
      ...(input.jobName !== undefined ? {jobName: input.jobName} : {}),
      ...(input.customerName !== undefined ?
              {customerName: input.customerName} :
              {}),
      ...(input.site !== undefined ? {site: input.site} : {}),
      ...(input.latitude !== undefined ? {latitude: input.latitude} : {}),
      ...(input.longitude !== undefined ? {longitude: input.longitude} : {}),
      ...(input.status !== undefined ? {status: input.status} : {}),
      ...(input.priority !== undefined ? {priority: input.priority} : {}),
      ...(input.etaMinutes !== undefined ? {etaMinutes: input.etaMinutes} : {}),
      ...(input.scheduledFor !== undefined ? {
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null
      } :
                                             {}),
      ...(input.followUpNote !== undefined ?
              {followUpNote: input.followUpNote} :
              {}),
      ...(input.assignedTechnicianIds !== undefined ?
              {assignedTechnicianIds: input.assignedTechnicianIds} :
              {}),
      ...(input.assignedTechnicianName !== undefined ?
              {assignedTechnicianName: input.assignedTechnicianName} :
              {}),
      ...(input.laborRate !== undefined ? {laborRate: input.laborRate} : {}),
      ...(input.requiredSkus !== undefined ?
              {requiredSkus: input.requiredSkus} :
              {}),
      ...(input.quote?.partEstimate !== undefined ?
              {partEstimate: input.quote.partEstimate} :
              {}),
      ...(input.quote?.laborEstimate !== undefined ?
              {laborEstimate: input.quote.laborEstimate} :
              {}),
      ...(input.quote?.estimatedMinutes !== undefined ?
              {estimatedMinutes: input.quote.estimatedMinutes} :
              {}),
      ...(input.quote?.estimatedTotal !== undefined ?
              {estimatedTotal: input.quote.estimatedTotal} :
              {}),
      ...(input.quote?.notes !== undefined ? {quoteNotes: input.quote.notes} :
                                             {}),
      ...(input.timeClock?.clockedInAt !== undefined ? {
        clockedInAt: input.timeClock.clockedInAt ?
            new Date(input.timeClock.clockedInAt) :
            null
      } :
                                                       {}),
      ...(input.timeClock?.clockedOutAt !== undefined ? {
        clockedOutAt: input.timeClock.clockedOutAt ?
            new Date(input.timeClock.clockedOutAt) :
            null
      } :
                                                        {}),
      ...(input.timeClock?.breakMinutes !== undefined ?
              {breakMinutes: input.timeClock.breakMinutes} :
              {}),
      ...(input.timeClock?.notes !== undefined ?
              {timeClockNotes: input.timeClock.notes} :
              {}),
      ...(input.timeClock?.ledger !== undefined ?
              {timeClockLedger: input.timeClock.ledger} :
              {}),
    },
  });

  return toJobQueueItem(row);
}

export async function closeOutJobRecord(
    orgId: string, jobNumber: string,
    input: JobCloseoutInput): Promise<JobQueueItem|null> {
  const client = await getClient();
  const existing =
      await client.jobRecord.findFirst({where: {orgId, jobNumber}});
  if (!existing || existing.status === 'closed' ||
      existing.status === 'completed') {
    return null;
  }

  const row = await client.jobRecord.update({
    where: {id: existing.id},
    data: {
      status: 'closed',
      actualPartCost: input.actualPartCost,
      actualLaborCost: input.actualLaborCost,
      actualMinutes: input.actualMinutes,
      finalTotal: input.finalTotal,
      closedOutAt: new Date(),
      closeoutNotes: input.resolutionNotes,
    },
  });

  return toJobQueueItem(row);
}

export async function reopenJobRecord(
    orgId: string, jobNumber: string): Promise<JobQueueItem|null> {
  const client = await getClient();
  const existing =
      await client.jobRecord.findFirst({where: {orgId, jobNumber}});
  if (!existing ||
      (existing.status !== 'closed' && existing.status !== 'completed')) {
    return null;
  }

  const row = await client.jobRecord.update({
    where: {id: existing.id},
    data: {
      status: 'in_progress',
      actualPartCost: null,
      actualLaborCost: null,
      actualMinutes: null,
      finalTotal: null,
      closedOutAt: null,
      closeoutNotes: null,
    },
  });

  return toJobQueueItem(row);
}

export async function deleteJobRecord(
    orgId: string, jobNumber: string): Promise<JobQueueItem|null> {
  const client = await getClient();
  const existing =
      await client.jobRecord.findFirst({where: {orgId, jobNumber}});
  if (!existing) {
    return null;
  }

  const row = await client.jobRecord.delete({where: {id: existing.id}});
  return toJobQueueItem(row);
}
