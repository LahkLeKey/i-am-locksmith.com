import { requireRoutePermission } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function JobsPage() {
  await requireRoutePermission('/jobs');
  const dashboardData = await getDashboardData();
  const snapshot = getWorkspaceMvpSnapshot('jobs', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
