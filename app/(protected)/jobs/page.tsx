import {requireRoutePermission} from '@/lib/rbac/guard';
import {getWorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

import {WorkspaceMvpView} from '@/app/components/workspace-mvp-view';

export default async function JobsPage() {
  await requireRoutePermission('/jobs');
  const snapshot = getWorkspaceMvpSnapshot('jobs');

  return <WorkspaceMvpView snapshot={snapshot} />;
}
