import {prisma} from '@/lib/db/prisma';

export type ReplenishmentRequestRecord = {
  id: string;
  orgId: string;
  sku: string;
  location: string;
  supplier: string;
  requestedQuantity: number;
  status: 'open'|'received'|'cancelled';
  requestedByUserId: string;
  orderingNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReplenishmentRequestInput = {
  sku: string;
  location: string;
  supplier: string;
  requestedQuantity: number;
  requestedByUserId: string;
  orderingNotes?: string | null;
};

export type IncomingQuantityRow = {
  sku: string;
  location: string;
  incomingQuantity: number;
};

type ReplenishmentRequestClient = {
  replenishmentRequest: {
    create: (args: {
      data: ReplenishmentRequestInput&{orgId: string; status: 'open'};
    }) => Promise<ReplenishmentRequestRow>;
    findMany: (args: {
      where: {orgId: string; status?: 'open'|'received'|'cancelled'};
      orderBy: Array<{createdAt: 'asc'|'desc'}>;
    }) => Promise<ReplenishmentRequestRow[]>;
    groupBy: (args: {
      by: ['sku', 'location'];
      where: {orgId: string; status: 'open'};
      _sum: {requestedQuantity: true};
    }) => Promise<Array<{
      sku: string;
      location: string;
      _sum: {requestedQuantity: number | null};
    }>>;
  };
};

type ReplenishmentRequestRow =
    Omit<ReplenishmentRequestRecord, 'createdAt'|'updatedAt'|'requestedQuantity'>&{
  requestedQuantity: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRecord(row: ReplenishmentRequestRow): ReplenishmentRequestRecord {
  const status = row.status === 'received' || row.status === 'cancelled' ?
      row.status :
      'open';

  return {
    id: row.id,
    orgId: row.orgId,
    sku: row.sku,
    location: row.location,
    supplier: row.supplier,
    requestedQuantity: toFiniteNumber(row.requestedQuantity),
    status,
    requestedByUserId: row.requestedByUserId,
    orderingNotes: row.orderingNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getClient(): Promise<ReplenishmentRequestClient> {
  return prisma as unknown as ReplenishmentRequestClient;
}

export async function createReplenishmentRequest(
    orgId: string,
    input: ReplenishmentRequestInput): Promise<ReplenishmentRequestRecord> {
  const client = await getClient();

  const row = await client.replenishmentRequest.create({
    data: {
      ...input,
      orderingNotes: input.orderingNotes ?? null,
      orgId,
      status: 'open',
    },
  });

  return toRecord(row);
}

export async function listOpenReplenishmentRequests(orgId: string):
    Promise<ReplenishmentRequestRecord[]> {
  const client = await getClient();
  const rows = await client.replenishmentRequest.findMany({
    where: {orgId, status: 'open'},
    orderBy: [{createdAt: 'desc'}],
  });

  return rows.map((row) => toRecord(row));
}

export async function listIncomingQuantitiesBySkuLocation(orgId: string):
    Promise<IncomingQuantityRow[]> {
  const client = await getClient();
  const grouped = await client.replenishmentRequest.groupBy({
    by: ['sku', 'location'],
    where: {orgId, status: 'open'},
    _sum: {requestedQuantity: true},
  });

  return grouped.map((row) => ({
                       sku: row.sku,
                       location: row.location,
                       incomingQuantity: toFiniteNumber(row._sum.requestedQuantity),
                     }));
}
