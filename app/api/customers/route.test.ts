import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/customers/repository', () => ({
                                        createCustomerWithSite: vi.fn(),
                                        listCustomers: vi.fn(),
                                        updateCustomer: vi.fn(),
                                      }));

import {createCustomerWithSite, listCustomers, updateCustomer} from '@/lib/customers/repository';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';

import {GET, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCreateCustomerWithSite = vi.mocked(createCustomerWithSite);
const mockedListCustomers = vi.mocked(listCustomers);
const mockedUpdateCustomer = vi.mocked(updateCustomer);

describe('customers api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      clerkOrgRole: 'org:admin',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      effectivePermissions: new Set(),
    });
    mockedAuthorizePermission.mockResolvedValue({state: 'authorized'});
  });

  it('lists tenant customers with their service sites', async () => {
    mockedListCustomers.mockResolvedValue([]);

    const response = await GET();

    expect(response?.status).toBe(200);
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('customers.read');
    expect(mockedListCustomers).toHaveBeenCalledWith('org_1');
  });

  it('creates a customer and verified primary service site', async () => {
    mockedCreateCustomerWithSite.mockResolvedValue({
      id: 'customer_1',
      orgId: 'org_1',
      displayName: 'Northside Medical',
      email: 'dispatch@northside.example',
      phone: '612-555-0123',
      notes: null,
      sites: [{
        id: 'site_1',
        label: 'Main entrance',
        address: '123 Main Street, Minneapolis, Minnesota',
        latitude: 44.9778,
        longitude: -93.265,
        isPrimary: true,
      }],
    });
    const response = await POST(new Request('http://localhost/api/customers', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        displayName: ' Northside Medical ',
        email: ' dispatch@northside.example ',
        phone: ' 612-555-0123 ',
        site: {
          label: ' Main entrance ',
          address: ' 123 Main Street, Minneapolis, Minnesota ',
          latitude: 44.9778,
          longitude: -93.265,
        },
      }),
    }));

    expect(response?.status).toBe(200);
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('customers.manage');
    expect(mockedCreateCustomerWithSite).toHaveBeenCalledWith('org_1', {
      displayName: 'Northside Medical',
      email: 'dispatch@northside.example',
      phone: '612-555-0123',
      notes: null,
      site: {
        label: 'Main entrance',
        address: '123 Main Street, Minneapolis, Minnesota',
        latitude: 44.9778,
        longitude: -93.265,
      },
    });
  });

  it('rejects a partial coordinate pair', async () => {
    const response = await POST(new Request('http://localhost/api/customers', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        displayName: 'Northside Medical',
        site: {
          label: 'Main entrance',
          address: '123 Main Street',
          latitude: 44.9
        },
      }),
    }));

    expect(response?.status).toBe(400);
    expect(mockedCreateCustomerWithSite).not.toHaveBeenCalled();
  });

  it('updates tenant customer contact details and notes', async () => {
    mockedUpdateCustomer.mockResolvedValue({
      id: 'customer_1', orgId: 'org_1', displayName: 'Northside Medical',
      email: 'office@northside.example', phone: '612-555-0199',
      notes: 'Use loading entrance after 5 PM', sites: [],
    });
    const response = await PATCH(new Request('http://localhost/api/customers', {
      method: 'PATCH', headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'customer_1', displayName: ' Northside Medical ',
        email: ' office@northside.example ', phone: ' 612-555-0199 ',
        notes: ' Use loading entrance after 5 PM ',
      }),
    }));

    expect(response?.status).toBe(200);
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('customers.manage');
    expect(mockedUpdateCustomer).toHaveBeenCalledWith('org_1', 'customer_1', {
      displayName: 'Northside Medical', email: 'office@northside.example',
      phone: '612-555-0199', notes: 'Use loading entrance after 5 PM',
    });
  });
});