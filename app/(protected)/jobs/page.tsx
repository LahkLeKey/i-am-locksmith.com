import { requireRouteContext } from '@/lib/rbac/guard';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { listJobRecords } from '@/lib/jobs/repository';
import { listTechnicians } from '@/lib/technicians/repository';

import { JobsCrudPanel } from '@/app/components/jobs-crud-panel';

export default async function JobsPage() {
  const context = await requireRouteContext('/jobs');
  if (!context.orgId) {
    throw new Error('Jobs requires an active organization');
  }

  const jobs = await listJobRecords(context.orgId);
  const inventoryParts = await listInventoryParts(context.orgId);
  const technicians = await listTechnicians(context.orgId);
  const inventoryLookupParts = inventoryParts.map((part) => ({
    id: part.id,
    sku: part.sku,
    itemName: part.itemName,
    estimatedUnitCost: part.estimatedUnitCost,
    location: part.location,
    onHand: part.onHand,
  }));

  return (
    <section className="space-y-4">
      <article className="px-1 py-1">
        <h1 className="text-2xl font-semibold text-[#0f172a]">Jobs Operations</h1>
        <p className="mt-1 text-sm text-[#4b5563]">
          Manage quote intake, dispatch, closeout financials, and inventory actions in one operational queue.
        </p>
      </article>
      <JobsCrudPanel
        initialJobs={jobs}
        inventoryLookupParts={inventoryLookupParts}
        technicians={technicians.map((item) => ({
          id: item.id,
          fullName: item.fullName,
          hourlyRate: item.hourlyRate,
          availabilityStatus: item.availabilityStatus,
          isActive: item.isActive,
        }))}
      />
    </section>
  );
}
