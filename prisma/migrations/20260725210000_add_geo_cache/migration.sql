CREATE TABLE "GeoCacheEntry" (
    "id" TEXT NOT NULL,
    "cacheKey" VARCHAR(128) NOT NULL,
    "namespace" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "endpoint" VARCHAR(50) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "normalizedRequest" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "byteSize" INTEGER,
    "regionKey" VARCHAR(100),
    "dataVersion" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "staleUntil" TIMESTAMP(3) NOT NULL,
    "refreshLeaseUntil" TIMESTAMP(3),
    "refreshLeaseOwner" VARCHAR(100),
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hitCount" BIGINT NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GeoCacheEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeoProviderQuota" (
    "provider" VARCHAR(30) NOT NULL,
    "nextAllowedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeoProviderQuota_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE "GeoCacheLease" (
    "cacheKey" VARCHAR(128) NOT NULL,
    "owner" VARCHAR(100) NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeoCacheLease_pkey" PRIMARY KEY ("cacheKey")
);

CREATE UNIQUE INDEX "GeoCacheEntry_cacheKey_key" ON "GeoCacheEntry"("cacheKey");
CREATE INDEX "GeoCacheEntry_namespace_expiresAt_idx" ON "GeoCacheEntry"("namespace", "expiresAt");
CREATE INDEX "GeoCacheEntry_provider_endpoint_expiresAt_idx" ON "GeoCacheEntry"("provider", "endpoint", "expiresAt");
CREATE INDEX "GeoCacheEntry_regionKey_expiresAt_idx" ON "GeoCacheEntry"("regionKey", "expiresAt");
CREATE INDEX "GeoCacheEntry_lastAccessedAt_idx" ON "GeoCacheEntry"("lastAccessedAt");
CREATE INDEX "GeoCacheLease_leaseUntil_idx" ON "GeoCacheLease"("leaseUntil");