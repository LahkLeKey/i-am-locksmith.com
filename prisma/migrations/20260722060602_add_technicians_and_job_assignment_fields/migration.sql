-- AlterTable
ALTER TABLE "JobRecord" ADD COLUMN     "assignedTechnicianId" TEXT,
ADD COLUMN     "assignedTechnicianName" TEXT,
ADD COLUMN     "laborRate" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "availabilityStatus" TEXT NOT NULL,
    "availabilityNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Technician_orgId_isActive_idx" ON "Technician"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "Technician_orgId_fullName_idx" ON "Technician"("orgId", "fullName");

-- CreateIndex
CREATE INDEX "JobRecord_orgId_assignedTechnicianId_idx" ON "JobRecord"("orgId", "assignedTechnicianId");
