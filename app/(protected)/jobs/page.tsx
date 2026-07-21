import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { getWorkspaceMvpSnapshot } from '@/lib/workspaces/mvp';

import { JobsCrudPanel } from '@/app/components/jobs-crud-panel';
import { WorkspaceMvpView } from '@/app/components/workspace-mvp-view';

export default async function JobsPage() {
  const context = await requireRouteContext('/jobs');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const snapshot = getWorkspaceMvpSnapshot('jobs', dashboardData);

  return (
    <section className="space-y-6">
      <WorkspaceMvpView snapshot={snapshot} />
      <JobsCrudPanel initialJobs={dashboardData.jobsQueue} />
    </section>
  );
}
