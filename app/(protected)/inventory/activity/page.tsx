import { requireRouteContext } from '@/lib/rbac/guard';
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

function requireOrgId(orgId: string | null): string {
  if (!orgId) {
    throw new Error('Inventory Activity requires an active organization');
  }

  return orgId;
}

export default async function InventoryActivityPage() {
  const context = await requireRouteContext('/inventory');
  const orgId = requireOrgId(context.orgId);

  const dashboardData = await getDashboardData({ orgId });
  const inventory = buildInventoryReadModel(dashboardData);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory Activity</h1>
      <p className="text-sm text-[#4b5563]">
        Recent inventory transactions and events.
      </p>

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h2 className="text-sm font-semibold">Inventory Timeline</h2>
        {inventory.timeline && inventory.timeline.length > 0 ? (
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
        ) : (
          <p className="mt-3 text-xs text-[#64748b]">No recent activity.</p>
        )}
      </article>
    </section>
  );
}
