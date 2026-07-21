import {getDashboardDataForSnapshot, getOrCreateOrgSnapshot, persistDashboardData} from '@/lib/dashboard/snapshotMutations';
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
  'reports.refresh_snapshot': 'reports.read',
  'settings.apply_replenishment_guardrail': 'settings.update',
};

function isWorkflowActionType(value: unknown): value is WorkflowActionType {
  if (typeof value !== 'string') {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(ACTION_PERMISSION_MAP, value);
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

  const currentSnapshot = await getOrCreateOrgSnapshot(context.orgId);
  const dashboardData = await getDashboardDataForSnapshot(currentSnapshot);
  const next = applyWorkflowAction(dashboardData, body.actionType);

  if (body.actionType === 'reports.refresh_snapshot') {
    return NextResponse.json({
      ok: true,
      message: next.message,
      generatedAt: next.data.generatedAt,
    });
  }

  await persistDashboardData(currentSnapshot.id, next.data);

  return NextResponse.json({
    ok: true,
    message: next.message,
    generatedAt: next.data.generatedAt,
  });
}
