import { requireRouteContext } from '@/lib/rbac/guard';
import { formatSchedule } from '@/lib/dashboard/format';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventorySkuLocationBalances } from '@/lib/inventory/ledger-repository';
import { listIncomingQuantitiesBySkuLocation } from '@/lib/inventory/replenishment-repository';
import { buildInventoryReadModel, type InventoryPartSource } from '@/lib/inventory/read-model';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { InventoryReplenishmentPanel } from '@/app/components/inventory-replenishment-panel';

import { InventoryAlertsCrudPanel } from '@/app/components/inventory-alerts-crud-panel';
import { InventoryPartsPanel } from '@/app/components/inventory-parts-panel';

const INVENTORY_SERVICE_LINES = ['automotive', 'mobile', 'shop'] as const;

function formatScheduleSafe(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  return formatSchedule(isoDate);
}

function requireOrgId(orgId: string | null): string {
  if (!orgId) {
    throw new Error('Inventory requires an active organization');
  }

  return orgId;
}

function toInventoryPartSource(part: Awaited<ReturnType<typeof listInventoryParts>>[number]): InventoryPartSource {
  return {
    ...part,
    serviceLines: part.serviceLines.filter(
      (serviceLine): serviceLine is typeof INVENTORY_SERVICE_LINES[number] =>
        INVENTORY_SERVICE_LINES.includes(serviceLine as typeof INVENTORY_SERVICE_LINES[number]),
    ),
    severity: part.severity === 'critical' || part.severity === 'high' || part.severity === 'medium' || part.severity === 'low' ?
      part.severity : 'medium',
  };
}

export default async function InventoryPage() {
  const context = await requireRouteContext('/inventory');
  const orgId = requireOrgId(context.orgId);

  const dashboardData = await getDashboardData({ orgId });
  const inventoryParts = await listInventoryParts(orgId);
  const inventoryBalances = await listInventorySkuLocationBalances(orgId);
  const incomingBySkuLocation = await listIncomingQuantitiesBySkuLocation(orgId);
  const inventoryBalanceLookup = new Map(
    inventoryBalances.map((entry) => [`${entry.sku.toLowerCase()}::${entry.location.toLowerCase()}`, entry]),
  );
  const inventory = buildInventoryReadModel(
    dashboardData,
    inventoryParts.map((part) => {
      const balance = inventoryBalanceLookup.get(
        `${part.sku.toLowerCase()}::${part.location.toLowerCase()}`,
      );

      return {
        ...toInventoryPartSource(part),
        reserved: balance?.reserved ?? 0,
        available: balance ? part.onHand - balance.reserved : part.onHand,
      };
    }),
    { incomingBySkuLocation },
  );

  const serviceLineBadgeClasses = {
    automotive: 'bg-[#ecfeff] text-[#155e75]',
    mobile: 'bg-[#f0fdf4] text-[#166534]',
    shop: 'bg-[#f8fafc] text-[#475569]',
  } as const;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="text-sm text-[#4b5563]">
        Low-stock queue, workflow coverage, and catalog management sourced from persisted inventory signals.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Low-stock Alerts</p>
          <p className="mt-2 text-xl font-semibold">
            {inventory.lowStockQueue.length}
          </p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Critical Alerts</p>
          <p className="mt-2 text-xl font-semibold">{inventory.criticalCount}</p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Last Snapshot</p>
          <p className="mt-2 text-sm font-semibold">
            {formatScheduleSafe(inventory.updatedAt)}
          </p>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {inventory.serviceLineSummary.map((entry) => (
          <article key={entry.id} className="rounded-md border border-[#e5e7eb] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{entry.label}</h2>
              <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-xs font-semibold text-[#0f172a]">
                {entry.count} rows
              </span>
            </div>
            <p className="mt-2 text-xs text-[#475569]">{entry.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold">Low-stock Queue</h2>
          <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
            {inventory.lowStockQueue.map((alert) => (
              <li key={alert.id} className="rounded bg-[#fff7ed] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{alert.sku}</span>
                  <span className="uppercase">{alert.severity}</span>
                </div>
                <p>{alert.itemName} ({alert.location})</p>
                <p>
                  Available {alert.available} + Incoming {alert.incomingQuantity} / Min {alert.reorderPoint}
                </p>
                <p>
                  Shortage {alert.shortage} / Reorder {alert.suggestedOrderQty}
                </p>
                <p>
                  Supplier {alert.supplier} / Incoming requests open
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-md border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold">Inventory Timeline</h2>
          <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
            {inventory.timeline.map((event) => (
              <li key={event.id} className="rounded bg-[#f8fafc] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{event.sku}</span>
                  <span className="uppercase">{event.severity}</span>
                </div>
                <p>{event.summary}</p>
                <p>{event.location}</p>
                <p>{formatScheduleSafe(event.at)}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <InventoryReplenishmentPanel
        queue={inventory.lowStockQueue}
      />

      <InventoryPartsPanel initialParts={inventory.catalogRows} />

      <InventoryAlertsCrudPanel initialAlerts={dashboardData.replenishmentAlerts} />
    </section>
  );
}
