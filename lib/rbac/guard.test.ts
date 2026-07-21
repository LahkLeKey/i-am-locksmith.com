import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('next/navigation', () => {
  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock('./server', () => {
  return {
    authorizePermission: vi.fn(),
    getAuthorizationContext: vi.fn(),
  };
});

import {notFound, redirect} from 'next/navigation';

import type {AuthorizationContext} from './server';
import {authorizePermission, getAuthorizationContext} from './server';
import {requireAuthenticatedContext, requireRouteContext, requireRoutePermission} from './guard';

const mockedRedirect = vi.mocked(redirect);
const mockedNotFound = vi.mocked(notFound);
const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);

describe('rbac guard', () => {
  beforeEach(() => {
    mockedRedirect.mockReset();
    mockedNotFound.mockReset();
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
  });

  it('redirects to sign-in when no authenticated context exists', async () => {
    mockedGetAuthorizationContext.mockResolvedValue(null);

    await requireAuthenticatedContext();

    expect(mockedRedirect).toHaveBeenCalledWith('/sign-in');
    expect(mockedRedirect).toHaveBeenCalledTimes(1);
  });

  it('redirects to sign-in when route permission check is unauthenticated',
     async () => {
       mockedAuthorizePermission.mockResolvedValue({state: 'unauthenticated'});

       await requireRoutePermission('/dashboard');

       expect(mockedRedirect).toHaveBeenCalledWith('/sign-in');
       expect(mockedRedirect).toHaveBeenCalledTimes(1);
       expect(mockedNotFound).not.toHaveBeenCalled();
     });

  it('calls notFound when route permission check is forbidden', async () => {
    mockedAuthorizePermission.mockResolvedValue({state: 'forbidden'});

    await requireRoutePermission('/settings');

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('returns context when authenticated and does not redirect', async () => {
    const context: AuthorizationContext = {
      userId: 'user_123',
      orgId: 'org_123',
      clerkOrgRole: 'org:member',
      orgRole: null,
      userRole: 'dispatcher',
      effectivePermissions: new Set(['dashboard.read']),
    };
    mockedGetAuthorizationContext.mockResolvedValue(context);

    const result = await requireAuthenticatedContext();

    expect(result).toEqual(context);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('returns context when route context permission is granted', async () => {
    const context: AuthorizationContext = {
      userId: 'user_123',
      orgId: 'org_123',
      clerkOrgRole: 'org:member',
      orgRole: null,
      userRole: 'dispatcher',
      effectivePermissions: new Set(['customers.read']),
    };
    mockedGetAuthorizationContext.mockResolvedValue(context);

    const result = await requireRouteContext('/customers');

    expect(result).toEqual(context);
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it('calls notFound when route context permission is missing', async () => {
    const context: AuthorizationContext = {
      userId: 'user_123',
      orgId: 'org_123',
      clerkOrgRole: 'org:member',
      orgRole: null,
      userRole: 'dispatcher',
      effectivePermissions: new Set(),
    };
    mockedGetAuthorizationContext.mockResolvedValue(context);

    await requireRouteContext('/customers');

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});