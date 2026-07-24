-- CreateTable
CREATE TABLE "InventoryLedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_orgId_sku_location_createdAt_idx" ON "InventoryLedgerEntry"("orgId", "sku", "location", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_orgId_kind_createdAt_idx" ON "InventoryLedgerEntry"("orgId", "kind", "createdAt");
