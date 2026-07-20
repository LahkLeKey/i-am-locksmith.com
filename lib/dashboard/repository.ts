import {type DashboardData} from './types';

type DashboardSnapshotRecord = {
  generatedAt: Date; revenueToday: number; openInvoices: number;
  grossMarginWeek: unknown;
  lowStockSkus: number;
  vansBelowMin: number;
  financialTrend: unknown;
  kpis: unknown;
  jobsQueue: unknown;
  replenishmentAlerts: unknown;
};

type DashboardSnapshotClient = {
  dashboardSnapshot: {
    findFirst: (args: {
      orderBy: Array<{generatedAt?: 'desc'; id?: 'desc'}>;
    }) =>
        Promise<DashboardSnapshotRecord|null>;
  };
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  generatedAt: new Date(0).toISOString(),
  revenueToday: 0,
  openInvoices: 0,
  grossMarginWeek: 0,
  lowStockSkus: 0,
  vansBelowMin: 0,
  financialTrend: {
    revenue: [],
    expenses: [],
    profit: [],
  },
  kpis: [],
  jobsQueue: [],
  replenishmentAlerts: [],
};

export async function getDashboardData(client?: DashboardSnapshotClient):
    Promise<DashboardData> {
  try {
    const resolvedClient = client ?? await getPrismaClient();

    const snapshot = await resolvedClient.dashboardSnapshot.findFirst({
      orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
    });

    if (!snapshot) {
      return EMPTY_DASHBOARD_DATA;
    }

    return mapSnapshotToDashboardData(snapshot);
  } catch (error) {
    console.error('Failed to load dashboard snapshot from database', error);
    return EMPTY_DASHBOARD_DATA;
  }
}

function mapSnapshotToDashboardData(snapshot: DashboardSnapshotRecord):
    DashboardData {
  const financialTrend = parseFinancialTrend(snapshot.financialTrend);

  return {
    generatedAt: snapshot.generatedAt.toISOString(),
    revenueToday: snapshot.revenueToday,
    openInvoices: snapshot.openInvoices,
    grossMarginWeek: toFiniteNumber(snapshot.grossMarginWeek),
    lowStockSkus: snapshot.lowStockSkus,
    vansBelowMin: snapshot.vansBelowMin,
    financialTrend,
    kpis: parseArray(snapshot.kpis, 'kpis') as DashboardData['kpis'],
    jobsQueue: parseArray(snapshot.jobsQueue, 'jobsQueue') as
        DashboardData['jobsQueue'],
    replenishmentAlerts:
        parseArray(snapshot.replenishmentAlerts, 'replenishmentAlerts') as
        DashboardData['replenishmentAlerts'],
  };
}

async function getPrismaClient(): Promise<DashboardSnapshotClient> {
  const module = await import('../db/prisma');
  return module.prisma;
}

function parseObject(
    value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`Invalid dashboard snapshot field: ${fieldName}`);
  }

  return value as Record<string, unknown>;
}

function parseArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid dashboard snapshot field: ${fieldName}`);
  }

  return value;
}

function toFiniteNumber(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return numericValue;
}

function parseFinancialTrend(value: unknown): DashboardData['financialTrend'] {
  const parsed = parseObject(value, 'financialTrend');

  return {
    revenue: parseArray(parsed.revenue, 'financialTrend.revenue') as
        DashboardData['financialTrend']['revenue'],
    expenses: parseArray(parsed.expenses, 'financialTrend.expenses') as
        DashboardData['financialTrend']['expenses'],
    profit: parseArray(parsed.profit, 'financialTrend.profit') as
        DashboardData['financialTrend']['profit'],
  };
}
