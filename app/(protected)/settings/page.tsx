import {requireRoutePermission} from '@/lib/rbac/guard';
import {getWorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

import {WorkspaceMvpView} from '@/app/components/workspace-mvp-view';

export default async function SettingsPage() {
  await requireRoutePermission('/settings');
  const snapshot = getWorkspaceMvpSnapshot('settings');

  return <WorkspaceMvpView snapshot={snapshot} />;
}
