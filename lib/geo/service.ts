import {randomUUID} from 'node:crypto';

import {acquireGeoCacheLease, acquireProviderQuota, buildGeoCacheIdentity, getGeoCache, releaseGeoCacheLease, setGeoCache} from './cache';
import {fetchNominatimGeocode} from './nominatim-provider';
import type {GeocodeRequest, GeocodeResult, GeoServiceResult} from './types';

export class GeoServiceError extends Error {
  constructor(public readonly code: 'UPSTREAM_RATE_LIMITED', message: string) {
    super(message);
    this.name = 'GeoServiceError';
  }
}

export async function geocodeAddress(request: GeocodeRequest):
    Promise<GeoServiceResult<GeocodeResult[]>> {
  const normalizedRequest = {
    language: request.language.trim() || 'en',
    limit: request.limit,
    query: request.query.trim().normalize('NFKC').replace(/\s+/g, ' '),
  };
  const identity = buildGeoCacheIdentity(normalizedRequest);
  const cached = await getGeoCache<GeocodeResult[]>(identity.cacheKey);
  if (cached.status === 'HIT') {
    return {
      data: cached.value,
      cache: {
        status: 'HIT',
        createdAt: cached.createdAt.toISOString(),
        expiresAt: cached.expiresAt.toISOString(),
        stale: false
      }
    };
  }

  const requestId = randomUUID();
  const lease =
      await acquireGeoCacheLease(identity.cacheKey, requestId, 30_000);
  if (!lease) {
    if (cached.status === 'STALE') {
      return {
        data: cached.value,
        cache: {
          status: 'STALE',
          createdAt: cached.createdAt.toISOString(),
          expiresAt: cached.expiresAt.toISOString(),
          stale: true
        }
      };
    }
    throw new GeoServiceError(
        'UPSTREAM_RATE_LIMITED', 'Another request is refreshing this address.');
  }

  try {
    const quota = await acquireProviderQuota(
        'nominatim', Number(process.env.GEO_NOMINATIM_INTERVAL_MS ?? 1100));
    if (!quota && cached.status === 'STALE') {
      return {
        data: cached.value,
        cache: {
          status: 'STALE',
          createdAt: cached.createdAt.toISOString(),
          expiresAt: cached.expiresAt.toISOString(),
          stale: true
        }
      };
    }
    if (!quota) {
      throw new GeoServiceError(
          'UPSTREAM_RATE_LIMITED',
          'The location provider is temporarily rate limited.');
    }

    const data = await fetchNominatimGeocode(normalizedRequest);
    const createdAt = new Date();
    const freshMs = data.length === 0 ? 10 * 60_000 : 24 * 60 * 60_000;
    const staleMs = data.length === 0 ? 0 : 3 * 24 * 60 * 60_000;
    const expiresAt = new Date(createdAt.getTime() + freshMs);
    await setGeoCache({
      ...identity,
      normalizedRequest: {requestHash: identity.requestHash},
      namespace: 'geo',
      provider: 'nominatim',
      endpoint: 'geocode',
      response: data,
      responseStatus: 200,
      expiresAt,
      staleUntil: new Date(expiresAt.getTime() + staleMs)
    });
    return {
      data,
      cache: {
        status: cached.status === 'STALE' ? 'REFRESHED' : 'MISS',
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        stale: false
      }
    };
  } catch (error) {
    if (cached.status === 'STALE' && !(error instanceof GeoServiceError)) {
      return {
        data: cached.value,
        cache: {
          status: 'STALE',
          createdAt: cached.createdAt.toISOString(),
          expiresAt: cached.expiresAt.toISOString(),
          stale: true
        }
      };
    }
    throw error;
  } finally {
    await releaseGeoCacheLease(identity.cacheKey, requestId);
  }
}