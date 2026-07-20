-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "revenueToday" INTEGER NOT NULL,
    "openInvoices" INTEGER NOT NULL,
    "grossMarginWeek" DECIMAL(6,2) NOT NULL,
    "lowStockSkus" INTEGER NOT NULL,
    "vansBelowMin" INTEGER NOT NULL,
    "financialTrend" JSONB NOT NULL,
    "kpis" JSONB NOT NULL,
    "jobsQueue" JSONB NOT NULL,
    "replenishmentAlerts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardSnapshot_generatedAt_idx" ON "DashboardSnapshot"("generatedAt");
