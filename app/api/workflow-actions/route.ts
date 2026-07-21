import {Prisma} from '@prisma/client';
import {getDashboardData} from '@/lib/dashboard/repository';
import {prisma} from '@/lib/db/prisma';
import type {Permission} from '@/lib/rbac/policy';
import {authorizePermission, getAuthorizationContext} from '@/lib/rbac/server';
import {applyWorkflowAction, type WorkflowActionType} from '@/lib/workspaces/workflow-actions';
import {NextResponse} from 'next/server';

type WorkflowActionRequest = {
  actionType?: WorkflowActionType;
};

const ACTION_PERMISSION_MAP: Record<WorkflowActionType, Permission> = {
  'customers.record_follow_up': 'customers.update',
  'jobs.dispatch_next': 'jobs.assign',
  'quotes.approve_pending': 'quotes.approve',
  'invoices.send_one': 'invoices.send',
  'reports.refresh_snapshot': 'settings.update',
  'settings.apply_replenishment_guardrail': 'settings.update',
};

function isWorkflowActionType(value: unknown): value is WorkflowActionType {
  if (typeof value !== 'string') {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(ACTION_PERMISSION_MAP, value);
}

function asInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue|
    Prisma.JsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  let body: WorkflowActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  if (!isWorkflowActionType(body.actionType)) {
    return NextResponse.json(
        {error: 'Unsupported workflow action'}, {status: 400});
  }

  const context = await getAuthorizationContext();
  if (!context) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  if (!context.orgId) {
    return NextResponse.json(
        {error: 'No active organization selected'}, {status: 400});
  }

  const permission = ACTION_PERMISSION_MAP[body.actionType];
  const decision = await authorizePermission(permission);

  if (decision.state === 'unauthenticated') {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  if (decision.state === 'forbidden') {
    return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }

  let currentSnapshot = await prisma.dashboardSnapshot.findFirst({
    where: {orgId: context.orgId},
    orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
  });

  if (!currentSnapshot) {
    const fallbackSnapshot = await prisma.dashboardSnapshot.findFirst({
      orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
    });

    if (!fallbackSnapshot) {
      return NextResponse.json(
          {error: 'No dashboard snapshot found'}, {status: 404});
    }

    currentSnapshot = await prisma.dashboardSnapshot.create({
      data: {
        orgId: context.orgId,
        generatedAt: fallbackSnapshot.generatedAt,
        revenueToday: fallbackSnapshot.revenueToday,
        openInvoices: fallbackSnapshot.openInvoices,
        grossMarginWeek: fallbackSnapshot.grossMarginWeek,
        lowStockSkus: fallbackSnapshot.lowStockSkus,
        vansBelowMin: fallbackSnapshot.vansBelowMin,
        financialTrend: asInputJson(fallbackSnapshot.financialTrend),
        kpis: asInputJson(fallbackSnapshot.kpis),
        jobsQueue: asInputJson(fallbackSnapshot.jobsQueue),
        replenishmentAlerts: asInputJson(fallbackSnapshot.replenishmentAlerts),
      },
    });
  }

  const dashboardData = await getDashboardData({
    dashboardSnapshot: {
      findFirst: async () => currentSnapshot,
    },
  });
  const next = applyWorkflowAction(dashboardData, body.actionType);

  await prisma.dashboardSnapshot.update({
    where: {id: currentSnapshot.id},
    data: {
      generatedAt: new Date(next.data.generatedAt),
      revenueToday: next.data.revenueToday,
      openInvoices: next.data.openInvoices,
      grossMarginWeek: next.data.grossMarginWeek,
      lowStockSkus: next.data.lowStockSkus,
      vansBelowMin: next.data.vansBelowMin,
      financialTrend: next.data.financialTrend,
      kpis: next.data.kpis,
      jobsQueue: next.data.jobsQueue,
      replenishmentAlerts: next.data.replenishmentAlerts,
    },
  });

  return NextResponse.json({
    ok: true,
    message: next.message,
    generatedAt: next.data.generatedAt,
  });
}
