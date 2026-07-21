-- AlterTable
ALTER TABLE "DashboardSnapshot" ADD COLUMN     "orgId" TEXT NOT NULL DEFAULT 'org_seed_default';

-- CreateIndex
CREATE INDEX "DashboardSnapshot_orgId_generatedAt_idx" ON "DashboardSnapshot"("orgId", "generatedAt");
