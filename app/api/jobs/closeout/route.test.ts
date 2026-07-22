import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/jobs/repository', () => ({
                                   closeOutJobRecord: vi.fn(),
                                 }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {closeOutJobRecord} from '@/lib/jobs/repository';

import {POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCloseOutJobRecord = vi.mocked(closeOutJobRecord);

describe('jobs closeout api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedCloseOutJobRecord.mockReset();

    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });

    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});

    mockedCloseOutJobRecord.mockResolvedValue({
      id: 'JOB-1',
      customerName: 'Acme',
      site: 'Denver',
      priority: 'normal',
      status: 'completed',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: ['SKU-1'],
      followUpNote: null,
      quote: {
        partEstimate: 100,
        laborEstimate: 80,
        estimatedMinutes: 60,
        estimatedTotal: 180,
        notes: null,
      },
      closeout: {
        actualPartCost: 95,
        actualLaborCost: 90,
        actualMinutes: 75,
        finalTotal: 185,
        closedOutAt: new Date().toISOString(),
        resolutionNotes: 'Completed successfully',
      },
    } as never);
  });

  it('closes out a job with actuals', async () => {
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: 90,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
        resolutionNotes: 'Done',
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedCloseOutJobRecord).toHaveBeenCalledOnce();
  });

  it('returns 400 for invalid numeric payload', async () => {
    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: -1,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCloseOutJobRecord).not.toHaveBeenCalled();
  });

  it('returns forbidden when permission denied', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    const request = new Request('http://localhost/api/jobs/closeout', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'JOB-1',
        actualPartCost: 90,
        actualLaborCost: 80,
        actualMinutes: 70,
        finalTotal: 170,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(403);
  });
});
