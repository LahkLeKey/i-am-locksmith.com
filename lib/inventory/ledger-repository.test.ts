import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
                             prisma: {
                               inventoryLedgerEntry: {
                                 create: vi.fn(),
                                 findMany: vi.fn(),
                                 groupBy: vi.fn(),
                               },
                             },
                           }));

import {prisma} from '@/lib/db/prisma';

import {appendInventoryLedgerEntry, listInventoryLedgerEntries, listInventoryLedgerTimeline, listInventorySkuLocationBalances,} from './ledger-repository';

const mockedLedgerEntry =
    vi.mocked((prisma as unknown as {
                inventoryLedgerEntry: Record<string, unknown>
              }).inventoryLedgerEntry as {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    });

describe('inventory ledger repository', () => {
  beforeEach(() => {
    mockedLedgerEntry.create.mockReset();
    mockedLedgerEntry.findMany.mockReset();
    mockedLedgerEntry.groupBy.mockReset();
  });

  it('appends inventory ledger entries with org scoping', async () => {
    mockedLedgerEntry.create.mockResolvedValue({
      id: 'entry_1',
      orgId: 'org_1',
      sku: 'SKU-1',
      location: 'Warehouse A',
      delta: 4,
      kind: 'receive',
      note: 'Initial stock',
      referenceId: null,
      referenceType: null,
      createdAt: new Date('2026-07-20T10:00:00.000Z'),
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    } as never);

    const entry = await appendInventoryLedgerEntry('org_1', {
      sku: 'SKU-1',
      location: 'Warehouse A',
      delta: 4,
      kind: 'receive',
      note: 'Initial stock',
    });

    expect(mockedLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Warehouse A',
        delta: 4,
        kind: 'receive',
        note: 'Initial stock',
        referenceId: null,
        referenceType: null,
      },
    });
    expect(entry.id).toBe('entry_1');
    expect(entry.createdAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('lists entries in timeline order', async () => {
    mockedLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'entry_1',
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Warehouse A',
        delta: 4,
        kind: 'receive',
        note: null,
        referenceId: null,
        referenceType: null,
        createdAt: new Date('2026-07-20T08:00:00.000Z'),
        updatedAt: new Date('2026-07-20T08:00:00.000Z'),
      },
      {
        id: 'entry_2',
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Warehouse A',
        delta: -1,
        kind: 'adjustment',
        note: null,
        referenceId: null,
        referenceType: null,
        createdAt: new Date('2026-07-20T09:00:00.000Z'),
        updatedAt: new Date('2026-07-20T09:00:00.000Z'),
      },
    ] as never);

    const entries = await listInventoryLedgerEntries('org_1', {
      sku: 'SKU-1',
      location: 'Warehouse A',
    });

    expect(mockedLedgerEntry.findMany).toHaveBeenCalledWith({
      where: {orgId: 'org_1', sku: 'SKU-1', location: 'Warehouse A'},
      orderBy: [{createdAt: 'asc'}],
    });
    expect(entries.map((entry) => entry.id)).toEqual(['entry_1', 'entry_2']);
  });

  it('aggregates balances by sku and location', async () => {
    mockedLedgerEntry.groupBy.mockResolvedValueOnce([
      {
        sku: 'SKU-1',
        location: 'Warehouse A',
        _sum: {delta: 7},
        _count: {id: 3},
        _max: {updatedAt: new Date('2026-07-20T11:00:00.000Z')},
      },
      {
        sku: 'SKU-2',
        location: 'Van 3',
        _sum: {delta: -2},
        _count: {id: 1},
        _max: {updatedAt: new Date('2026-07-20T12:00:00.000Z')},
      },
    ] as never);

    mockedLedgerEntry.groupBy.mockResolvedValueOnce([
      {
        sku: 'SKU-1',
        location: 'Warehouse A',
        _sum: {delta: -2},
        _count: {id: 1},
        _max: {updatedAt: new Date('2026-07-20T12:00:00.000Z')},
      },
      {
        sku: 'SKU-2',
        location: 'Van 3',
        _sum: {delta: 0},
        _count: {id: 0},
        _max: {updatedAt: new Date('2026-07-20T12:00:00.000Z')},
      },
    ] as never);

    const balances = await listInventorySkuLocationBalances('org_1');

    expect(mockedLedgerEntry.groupBy).toHaveBeenNthCalledWith(1, {
      by: ['sku', 'location'],
      where: {
        orgId: 'org_1',
        kind: {notIn: ['reservation', 'reservation_release']}
      },
      _sum: {delta: true},
      _count: {id: true},
      _max: {updatedAt: true},
    });
    expect(mockedLedgerEntry.groupBy).toHaveBeenNthCalledWith(2, {
      by: ['sku', 'location'],
      where:
          {orgId: 'org_1', kind: {in : ['reservation', 'reservation_release']}},
      _sum: {delta: true},
      _count: {id: true},
      _max: {updatedAt: true},
    });
    expect(balances).toEqual([
      {
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Warehouse A',
        onHand: 7,
        reserved: 2,
        available: 5,
        entryCount: 3,
        lastUpdatedAt: '2026-07-20T11:00:00.000Z',
      },
      {
        orgId: 'org_1',
        sku: 'SKU-2',
        location: 'Van 3',
        onHand: -2,
        reserved: 0,
        available: -2,
        entryCount: 1,
        lastUpdatedAt: '2026-07-20T12:00:00.000Z',
      },
    ]);
  });

  it('exposes the ledger timeline through the entry list helper', async () => {
    mockedLedgerEntry.findMany.mockResolvedValue([] as never);

    await listInventoryLedgerTimeline('org_1', 'SKU-1', 'Warehouse A');

    expect(mockedLedgerEntry.findMany).toHaveBeenCalledWith({
      where: {orgId: 'org_1', sku: 'SKU-1', location: 'Warehouse A'},
      orderBy: [{createdAt: 'asc'}],
    });
  });
});