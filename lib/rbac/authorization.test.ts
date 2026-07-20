import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@clerk/nextjs/server', () => {
  return {
    auth: vi.fn(),
    currentUser: vi.fn(),
  };
});

import {auth, currentUser} from '@clerk/nextjs/server';
import {authorizePermission, getAuthorizationContext} from './server';

const mockedAuth = vi.mocked(auth);
const mockedCurrentUser = vi.mocked(currentUser);

describe('authorization guards', () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    mockedCurrentUser.mockReset();
  });

  it('returns unauthenticated when no user session exists', async () => {
    mockedAuth.mockResolvedValue({userId: null} as never);

    const result = await authorizePermission('dashboard.read');

    expect(result).toEqual({state: 'unauthenticated'});
  });

  it('returns unauthenticated when auth provider throws', async () => {
    mockedAuth.mockRejectedValue(new Error('clerk unavailable'));

    const result = await authorizePermission('dashboard.read');

    expect(result).toEqual({state: 'unauthenticated'});
  });

  it('returns unauthenticated when user lookup throws', async () => {
    mockedAuth.mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_123',
      orgRole: 'org:admin',
    } as never);
    mockedCurrentUser.mockRejectedValue(new Error('profile unavailable'));

    const result = await authorizePermission('dashboard.read');

    expect(result).toEqual({state: 'unauthenticated'});
  });

  it('returns forbidden when permission is missing', async () => {
    mockedAuth.mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_123',
      orgRole: 'org:member',
    } as never);
    mockedCurrentUser.mockResolvedValue({
      publicMetadata: {
        orgRoles: {
          org_123: 'dispatcher',
        },
      },
    } as never);

    const result = await authorizePermission('settings.update');

    expect(result).toEqual({state: 'forbidden'});
  });

  it('returns authorized when permission is present', async () => {
    mockedAuth.mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_123',
      orgRole: 'org:admin',
    } as never);
    mockedCurrentUser.mockResolvedValue({
      publicMetadata: {
        orgRoles: {
          org_123: 'technician',
        },
      },
    } as never);

    const result = await authorizePermission('jobs.complete');

    expect(result).toEqual({state: 'authorized'});
  });

  it('fails closed for unknown org role even with elevated scoped metadata',
     async () => {
       mockedAuth.mockResolvedValue({
         userId: 'user_123',
         orgId: 'org_123',
         orgRole: 'org:unknown',
       } as never);
       mockedCurrentUser.mockResolvedValue({
         publicMetadata: {
           orgRoles: {
             org_123: 'owner_admin',
           },
         },
       } as never);

       const result = await authorizePermission('settings.update');

       expect(result).toEqual({state: 'forbidden'});
     });

  it('uses org-scoped role metadata instead of global metadata', async () => {
    mockedAuth.mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_123',
      orgRole: 'org:member',
    } as never);
    mockedCurrentUser.mockResolvedValue({
      publicMetadata: {
        role: 'owner_admin',
        orgRoles: {
          org_123: 'viewer_auditor',
        },
      },
    } as never);

    const context = await getAuthorizationContext();

    expect(context?.userRole).toBe('viewer_auditor');
    expect(context?.effectivePermissions.has('settings.update')).toBe(false);
  });
});
