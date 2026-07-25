import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));
vi.mock(
    '@/lib/customers/repository', () => ({
      createCustomerServiceSite: vi.fn(),
      updateCustomerServiceSite: vi.fn(),
    }));

import {createCustomerServiceSite, updateCustomerServiceSite} from '@/lib/customers/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';

import {PATCH, POST} from './route';

describe('customer service sites api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthorizationContext).mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });
    vi.mocked(authorizePermission).mockResolvedValue({state: 'authorized'});
  });

  it('adds a verified service site to an existing tenant customer',
     async () => {
       vi.mocked(createCustomerServiceSite).mockResolvedValue({
         id: 'site_2',
         label: 'Warehouse',
         address: '456 Central Avenue',
         latitude: 44.98,
         longitude: -93.27,
         isPrimary: false,
       });
       const response = await POST(
           new Request('http://localhost/api/customers/customer_1/sites', {
             method: 'POST',
             headers: {'content-type': 'application/json'},
             body: JSON.stringify({
               label: ' Warehouse ',
               address: ' 456 Central Avenue ',
               latitude: 44.98,
               longitude: -93.27,
             }),
           }),
           {params: Promise.resolve({customerId: 'customer_1'})});

       expect(response?.status).toBe(200);
       expect(createCustomerServiceSite)
           .toHaveBeenCalledWith('org_1', 'customer_1', {
             label: 'Warehouse',
             address: '456 Central Avenue',
             latitude: 44.98,
             longitude: -93.27,
           });
     });

  it('updates a tenant customer service site', async () => {
    vi.mocked(updateCustomerServiceSite).mockResolvedValue({
      id: 'site_1', label: 'Main entrance', address: '123 Main Street',
      latitude: 44.97, longitude: -93.26, isPrimary: true,
    });
    const response = await PATCH(
        new Request('http://localhost/api/customers/customer_1/sites', {
          method: 'PATCH', headers: {'content-type': 'application/json'},
          body: JSON.stringify({
            id: 'site_1', label: ' Main entrance ',
            address: ' 123 Main Street ', latitude: 44.97,
            longitude: -93.26, isPrimary: true,
          }),
        }), {params: Promise.resolve({customerId: 'customer_1'})});

    expect(response?.status).toBe(200);
    expect(authorizePermission).toHaveBeenCalledWith('customers.manage');
    expect(updateCustomerServiceSite).toHaveBeenCalledWith(
        'org_1', 'customer_1', 'site_1', {
          label: 'Main entrance', address: '123 Main Street',
          latitude: 44.97, longitude: -93.26, isPrimary: true,
        });
  });
});