import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventoryParts } from '@/lib/inventory/parts-repository';

import { JobsCrudPanel } from '@/app/components/jobs-crud-panel';

export default async function JobsPage() {
  const context = await requireRouteContext('/jobs');
  if (!context.orgId) {
    throw new Error('Jobs requires an active organization');
  }

  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const inventoryParts = await listInventoryParts(context.orgId);
  const inventoryLookupParts = inventoryParts.map((part) => ({
    id: part.id,
    sku: part.sku,
    itemName: part.itemName,
    location: part.location,
    onHand: part.onHand,
  }));

  return (
    <section className="space-y-6">
      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h1 className="text-2xl font-semibold">Jobs Operations</h1>
        <p className="mt-1 text-sm text-[#4b5563]">
          Manage dispatch jobs directly with inline updates and inventory actions linked to reporting.
        </p>
      </article>
      <JobsCrudPanel initialJobs={dashboardData.jobsQueue} inventoryLookupParts={inventoryLookupParts} />
    </section>
  );
}
