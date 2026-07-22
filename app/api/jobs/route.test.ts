import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock(
    '@/lib/dashboard/snapshotMutations', () => ({
                                           getOrCreateOrgSnapshot: vi.fn(),
                                           getDashboardDataForSnapshot: vi.fn(),
                                           persistDashboardData: vi.fn(),
                                         }));

vi.mock('@/lib/inventory/parts-repository', () => ({
                                              listInventoryParts: vi.fn(),
                                              createInventoryPart: vi.fn(),
                                              updateInventoryPart: vi.fn(),
                                            }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData,} from '@/lib/dashboard/snapshotMutations';
import {createInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';

import {DELETE, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedGetOrCreateOrgSnapshot = vi.mocked(getOrCreateOrgSnapshot);
const mockedGetDashboardDataForSnapshot =
    vi.mocked(getDashboardDataForSnapshot);
const mockedPersistDashboardData = vi.mocked(persistDashboardData);
const mockedListInventoryParts = vi.mocked(listInventoryParts);
const mockedCreateInventoryPart = vi.mocked(createInventoryPart);
const mockedUpdateInventoryPart = vi.mocked(updateInventoryPart);

const BASE_DATA = {
  generatedAt: '2026-07-21T12:00:00.000Z',
  revenueToday: 0,
  openInvoices: 0,
  grossMarginWeek: 0,
  lowStockSkus: 0,
  vansBelowMin: 0,
  financialTrend: {revenue: [], expenses: [], profit: []},
  kpis: [],
  jobsQueue: [
    {
      id: 'JOB-1',
      customerName: 'Acme',
      site: 'Denver',
      priority: 'normal',
      status: 'queued',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: [],
    },
  ],
  replenishmentAlerts: [],
};

describe('jobs api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedGetOrCreateOrgSnapshot.mockReset();
    mockedGetDashboardDataForSnapshot.mockReset();
    mockedPersistDashboardData.mockReset();
    mockedListInventoryParts.mockReset();
    mockedCreateInventoryPart.mockReset();
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
    mockedGetOrCreateOrgSnapshot.mockResolvedValue(
        {id: 'snap_1', orgId: 'org_1'} as never);
    mockedGetDashboardDataForSnapshot.mockResolvedValue(BASE_DATA as never);
    mockedListInventoryParts.mockResolvedValue([
      {
        id: 'part_1',
        orgId: 'org_1',
        sku: 'SKU-1',
        itemName: 'Key blank',
        serviceLines: ['mobile'],
        location: 'Van 1',
        onHand: 8,
        reorderPoint: 3,
        suggestedOrderQty: 6,
        supplier: 'Supplier',
        severity: 'medium',
        compatibilityNote: 'Test note',
      },
    ] as never);
    mockedUpdateInventoryPart.mockResolvedValue({id: 'part_1'} as never);
    mockedCreateInventoryPart.mockResolvedValue(
        {id: 'part_2', sku: 'SKU-NEW'} as never);
  });

  it('creates a job', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({customerName: 'New Co', site: 'Austin'}),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedPersistDashboardData).toHaveBeenCalledOnce();
  });

  it('updates a job', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', status: 'in_progress'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedPersistDashboardData).toHaveBeenCalledOnce();
  });

  it('updates customer and site inline', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        customerName: 'Updated Customer',
        site: 'Updated Site',
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedPersistDashboardData).toHaveBeenCalledOnce();
  });

  it('rejects empty customer name for inline edits', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', customerName: '   '}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedPersistDashboardData).not.toHaveBeenCalled();
  });

  it('rejects empty site for inline edits', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', site: '   '}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedPersistDashboardData).not.toHaveBeenCalled();
  });

  it('deletes a job', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'DELETE',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1'}),
    });

    const response = await DELETE(request);

    expect(response?.status).toBe(200);
    expect(mockedPersistDashboardData).toHaveBeenCalledOnce();
  });

  it('returns forbidden when permission denied', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({customerName: 'X', site: 'Y'}),
    });

    const response = await POST(request);

    expect(response?.status).toBe(403);
  });

  it('reserves inventory for a job and appends required sku', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'reserve',
        inventorySku: 'SKU-1',
        reserveQuantity: 2,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateInventoryPart).toHaveBeenCalledOnce();
    expect(mockedPersistDashboardData).toHaveBeenCalled();
  });

  it('returns 404 when reserve SKU does not exist', async () => {
    mockedListInventoryParts.mockResolvedValue([] as never);

    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'reserve',
        inventorySku: 'MISSING',
        reserveQuantity: 1,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(404);
    expect(mockedUpdateInventoryPart).not.toHaveBeenCalled();
  });

  it('returns 400 when reserve quantity is invalid', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'reserve',
        inventorySku: 'SKU-1',
        reserveQuantity: 0,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedUpdateInventoryPart).not.toHaveBeenCalled();
  });

  it('returns 400 when reserve quantity exceeds stock', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'reserve',
        inventorySku: 'SKU-1',
        reserveQuantity: 99,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedUpdateInventoryPart).not.toHaveBeenCalled();
  });

  it('creates inventory from a job context and appends required sku',
     async () => {
       const request = new Request('http://localhost/api/jobs', {
         method: 'PATCH',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           id: 'JOB-1',
           inventoryAction: 'create_inventory',
           inventorySku: 'SKU-NEW',
           createInventory: {
             itemName: 'New key profile',
             serviceLines: ['mobile', 'shop'],
             location: 'Warehouse A',
             onHand: 0,
             reorderPoint: 2,
             suggestedOrderQty: 8,
             supplier: 'Supplier',
             severity: 'medium',
             compatibilityNote: 'Reporting-driven part add',
           },
         }),
       });

       const response = await PATCH(request);

       expect(response?.status).toBe(200);
       expect(mockedCreateInventoryPart).toHaveBeenCalledOnce();
       expect(mockedPersistDashboardData).toHaveBeenCalled();
     });

  it('returns 409 when creating inventory with existing sku', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'create_inventory',
        inventorySku: 'SKU-1',
        createInventory: {
          itemName: 'Duplicate',
          serviceLines: ['mobile'],
          location: 'Van 1',
          onHand: 0,
          reorderPoint: 1,
          suggestedOrderQty: 3,
          supplier: 'Supplier',
          severity: 'medium',
          compatibilityNote: 'Duplicate sku',
        },
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(409);
    expect(mockedCreateInventoryPart).not.toHaveBeenCalled();
  });

  it('returns 400 when create inventory fields are missing', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'create_inventory',
        inventorySku: 'SKU-NEW-2',
        createInventory: {
          itemName: '',
          location: '',
          onHand: 0,
          reorderPoint: 1,
          suggestedOrderQty: 2,
          supplier: '',
          compatibilityNote: '',
        },
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateInventoryPart).not.toHaveBeenCalled();
  });
});
