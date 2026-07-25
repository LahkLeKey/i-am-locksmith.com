import { requireRouteContext } from '@/lib/rbac/guard';
import { formatSchedule, formatUsd } from '@/lib/dashboard/format';
import { listJobRecords } from '@/lib/jobs/repository';
import Link from 'next/link';

export default async function InvoicesPage() {
  const context = await requireRouteContext('/invoices');
  if (!context.orgId) throw new Error('Invoices requires an active organization');
  const jobs = await listJobRecords(context.orgId);
  const billableJobs = jobs.filter((job) => job.status === 'closed' || job.status === 'completed');
  const readyTotal = billableJobs.reduce((total, job) => total + (job.closeout?.finalTotal ?? job.quote?.estimatedTotal ?? 0), 0);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Invoices</h1><p className="mt-1 text-sm text-[#4b5563]">Turn completed job outcomes into a reviewable billing queue.</p></div>
        <Link href="/jobs" className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white">Review job closeouts</Link>
      </header>
      <div className="grid border-y border-[#e5e7eb] sm:grid-cols-3">
        <div className="p-4"><p className="text-xs text-[#64748b]">Ready to invoice</p><p className="mt-1 text-xl font-semibold">{billableJobs.length}</p></div>
        <div className="border-y border-[#e5e7eb] p-4 sm:border-x sm:border-y-0"><p className="text-xs text-[#64748b]">Billing value</p><p className="mt-1 text-xl font-semibold">{formatUsd(readyTotal)}</p></div>
        <div className="p-4"><p className="text-xs text-[#64748b]">Needs closeout</p><p className="mt-1 text-xl font-semibold">{jobs.filter((job) => job.status !== 'closed' && job.status !== 'completed').length}</p></div>
      </div>
      <section aria-labelledby="billing-queue-heading">
        <h2 id="billing-queue-heading" className="text-sm font-semibold">Billing queue</h2>
        <div className="mt-3 overflow-x-auto border-y border-[#e5e7eb]">
          <table className="min-w-full text-left text-xs"><thead className="bg-[#f8fafc] text-[#475569]"><tr><th className="px-3 py-2">Job</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Closed</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Next step</th></tr></thead>
            <tbody className="divide-y divide-[#e5e7eb]">{billableJobs.map((job) => <tr key={job.id}><td className="px-3 py-3 font-semibold">{job.id}</td><td className="px-3 py-3"><p className="font-medium">{job.customerName}</p><p className="text-[#64748b]">{job.site}</p></td><td className="px-3 py-3">{formatSchedule(job.closeout?.closedOutAt ?? null)}</td><td className="px-3 py-3 text-right font-semibold">{formatUsd(job.closeout?.finalTotal ?? job.quote?.estimatedTotal ?? 0)}</td><td className="px-3 py-3 text-right"><Link href={`/jobs?view=closed&job=${encodeURIComponent(job.id)}`} className="font-semibold text-[#0f766e] hover:underline">Open closeout →</Link></td></tr>)}</tbody>
          </table>
        </div>
        {billableJobs.length === 0 ? <p className="py-8 text-center text-sm text-[#64748b]">No completed jobs are ready for invoicing.</p> : null}
      </section>
    </section>
  );
}
