import { requireRoutePermission } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function QuotesPage() {
  await requireRoutePermission('/quotes');
  const dashboardData = await getDashboardData();
  const snapshot = getWorkspaceMvpSnapshot('quotes', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
