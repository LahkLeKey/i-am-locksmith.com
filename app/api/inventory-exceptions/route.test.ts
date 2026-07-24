import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
  authorizePermission: vi.fn(),
  getAuthorizationContext: vi.fn(),
}));

vi.mock('@/lib/inventory/exceptions-repository', () => ({
  listInventoryExceptions: vi.fn(),
  reconcileInventoryException: vi.fn(),
}));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {
  listInventoryExceptions,
  reconcileInventoryException,
} from '@/lib/inventory/exceptions-repository';

import {GET, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedListInventoryExceptions = vi.mocked(listInventoryExceptions);
const mockedReconcileInventoryException = vi.mocked(reconcileInventoryException);

describe('inventory exceptions api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedListInventoryExceptions.mockReset();
    mockedReconcileInventoryException.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });

    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedListInventoryExceptions.mockResolvedValue([]);
    mockedReconcileInventoryException.mockResolvedValue(
        {ok: true, entryKind: 'exception_adjustment'});
  });

  it('lists exception queue entries', async () => {
    const response = (await GET())!;

    expect(response.status).toBe(200);
    expect(mockedListInventoryExceptions).toHaveBeenCalledWith('org_1');
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('inventory.read');
  });

  it('reconciles an exception by adjustment', async () => {
    const response =
        (await POST(new Request('http://localhost/api/inventory-exceptions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        sku: 'SKU-NEG',
        location: 'Warehouse A',
        actionType: 'adjustment',
        quantity: 2,
        reasonCode: 'cycle_count_correction',
        note: 'Cycle count verified',
      }),
    })))!;

    expect(response.status).toBe(200);
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('inventory.adjust');
    expect(mockedReconcileInventoryException).toHaveBeenCalledWith('org_1', {
      actionType: 'adjustment',
      sku: 'SKU-NEG',
      location: 'Warehouse A',
      quantity: 2,
      reasonCode: 'cycle_count_correction',
      note: 'Cycle count verified',
      correlationId: null,
      actorUserId: 'user_1',
    });
  });

  it('rejects invalid reconcile payload', async () => {
    const response =
        (await POST(new Request('http://localhost/api/inventory-exceptions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        sku: 'SKU-NEG',
        location: 'Warehouse A',
        actionType: 'adjustment',
        quantity: 0,
        reasonCode: 'cycle_count_correction',
      }),
    })))!;

    expect(response.status).toBe(400);
    expect(mockedReconcileInventoryException).not.toHaveBeenCalled();
  });

  it('rejects forbidden reconcile requests', async () => {
    mockedAuthorizePermission.mockResolvedValueOnce({state: 'forbidden'});

    const response =
        (await POST(new Request('http://localhost/api/inventory-exceptions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        sku: 'SKU-NEG',
        location: 'Warehouse A',
        actionType: 'adjustment',
        quantity: 1,
        reasonCode: 'cycle_count_correction',
      }),
    })))!;

    expect(response.status).toBe(403);
    expect(mockedReconcileInventoryException).not.toHaveBeenCalled();
  });
});
