import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('./cache', () => ({
  acquireGeoCacheLease: vi.fn(),
  acquireProviderQuota: vi.fn(),
  buildGeoCacheIdentity: vi.fn(),
  getGeoCache: vi.fn(),
  releaseGeoCacheLease: vi.fn(),
  setGeoCache: vi.fn(),
}));

vi.mock('./nominatim-provider', () => ({
  fetchNominatimGeocode: vi.fn(),
}));

import {acquireGeoCacheLease, acquireProviderQuota, buildGeoCacheIdentity, getGeoCache, releaseGeoCacheLease, setGeoCache} from './cache';
import {fetchNominatimGeocode} from './nominatim-provider';
import {geocodeAddress} from './service';

const mockedGetGeoCache = vi.mocked(getGeoCache);
const mockedBuildIdentity = vi.mocked(buildGeoCacheIdentity);
const mockedAcquireLease = vi.mocked(acquireGeoCacheLease);
const mockedAcquireQuota = vi.mocked(acquireProviderQuota);
const mockedProvider = vi.mocked(fetchNominatimGeocode);
const mockedSetGeoCache = vi.mocked(setGeoCache);
const mockedReleaseLease = vi.mocked(releaseGeoCacheLease);

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedBuildIdentity.mockReturnValue({
      cacheKey: 'geo:v1:nominatim:geocode:hash',
      requestHash: 'hash',
      normalizedRequest: {language: 'en', limit: 5, query: '123 Main St'},
    });
    mockedAcquireLease.mockResolvedValue(true);
    mockedAcquireQuota.mockResolvedValue(true);
  });

  it('returns a fresh database cache hit without calling Nominatim', async () => {
    mockedGetGeoCache.mockResolvedValue({
      status: 'HIT',
      value: [{displayName: '123 Main St', latitude: 44, longitude: -93, osmType: 'way', osmId: 1}],
      createdAt: new Date('2026-07-25T18:00:00.000Z'),
      expiresAt: new Date('2026-07-26T18:00:00.000Z'),
    });

    const result = await geocodeAddress({query: '  123 Main St  ', limit: 5, language: 'en'});

    expect(result.cache.status).toBe('HIT');
    expect(mockedProvider).not.toHaveBeenCalled();
  });

  it('stores a normalized provider response after a cache miss', async () => {
    mockedGetGeoCache.mockResolvedValue({status: 'MISS', value: null});
    mockedProvider.mockResolvedValue([
      {displayName: '123 Main St', latitude: 44, longitude: -93, osmType: 'way', osmId: 1},
    ]);

    const result = await geocodeAddress({query: '123 Main St', limit: 5, language: 'en'});

    expect(result.cache.status).toBe('MISS');
    expect(mockedSetGeoCache).toHaveBeenCalledWith(expect.objectContaining({
      cacheKey: 'geo:v1:nominatim:geocode:hash',
      provider: 'nominatim',
      endpoint: 'geocode',
    }));
    expect(mockedReleaseLease).toHaveBeenCalled();
  });

  it('serves stale data when another invocation owns the refresh lease', async () => {
    mockedGetGeoCache.mockResolvedValue({
      status: 'STALE',
      value: [{displayName: 'Old result', latitude: 44, longitude: -93, osmType: 'way', osmId: 1}],
      createdAt: new Date('2026-07-20T18:00:00.000Z'),
      expiresAt: new Date('2026-07-21T18:00:00.000Z'),
    });
    mockedAcquireLease.mockResolvedValue(false);

    const result = await geocodeAddress({query: '123 Main St', limit: 5, language: 'en'});

    expect(result.cache.status).toBe('STALE');
    expect(mockedProvider).not.toHaveBeenCalled();
  });

  it('does not call the provider when another invocation owns a cold miss',
     async () => {
       mockedGetGeoCache.mockResolvedValue({status: 'MISS', value: null});
       mockedAcquireLease.mockResolvedValue(false);

       await expect(geocodeAddress({query: '123 Main St', limit: 5, language: 'en'}))
           .rejects.toMatchObject({code: 'UPSTREAM_RATE_LIMITED'});
       expect(mockedProvider).not.toHaveBeenCalled();
       expect(mockedAcquireQuota).not.toHaveBeenCalled();
     });

  it('releases its lease when provider quota is unavailable', async () => {
    mockedGetGeoCache.mockResolvedValue({status: 'MISS', value: null});
    mockedAcquireQuota.mockResolvedValue(false);

    await expect(geocodeAddress({query: '123 Main St', limit: 5, language: 'en'}))
        .rejects.toMatchObject({code: 'UPSTREAM_RATE_LIMITED'});
    expect(mockedReleaseLease).toHaveBeenCalledWith(
        'geo:v1:nominatim:geocode:hash', expect.any(String));
    expect(mockedProvider).not.toHaveBeenCalled();
  });
});