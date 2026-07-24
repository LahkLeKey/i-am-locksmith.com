-- CreateTable
CREATE TABLE "ReplenishmentRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requestedByUserId" TEXT NOT NULL,
    "orderingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplenishmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplenishmentRequest_orgId_status_createdAt_idx" ON "ReplenishmentRequest"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReplenishmentRequest_orgId_sku_location_status_idx" ON "ReplenishmentRequest"("orgId", "sku", "location", "status");
