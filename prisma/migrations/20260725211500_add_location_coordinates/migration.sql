ALTER TABLE "InventoryLocation"
ADD COLUMN "address" TEXT,
ADD COLUMN "latitude" DECIMAL(9,6),
ADD COLUMN "longitude" DECIMAL(9,6);

ALTER TABLE "JobRecord"
ADD COLUMN "latitude" DECIMAL(9,6),
ADD COLUMN "longitude" DECIMAL(9,6);