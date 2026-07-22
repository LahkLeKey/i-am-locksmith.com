-- CreateTable
CREATE TABLE "JobRecord" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "etaMinutes" INTEGER,
    "requiredSkus" JSONB NOT NULL,
    "followUpNote" TEXT,
    "partEstimate" DECIMAL(10,2) NOT NULL,
    "laborEstimate" DECIMAL(10,2) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "estimatedTotal" DECIMAL(10,2) NOT NULL,
    "quoteNotes" TEXT,
    "actualPartCost" DECIMAL(10,2),
    "actualLaborCost" DECIMAL(10,2),
    "actualMinutes" INTEGER,
    "finalTotal" DECIMAL(10,2),
    "closedOutAt" TIMESTAMP(3),
    "closeoutNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRecord_orgId_status_updatedAt_idx" ON "JobRecord"("orgId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobRecord_orgId_jobNumber_key" ON "JobRecord"("orgId", "jobNumber");
