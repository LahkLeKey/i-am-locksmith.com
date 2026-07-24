import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
  authorizePermission: vi.fn(),
  getAuthorizationContext: vi.fn(),
}));

vi.mock('@/lib/inventory/replenishment-repository', () => ({
  createReplenishmentRequest: vi.fn(),
  listOpenReplenishmentRequests: vi.fn(),
}));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {createReplenishmentRequest, listOpenReplenishmentRequests} from '@/lib/inventory/replenishment-repository';

import {GET, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCreateReplenishmentRequest = vi.mocked(createReplenishmentRequest);
const mockedListOpenReplenishmentRequests = vi.mocked(
    listOpenReplenishmentRequests);

describe('inventory replenishment requests api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedCreateReplenishmentRequest.mockReset();
    mockedListOpenReplenishmentRequests.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });

    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedListOpenReplenishmentRequests.mockResolvedValue([]);
  });

  it('lists open replenishment requests', async () => {
    const response = await GET();

    expect(response?.status).toBe(200);
    expect(mockedListOpenReplenishmentRequests).toHaveBeenCalledWith('org_1');
  });

  it('creates a replenishment request', async () => {
    mockedCreateReplenishmentRequest.mockResolvedValue({
      id: 'req_1',
      orgId: 'org_1',
      sku: 'SKU-1',
      location: 'Warehouse A',
      supplier: 'Supplier A',
      requestedQuantity: 8,
      status: 'open',
      requestedByUserId: 'user_1',
      orderingNotes: 'Order ASAP',
      createdAt: '2026-07-24T01:00:00.000Z',
      updatedAt: '2026-07-24T01:00:00.000Z',
    });

    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'SKU-1',
            location: 'Warehouse A',
            supplier: 'Supplier A',
            requestedQuantity: 8,
            orderingNotes: 'Order ASAP',
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(201);
    expect(mockedCreateReplenishmentRequest).toHaveBeenCalledWith('org_1', {
      sku: 'SKU-1',
      location: 'Warehouse A',
      supplier: 'Supplier A',
      requestedQuantity: 8,
      orderingNotes: 'Order ASAP',
      requestedByUserId: 'user_1',
    });
  });

  it('rejects invalid quantity', async () => {
    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'SKU-1',
            location: 'Warehouse A',
            supplier: 'Supplier A',
            requestedQuantity: 0,
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });

  it('rejects decimal quantity', async () => {
    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'SKU-1',
            location: 'Warehouse A',
            supplier: 'Supplier A',
            requestedQuantity: 1.5,
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });

  it('rejects missing required fields', async () => {
    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: '',
            location: 'Warehouse A',
            supplier: '',
            requestedQuantity: 2,
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });

  it('rejects invalid json', async () => {
    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: '{invalid-json',
        });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    mockedGetAuthorizationContext.mockResolvedValue(null as never);

    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'SKU-1',
            location: 'Warehouse A',
            supplier: 'Supplier A',
            requestedQuantity: 2,
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(401);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });

  it('rejects unauthorized requests', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request(
        'http://localhost/api/inventory-replenishment-requests',
        {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            sku: 'SKU-1',
            location: 'Warehouse A',
            supplier: 'Supplier A',
            requestedQuantity: 2,
          }),
        });

    const response = await POST(request);

    expect(response?.status).toBe(403);
    expect(mockedCreateReplenishmentRequest).not.toHaveBeenCalled();
  });
});