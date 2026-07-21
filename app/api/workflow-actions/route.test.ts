import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
  authorizePermission: vi.fn(),
  getAuthorizationContext: vi.fn(),
}));

vi.mock('@/lib/dashboard/repository', () => ({
                                        getDashboardData: vi.fn(),
                                      }));

vi.mock('@/lib/workspaces/workflow-actions', () => ({
                                               applyWorkflowAction: vi.fn(),
                                             }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dashboardSnapshot: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getDashboardData} from '@/lib/dashboard/repository';
import {applyWorkflowAction} from '@/lib/workspaces/workflow-actions';
import {prisma} from '@/lib/db/prisma';

import {POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedGetDashboardData = vi.mocked(getDashboardData);
const mockedApplyWorkflowAction = vi.mocked(applyWorkflowAction);
const mockedFindFirst = vi.mocked(prisma.dashboardSnapshot.findFirst);
const mockedCreate = vi.mocked(prisma.dashboardSnapshot.create);
const mockedUpdate = vi.mocked(prisma.dashboardSnapshot.update);

describe('workflow actions route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedGetDashboardData.mockReset();
    mockedApplyWorkflowAction.mockReset();
    mockedFindFirst.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });
  });

  it('rejects unsupported action types', async () => {
    const request = new Request('http://localhost/api/workflow-actions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({actionType: 'toString'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns forbidden when permission check fails', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request('http://localhost/api/workflow-actions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({actionType: 'jobs.dispatch_next'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns unauthorized when no auth context exists', async () => {
    mockedGetAuthorizationContext.mockResolvedValue(null);

    const request = new Request('http://localhost/api/workflow-actions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({actionType: 'jobs.dispatch_next'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns bad request when no active organization is set', async () => {
    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: null,
      clerkOrgRole: null,
      orgRole: null,
      userRole: null,
      effectivePermissions: new Set(),
    });

    const request = new Request('http://localhost/api/workflow-actions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({actionType: 'jobs.dispatch_next'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('updates snapshot on authorized action', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedFindFirst.mockResolvedValue({
      id: 'snap_1',
      orgId: 'org_1',
    } as never);
    mockedGetDashboardData.mockResolvedValue({
      generatedAt: '2026-07-21T10:00:00.000Z',
      revenueToday: 1,
      openInvoices: 1,
      grossMarginWeek: 1,
      lowStockSkus: 1,
      vansBelowMin: 1,
      financialTrend: {revenue: [], expenses: [], profit: []},
      kpis: [],
      jobsQueue: [],
      replenishmentAlerts: [],
    });
    mockedApplyWorkflowAction.mockReturnValue({
      data: {
        generatedAt: '2026-07-21T10:01:00.000Z',
        revenueToday: 2,
        openInvoices: 1,
        grossMarginWeek: 1,
        lowStockSkus: 1,
        vansBelowMin: 1,
        financialTrend: {revenue: [], expenses: [], profit: []},
        kpis: [],
        jobsQueue: [],
        replenishmentAlerts: [],
      },
      message: 'ok',
    } as never);

    const request = new Request('http://localhost/api/workflow-actions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({actionType: 'jobs.dispatch_next'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledOnce();
  });

  it('bootstraps org snapshot from fallback when none exists for active org',
     async () => {
       mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
       mockedFindFirst
           .mockResolvedValueOnce(null as never)
           .mockResolvedValueOnce({
             id: 'fallback_1',
             generatedAt: new Date('2026-07-21T10:00:00.000Z'),
             revenueToday: 10,
             openInvoices: 2,
             grossMarginWeek: 10,
             lowStockSkus: 1,
             vansBelowMin: 1,
             financialTrend: {revenue: [], expenses: [], profit: []},
             kpis: [],
             jobsQueue: [],
             replenishmentAlerts: [],
           } as never);
       mockedCreate.mockResolvedValue({
         id: 'snap_bootstrap',
         orgId: 'org_1',
       } as never);
       mockedGetDashboardData.mockResolvedValue({
         generatedAt: '2026-07-21T10:00:00.000Z',
         revenueToday: 1,
         openInvoices: 1,
         grossMarginWeek: 1,
         lowStockSkus: 1,
         vansBelowMin: 1,
         financialTrend: {revenue: [], expenses: [], profit: []},
         kpis: [],
         jobsQueue: [],
         replenishmentAlerts: [],
       });
       mockedApplyWorkflowAction.mockReturnValue({
         data: {
           generatedAt: '2026-07-21T10:01:00.000Z',
           revenueToday: 2,
           openInvoices: 1,
           grossMarginWeek: 1,
           lowStockSkus: 1,
           vansBelowMin: 1,
           financialTrend: {revenue: [], expenses: [], profit: []},
           kpis: [],
           jobsQueue: [],
           replenishmentAlerts: [],
         },
         message: 'ok',
       } as never);

       const request = new Request('http://localhost/api/workflow-actions', {
         method: 'POST',
         headers: {'content-type': 'application/json'},
         body: JSON.stringify({actionType: 'jobs.dispatch_next'}),
       });

       const response = await POST(request);

       expect(response.status).toBe(200);
       expect(mockedCreate).toHaveBeenCalledOnce();
     });
});
