import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('./ledger-repository', () => ({
  appendInventoryLedgerEntry: vi.fn(),
  listInventoryLedgerEntries: vi.fn(),
  listInventorySkuLocationBalances: vi.fn(),
}));

import {
  appendInventoryLedgerEntry,
  listInventoryLedgerEntries,
  listInventorySkuLocationBalances,
} from './ledger-repository';

import {
  listInventoryExceptions,
  reconcileInventoryException,
} from './exceptions-repository';

const mockedAppendInventoryLedgerEntry = vi.mocked(appendInventoryLedgerEntry);
const mockedListInventoryLedgerEntries = vi.mocked(listInventoryLedgerEntries);
const mockedListInventorySkuLocationBalances = vi.mocked(
    listInventorySkuLocationBalances);

describe('inventory exceptions repository', () => {
  beforeEach(() => {
    mockedAppendInventoryLedgerEntry.mockReset();
    mockedListInventoryLedgerEntries.mockReset();
    mockedListInventorySkuLocationBalances.mockReset();
  });

  it('surfaces negative availability exceptions with attribution context',
     async () => {
       mockedListInventorySkuLocationBalances.mockResolvedValue([
         {
           orgId: 'org_1',
           sku: 'SKU-NEG',
           location: 'Warehouse A',
           onHand: 1,
           reserved: 3,
           available: -2,
           entryCount: 4,
           lastUpdatedAt: '2026-07-24T01:00:00.000Z',
         },
       ] as never);

       mockedListInventoryLedgerEntries.mockResolvedValue([
         {
           id: 'entry_4',
           orgId: 'org_1',
           sku: 'SKU-NEG',
           location: 'Warehouse A',
           delta: 3,
           kind: 'reservation',
           note: 'Reserved for job JOB-7 by user_7',
           referenceId: 'JOB-7',
           referenceType: 'job',
           createdAt: '2026-07-24T01:00:00.000Z',
           updatedAt: '2026-07-24T01:00:00.000Z',
         },
       ] as never);

       const exceptions = await listInventoryExceptions('org_1');

       expect(exceptions).toEqual([
         {
           id: 'SKU-NEG::Warehouse A',
           sku: 'SKU-NEG',
           location: 'Warehouse A',
           onHand: 1,
           reserved: 3,
           available: -2,
           cause: 'negative_available',
           reasonCode: 'over_reserved',
           sourceKind: 'reservation',
           sourceReferenceId: 'JOB-7',
           sourceReferenceType: 'job',
           sourceNote: 'Reserved for job JOB-7 by user_7',
           sourceAt: '2026-07-24T01:00:00.000Z',
           actor: 'user_7',
         },
       ]);
     });

  it('returns empty list when no negative states exist', async () => {
    mockedListInventorySkuLocationBalances.mockResolvedValue([
      {
        orgId: 'org_1',
        sku: 'SKU-OK',
        location: 'Warehouse A',
        onHand: 4,
        reserved: 1,
        available: 3,
        entryCount: 2,
        lastUpdatedAt: '2026-07-24T01:00:00.000Z',
      },
    ] as never);

    const exceptions = await listInventoryExceptions('org_1');

    expect(exceptions).toEqual([]);
    expect(mockedListInventoryLedgerEntries).not.toHaveBeenCalled();
  });

  it('reconciles by adjustment with append-only ledger write', async () => {
    await reconcileInventoryException('org_1', {
      actionType: 'adjustment',
      sku: 'SKU-NEG',
      location: 'Warehouse A',
      quantity: 2,
      reasonCode: 'cycle_count_correction',
      actorUserId: 'user_1',
      correlationId: 'exc_1',
      note: 'Cycle count verified',
    });

    expect(mockedAppendInventoryLedgerEntry).toHaveBeenCalledWith('org_1', {
      sku: 'SKU-NEG',
      location: 'Warehouse A',
      delta: 2,
      kind: 'exception_adjustment',
      note: 'Cycle count verified [cycle_count_correction]',
      referenceId: 'exc_1',
      referenceType: 'inventory_exception',
    });
  });

  it('reconciles by reservation correction using release event', async () => {
    await reconcileInventoryException('org_1', {
      actionType: 'reservation_correction',
      sku: 'SKU-NEG',
      location: 'Warehouse A',
      quantity: 1,
      reasonCode: 'reservation_reversal',
      actorUserId: 'user_2',
      correlationId: 'exc_2',
    });

    expect(mockedAppendInventoryLedgerEntry).toHaveBeenCalledWith('org_1', {
      sku: 'SKU-NEG',
      location: 'Warehouse A',
      delta: -1,
      kind: 'reservation_release',
      note: 'Inventory exception reconciliation by user_2 [reservation_reversal]',
      referenceId: 'exc_2',
      referenceType: 'inventory_exception',
    });
  });
});
