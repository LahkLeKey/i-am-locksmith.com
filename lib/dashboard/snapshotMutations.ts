import {getDashboardData} from '@/lib/dashboard/repository';
import type {DashboardData} from '@/lib/dashboard/types';
import {prisma} from '@/lib/db/prisma';
import {Prisma} from '@prisma/client';

type SnapshotRecord = {
  id: string; orgId: string; generatedAt: Date; revenueToday: number;
  openInvoices: number;
  grossMarginWeek: Prisma.Decimal;
  lowStockSkus: number;
  vansBelowMin: number;
  financialTrend: Prisma.JsonValue;
  kpis: Prisma.JsonValue;
  jobsQueue: Prisma.JsonValue;
  replenishmentAlerts: Prisma.JsonValue;
};

function asInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue|
    Prisma.JsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function buildEmptyDashboardData(): DashboardData {
  return {
    generatedAt: new Date().toISOString(),
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
}

export async function getOrCreateOrgSnapshot(orgId: string):
    Promise<SnapshotRecord> {
  const existing = await prisma.dashboardSnapshot.findFirst({
    where: {orgId},
    orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
  });

  if (existing) {
    return existing;
  }

  const empty = buildEmptyDashboardData();
  const created = await prisma.dashboardSnapshot.create({
    data: {
      orgId,
      generatedAt: new Date(empty.generatedAt),
      revenueToday: empty.revenueToday,
      openInvoices: empty.openInvoices,
      grossMarginWeek: empty.grossMarginWeek,
      lowStockSkus: empty.lowStockSkus,
      vansBelowMin: empty.vansBelowMin,
      financialTrend: asInputJson(empty.financialTrend),
      kpis: asInputJson(empty.kpis),
      jobsQueue: asInputJson(empty.jobsQueue),
      replenishmentAlerts: asInputJson(empty.replenishmentAlerts),
    },
  });

  return created;
}

export async function getDashboardDataForSnapshot(snapshot: SnapshotRecord):
    Promise<DashboardData> {
  return getDashboardData({
    orgId: snapshot.orgId,
    client: {
      dashboardSnapshot: {
        findFirst: async () => snapshot,
      },
    },
  });
}

export async function persistDashboardData(
    snapshotId: string, data: DashboardData) {
  return prisma.dashboardSnapshot.update({
    where: {id: snapshotId},
    data: {
      generatedAt: new Date(data.generatedAt),
      revenueToday: data.revenueToday,
      openInvoices: data.openInvoices,
      grossMarginWeek: data.grossMarginWeek,
      lowStockSkus: data.lowStockSkus,
      vansBelowMin: data.vansBelowMin,
      financialTrend: data.financialTrend,
      kpis: data.kpis,
      jobsQueue: data.jobsQueue,
      replenishmentAlerts: data.replenishmentAlerts,
    },
  });
}
