import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function SettingsPage() {
  const context = await requireRouteContext('/settings');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const snapshot = getWorkspaceMvpSnapshot('settings', dashboardData);

  return <WorkspaceMvpView snapshot={snapshot} />;
}
