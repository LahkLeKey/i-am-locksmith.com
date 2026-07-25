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

export type JobQueueStatus = 'queued'|'scheduled'|'in_progress'|'blocked'|
    'ready_for_payment'|'closed'|'completed';

export type JobQueuePriority = 'low'|'normal'|'high'|'urgent';

export type TimeClockLedgerEntry = {
  id: string; action: 'clock_in' | 'clock_out'; at: string; note: string | null;
};

export type JobQueueItem = {
  id: string;
  jobName?: string; customerName: string; site: string;
  latitude?: number | null; longitude?: number | null;
  priority: JobQueuePriority;
  status: JobQueueStatus;
  scheduledFor: string | null;
  etaMinutes: number | null;
  requiredSkus: string[];
  followUpNote?: string | null;
  assignedTechnician?: {id: string; fullName: string; laborRate: number;} |
      null;
  quote?: {
    partEstimate: number; laborEstimate: number; estimatedMinutes: number;
    estimatedTotal: number;
    notes: string | null;
  };
  closeout?: {
    actualPartCost: number | null; actualLaborCost: number | null;
    actualMinutes: number | null;
    finalTotal: number | null;
    closedOutAt: string | null;
    resolutionNotes: string | null;
  };
  timeClock?: {
    clockedInAt: string | null; clockedOutAt: string | null;
    breakMinutes: number;
    elapsedMinutes: number;
    notes: string | null;
    ledger: TimeClockLedgerEntry[];
  };
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
