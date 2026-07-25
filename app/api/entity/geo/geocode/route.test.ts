import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock(
    '@/lib/geo/service',
    () => ({
      GeoServiceError: class GeoServiceError extends Error{
        constructor(public code: string, message: string) {
          super(message);
        }
      },
                                                     geocodeAddress: vi.fn(),
    }));

vi.mock('@/lib/rbac/server', () => ({
                               getAuthorizationContext: vi.fn(),
                             }));

import {geocodeAddress} from '@/lib/geo/service';
import {getAuthorizationContext} from '@/lib/rbac/server';

import {GET} from './route';

const mockedGeocodeAddress = vi.mocked(geocodeAddress);
const mockedGetAuthorizationContext = vi.mocked(getAuthorizationContext);

describe('geo geocode api route', () => {
  beforeEach(() => {
    mockedGeocodeAddress.mockReset();
    mockedGetAuthorizationContext.mockReset();
    mockedGetAuthorizationContext.mockResolvedValue({
      userId: 'user_1',
      orgId: 'org_1',
      orgRole: 'owner_admin',
      userRole: 'owner_admin',
      clerkOrgRole: 'org:admin',
      effectivePermissions: new Set(),
    });
  });

  it('rejects unauthenticated requests', async () => {
    mockedGetAuthorizationContext.mockResolvedValue(null);

    const response = await GET(new Request(
        'http://localhost/api/entity/geo/geocode?q=123%20Main%20Street'));

    expect(response.status).toBe(401);
    expect(mockedGeocodeAddress).not.toHaveBeenCalled();
  });

  it('rejects a blank address query', async () => {
    const response = await GET(
        new Request('http://localhost/api/entity/geo/geocode?q=%20%20'));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {code: 'INVALID_REQUEST', retryable: false},
    });
    expect(mockedGeocodeAddress).not.toHaveBeenCalled();
  });

  it('returns normalized geocoding data with cache and attribution metadata',
     async () => {
       mockedGeocodeAddress.mockResolvedValue({
         data: [{
           displayName: '123 Main Street, Minneapolis, Minnesota',
           latitude: 44.9778,
           longitude: -93.265,
           osmType: 'way',
           osmId: 123,
         }],
         cache: {
           status: 'MISS',
           createdAt: '2026-07-25T18:00:00.000Z',
           expiresAt: '2026-07-26T18:00:00.000Z',
           stale: false,
         },
       });

       const response = await GET(new Request(
           'http://localhost/api/entity/geo/geocode?q=123%20Main%20Street&limit=3'));
       const payload = await response.json();

       expect(response.status).toBe(200);
       expect(mockedGeocodeAddress).toHaveBeenCalledWith({
         query: '123 Main Street',
         limit: 3,
         language: 'en',
       });
       expect(payload).toMatchObject({
         data: [{latitude: 44.9778, longitude: -93.265}],
         provider: 'nominatim',
         cache: {status: 'MISS', stale: false},
         attribution: {
           text: '© OpenStreetMap contributors',
           required: true,
         },
       });
       expect(payload.requestId).toEqual(expect.any(String));
       expect(payload.cache.cacheKey).toBeUndefined();
     });
});