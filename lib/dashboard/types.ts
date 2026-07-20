export type TrendDirection = 'up'|'down'|'flat';

export type TrendPoint = {
  at: string; value: number;
};

export type KpiCard = {
  id: string; label: string; value: number;
  unit?: 'count' | 'usd' | 'minutes' | 'percent'; changePct: number;
  direction: TrendDirection;
  trend: TrendPoint[];
};

export type JobQueueStatus =|'queued'|'scheduled'|'in_progress'|'blocked';

export type JobQueuePriority = 'low'|'normal'|'high'|'urgent';

export type JobQueueItem = {
  id: string; customerName: string; site: string; priority: JobQueuePriority;
  status: JobQueueStatus;
  scheduledFor: string | null;
  etaMinutes: number | null;
  requiredSkus: string[];
};

export type ReplenishmentSeverity = 'low'|'medium'|'high'|'critical';

export type ReplenishmentAlert = {
  id: string; sku: string; itemName: string; location: string; onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  severity: ReplenishmentSeverity;
  supplier: string;
  etaDays: number | null;
  createdAt: string;
};

export type DashboardData = {
  generatedAt: string; revenueToday: number; openInvoices: number;
  grossMarginWeek: number;
  lowStockSkus: number;
  vansBelowMin: number;
  financialTrend:
      {revenue: TrendPoint[]; expenses: TrendPoint[]; profit: TrendPoint[];};
  kpis: KpiCard[];
  jobsQueue: JobQueueItem[];
  replenishmentAlerts: ReplenishmentAlert[];
};
