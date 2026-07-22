import {type DashboardData, type ReplenishmentAlert} from '../dashboard/types';

export type InventoryPartSource = {
  id: string; sku: string; itemName: string; serviceLines: string[];
  estimatedUnitCost: number;
  location: string;
  onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  supplier: string;
  severity: ReplenishmentAlert['severity'];
  compatibilityNote: string;
};

export type InventoryServiceLine = 'automotive'|'mobile'|'shop';

export type InventoryCatalogRow = {
  id: string; sku: string; itemName: string;
  serviceLines: InventoryServiceLine[];
  estimatedUnitCost: number;
  location: string;
  onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  supplier: string;
  severity: ReplenishmentAlert['severity'];
  compatibilityNote: string;
};

export type InventoryServiceLineSummary = {
  id: InventoryServiceLine; label: string; count: number; note: string;
};

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
  catalogRows: InventoryCatalogRow[];
  serviceLineSummary: InventoryServiceLineSummary[];
};

const SEVERITY_PRIORITY: Record<ReplenishmentAlert['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildInventoryReadModel(
    dashboardData: DashboardData,
    inventoryParts: InventoryPartSource[] = []): InventoryReadModel {
  const queue = sortAlertsForQueue(dashboardData.replenishmentAlerts);
  const timeline = buildTimelineEvents(dashboardData.replenishmentAlerts);
  const catalogRows =
      buildCatalogRows(inventoryParts.length > 0 ? inventoryParts : queue);
  const serviceLineSummary = buildServiceLineSummary(catalogRows);

  return {
    updatedAt: dashboardData.generatedAt,
    lowStockQueue: queue,
    timeline,
    criticalCount:
        queue.filter((alert) => alert.severity === 'critical').length,
    catalogRows,
    serviceLineSummary,
  };
}

function buildCatalogRows(parts: Array<ReplenishmentAlert|InventoryPartSource>):
    InventoryCatalogRow[] {
  return parts.map((part) => {
    const serviceLines =
        'serviceLines' in part && part.serviceLines.length > 0 ?
        normalizeServiceLines(part.serviceLines) :
        classifyServiceLines(part);
    const compatibilityNote = 'compatibilityNote' in part ?
        part.compatibilityNote :
        buildCompatibilityNote(serviceLines, part.location);

    return {
      id: part.id,
      sku: part.sku,
      itemName: part.itemName,
      serviceLines,
      estimatedUnitCost: 'estimatedUnitCost' in part ? part.estimatedUnitCost :
                                                       35,
      location: part.location,
      onHand: part.onHand,
      reorderPoint: part.reorderPoint,
      suggestedOrderQty: part.suggestedOrderQty,
      supplier: part.supplier,
      severity: part.severity,
      compatibilityNote,
    };
  });
}

function buildServiceLineSummary(catalogRows: InventoryCatalogRow[]):
    InventoryServiceLineSummary[] {
  const automotiveCount =
      catalogRows.filter((row) => row.serviceLines.includes('automotive'))
          .length;
  const mobileCount =
      catalogRows.filter((row) => row.serviceLines.includes('mobile')).length;
  const shopCount =
      catalogRows.filter((row) => row.serviceLines.includes('shop')).length;

  return [
    {
      id: 'automotive',
      label: 'Automotive-ready parts',
      count: automotiveCount,
      note: automotiveCount > 0 ? 'Parts with vehicle or transponder fit.' :
                                  'No automotive-specific parts flagged yet.',
    },
    {
      id: 'mobile',
      label: 'Mobile van stock',
      count: mobileCount,
      note: mobileCount > 0 ? 'Parts suitable for field vans and route work.' :
                              'No van or field-service items flagged yet.',
    },
    {
      id: 'shop',
      label: 'Shop / counter stock',
      count: shopCount,
      note: shopCount > 0 ? 'Parts suited to bench work and storefront jobs.' :
                            'No shop stock items flagged yet.',
    },
  ];
}

function classifyServiceLines(alert: ReplenishmentAlert|InventoryPartSource):
    InventoryServiceLine[] {
  const haystack =
      `${alert.sku} ${alert.itemName} ${alert.location}`.toLowerCase();
  const serviceLines = new Set<InventoryServiceLine>();

  if (/(auto|automotive|vehicle|car|transponder|remote|fob|ignition|programmer)/
          .test(haystack)) {
    serviceLines.add('automotive');
  }

  if (/(van|mobile|field|portable|route|battery|scanner|kit)/.test(haystack)) {
    serviceLines.add('mobile');
  }

  if (/(shop|warehouse|counter|bench|core|cylinder|blank|deadbolt|mortise|rim|pin|wafer)/
          .test(haystack)) {
    serviceLines.add('shop');
  }

  if (serviceLines.size === 0) {
    serviceLines.add('mobile');
    serviceLines.add('shop');
  }

  return [...serviceLines];
}

function normalizeServiceLines(serviceLines: string[]): InventoryServiceLine[] {
  const normalized: InventoryServiceLine[] = [];

  for (const serviceLine of serviceLines) {
    if (serviceLine === 'automotive' || serviceLine === 'mobile' ||
        serviceLine === 'shop') {
      normalized.push(serviceLine);
    }
  }

  return normalized;
}

function buildCompatibilityNote(
    serviceLines: InventoryServiceLine[], location: string): string {
  if (serviceLines.includes('automotive') && serviceLines.includes('mobile')) {
    return `Move-ready for van stock and automotive calls from ${location}.`;
  }

  if (serviceLines.includes('automotive')) {
    return 'Best for automotive callouts and vehicle-specific jobs.';
  }

  if (serviceLines.includes('mobile')) {
    return 'Best for mobile van restock and field work.';
  }

  return 'Bench and counter stock suited to shop workflows.';
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
