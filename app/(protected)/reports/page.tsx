import {requireRoutePermission} from '@/lib/rbac/guard';
import {getWorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

import {WorkspaceMvpView} from '@/app/components/workspace-mvp-view';

export default async function ReportsPage() {
  await requireRoutePermission('/reports');
  const snapshot = getWorkspaceMvpSnapshot('reports');

  return <WorkspaceMvpView snapshot={snapshot} />;
}
