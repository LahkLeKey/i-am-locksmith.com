import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/workspaces/workflow-actions', () => ({
                                               applyWorkflowAction: vi.fn(),
                                             }));

vi.mock(
    '@/lib/dashboard/snapshotMutations', () => ({
                                           getOrCreateOrgSnapshot: vi.fn(),
                                           getDashboardDataForSnapshot: vi.fn(),
                                           persistDashboardData: vi.fn(),
                                         }));

import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData} from '@/lib/dashboard/snapshotMutations';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {applyWorkflowAction} from '@/lib/workspaces/workflow-actions';

import {POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedGetOrCreateOrgSnapshot = vi.mocked(getOrCreateOrgSnapshot);
const mockedGetDashboardDataForSnapshot =
    vi.mocked(getDashboardDataForSnapshot);
const mockedPersistDashboardData = vi.mocked(persistDashboardData);
const mockedApplyWorkflowAction = vi.mocked(applyWorkflowAction);

describe('workflow actions route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedGetOrCreateOrgSnapshot.mockReset();
    mockedGetDashboardDataForSnapshot.mockReset();
    mockedPersistDashboardData.mockReset();
    mockedApplyWorkflowAction.mockReset();

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
    mockedGetOrCreateOrgSnapshot.mockResolvedValue({
      id: 'snap_1',
      orgId: 'org_1',
    } as never);
    mockedGetDashboardDataForSnapshot.mockResolvedValue({
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
      body: JSON.stringify({actionType: 'jobs.record_customer_follow_up'}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockedPersistDashboardData).toHaveBeenCalledOnce();
  });

  it('initializes org snapshot when missing and proceeds', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
    mockedGetOrCreateOrgSnapshot.mockResolvedValue({
      id: 'snap_bootstrap',
      orgId: 'org_1',
    } as never);
    mockedGetDashboardDataForSnapshot.mockResolvedValue({
      generatedAt: '2026-07-21T10:00:00.000Z',
      revenueToday: 0,
      openInvoices: 0,
      grossMarginWeek: 0,
      lowStockSkus: 0,
      vansBelowMin: 0,
      financialTrend: {revenue: [], expenses: [], profit: []},
      kpis: [],
      jobsQueue: [],
      replenishmentAlerts: [],
    });
    mockedApplyWorkflowAction.mockReturnValue({
      data: {
        generatedAt: '2026-07-21T10:01:00.000Z',
        revenueToday: 0,
        openInvoices: 0,
        grossMarginWeek: 0,
        lowStockSkus: 0,
        vansBelowMin: 0,
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
    expect(mockedGetOrCreateOrgSnapshot).toHaveBeenCalledWith('org_1');
  });
});
