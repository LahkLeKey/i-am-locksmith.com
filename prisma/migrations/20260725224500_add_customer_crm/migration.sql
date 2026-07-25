CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceSite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceSite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobRecord" ADD COLUMN "customerId" TEXT;
ALTER TABLE "JobRecord" ADD COLUMN "serviceSiteId" TEXT;

CREATE INDEX "Customer_orgId_displayName_idx" ON "Customer"("orgId", "displayName");
CREATE INDEX "Customer_orgId_phone_idx" ON "Customer"("orgId", "phone");
CREATE INDEX "Customer_orgId_email_idx" ON "Customer"("orgId", "email");
CREATE INDEX "ServiceSite_orgId_customerId_isPrimary_idx" ON "ServiceSite"("orgId", "customerId", "isPrimary");
CREATE INDEX "ServiceSite_orgId_address_idx" ON "ServiceSite"("orgId", "address");
CREATE INDEX "JobRecord_orgId_customerId_updatedAt_idx" ON "JobRecord"("orgId", "customerId", "updatedAt");
CREATE INDEX "JobRecord_orgId_serviceSiteId_idx" ON "JobRecord"("orgId", "serviceSiteId");

ALTER TABLE "ServiceSite" ADD CONSTRAINT "ServiceSite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobRecord" ADD CONSTRAINT "JobRecord_serviceSiteId_fkey" FOREIGN KEY ("serviceSiteId") REFERENCES "ServiceSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;