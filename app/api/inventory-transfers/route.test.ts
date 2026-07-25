import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               getAuthorizationContext: vi.fn(),
                               authorizePermission: vi.fn(),
                             }));

vi.mock('@/lib/inventory/parts-repository', () => ({
                                              getInventoryPartById: vi.fn(),
                                            }));

vi.mock(
    '@/lib/inventory/ledger-repository',
    () => ({
      appendInventoryLedgerEntry: vi.fn(),
      listInventorySkuLocationBalances: vi.fn(),
    }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getInventoryPartById} from '@/lib/inventory/parts-repository';
import {appendInventoryLedgerEntry, listInventorySkuLocationBalances,} from '@/lib/inventory/ledger-repository';

import {POST} from './route';

const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetInventoryPartById = vi.mocked(getInventoryPartById);
const mockedAppendInventoryLedgerEntry = vi.mocked(appendInventoryLedgerEntry);
const mockedListInventorySkuLocationBalances =
    vi.mocked(listInventorySkuLocationBalances);

function transferRequest(quantity: number) {
  return new Request('http://localhost/api/inventory-transfers', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      sourceLocation: 'Garage',
      targetLocation: 'Van 1',
      parts: [{id: 'part_1', quantity}],
    }),
  });
}

function transferRequestTo(targetLocation: string) {
  return new Request('http://localhost/api/inventory-transfers', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      sourceLocation: 'Garage',
      targetLocation,
      parts: [{id: 'part_1', quantity: 1}],
    }),
  });
}

describe('inventory transfers api route', () => {
  beforeEach(() => {
    mockedGetAuthorizationContext.mockReset();
    mockedAuthorizePermission.mockReset();
    mockedGetInventoryPartById.mockReset();
    mockedAppendInventoryLedgerEntry.mockReset();
    mockedListInventorySkuLocationBalances.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      clerkOrgRole: 'org:admin',
      effectivePermissions: new Set(),
    });
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedGetInventoryPartById.mockResolvedValue({
      id: 'part_1',
      orgId: 'org_1',
      sku: 'SKU-1',
      itemName: 'Key blank',
      estimatedUnitCost: 2,
      serviceLines: ['mobile'],
      location: 'Garage',
      onHand: 8,
      reorderPoint: 2,
      suggestedOrderQty: 10,
      supplier: 'Supplier A',
      severity: 'low',
      compatibilityNote: '',
    });
    mockedListInventorySkuLocationBalances.mockResolvedValue([{
      orgId: 'org_1',
      sku: 'SKU-1',
      location: 'Garage',
      onHand: 8,
      entryCount: 1,
      reserved: 1,
      available: 7,
      lastUpdatedAt: '2026-07-24T01:00:00.000Z',
    }]);
    mockedAppendInventoryLedgerEntry.mockResolvedValue({} as never);
  });

  it.each([0, -1, 1.5])(
      'rejects invalid transfer quantity %s', async (quantity) => {
        const response = await POST(transferRequest(quantity));

        expect(response.status).toBe(400);
        expect(mockedAppendInventoryLedgerEntry).not.toHaveBeenCalled();
      });

  it('rejects users without inventory transfer permission', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const response = await POST(transferRequest(3));

    expect(response.status).toBe(403);
    expect(mockedAppendInventoryLedgerEntry).not.toHaveBeenCalled();
  });

  it('rejects source and destination locations that differ only by case',
     async () => {
       const response = await POST(transferRequestTo('garage'));

       expect(response.status).toBe(400);
       expect(mockedAppendInventoryLedgerEntry).not.toHaveBeenCalled();
     });

  it('writes matching source and destination ledger entries', async () => {
    const response = await POST(transferRequest(3));

    expect(response.status).toBe(200);
    expect(mockedGetInventoryPartById).toHaveBeenCalledWith('org_1', 'part_1');
    expect(mockedAppendInventoryLedgerEntry)
        .toHaveBeenNthCalledWith(
            1,
            'org_1',
            expect.objectContaining({
              sku: 'SKU-1',
              location: 'Garage',
              delta: -3,
              kind: 'transfer_out',
            }),
        );
    expect(mockedAppendInventoryLedgerEntry)
        .toHaveBeenNthCalledWith(
            2,
            'org_1',
            expect.objectContaining({
              sku: 'SKU-1',
              location: 'Van 1',
              delta: 3,
              kind: 'transfer_in',
            }),
        );
  });
});
