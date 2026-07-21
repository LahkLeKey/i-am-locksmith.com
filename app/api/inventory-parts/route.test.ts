import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/inventory/parts-repository', () => ({
                                              createInventoryPart: vi.fn(),
                                              deleteInventoryPart: vi.fn(),
                                              listInventoryParts: vi.fn(),
                                              updateInventoryPart: vi.fn(),
                                            }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {createInventoryPart, deleteInventoryPart, listInventoryParts, updateInventoryPart,} from '@/lib/inventory/parts-repository';

import {DELETE, GET, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCreateInventoryPart = vi.mocked(createInventoryPart);
const mockedDeleteInventoryPart = vi.mocked(deleteInventoryPart);
const mockedListInventoryParts = vi.mocked(listInventoryParts);
const mockedUpdateInventoryPart = vi.mocked(updateInventoryPart);

describe('inventory parts api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedCreateInventoryPart.mockReset();
    mockedDeleteInventoryPart.mockReset();
    mockedListInventoryParts.mockReset();
    mockedUpdateInventoryPart.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
  });

  it('lists inventory parts', async () => {
    mockedListInventoryParts.mockResolvedValue([]);

    const response = (await GET())!;

    expect(response.status).toBe(200);
  });

  it('creates a part', async () => {
    mockedCreateInventoryPart.mockResolvedValue({id: 'part_1'} as never);

    const response =
        (await POST(new Request('http://localhost/api/inventory-parts', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'AUTO-1',
            itemName: 'Auto part',
            serviceLines: ['automotive'],
            location: 'Van 1',
            onHand: 3,
            reorderPoint: 5,
            suggestedOrderQty: 10,
            supplier: 'Supplier',
            severity: 'high',
            compatibilityNote: 'Fit note',
          }),
        })))!;

    expect(response.status).toBe(201);
    expect(mockedCreateInventoryPart).toHaveBeenCalledOnce();
  });

  it('updates a part', async () => {
    mockedUpdateInventoryPart.mockResolvedValue({id: 'part_1'} as never);

    const response =
        (await PATCH(new Request('http://localhost/api/inventory-parts', {
          method: 'PATCH',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({id: 'part_1', onHand: 2}),
        })))!;

    expect(response.status).toBe(200);
    expect(mockedUpdateInventoryPart).toHaveBeenCalledOnce();
  });

  it('deletes a part', async () => {
    mockedDeleteInventoryPart.mockResolvedValue({id: 'part_1'} as never);

    const response =
        (await DELETE(new Request('http://localhost/api/inventory-parts', {
          method: 'DELETE',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({id: 'part_1'}),
        })))!;

    expect(response.status).toBe(200);
    expect(mockedDeleteInventoryPart).toHaveBeenCalledOnce();
  });
});