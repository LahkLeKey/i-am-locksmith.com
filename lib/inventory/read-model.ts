import {type DashboardData, type ReplenishmentAlert} from '../dashboard/types';

export type InventoryTimelineEvent = {
  id: string; at: string; severity: ReplenishmentAlert['severity'];
  summary: string;
  sku: string;
  location: string;
};

export type InventoryReadModel = {
  updatedAt: string; lowStockQueue: ReplenishmentAlert[];
  timeline: InventoryTimelineEvent[];
  criticalCount: number;
};

const SEVERITY_PRIORITY: Record<ReplenishmentAlert['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildInventoryReadModel(dashboardData: DashboardData):
    InventoryReadModel {
  const queue = sortAlertsForQueue(dashboardData.replenishmentAlerts);
  const timeline = buildTimelineEvents(dashboardData.replenishmentAlerts);

  return {
    updatedAt: dashboardData.generatedAt,
    lowStockQueue: queue,
    timeline,
    criticalCount:
        queue.filter((alert) => alert.severity === 'critical').length,
  };
}

function sortAlertsForQueue(alerts: ReplenishmentAlert[]):
    ReplenishmentAlert[] {
  return [...alerts].sort((left, right) => {
    const severityComparison =
        SEVERITY_PRIORITY[left.severity] - SEVERITY_PRIORITY[right.severity];

    if (severityComparison !== 0) {
      return severityComparison;
    }

    const deficitComparison =
        (right.reorderPoint - right.onHand) - (left.reorderPoint - left.onHand);

    if (deficitComparison !== 0) {
      return deficitComparison;
    }

    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}

function buildTimelineEvents(alerts: ReplenishmentAlert[]):
    InventoryTimelineEvent[] {
  return [...alerts]
      .sort(
          (left, right) =>
              toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
      .map((alert) => ({
             id: `event-${alert.id}`,
             at: alert.createdAt,
             severity: alert.severity,
             summary: `${alert.sku} dropped below reorder point`,
             sku: alert.sku,
             location: alert.location,
           }));
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed;
}
