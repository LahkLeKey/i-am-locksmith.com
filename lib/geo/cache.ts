import {prisma} from '@/lib/db/prisma';
import {createHash} from 'node:crypto';

const MAX_CACHE_BYTES =
    Number(process.env.GEO_MAX_CACHE_RESPONSE_BYTES ?? 1_000_000);

type CacheRow = {
  id: string; response: unknown; createdAt: Date; expiresAt: Date;
  staleUntil: Date;
};

type GeoCacheClient = {
  geoCacheEntry: {
    findUnique: (args: {where: {cacheKey: string}}) => Promise<CacheRow|null>;
    update:
        (args: {where: {cacheKey: string}; data: Record<string, unknown>}) =>
            Promise<unknown>;
    updateMany: (args: {
      where: Record<string, unknown>; data: Record<string, unknown>
    }) => Promise<{count: number}>;
    upsert: (args: {
      where: {cacheKey: string}; create: Record<string, unknown>;
      update: Record<string, unknown>
    }) => Promise<unknown>;
  };
  geoProviderQuota: {
    upsert: (args: {
      where: {provider: string}; create: Record<string, unknown>;
      update: Record<string, unknown>
    }) => Promise<unknown>;
    updateMany: (args: {
      where: Record<string, unknown>; data: Record<string, unknown>
    }) => Promise<{count: number}>;
  };
  geoCacheLease: {
    create:
        (args: {data: {cacheKey: string; owner: string; leaseUntil: Date}}) =>
            Promise<unknown>;
    updateMany: (args: {
      where: Record<string, unknown>; data: Record<string, unknown>
    }) => Promise<{count: number}>;
    deleteMany: (args: {where: Record<string, unknown>}) =>
        Promise<{count: number}>;
  };
};

export type GeoCacheRead<T> =|{
  status: 'HIT'|'STALE';
  value: T;
  createdAt: Date;
  expiresAt: Date
}
|{
  status: 'MISS';
  value: null
};

export function buildGeoCacheIdentity(normalizedRequest: unknown) {
  const serialized = JSON.stringify(
      normalizedRequest, Object.keys(normalizedRequest as object).sort());
  const requestHash = createHash('sha256').update(serialized).digest('hex');
  return {
    cacheKey: `geo:v1:nominatim:geocode:${requestHash}`,
    requestHash,
    normalizedRequest,
  };
}

export async function getGeoCache<T>(cacheKey: string):
    Promise<GeoCacheRead<T>> {
  const client = prisma as unknown as GeoCacheClient;
  const row = await client.geoCacheEntry.findUnique({where: {cacheKey}});
  if (!row || row.staleUntil <= new Date())
    return {status: 'MISS', value: null};

  void client.geoCacheEntry
      .update({
        where: {cacheKey},
        data: {lastAccessedAt: new Date(), hitCount: {increment: 1}},
      })
      .catch(() => undefined);

  return {
    status: row.expiresAt > new Date() ? 'HIT' : 'STALE',
    value: row.response as T,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

export async function setGeoCache(input: {
  cacheKey: string; namespace: string; provider: string; endpoint: string;
  requestHash: string;
  normalizedRequest: unknown;
  response: unknown;
  responseStatus: number;
  expiresAt: Date;
  staleUntil: Date;
}) {
  const serialized = JSON.stringify(input.response);
  const byteSize = Buffer.byteLength(serialized);
  if (byteSize > MAX_CACHE_BYTES) return false;
  const client = prisma as unknown as GeoCacheClient;
  const data =
      {...input, byteSize, refreshLeaseUntil: null, refreshLeaseOwner: null};
  await client.geoCacheEntry.upsert({
    where: {cacheKey: input.cacheKey},
    create: data,
    update: {...data, createdAt: new Date(), lastAccessedAt: new Date()},
  });
  return true;
}

export async function acquireGeoCacheLease(
    cacheKey: string, requestId: string, leaseMs: number) {
  const client = prisma as unknown as GeoCacheClient;
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + leaseMs);
  try {
    await client.geoCacheLease.create(
        {data: {cacheKey, owner: requestId, leaseUntil}});
    return true;
  } catch {
    const result = await client.geoCacheLease.updateMany({
      where: {cacheKey, leaseUntil: {lt: now}},
      data: {owner: requestId, leaseUntil},
    });
    return result.count === 1;
  }
}

export async function releaseGeoCacheLease(
    cacheKey: string, requestId: string) {
  const client = prisma as unknown as GeoCacheClient;
  await client.geoCacheLease.deleteMany({where: {cacheKey, owner: requestId}});
}

export async function acquireProviderQuota(
    provider: string, intervalMs: number) {
  const client = prisma as unknown as GeoCacheClient;
  const now = new Date();
  await client.geoProviderQuota.upsert({
    where: {provider},
    create: {provider, nextAllowedAt: now},
    update: {},
  });
  const result = await client.geoProviderQuota.updateMany({
    where: {provider, nextAllowedAt: {lte: now}},
    data: {nextAllowedAt: new Date(now.getTime() + intervalMs)},
  });
  return result.count === 1;
}