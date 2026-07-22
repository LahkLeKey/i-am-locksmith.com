import type {DashboardData, JobQueueItem, ReplenishmentAlert} from '../dashboard/types';

export type WorkflowActionType =|'customers.record_follow_up'|
  'jobs.dispatch_next'|'jobs.capture_quote_intake'|'invoices.send_one'|
    'reports.refresh_snapshot'|'settings.apply_replenishment_guardrail';

export function applyWorkflowAction(
    dashboardData: DashboardData,
    actionType: WorkflowActionType): {data: DashboardData; message: string} {
  const nowIso = new Date().toISOString();

  if (actionType === 'jobs.dispatch_next') {
    const nextJobsQueue: JobQueueItem[] =
        dashboardData.jobsQueue.map((job) => ({...job}));
    const nextQueuedIndex =
        nextJobsQueue.findIndex((job) => job.status === 'queued');

    if (nextQueuedIndex >= 0) {
      nextJobsQueue[nextQueuedIndex] = {
        ...nextJobsQueue[nextQueuedIndex],
        status: 'in_progress',
        etaMinutes: 30,
      };
    }

    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
        jobsQueue: nextJobsQueue,
      },
      message: nextQueuedIndex >= 0 ?
          `Job ${nextJobsQueue[nextQueuedIndex]?.id} dispatched.` :
          'No queued jobs available to dispatch.',
    };
  }

  if (actionType === 'jobs.capture_quote_intake') {
    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
        revenueToday: dashboardData.revenueToday + 750,
      },
      message: 'Quote intake logged in jobs operations and projected revenue updated.',
    };
  }

  if (actionType === 'invoices.send_one') {
    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
        openInvoices: Math.max(0, dashboardData.openInvoices - 1),
      },
      message: 'Invoice marked as sent.',
    };
  }

  if (actionType === 'settings.apply_replenishment_guardrail') {
    const nextAlerts: ReplenishmentAlert[] =
        dashboardData.replenishmentAlerts.map(
            (alert) => ({
              ...alert,
              suggestedOrderQty:
                  Math.max(alert.suggestedOrderQty, alert.reorderPoint * 2),
            }));

    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
        replenishmentAlerts: nextAlerts,
      },
      message: 'Replenishment guardrail applied.',
    };
  }

  if (actionType === 'customers.record_follow_up') {
    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
      },
      message: 'Customer follow-up recorded.',
    };
  }

  if (actionType === 'reports.refresh_snapshot') {
    return {
      data: {
        ...dashboardData,
        generatedAt: nowIso,
      },
      message: 'Reporting snapshot refreshed.',
    };
  }

  return {
    data: {
      ...dashboardData,
      generatedAt: nowIso,
    },
    message: 'Reporting snapshot refreshed.',
  };
}
