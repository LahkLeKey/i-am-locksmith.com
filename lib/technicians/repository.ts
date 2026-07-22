import {prisma} from '@/lib/db/prisma';

export type TechnicianAvailability = 'available'|'busy'|'off_shift';

export type TechnicianRecord = {
  id: string; orgId: string; fullName: string; hourlyRate: number;
  lockpickingSkills: string[];
  availabilityStatus: TechnicianAvailability;
  availabilityNote: string | null;
  isActive: boolean;
};

export type TechnicianCreateInput = {
  fullName: string; hourlyRate: number; lockpickingSkills: string[];
  availabilityStatus: TechnicianAvailability;
  availabilityNote: string | null;
  isActive: boolean;
};

export type TechnicianUpdateInput = Partial<TechnicianCreateInput>;

type TechnicianRow = {
  id: string; orgId: string; fullName: string; hourlyRate: unknown;
  lockpickingSkills: unknown;
  availabilityStatus: string;
  availabilityNote: string | null;
  isActive: boolean;
};

type TechnicianClient = {
  technician: {
    findMany: (args: {
      where: {orgId: string};
      orderBy: Array<{isActive?: 'desc'; fullName?: 'asc'; updatedAt?: 'desc'}>;
    }) => Promise<TechnicianRow[]>;
    findFirst: (args: {where: {orgId: string; id: string}}) =>
        Promise<TechnicianRow|null>;
    create: (args: {
      data: {
        orgId: string; fullName: string; hourlyRate: number;
        lockpickingSkills: unknown;
        availabilityStatus: string;
        availabilityNote: string | null;
        isActive: boolean;
      };
    }) => Promise<TechnicianRow>;
    update: (args: {
      where: {id: string}; data: {
        fullName?: string;
        hourlyRate?: number;
        lockpickingSkills?: unknown;
        availabilityStatus?: string;
        availabilityNote?: string | null;
        isActive?: boolean;
      };
    }) => Promise<TechnicianRow>;
  };
};

function toFiniteMoney(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function asAvailability(value: string): TechnicianAvailability {
  if (value === 'available' || value === 'busy' || value === 'off_shift') {
    return value;
  }

  return 'available';
}

function toTechnicianRecord(row: TechnicianRow): TechnicianRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    fullName: row.fullName,
    hourlyRate: toFiniteMoney(row.hourlyRate),
    lockpickingSkills: toStringList(row.lockpickingSkills),
    availabilityStatus: asAvailability(row.availabilityStatus),
    availabilityNote: row.availabilityNote,
    isActive: row.isActive,
  };
}

async function getClient(): Promise<TechnicianClient> {
  return prisma as unknown as TechnicianClient;
}

export async function listTechnicians(orgId: string):
    Promise<TechnicianRecord[]> {
  const client = await getClient();
  const rows = await client.technician.findMany({
    where: {orgId},
    orderBy: [{isActive: 'desc'}, {fullName: 'asc'}, {updatedAt: 'desc'}],
  });

  return rows.map(toTechnicianRecord);
}

export async function getTechnicianById(
    orgId: string, id: string): Promise<TechnicianRecord|null> {
  const client = await getClient();
  const row = await client.technician.findFirst({where: {orgId, id}});
  return row ? toTechnicianRecord(row) : null;
}

export async function createTechnician(
    orgId: string, input: TechnicianCreateInput): Promise<TechnicianRecord> {
  const client = await getClient();
  const row = await client.technician.create({
    data: {
      orgId,
      fullName: input.fullName,
      hourlyRate: input.hourlyRate,
      lockpickingSkills: input.lockpickingSkills,
      availabilityStatus: input.availabilityStatus,
      availabilityNote: input.availabilityNote,
      isActive: input.isActive,
    },
  });

  return toTechnicianRecord(row);
}

export async function updateTechnician(
    orgId: string, id: string,
    input: TechnicianUpdateInput): Promise<TechnicianRecord|null> {
  const client = await getClient();
  const existing = await client.technician.findFirst({where: {orgId, id}});
  if (!existing) {
    return null;
  }

  const row = await client.technician.update({
    where: {id: existing.id},
    data: {
      ...(input.fullName !== undefined ? {fullName: input.fullName} : {}),
      ...(input.hourlyRate !== undefined ? {hourlyRate: input.hourlyRate} : {}),
      ...(input.lockpickingSkills !== undefined ?
              {lockpickingSkills: input.lockpickingSkills} :
              {}),
      ...(input.availabilityStatus !== undefined ?
              {availabilityStatus: input.availabilityStatus} :
              {}),
      ...(input.availabilityNote !== undefined ?
              {availabilityNote: input.availabilityNote} :
              {}),
      ...(input.isActive !== undefined ? {isActive: input.isActive} : {}),
    },
  });

  return toTechnicianRecord(row);
}
