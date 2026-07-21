-- CreateTable
CREATE TABLE "InventoryPart" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "serviceLines" JSONB NOT NULL,
    "location" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL,
    "reorderPoint" INTEGER NOT NULL,
    "suggestedOrderQty" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "compatibilityNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryPart_orgId_sku_idx" ON "InventoryPart"("orgId", "sku");

-- CreateIndex
CREATE INDEX "InventoryPart_orgId_location_idx" ON "InventoryPart"("orgId", "location");
