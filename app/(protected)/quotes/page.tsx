import {requireRoutePermission} from '@/lib/rbac/guard';
import {getWorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

import {WorkspaceMvpView} from '@/app/components/workspace-mvp-view';

export default async function QuotesPage() {
  await requireRoutePermission('/quotes');
  const snapshot = getWorkspaceMvpSnapshot('quotes');

  return <WorkspaceMvpView snapshot={snapshot} />;
}
