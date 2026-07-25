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

vi.mock('@/lib/customers/repository', () => ({getCustomerSite: vi.fn()}));

vi.mock('@/lib/inventory/ledger-repository', () => ({
                                               listInventorySkuLocationBalances:
                                                   vi.fn(),
                                               reserveInventoryForJob: vi.fn(),
                                             }));

vi.mock('@/lib/jobs/repository', () => ({
                                   createJobRecord: vi.fn(),
                                   deleteJobRecord: vi.fn(),
                                   getJobRecord: vi.fn(),
                                   listJobRecords: vi.fn(),
                                   reopenJobRecord: vi.fn(),
                                   updateJobRecord: vi.fn(),
                                 }));

vi.mock('@/lib/technicians/repository', () => ({
                                          getTechnicianById: vi.fn(),
                                        }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getCustomerSite} from '@/lib/customers/repository';
import {createInventoryPart, listInventoryParts, updateInventoryPart} from '@/lib/inventory/parts-repository';
import {listInventorySkuLocationBalances, reserveInventoryForJob} from '@/lib/inventory/ledger-repository';
import {createJobRecord, deleteJobRecord, getJobRecord, listJobRecords, reopenJobRecord, updateJobRecord} from '@/lib/jobs/repository';
import {getTechnicianById} from '@/lib/technicians/repository';

import {DELETE, GET, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetCustomerSite = vi.mocked(getCustomerSite);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);

const mockedListInventoryParts = vi.mocked(listInventoryParts);
const mockedCreateInventoryPart = vi.mocked(createInventoryPart);
const mockedUpdateInventoryPart = vi.mocked(updateInventoryPart);
const mockedListInventorySkuLocationBalances =
    vi.mocked(listInventorySkuLocationBalances);
const mockedReserveInventoryForJob = vi.mocked(reserveInventoryForJob);

const mockedCreateJobRecord = vi.mocked(createJobRecord);
const mockedDeleteJobRecord = vi.mocked(deleteJobRecord);
const mockedGetJobRecord = vi.mocked(getJobRecord);
const mockedListJobRecords = vi.mocked(listJobRecords);
const mockedReopenJobRecord = vi.mocked(reopenJobRecord);
const mockedUpdateJobRecord = vi.mocked(updateJobRecord);
const mockedGetTechnicianById = vi.mocked(getTechnicianById);

const BASE_JOB = {
  id: 'JOB-1',
  jobName: 'Acme - Denver',
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
  timeClock: {
    clockedInAt: null,
    clockedOutAt: null,
    breakMinutes: 0,
    elapsedMinutes: 0,
    notes: null,
    ledger: [],
  },
} as const;

describe('jobs api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetCustomerSite.mockReset();
    mockedGetAuthorizationContext.mockReset();

    mockedListInventoryParts.mockReset();
    mockedCreateInventoryPart.mockReset();
    mockedUpdateInventoryPart.mockReset();
    mockedListInventorySkuLocationBalances.mockReset();

    mockedCreateJobRecord.mockReset();
    mockedDeleteJobRecord.mockReset();
    mockedGetJobRecord.mockReset();
    mockedListJobRecords.mockReset();
    mockedReopenJobRecord.mockReset();
    mockedUpdateJobRecord.mockReset();
    mockedReserveInventoryForJob.mockReset();

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
    mockedReopenJobRecord.mockResolvedValue({
      ...BASE_JOB,
      status: 'in_progress',
      closeout: {
        actualPartCost: null,
        actualLaborCost: null,
        actualMinutes: null,
        finalTotal: null,
        closedOutAt: null,
        resolutionNotes: null,
      },
    } as never);
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
    mockedListInventorySkuLocationBalances.mockResolvedValue([
      {
        orgId: 'org_1',
        sku: 'SKU-1',
        location: 'Van 1',
        onHand: 8,
        reserved: 0,
        available: 8,
        entryCount: 0,
        lastUpdatedAt: '2026-07-20T10:00:00.000Z',
      },
    ] as never);
    mockedReserveInventoryForJob.mockResolvedValue({id: 'ledger_1'} as never);
  });

  it('creates a job with quote fields', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        customerName: 'New Co',
        site: 'Austin',
        latitude: 30.2672,
        longitude: -97.7431,
        priority: 'high',
        scheduledFor: '2026-07-23T15:00:00.000Z',
        requiredSkus: ['SKU-1', 'SKU-2'],
        followUpNote: 'Call customer before arrival',
        assignedTechnicianIds: ['tech_1'],
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
              latitude: 30.2672,
              longitude: -97.7431,
              priority: 'high',
              requiredSkus: ['SKU-1', 'SKU-2'],
              followUpNote: 'Call customer before arrival',
              assignedTechnicianIds: ['tech_1'],
              assignedTechnicianName: 'Taylor Ford',
              laborRate: 95,
              quote: expect.objectContaining({
                partEstimate: 42.5,
              }),
            }),
        );
    expect(mockedGetTechnicianById).toHaveBeenCalledWith('org_1', 'tech_1');
  });

  it('derives job snapshots from a selected CRM customer site', async () => {
    mockedGetCustomerSite.mockResolvedValue({
      customer: {
        id: 'customer_1',
        orgId: 'org_1',
        displayName: 'Northside Medical',
        email: null,
        phone: null,
        notes: null,
        sites: [],
      },
      site: {
        id: 'site_1',
        label: 'Main entrance',
        address: '123 Main Street, Minneapolis, Minnesota',
        latitude: 44.9778,
        longitude: -93.265,
        isPrimary: true,
      },
    });
    const response = await POST(new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        customerId: 'customer_1',
        serviceSiteId: 'site_1',
        assignedTechnicianId: 'tech_1',
        quote: {
          partEstimate: 0,
          laborEstimate: 0,
          estimatedMinutes: 45,
          estimatedTotal: 0
        },
      }),
    }));

    expect(response?.status).toBe(200);
    expect(mockedGetCustomerSite)
        .toHaveBeenCalledWith('org_1', 'customer_1', 'site_1');
    expect(mockedCreateJobRecord)
        .toHaveBeenCalledWith('org_1', expect.objectContaining({
          customerId: 'customer_1',
          serviceSiteId: 'site_1',
          customerName: 'Northside Medical',
          site: '123 Main Street, Minneapolis, Minnesota',
          latitude: 44.9778,
          longitude: -93.265,
        }));
  });

  it('reserves a selected SKU from its chosen source location', async () => {
    mockedCreateJobRecord.mockResolvedValue({
      ...BASE_JOB,
      id: 'JOB-NEW',
      requiredSkus: ['SKU-1'],
    } as never);
    const request = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        customerName: 'New Co',
        site: 'Austin',
        assignedTechnicianId: 'tech_1',
        inventorySelections: [
          {sku: 'SKU-1', location: 'Van 1', quantity: 1},
        ],
        quote: {
          partEstimate: 0,
          laborEstimate: 0,
          estimatedMinutes: 45,
          estimatedTotal: 0,
        },
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedCreateJobRecord)
        .toHaveBeenCalledWith(
            'org_1', expect.objectContaining({requiredSkus: ['SKU-1']}));
    expect(mockedReserveInventoryForJob)
        .toHaveBeenCalledWith('org_1', 'SKU-1', 'Van 1', {
          jobId: 'JOB-NEW',
          jobNumber: 'JOB-NEW',
          quantity: 1,
          note: 'Reserved for JOB-NEW',
        });
  });

  it('rejects a selected source with insufficient stock before creating a job',
     async () => {
       mockedListInventorySkuLocationBalances.mockResolvedValue(
           [{
             orgId: 'org_1',
             sku: 'SKU-1',
             location: 'Van 1',
             onHand: 8,
             reserved: 8,
             available: 0,
             entryCount: 1,
             lastUpdatedAt: '2026-07-20T10:00:00.000Z',
           }] as never);
       const request = new Request('http://localhost/api/jobs', {
         method: 'POST',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           customerName: 'New Co',
           site: 'Austin',
           assignedTechnicianId: 'tech_1',
           inventorySelections: [
             {sku: 'SKU-1', location: 'Van 1', quantity: 1},
           ],
           quote: {
             partEstimate: 0,
             laborEstimate: 0,
             estimatedMinutes: 45,
             estimatedTotal: 0,
           },
         }),
       });

       const response = await POST(request);

       expect(response?.status).toBe(400);
       expect(mockedCreateJobRecord).not.toHaveBeenCalled();
       expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
     });

  it('requires inventory reservation permission for sourced parts',
     async () => {
       mockedAuthorizePermission.mockResolvedValueOnce({state: 'authorized'})
           .mockResolvedValueOnce({state: 'forbidden'});
       const request = new Request('http://localhost/api/jobs', {
         method: 'POST',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           customerName: 'New Co',
           site: 'Austin',
           assignedTechnicianId: 'tech_1',
           inventorySelections: [
             {sku: 'SKU-1', location: 'Van 1', quantity: 1},
           ],
           quote: {
             partEstimate: 0,
             laborEstimate: 0,
             estimatedMinutes: 45,
             estimatedTotal: 0,
           },
         }),
       });

       const response = await POST(request);

       expect(response?.status).toBe(403);
       expect(mockedCreateJobRecord).not.toHaveBeenCalled();
       expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
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

  it('trims and updates the job name', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', jobName: '  Front door rekey  '}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith(
            'org_1', 'JOB-1',
            expect.objectContaining({jobName: 'Front door rekey'}));
  });

  it('clears stale coordinates when the service site changes', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', site: '456 New Service Road'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith('org_1', 'JOB-1', expect.objectContaining({
          site: '456 New Service Road',
          latitude: null,
          longitude: null,
        }));
  });

  it('reopens a closed job through the explicit action', async () => {
    mockedGetJobRecord.mockResolvedValue({
      ...BASE_JOB,
      status: 'closed',
    } as never);
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', jobAction: 'reopen'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedReopenJobRecord).toHaveBeenCalledWith('org_1', 'JOB-1');
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
  });

  it('rejects reopening a job that is not closed', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', jobAction: 'reopen'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(409);
    expect(mockedReopenJobRecord).not.toHaveBeenCalled();
  });

  it('rejects ordinary edits to a closed job', async () => {
    mockedGetJobRecord.mockResolvedValue({
      ...BASE_JOB,
      status: 'closed',
    } as never);
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', priority: 'high'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(409);
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
  });

  it('rejects ordinary edits after a job is ready for payment', async () => {
    mockedGetJobRecord.mockResolvedValue({
      ...BASE_JOB,
      status: 'ready_for_payment',
    } as never);
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id: 'JOB-1', priority: 'high'}),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(409);
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
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
        inventoryLocation: 'Van 1',
        reserveQuantity: 2,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedReserveInventoryForJob).toHaveBeenCalledOnce();
    expect(mockedUpdateInventoryPart).not.toHaveBeenCalled();
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith(
            'org_1',
            'JOB-1',
            expect.objectContaining({
              requiredSkus: ['SKU-1'],
              quote: expect.objectContaining({
                partEstimate: 42.5,
                estimatedTotal: 92.5,
              }),
            }),
        );
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
        inventoryLocation: 'Van 1',
        reserveQuantity: 1,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(404);
    expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
  });

  it('rejects reserve requests when available quantity is exhausted',
     async () => {
       mockedListInventorySkuLocationBalances.mockResolvedValue([
         {
           orgId: 'org_1',
           sku: 'SKU-1',
           location: 'Van 1',
           onHand: 8,
           reserved: 8,
           available: 0,
           entryCount: 1,
           lastUpdatedAt: '2026-07-20T10:00:00.000Z',
         },
       ] as never);

       const request = new Request('http://localhost/api/jobs', {
         method: 'PATCH',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           id: 'JOB-1',
           inventoryAction: 'reserve',
           inventorySku: 'SKU-1',
           inventoryLocation: 'Van 1',
           reserveQuantity: 1,
         }),
       });

       const response = await PATCH(request);

       expect(response?.status).toBe(400);
       expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
     });

  it('returns 400 when reserve quantity is invalid', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        inventoryAction: 'reserve',
        inventorySku: 'SKU-1',
        inventoryLocation: 'Van 1',
        reserveQuantity: 0,
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
  });

  it('returns 404 when reserve location does not match the sku location',
     async () => {
       const request = new Request('http://localhost/api/jobs', {
         method: 'PATCH',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           id: 'JOB-1',
           inventoryAction: 'reserve',
           inventorySku: 'SKU-1',
           inventoryLocation: 'Warehouse A',
           reserveQuantity: 1,
         }),
       });

       const response = await PATCH(request);

       expect(response?.status).toBe(404);
       expect(mockedReserveInventoryForJob).not.toHaveBeenCalled();
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
       expect(mockedUpdateJobRecord)
           .toHaveBeenCalledWith(
               'org_1',
               'JOB-1',
               expect.objectContaining({
                 requiredSkus: ['SKU-NEW'],
                 quote: expect.objectContaining({
                   partEstimate: 35,
                   estimatedTotal: 85,
                 }),
               }),
           );
     });

  it('recomputes labor and total when technician changes without quote payload',
     async () => {
       mockedGetJobRecord.mockResolvedValue({
         ...BASE_JOB,
         quote: {
           ...BASE_JOB.quote,
           partEstimate: 120,
           estimatedMinutes: 90,
         },
       } as never);

       const request = new Request('http://localhost/api/jobs', {
         method: 'PATCH',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({
           id: 'JOB-1',
           assignedTechnicianIds: ['tech_1'],
         }),
       });

       const response = await PATCH(request);

       expect(response?.status).toBe(200);
       expect(mockedUpdateJobRecord)
           .toHaveBeenCalledWith(
               'org_1',
               'JOB-1',
               expect.objectContaining({
                 assignedTechnicianIds: ['tech_1'],
                 assignedTechnicianName: 'Taylor Ford',
                 laborRate: 95,
                 quote: expect.objectContaining({
                   laborEstimate: 142.5,
                   estimatedTotal: 262.5,
                 }),
               }),
           );
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
                ledger: expect.arrayContaining([
                  expect.objectContaining({action: 'clock_in'}),
                ]),
              }),
            }),
        );
  });

  it('clocks out a job via time clock action', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'clock_out',
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
                clockedOutAt: expect.any(String),
                ledger: expect.arrayContaining([
                  expect.objectContaining({action: 'clock_out'}),
                ]),
              }),
            }),
        );
  });

  it('saves markdown time notes via time clock action', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_notes',
        timeClockNotes: '## Shift Log\n- Started early',
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateJobRecord)
        .toHaveBeenCalledWith(
            'org_1',
            'JOB-1',
            expect.objectContaining({
              timeClock: {notes: '## Shift Log\n- Started early'},
            }),
        );
  });

  it('updates editable time clock fields', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_time_clock',
        timeClockClockedInAt: '2026-07-22T10:00:00.000Z',
        timeClockClockedOutAt: '2026-07-22T12:30:00.000Z',
        timeClockBreakMinutes: 15,
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
                clockedInAt: '2026-07-22T10:00:00.000Z',
                clockedOutAt: '2026-07-22T12:30:00.000Z',
                breakMinutes: 15,
              }),
            }),
        );
  });

  it('updates time clock ledger entries through set_time_clock', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_time_clock',
        timeClockLedger: [
          {
            id: 'entry-1',
            action: 'clock_in',
            at: '2026-07-22T10:00:00.000Z',
            note: 'Start',
          },
          {
            id: 'entry-2',
            action: 'clock_out',
            at: '2026-07-22T11:30:00.000Z',
            note: 'Done',
          },
        ],
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
                clockedInAt: '2026-07-22T10:00:00.000Z',
                clockedOutAt: '2026-07-22T11:30:00.000Z',
                ledger: expect.arrayContaining([
                  expect.objectContaining({id: 'entry-1', action: 'clock_in'}),
                  expect.objectContaining({id: 'entry-2', action: 'clock_out'}),
                ]),
              }),
            }),
        );
  });

  it('rejects invalid time clock ledger payload', async () => {
    const request = new Request('http://localhost/api/jobs', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        timeClockAction: 'set_time_clock',
        timeClockLedger: [
          {
            id: '',
            action: 'clock_in',
            at: 'not-a-date',
          },
        ],
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(400);
    expect(mockedUpdateJobRecord).not.toHaveBeenCalled();
  });
});
