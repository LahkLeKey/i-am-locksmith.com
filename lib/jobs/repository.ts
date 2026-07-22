import type {JobQueueItem, JobQueuePriority, JobQueueStatus} from '@/lib/dashboard/types';
import {prisma} from '@/lib/db/prisma';

export type JobRecordInput = {
  customerName: string; site: string; priority: JobQueuePriority;
  scheduledFor: string | null;
  requiredSkus: string[];
  followUpNote: string | null;
  quote: {
    partEstimate: number; laborEstimate: number; estimatedMinutes: number;
    estimatedTotal: number;
    notes: string | null;
  };
};

export type JobRecordUpdate = {
  customerName?: string;
  site?: string;
  status?: JobQueueStatus;
  priority?: JobQueuePriority;
  etaMinutes?: number | null;
  scheduledFor?: string | null;
  followUpNote?: string | null;
  requiredSkus?: string[];
  quote?: {
    partEstimate?: number;
    laborEstimate?: number;
    estimatedMinutes?: number;
    estimatedTotal?: number;
    notes?: string | null;
  };
};

export type JobCloseoutInput = {
  actualPartCost: number; actualLaborCost: number; actualMinutes: number;
  finalTotal: number;
  resolutionNotes: string | null;
};

type JobRecordRow = {
  id: string; jobNumber: string; orgId: string; customerName: string;
  site: string;
  priority: string;
  status: string;
  scheduledFor: Date | null;
  etaMinutes: number | null;
  requiredSkus: unknown;
  followUpNote: string | null;
  partEstimate: unknown;
  laborEstimate: unknown;
  estimatedMinutes: number;
  estimatedTotal: unknown;
  quoteNotes: string | null;
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
        jobNumber: string; orgId: string; customerName: string; site: string;
        priority: string;
        status: string;
        scheduledFor: Date | null;
        etaMinutes: number | null;
        requiredSkus: unknown;
        followUpNote: string | null;
        partEstimate: number;
        laborEstimate: number;
        estimatedMinutes: number;
        estimatedTotal: number;
        quoteNotes: string | null;
      };
    }) => Promise<JobRecordRow>;
    update: (args: {where: {id: string}; data: Record<string, unknown>;}) =>
        Promise<JobRecordRow>;
    delete: (args: {where: {id: string}}) => Promise<JobRecordRow>;
  };
};

function asStatus(value: string): JobQueueStatus {
  if (value === 'queued' || value === 'scheduled' || value === 'in_progress' ||
      value === 'blocked' || value === 'completed') {
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

function toJobQueueItem(row: JobRecordRow): JobQueueItem {
  return {
    id: row.jobNumber,
    customerName: row.customerName,
    site: row.site,
    priority: asPriority(row.priority),
    status: asStatus(row.status),
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    etaMinutes: row.etaMinutes,
    requiredSkus: toRequiredSkus(row.requiredSkus),
    followUpNote: row.followUpNote,
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
      orgId,
      customerName: input.customerName,
      site: input.site,
      priority: input.priority,
      status: 'queued',
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      etaMinutes: null,
      requiredSkus: input.requiredSkus,
      followUpNote: input.followUpNote,
      partEstimate: input.quote.partEstimate,
      laborEstimate: input.quote.laborEstimate,
      estimatedMinutes: input.quote.estimatedMinutes,
      estimatedTotal: input.quote.estimatedTotal,
      quoteNotes: input.quote.notes,
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
  if (!existing) {
    return null;
  }

  const row = await client.jobRecord.update({
    where: {id: existing.id},
    data: {
      ...(input.customerName !== undefined ?
              {customerName: input.customerName} :
              {}),
      ...(input.site !== undefined ? {site: input.site} : {}),
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
  if (!existing) {
    return null;
  }

  const row = await client.jobRecord.update({
    where: {id: existing.id},
    data: {
      status: 'completed',
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
