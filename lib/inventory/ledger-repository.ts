import {prisma} from '@/lib/db/prisma';

export type InventoryLedgerEntryRecord = {
  id: string; orgId: string; sku: string; location: string; delta: number;
  kind: string;
  note: string | null;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryLedgerEntryInput = {
  sku: string; location: string; delta: number; kind: string;
  note?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
};

export type InventorySkuLocationBalance = {
  orgId: string; sku: string; location: string; onHand: number;
  entryCount: number;
  reserved: number;
  available: number;
  lastUpdatedAt: string;
};

export type InventoryLedgerReservationInput = {
  jobId: string;
  jobNumber?: string | null; quantity: number;
  note?: string | null;
};

type InventoryLedgerEntryClient = {
  inventoryLedgerEntry: {
    create: (args: {data: InventoryLedgerEntryInput&{orgId: string};}) =>
        Promise<InventoryLedgerEntryRow>;
    findMany: (args: {
      where: {orgId: string; sku?: string; location?: string};
      orderBy: Array<{createdAt: 'asc' | 'desc'}>;
    }) => Promise<InventoryLedgerEntryRow[]>;
    groupBy: (args: {
      by: ['sku', 'location']; where: {
        orgId: string;
        kind?: string |
            {
              in ?: string[];
              notIn?: string[]
            }
      };
      _sum: {delta: true};
      _count: {id: true};
      _max: {updatedAt: true};
    }) => Promise<InventoryLedgerAggregationRow[]>;
  };
};

type InventoryLedgerEntryRow =
    Omit<InventoryLedgerEntryRecord, 'createdAt'|'updatedAt'>&{
  createdAt: Date;
  updatedAt: Date;
  delta: unknown;
};

type InventoryLedgerAggregationRow = {
  sku: string; location: string; _sum: {delta: number | null};
  _count: {id: number};
  _max: {updatedAt: Date | null};
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInventoryLedgerEntryRecord(row: InventoryLedgerEntryRow):
    InventoryLedgerEntryRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    sku: row.sku,
    location: row.location,
    delta: toFiniteNumber(row.delta),
    kind: row.kind,
    note: row.note,
    referenceId: row.referenceId,
    referenceType: row.referenceType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toInventorySkuLocationBalance(
    orgId: string, row: InventoryLedgerAggregationRow,
    reserved = 0): InventorySkuLocationBalance {
  const onHand = toFiniteNumber(row._sum.delta);
  return {
    orgId,
    sku: row.sku,
    location: row.location,
    onHand,
    entryCount: toFiniteNumber(row._count.id),
    reserved,
    available: onHand - reserved,
    lastUpdatedAt: (row._max.updatedAt ?? new Date(0)).toISOString(),
  };
}

function toReservationKey(row: {sku: string; location: string}): string {
  return `${row.sku}::${row.location}`;
}

async function getClient(): Promise<InventoryLedgerEntryClient> {
  return prisma as unknown as InventoryLedgerEntryClient;
}

export async function appendInventoryLedgerEntry(
    orgId: string,
    data: InventoryLedgerEntryInput): Promise<InventoryLedgerEntryRecord> {
  const client = await getClient();

  const row = await client.inventoryLedgerEntry.create({
    data: {
      ...data,
      note: data.note ?? null,
      referenceId: data.referenceId ?? null,
      referenceType: data.referenceType ?? null,
      orgId,
    },
  });

  return toInventoryLedgerEntryRecord(row);
}

export async function listInventoryLedgerEntries(
    orgId: string, filters: {sku?: string; location?: string} = {}):
    Promise<InventoryLedgerEntryRecord[]> {
  const client = await getClient();

  const rows = await client.inventoryLedgerEntry.findMany({
    where: {
      orgId,
      sku: filters.sku,
      location: filters.location,
    },
    orderBy: [{createdAt: 'asc'}],
  });

  return rows.map((row) => toInventoryLedgerEntryRecord(row));
}

export async function listInventorySkuLocationBalances(orgId: string):
    Promise<InventorySkuLocationBalance[]> {
  const client = await getClient();
  const [onHandRows, reservedRows] = await Promise.all([
    client.inventoryLedgerEntry.groupBy({
      by: ['sku', 'location'],
      where: {
        orgId,
        kind: {notIn: ['reservation', 'reservation_release']},
      },
      _sum: {delta: true},
      _count: {id: true},
      _max: {updatedAt: true},
    }),
    client.inventoryLedgerEntry.groupBy({
      by: ['sku', 'location'],
      where: {
        orgId,
        kind: {in : ['reservation', 'reservation_release']},
      },
      _sum: {delta: true},
      _count: {id: true},
      _max: {updatedAt: true},
    }),
  ]);

  const reservedByLocation = new Map(reservedRows.map(
      (row) =>
          [toReservationKey(row), Math.abs(toFiniteNumber(row._sum.delta))]));

  return onHandRows.map(
      (row) => toInventorySkuLocationBalance(
          orgId, row, reservedByLocation.get(toReservationKey(row)) ?? 0));
}

export async function recordInventoryOpeningBalance(
    orgId: string, sku: string, location: string, quantity: number,
    note?: string|null): Promise<InventoryLedgerEntryRecord> {
  return appendInventoryLedgerEntry(orgId, {
    sku,
    location,
    delta: quantity,
    kind: 'opening_balance',
    note: note ?? null,
  });
}

export async function reserveInventoryForJob(
    orgId: string, sku: string, location: string,
    reservation: InventoryLedgerReservationInput):
    Promise<InventoryLedgerEntryRecord> {
  return appendInventoryLedgerEntry(orgId, {
    sku,
    location,
    delta: Math.abs(reservation.quantity),
    kind: 'reservation',
    note: reservation.note ?? null,
    referenceId: reservation.jobId,
    referenceType: 'job',
  });
}

export async function releaseInventoryReservationForJob(
    orgId: string, sku: string, location: string,
    reservation: InventoryLedgerReservationInput):
    Promise<InventoryLedgerEntryRecord> {
  return appendInventoryLedgerEntry(orgId, {
    sku,
    location,
    delta: -Math.abs(reservation.quantity),
    kind: 'reservation_release',
    note: reservation.note ?? null,
    referenceId: reservation.jobId,
    referenceType: 'job',
  });
}

export async function listInventoryLedgerTimeline(
    orgId: string, sku: string,
    location: string): Promise<InventoryLedgerEntryRecord[]> {
  return listInventoryLedgerEntries(orgId, {sku, location});
}