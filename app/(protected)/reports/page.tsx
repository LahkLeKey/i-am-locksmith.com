import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { formatPercent, formatUsd } from '@/lib/dashboard/format';
import { listJobRecords } from '@/lib/jobs/repository';
import Link from 'next/link';

export default async function ReportsPage() {
  const context = await requireRouteContext('/reports');
  if (!context.orgId) throw new Error('Reports requires an active organization');
  const dashboardData = await getDashboardData({ orgId: context.orgId });
  const jobs = await listJobRecords(context.orgId);
  const closedJobs = jobs.filter((job) => job.status === 'closed' || job.status === 'completed');
  const quoted = jobs.reduce((total, job) => total + (job.quote?.estimatedTotal ?? 0), 0);
  const realized = closedJobs.reduce((total, job) => total + (job.closeout?.finalTotal ?? 0), 0);
  const completionRate = jobs.length > 0 ? (closedJobs.length / jobs.length) * 100 : 0;
  const statuses = ['queued', 'scheduled', 'in_progress', 'blocked', 'closed', 'completed'] as const;

  return <section className="space-y-5">
    <header><h1 className="text-2xl font-semibold">Reports</h1><p className="mt-1 text-sm text-[#4b5563]">Live operating picture from persisted jobs and financial snapshots.</p></header>
    <div className="grid border-y border-[#e5e7eb] sm:grid-cols-2 xl:grid-cols-4">
      {[['Quoted pipeline', formatUsd(quoted)], ['Closed revenue', formatUsd(realized)], ['Completion rate', formatPercent(completionRate)], ['Snapshot margin', formatPercent(dashboardData.grossMarginWeek)]].map(([label, value], index) => <div key={label} className={`p-4 ${index > 0 ? 'border-t border-[#e5e7eb] sm:border-l sm:border-t-0' : ''}`}><p className="text-xs text-[#64748b]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section><h2 className="text-sm font-semibold">Job lifecycle</h2><div className="mt-3 divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">{statuses.map((status) => <Link key={status} href="/jobs" className="flex items-center justify-between px-3 py-3 text-sm hover:bg-[#f8fafc]"><span className="capitalize text-[#475569]">{status.replace('_', ' ')}</span><span className="font-semibold">{jobs.filter((job) => job.status === status).length} →</span></Link>)}</div></section>
      <section><h2 className="text-sm font-semibold">Financial trend</h2><div className="mt-3 divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">{dashboardData.financialTrend.revenue.map((point, index) => <div key={point.at} className="grid grid-cols-3 gap-2 px-3 py-3 text-xs"><span className="text-[#64748b]">{new Date(point.at).toLocaleDateString()}</span><span className="text-right">Rev {formatUsd(point.value)}</span><span className="text-right font-semibold">Profit {formatUsd(dashboardData.financialTrend.profit[index]?.value ?? 0)}</span></div>)}</div></section>
    </div>
  </section>;
}
