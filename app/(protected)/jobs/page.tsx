import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventoryParts } from '@/lib/inventory/parts-repository';

import { JobsCrudPanel } from '@/app/components/jobs-crud-panel';
import { WorkspaceActionPanel } from '@/app/components/workspace-action-panel';

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
          Manage customer follow-up, quote intake, dispatch jobs, and inventory actions in one operational queue.
        </p>
      </article>
      <WorkspaceActionPanel
        actionType="jobs.record_customer_follow_up"
        label="Record Customer Follow-up"
        summary="Keep customer communication updates in the jobs command center without a separate CRM tab."
      />
      <WorkspaceActionPanel
        actionType="jobs.capture_quote_intake"
        label="Log Quote Intake"
        summary="Capture quote progress directly in Jobs Operations and update projected revenue context."
      />
      <JobsCrudPanel initialJobs={dashboardData.jobsQueue} inventoryLookupParts={inventoryLookupParts} />
    </section>
  );
}
