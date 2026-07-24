import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    replenishmentRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('./ledger-repository', () => ({
  appendInventoryLedgerEntry: vi.fn(),
}));

import {prisma} from '@/lib/db/prisma';

import {appendInventoryLedgerEntry} from './ledger-repository';
import {receiveReplenishmentRequest} from './replenishment-repository';

const mockedReplenishmentRequest = vi.mocked(
    (prisma as unknown as {
      replenishmentRequest: {
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        groupBy: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
    }).replenishmentRequest);

const mockedAppendInventoryLedgerEntry = vi.mocked(appendInventoryLedgerEntry);

const OPEN_REQUEST_ROW = {
  id: 'req_1',
  orgId: 'org_1',
  sku: 'SKU-1',
  location: 'Warehouse A',
  supplier: 'Supplier A',
  requestedQuantity: 8,
  status: 'open',
  requestedByUserId: 'user_1',
  orderingNotes: null,
  createdAt: new Date('2026-07-24T01:00:00.000Z'),
  updatedAt: new Date('2026-07-24T01:00:00.000Z'),
} as const;

const RECEIVED_REQUEST_ROW = {
  ...OPEN_REQUEST_ROW,
  status: 'received',
  updatedAt: new Date('2026-07-24T01:10:00.000Z'),
} as const;

describe('replenishment repository receive flow', () => {
  beforeEach(() => {
    mockedReplenishmentRequest.create.mockReset();
    mockedReplenishmentRequest.findMany.mockReset();
    mockedReplenishmentRequest.groupBy.mockReset();
    mockedReplenishmentRequest.findFirst.mockReset();
    mockedReplenishmentRequest.update.mockReset();
    mockedAppendInventoryLedgerEntry.mockReset();

    mockedReplenishmentRequest.findFirst.mockResolvedValue(
        OPEN_REQUEST_ROW as never);
    mockedReplenishmentRequest.update.mockResolvedValue(
        RECEIVED_REQUEST_ROW as never);
    mockedAppendInventoryLedgerEntry.mockResolvedValue({
      id: 'ledger_1',
      orgId: 'org_1',
      sku: 'SKU-1',
      location: 'Warehouse A',
      delta: 8,
      kind: 'replenishment_receive',
      note: null,
      referenceId: 'req_1',
      referenceType: 'replenishment_request',
      createdAt: '2026-07-24T01:10:00.000Z',
      updatedAt: '2026-07-24T01:10:00.000Z',
    } as never);
  });

  it('writes a receipt ledger event and closes the request when fully received',
     async () => {
       const result = await receiveReplenishmentRequest('org_1', {
         requestId: 'req_1',
         receivedByUserId: 'user_2',
       });

       expect(mockedReplenishmentRequest.findFirst).toHaveBeenCalledWith({
         where: {
           id: 'req_1',
           orgId: 'org_1',
           status: 'open',
         },
       });
       expect(mockedAppendInventoryLedgerEntry).toHaveBeenCalledWith('org_1', {
         sku: 'SKU-1',
         location: 'Warehouse A',
         delta: 8,
         kind: 'replenishment_receive',
         note: 'Received replenishment request req_1 (8) by user_2',
         referenceId: 'req_1',
         referenceType: 'replenishment_request',
       });
       expect(mockedReplenishmentRequest.update).toHaveBeenCalledWith({
         where: {id: 'req_1'},
         data: {status: 'received'},
       });
       expect(result.receivedQuantity).toBe(8);
       expect(result.remainingOpenRequest).toBeNull();
     });

  it('creates a remaining open request on partial receive', async () => {
    mockedReplenishmentRequest.create.mockResolvedValue({
      ...OPEN_REQUEST_ROW,
      id: 'req_2',
      requestedQuantity: 3,
      orderingNotes: 'Remaining quantity from req_1 after receiving 5',
      createdAt: new Date('2026-07-24T01:11:00.000Z'),
      updatedAt: new Date('2026-07-24T01:11:00.000Z'),
    } as never);

    const result = await receiveReplenishmentRequest('org_1', {
      requestId: 'req_1',
      receivedQuantity: 5,
      receivedByUserId: 'user_2',
      receivingNotes: 'Dock receipt A',
    });

    expect(mockedAppendInventoryLedgerEntry).toHaveBeenCalledWith('org_1', {
      sku: 'SKU-1',
      location: 'Warehouse A',
      delta: 5,
      kind: 'replenishment_receive',
      note: 'Dock receipt A',
      referenceId: 'req_1',
      referenceType: 'replenishment_request',
    });
    expect(mockedReplenishmentRequest.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Warehouse A',
        supplier: 'Supplier A',
        requestedQuantity: 3,
        status: 'open',
        requestedByUserId: 'user_1',
        orderingNotes: 'Remaining quantity from req_1 after receiving 5',
      },
    });

    expect(result.receivedQuantity).toBe(5);
    expect(result.remainingOpenRequest?.id).toBe('req_2');
    expect(result.remainingOpenRequest?.requestedQuantity).toBe(3);
  });

  it('rejects receive quantity above requested', async () => {
    await expect(
        receiveReplenishmentRequest('org_1', {
          requestId: 'req_1',
          receivedByUserId: 'user_2',
          receivedQuantity: 9,
        }),
    )
        .rejects.toMatchObject({code: 'INVALID_RECEIVE_QUANTITY'});

    expect(mockedAppendInventoryLedgerEntry).not.toHaveBeenCalled();
    expect(mockedReplenishmentRequest.update).not.toHaveBeenCalled();
  });

  it('rejects missing open request', async () => {
    mockedReplenishmentRequest.findFirst.mockResolvedValueOnce(null);

    await expect(
        receiveReplenishmentRequest('org_1', {
          requestId: 'req_missing',
          receivedByUserId: 'user_2',
          receivedQuantity: 2,
        }),
    )
        .rejects.toMatchObject({code: 'REPLENISHMENT_REQUEST_NOT_FOUND'});
  });
});
