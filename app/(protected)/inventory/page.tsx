import { requireRouteContext } from '@/lib/rbac/guard';
import { formatSchedule } from '@/lib/dashboard/format';
import { getDashboardData } from '@/lib/dashboard/repository';
import { buildInventoryReadModel } from '@/lib/inventory/read-model';

import { InventoryAlertsCrudPanel } from '@/app/components/inventory-alerts-crud-panel';

function formatScheduleSafe(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  return formatSchedule(isoDate);
}

export default async function InventoryPage() {
  const context = await requireRouteContext('/inventory');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const inventory = buildInventoryReadModel(dashboardData);

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

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Parts Catalog</h2>
            <p className="mt-1 text-xs text-[#475569]">
              Shared inventory rows filtered for automotive, mobile, and shop workflows.
            </p>
          </div>
          <p className="text-xs text-[#64748b]">
            Service-line tags are derived from the same parts master, not separate tables.
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-[#e5e7eb]">
          <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#475569]">
              <tr>
                <th className="px-3 py-2 font-semibold">Part</th>
                <th className="px-3 py-2 font-semibold">Service lines</th>
                <th className="px-3 py-2 font-semibold">Stock</th>
                <th className="px-3 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Fit note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] bg-white text-[#334155]">
              {inventory.catalogRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">{row.itemName}</p>
                    <p className="text-[11px] text-[#64748b]">{row.sku} · {row.location}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.serviceLines.map((line) => (
                        <span
                          key={`${row.id}-${line}`}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${serviceLineBadgeClasses[line]}`}
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">
                      {row.onHand} / {row.reorderPoint}
                    </p>
                    <p className="text-[11px] text-[#64748b]">Order {row.suggestedOrderQty} when replenishing</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">{row.supplier}</p>
                    <p className="text-[11px] uppercase tracking-wide text-[#64748b]">{row.severity}</p>
                  </td>
                  <td className="px-3 py-3 text-[#475569]">{row.compatibilityNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <InventoryAlertsCrudPanel initialAlerts={dashboardData.replenishmentAlerts} />
    </section>
  );
}
