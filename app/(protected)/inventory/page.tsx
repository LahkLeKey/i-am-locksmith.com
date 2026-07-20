import { requireRoutePermission } from '@/lib/rbac/guard';
import { formatSchedule } from '@/lib/dashboard/format';
import { getDashboardData } from '@/lib/dashboard/repository';
import { buildInventoryReadModel } from '@/lib/inventory/read-model';

function formatScheduleSafe(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  return formatSchedule(isoDate);
}

export default async function InventoryPage() {
  await requireRoutePermission('/inventory');
  const dashboardData = await getDashboardData();
  const inventory = buildInventoryReadModel(dashboardData);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="text-sm text-[#4b5563]">
        Low-stock queue and timeline sourced from persisted inventory signals.
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
                  On hand {alert.onHand} / Min {alert.reorderPoint} / Reorder {alert.suggestedOrderQty}
                </p>
                <p>
                  Supplier {alert.supplier} / ETA {
                    alert.etaDays === null ? 'Unknown' : `${alert.etaDays} day(s)`
                  }
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
    </section>
  );
}
