import {type DashboardData, type ReplenishmentAlert} from '../dashboard/types';

export type InventoryPartSource = {
  id: string; sku: string; itemName: string; serviceLines: string[];
  estimatedUnitCost: number;
  location: string;
  onHand: number;
  createdAt?: string;
  reserved?: number;
  available?: number; reorderPoint: number; suggestedOrderQty: number;
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
  createdAt: string;
  onHand: number;
  reserved: number;
  available: number;
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

export type InventoryIncomingQuantity = {
  sku: string;
  location: string;
  incomingQuantity: number;
};

export type InventoryReadModelBuildOptions = {
  incomingBySkuLocation?: InventoryIncomingQuantity[];
};

export type InventoryLocationBalance = {
  sku: string;
  location: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type InventoryQueueEntry = {
  id: string;
  sku: string;
  itemName: string;
  location: string;
  supplier: string;
  severity: ReplenishmentAlert['severity'];
  available: number;
  incomingQuantity: number;
  reorderPoint: number;
  shortage: number;
  suggestedOrderQty: number;
  createdAt: string;
};

export type InventoryReadModel = {
  updatedAt: string; lowStockQueue: InventoryQueueEntry[];
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

export function projectInventoryPartsByLocation(
    inventoryParts: InventoryPartSource[],
    balances: InventoryLocationBalance[]): InventoryPartSource[] {
  const balancesBySku = new Map<string, InventoryLocationBalance[]>();

  for (const balance of balances) {
    const sku = balance.sku.toLowerCase();
    const skuBalances = balancesBySku.get(sku) ?? [];
    skuBalances.push(balance);
    balancesBySku.set(sku, skuBalances);
  }

  return inventoryParts.flatMap((part) => {
    const skuBalances = balancesBySku.get(part.sku.toLowerCase());

    if (!skuBalances || skuBalances.length === 0) {
      return part;
    }

    return skuBalances.map((balance) => ({
      ...part,
      location: balance.location,
      onHand: balance.onHand,
      reserved: balance.reserved,
      available: balance.available,
    }));
  });
}

export function consolidateCatalogRowsBySku(
    catalogRows: InventoryCatalogRow[]): InventoryCatalogRow[] {
  const consolidated = new Map<string, InventoryCatalogRow>();

  for (const row of catalogRows) {
    const sku = row.sku.toLowerCase();
    const current = consolidated.get(sku);

    if (!current) {
      consolidated.set(sku, {...row});
      continue;
    }

    consolidated.set(sku, {
      ...current,
      onHand: current.onHand + row.onHand,
      reserved: current.reserved + row.reserved,
      available: current.available + row.available,
    });
  }

  return [...consolidated.values()];
}

export function buildInventoryReadModel(
    dashboardData: DashboardData,
    inventoryParts: InventoryPartSource[] = [],
    options: InventoryReadModelBuildOptions = {}): InventoryReadModel {
  const timeline = buildTimelineEvents(dashboardData.replenishmentAlerts);
  const catalogRows =
      buildCatalogRows(inventoryParts.length > 0 ? inventoryParts :
                                                     dashboardData.replenishmentAlerts);
  const queue =
      buildQueueFromCatalogRows(catalogRows, options.incomingBySkuLocation);
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
      createdAt: 'createdAt' in part && typeof part.createdAt === 'string' ?
          part.createdAt :
          new Date(0).toISOString(),
      onHand: part.onHand,
      reserved: 'reserved' in part && typeof part.reserved === 'number' ?
          part.reserved :
          0,
      available: 'available' in part && typeof part.available === 'number' ?
          part.available :
          part.onHand -
              ('reserved' in part && typeof part.reserved === 'number' ?
                   part.reserved :
                   0),
      reorderPoint: part.reorderPoint,
      suggestedOrderQty: part.suggestedOrderQty,
      supplier: part.supplier,
      severity: part.severity,
      compatibilityNote,
    };
  });
}

function buildQueueFromCatalogRows(
    catalogRows: InventoryCatalogRow[],
    incomingBySkuLocation: InventoryIncomingQuantity[] = []):
    InventoryQueueEntry[] {
  const incomingLookup = new Map(incomingBySkuLocation.map((entry) => [
    `${entry.sku.toLowerCase()}::${entry.location.toLowerCase()}`,
    entry.incomingQuantity,
  ]));

  const queue = catalogRows
                    .map((row): InventoryQueueEntry => {
                      const lookupKey =
                          `${row.sku.toLowerCase()}::${row.location.toLowerCase()}`;
                      const incomingQuantity =
                          incomingLookup.get(lookupKey) ?? 0;
                      const shortage = Math.max(
                          0, row.reorderPoint - (row.available + incomingQuantity));

                      return {
                        id: row.id,
                        sku: row.sku,
                        itemName: row.itemName,
                        location: row.location,
                        supplier: row.supplier,
                        severity: row.severity,
                        available: row.available,
                        incomingQuantity,
                        reorderPoint: row.reorderPoint,
                        shortage,
                        suggestedOrderQty: row.suggestedOrderQty,
                        createdAt: row.createdAt,
                      };
                    })
                    .filter((row) => row.shortage > 0);

  return [...queue].sort((left, right) => {
    const severityComparison =
        SEVERITY_PRIORITY[left.severity] - SEVERITY_PRIORITY[right.severity];

    if (severityComparison !== 0) {
      return severityComparison;
    }

    const shortageComparison = right.shortage - left.shortage;

    if (shortageComparison !== 0) {
      return shortageComparison;
    }

    const createdAtComparison =
        toTimestamp(right.createdAt) - toTimestamp(left.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.sku.localeCompare(right.sku);
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
