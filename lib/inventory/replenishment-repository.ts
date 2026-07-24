import {prisma} from '@/lib/db/prisma';

import {appendInventoryLedgerEntry} from './ledger-repository';

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

export type ReceiveReplenishmentRequestInput = {
  requestId: string;
  receivedQuantity?: number;
  receivedByUserId: string;
  receivingNotes?: string | null;
};

export type ReceiveReplenishmentRequestResult = {
  receivedRequest: ReplenishmentRequestRecord;
  remainingOpenRequest: ReplenishmentRequestRecord | null;
  receivedQuantity: number;
};

export type ReceiveReplenishmentRequestErrorCode =
    'REPLENISHMENT_REQUEST_NOT_FOUND'|'INVALID_RECEIVE_QUANTITY';

export type ReceiveReplenishmentRequestError = Error&{
  code: ReceiveReplenishmentRequestErrorCode;
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
    findFirst: (args: {
      where: {id: string; orgId: string; status: 'open'};
    }) => Promise<ReplenishmentRequestRow | null>;
    update: (args: {
      where: {id: string};
      data: {status: 'received'};
    }) => Promise<ReplenishmentRequestRow>;
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

function buildReceiveError(
    code: ReceiveReplenishmentRequestErrorCode,
    message: string): ReceiveReplenishmentRequestError {
  const error = new Error(message) as ReceiveReplenishmentRequestError;
  error.code = code;
  return error;
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

export async function receiveReplenishmentRequest(
    orgId: string,
    input: ReceiveReplenishmentRequestInput):
    Promise<ReceiveReplenishmentRequestResult> {
  const client = await getClient();
  const request = await client.replenishmentRequest.findFirst({
    where: {
      id: input.requestId,
      orgId,
      status: 'open',
    },
  });

  if (!request) {
    throw buildReceiveError(
        'REPLENISHMENT_REQUEST_NOT_FOUND',
        'Replenishment request not found or no longer open');
  }

  const quantityToReceive =
      input.receivedQuantity ?? toFiniteNumber(request.requestedQuantity);

  if (!Number.isInteger(quantityToReceive) || quantityToReceive <= 0) {
    throw buildReceiveError(
        'INVALID_RECEIVE_QUANTITY',
        'receivedQuantity must be a whole number greater than 0');
  }

  const requestedQuantity = toFiniteNumber(request.requestedQuantity);
  if (quantityToReceive > requestedQuantity) {
    throw buildReceiveError(
        'INVALID_RECEIVE_QUANTITY',
        `receivedQuantity (${quantityToReceive}) cannot exceed requested quantity (${requestedQuantity})`);
  }

  await appendInventoryLedgerEntry(orgId, {
    sku: request.sku,
    location: request.location,
    delta: quantityToReceive,
    kind: 'replenishment_receive',
    note: input.receivingNotes?.trim() ||
        `Received replenishment request ${request.id} (${quantityToReceive}) by ${input.receivedByUserId}`,
    referenceId: request.id,
    referenceType: 'replenishment_request',
  });

  const receivedRow = await client.replenishmentRequest.update({
    where: {id: request.id},
    data: {status: 'received'},
  });

  const remainingQuantity = requestedQuantity - quantityToReceive;
  let remainingOpenRequest: ReplenishmentRequestRecord | null = null;

  if (remainingQuantity > 0) {
    const remainingRow = await client.replenishmentRequest.create({
      data: {
        orgId,
        sku: request.sku,
        location: request.location,
        supplier: request.supplier,
        requestedQuantity: remainingQuantity,
        status: 'open',
        requestedByUserId: request.requestedByUserId,
        orderingNotes:
            `Remaining quantity from ${request.id} after receiving ${quantityToReceive}`,
      },
    });
    remainingOpenRequest = toRecord(remainingRow);
  }

  return {
    receivedRequest: toRecord(receivedRow),
    remainingOpenRequest,
    receivedQuantity: quantityToReceive,
  };
}
