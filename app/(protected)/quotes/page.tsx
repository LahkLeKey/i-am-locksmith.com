import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function QuotesPage() {
  const context = await requireRouteContext('/quotes');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const snapshot = getWorkspaceMvpSnapshot('quotes', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
