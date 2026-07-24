import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { buildInventoryReadModel } from '@/lib/inventory/read-model';
import ActivityClient from './client';

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

  const timelineData = (inventory.timeline || []).map(event => ({
    id: event.id,
    sku: event.sku,
    severity: event.severity,
    summary: event.summary,
    location: event.location,
    at: event.at,
  }));

  return <ActivityClient initialTimeline={timelineData} />;
}

