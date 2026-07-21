import { requireRoutePermission } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function CustomersPage() {
  await requireRoutePermission('/customers');
  const dashboardData = await getDashboardData();
  const snapshot = getWorkspaceMvpSnapshot('customers', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
