import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/inventory/parts-repository', () => ({
                                              listInventoryParts: vi.fn(),
                                              createInventoryPart: vi.fn(),
                                              updateInventoryPart: vi.fn(),
                                            }));

vi.mock('@/lib/jobs/repository', () => ({
                                   createJobRecord: vi.fn(),
                                   deleteJobRecord: vi.fn(),
                                   getJobRecord: vi.fn(),
                                   listJobRecords: vi.fn(),
                                   updateJobRecord: vi.fn(),
                                 }));

vi.mock('@/lib/technicians/repository', () => ({
                                          getTechnicianById: vi.fn(),
                                        }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {createInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';
import {createJobRecord, deleteJobRecord, getJobRecord, listJobRecords, updateJobRecord} from '@/lib/jobs/repository';
import {getTechnicianById} from '@/lib/technicians/repository';

import {DELETE, GET, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);

const mockedListInventoryParts = vi.mocked(listInventoryParts);
const mockedCreateInventoryPart = vi.mocked(createInventoryPart);
const mockedUpdateInventoryPart = vi.mocked(updateInventoryPart);

const mockedCreateJobRecord = vi.mocked(createJobRecord);
const mockedDeleteJobRecord = vi.mocked(deleteJobRecord);
const mockedGetJobRecord = vi.mocked(getJobRecord);
const mockedListJobRecords = vi.mocked(listJobRecords);
const mockedUpdateJobRecord = vi.mocked(updateJobRecord);
const mockedGetTechnicianById = vi.mocked(getTechnicianById);

const BASE_JOB = {
  id: 'JOB-1',
  customerName: 'Acme',
  site: 'Denver',
  priority: 'normal',
  status: 'queued',
  scheduledFor: null,
  etaMinutes: null,
  requiredSkus: [],
  followUpNote: null,
  assignedTechnician: null,
  quote: {
    partEstimate: 100,
    laborEstimate: 50,
    estimatedMinutes: 60,
    estimatedTotal: 150,
    notes: null,
  },
  closeout: {
    actualPartCost: null,
    actualLaborCost: null,
    actualMinutes: null,
    finalTotal: null,
    closedOutAt: null,
    resolutionNotes: null,
  },
} as const;

describe('jobs api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();

    mockedListInventoryParts.mockReset();
    mockedCreateInventoryPart.mockReset();
    mockedUpdateInventoryPart.mockReset();

    mockedCreateJobRecord.mockReset();
    mockedDeleteJobRecord.mockReset();
    mockedGetJobRecord.mockReset();
    mockedListJobRecords.mockReset();
    mockedUpdateJobRecord.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });

    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});

    mockedCreateJobRecord.mockResolvedValue({...BASE_JOB} as never);
    mockedUpdateJobRecord.mockResolvedValue({...BASE_JOB} as never);
    mockedDeleteJobRecord.mockResolvedValue({...BASE_JOB} as never);
    mockedGetJobRecord.mockResolvedValue({...BASE_JOB} as never);
    mockedListJobRecords.mockResolvedValue([{...BASE_JOB}] as never);
    mockedGetTechnicianById.mockResolvedValue({
      id: 'tech_1',
      orgId: 'org_1',
      fullName: 'Taylor Ford',
      lockpickingSkills: ['residential'],
      hourlyRate: 95,
      availabilityStatus: 'available',
      availabilityNote: null,
      isActive: true,
    } as never);

    mockedListInventoryParts.mockResolvedValue([
      {
        id: 'part_1',
        orgId: 'org_1',
        sku: 'SKU-1',
        itemName: 'Key blank',
        estimatedUnitCost: 42.5,
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

  it('creates a job with quote fields', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        customerName: 'New Co',
        site: 'Austin',
        priority: 'high',
        scheduledFor: '2026-07-23T15:00:00.000Z',
        requiredSkus: ['SKU-1', 'SKU-2'],
        followUpNote: 'Call customer before arrival',
        assignedTechnicianId: 'tech_1',
        quote: {
          partEstimate: 100,
          laborEstimate: 0,
          estimatedMinutes: 45,
          estimatedTotal: 0,
          notes: 'Initial quote',
        },
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedCreateJobRecord).toHaveBeenCalledOnce();
    expect(mockedCreateJobRecord)
        .toHaveBeenCalledWith(
            'org_1',
            expect.objectContaining({
              customerName: 'New Co',
              site: 'Austin',
              priority: 'high',
              requiredSkus: ['SKU-1', 'SKU-2'],
              followUpNote: 'Call customer before arrival',
              assignedTechnicianId: 'tech_1',
              assignedTechnicianName: 'Taylor Ford',
              laborRate: 95,
              quote: expect.objectContaining({
                partEstimate: 42.5,
              }),
            }),
        );
    expect(mockedGetTechnicianById).toHaveBeenCalledWith('org_1', 'tech_1');
  });

  it('lists jobs', async () => {
    const response = await GET();

    expect(response?.status).toBe(200);
    expect(mockedListJobRecords).toHaveBeenCalledOnce();
  });

  it('updates a job', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        status: 'in_progress',
        quote: {
          partEstimate: 90,
          laborEstimate: 60,
          estimatedMinutes: 50,
          estimatedTotal: 150,
          notes: 'Updated quote',
        },
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord).toHaveBeenCalledOnce();
  });

  it('rejects invalid quote values', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        quote: {
          partEstimate: -1,
        },
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
  });

  it('deletes a job', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'DELETE',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1'}),
    });

    const response = await DELETE(request);

    expect(response?.status).toBe(200);
    expect(mockedDeleteJobRecord).toHaveBeenCalledOnce();
  });

  it('returns forbidden when permission denied', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        customerName: 'X',
        site: 'Y',
        quote: {
          partEstimate: 10,
          laborEstimate: 10,
          estimatedMinutes: 10,
          estimatedTotal: 20,
        },
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(403);
  });

  it('reserves inventory for a job and appends required sku', async () => {
    mockedUpdateJobRecord.mockResolvedValue({
      ...BASE_JOB,
      requiredSkus: ['SKU-1'],
    } as never);

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
    expect(mockedUpdateJobRecord).toHaveBeenCalled();
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

  it('rejects completed status in generic update route', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        status: 'completed',
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
  });

  it('creates inventory from a job context and appends required sku',
     async () => {
       mockedUpdateJobRecord.mockResolvedValue({
         ...BASE_JOB,
         requiredSkus: ['SKU-NEW'],
       } as never);

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
       expect(mockedUpdateJobRecord).toHaveBeenCalled();
     });

  it('clocks in a job via time clock action', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'clock_in',
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith(
            'org_1',
            'JOB-1',
            expect.objectContaining({
              timeClock: expect.objectContaining({
                clockedInAt: expect.any(String),
                clockedOutAt: null,
              }),
            }),
        );
  });

  it('sets break minutes via time clock action', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_break',
        breakMinutes: 20,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith(
            'org_1',
            'JOB-1',
            expect.objectContaining({
              timeClock: {breakMinutes: 20},
            }),
        );
  });

  it('rejects invalid break minutes via time clock action', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_break',
        breakMinutes: -2,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
  });
});
