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

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData,} from '@/lib/dashboard/snapshotMutations';

import {DELETE, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedGetOrCreateOrgSnapshot = vi.mocked(getOrCreateOrgSnapshot);
const mockedGetDashboardDataForSnapshot =
    vi.mocked(getDashboardDataForSnapshot);
const mockedPersistDashboardData = vi.mocked(persistDashboardData);

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
});
