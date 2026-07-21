import {requireRoutePermission} from '@/lib/rbac/guard';
import {getWorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

import {WorkspaceMvpView} from '@/app/components/workspace-mvp-view';

export default async function CustomersPage() {
  await requireRoutePermission('/customers');
  const snapshot = getWorkspaceMvpSnapshot('customers');

  return <WorkspaceMvpView snapshot={snapshot} />;
}
