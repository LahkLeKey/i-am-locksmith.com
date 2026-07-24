import { requireRouteContext } from '@/lib/rbac/guard';
import { formatSchedule } from '@/lib/dashboard/format';
import { getDashboardData } from '@/lib/dashboard/repository';
import { buildInventoryReadModel } from '@/lib/inventory/read-model';
import Link from 'next/link';

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

export default async function InventoryPage() {
  const context = await requireRouteContext('/inventory');
  const orgId = requireOrgId(context.orgId);

  const dashboardData = await getDashboardData({ orgId });
  const inventory = buildInventoryReadModel(dashboardData);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            Warehouse balances, low-stock status, and operational overview.
          </p>
        </div>
        <Link
          href="/inventory/catalog"
          className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56]"
        >
          View Catalog
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Low-stock Alerts</p>
          <p className="mt-2 text-xl font-semibold">
            {inventory.lowStockQueue?.length ?? 0}
          </p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Critical Alerts</p>
          <p className="mt-2 text-xl font-semibold">{inventory.criticalCount ?? 0}</p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="text-xs text-[#6b7280]">Last Snapshot</p>
          <p className="mt-2 text-sm font-semibold">
            {formatScheduleSafe(inventory.updatedAt ?? new Date().toISOString())}
          </p>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {inventory.serviceLineSummary?.map((entry) => (
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

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Low-stock Queue</h2>
          <Link
            href="/inventory/activity"
            className="text-xs text-[#0f766e] hover:underline"
          >
            View Activity
          </Link>
        </div>
        {inventory.lowStockQueue && inventory.lowStockQueue.length > 0 ? (
          <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
            {inventory.lowStockQueue.slice(0, 5).map((alert) => (
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
        ) : (
          <p className="mt-3 text-xs text-[#64748b]">All items well stocked.</p>
        )}
      </article>
    </section>
  );
}