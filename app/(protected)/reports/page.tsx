import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function ReportsPage() {
  const context = await requireRouteContext('/reports');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const snapshot = getWorkspaceMvpSnapshot('reports', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
