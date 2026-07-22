import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/rbac/server', () => ({
                               authorizePermission: vi.fn(),
                               getAuthorizationContext: vi.fn(),
                             }));

vi.mock('@/lib/technicians/repository', () => ({
                                          createTechnician: vi.fn(),
                                          listTechnicians: vi.fn(),
                                          updateTechnician: vi.fn(),
                                        }));

import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {createTechnician, listTechnicians, updateTechnician} from '@/lib/technicians/repository';

import {GET, PATCH, POST} from './route';

const mockedAuthorizePermission = vi.mocked(authorizePermission);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);
const mockedCreateTechnician = vi.mocked(createTechnician);
const mockedListTechnicians = vi.mocked(listTechnicians);
const mockedUpdateTechnician = vi.mocked(updateTechnician);

describe('technicians api route', () => {
  beforeEach(() => {
    mockedAuthorizePermission.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedCreateTechnician.mockReset();
    mockedListTechnicians.mockReset();
    mockedUpdateTechnician.mockReset();

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

  it('lists technicians', async () => {
    mockedListTechnicians.mockResolvedValue([
      {
        id: 'tech_1',
        orgId: 'org_1',
        fullName: 'Taylor Ford',
        hourlyRate: 95,
        lockpickingSkills: ['residential'],
        availabilityStatus: 'available',
        availabilityNote: null,
        isActive: true,
      },
    ] as never);

    const response = await GET();

    expect(response?.status).toBe(200);
    expect(mockedAuthorizePermission).toHaveBeenCalledWith('technicians.read');
    expect(mockedListTechnicians).toHaveBeenCalledWith('org_1');
  });

  it('creates a technician', async () => {
    mockedCreateTechnician.mockResolvedValue({
      id: 'tech_1',
      orgId: 'org_1',
      fullName: 'Taylor Ford',
      hourlyRate: 95,
      lockpickingSkills: ['residential'],
      availabilityStatus: 'available',
      availabilityNote: null,
      isActive: true,
    } as never);

    const request = new Request('http://localhost/api/technicians', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        fullName: 'Taylor Ford',
        hourlyRate: 95,
        lockpickingSkills: ['residential'],
        availabilityStatus: 'available',
        isActive: true,
      }),
    });

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedAuthorizePermission)
        .toHaveBeenCalledWith('technicians.manage');
    expect(mockedCreateTechnician)
        .toHaveBeenCalledWith(
            'org_1',
            expect.objectContaining({
              fullName: 'Taylor Ford',
              hourlyRate: 95,
              lockpickingSkills: ['residential'],
            }),
        );
  });

  it('updates a technician', async () => {
    mockedUpdateTechnician.mockResolvedValue({
      id: 'tech_1',
      orgId: 'org_1',
      fullName: 'Taylor Ford',
      hourlyRate: 102,
      lockpickingSkills: ['residential', 'automotive'],
      availabilityStatus: 'busy',
      availabilityNote: 'On emergency job',
      isActive: true,
    } as never);

    const request = new Request('http://localhost/api/technicians', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        id: 'tech_1',
        hourlyRate: 102,
        lockpickingSkills: ['residential', 'automotive'],
        availabilityStatus: 'busy',
        availabilityNote: 'On emergency job',
      }),
    });

    const response = await PATCH(request);

    expect(response?.status).toBe(200);
    expect(mockedUpdateTechnician)
        .toHaveBeenCalledWith(
            'org_1',
            'tech_1',
            expect.objectContaining(
                {hourlyRate: 102, availabilityStatus: 'busy'}),
        );
  });

  it('rejects create with invalid rate', async () => {
    const request = new Request('http://localhost/api/technicians', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({fullName: 'Taylor Ford', hourlyRate: -1}),
    });

    const response = await POST(request);

    expect(response?.status).toBe(400);
    expect(mockedCreateTechnician).not.toHaveBeenCalled();
  });
});
