import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { formatPercent, formatUsd } from '@/lib/dashboard/format';
import { listInvoices } from '@/lib/invoices/repository';
import { listJobRecords } from '@/lib/jobs/repository';
import Link from 'next/link';

export default async function ReportsPage() {
  const context = await requireRouteContext('/reports');
  if (!context.orgId) throw new Error('Reports requires an active organization');
  const [dashboardData, jobs, invoices] = await Promise.all([
    getDashboardData({ orgId: context.orgId }),
    listJobRecords(context.orgId),
    listInvoices(context.orgId),
  ]);
  const closedJobs = jobs.filter((job) => job.status === 'closed' || job.status === 'completed');
  const quoted = jobs.reduce((total, job) => total + (job.quote?.estimatedTotal ?? 0), 0);
  const finalizedInvoices = invoices.filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'void');
  const billed = finalizedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const outstanding = finalizedInvoices.reduce((total, invoice) => total + invoice.balanceDue, 0);
  const collected = finalizedInvoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
  const paymentHistory = finalizedInvoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({
      id: payment.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: payment.amount,
      method: payment.method,
      receivedAt: payment.receivedAt,
    }))).sort((left, right) => right.receivedAt.getTime() - left.receivedAt.getTime());
  const completionRate = jobs.length > 0 ? (closedJobs.length / jobs.length) * 100 : 0;
  const statuses = ['queued', 'scheduled', 'in_progress', 'blocked', 'closed', 'completed'] as const;

  return <section className="space-y-5">
    <header><h1 className="text-2xl font-semibold">Reports</h1><p className="mt-1 text-sm text-[#4b5563]">Operating performance and finalized financial history.</p></header>
    <div className="grid border-y border-[#e5e7eb] sm:grid-cols-2 xl:grid-cols-4">
      {[['Finalized billing', formatUsd(billed)], ['Outstanding', formatUsd(outstanding)], ['Collected', formatUsd(collected)], ['Completion rate', formatPercent(completionRate)]].map(([label, value], index) => <div key={label} className={`p-4 ${index > 0 ? 'border-t border-[#e5e7eb] sm:border-l sm:border-t-0' : ''}`}><p className="text-xs text-[#64748b]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section><h2 className="text-sm font-semibold">Job lifecycle</h2><div className="mt-3 divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">{statuses.map((status) => <Link key={status} href="/jobs" className="flex items-center justify-between px-3 py-3 text-sm hover:bg-[#f8fafc]"><span className="capitalize text-[#475569]">{status.replace('_', ' ')}</span><span className="font-semibold">{jobs.filter((job) => job.status === status).length} →</span></Link>)}</div></section>
      <section><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Payment history</h2><Link href="/invoices?view=all" className="text-xs font-semibold text-[#0f766e]">View invoices →</Link></div><div className="mt-3 divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">{paymentHistory.slice(0, 8).map((payment) => <div key={payment.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3 text-xs"><div><p className="font-semibold">{payment.invoiceNumber} · {payment.customerName}</p><p className="mt-1 capitalize text-[#64748b]">{payment.receivedAt.toLocaleDateString()} · {payment.method.replace('_', ' ')}</p></div><span className="self-center font-semibold">{formatUsd(payment.amount)}</span></div>)}{paymentHistory.length === 0 ? <p className="px-3 py-8 text-center text-sm text-[#64748b]">No payments recorded yet.</p> : null}</div></section>
    </div>
    <section><h2 className="text-sm font-semibold">Operational context</h2><div className="mt-3 grid border-y border-[#e5e7eb] sm:grid-cols-3"><div className="p-4"><p className="text-xs text-[#64748b]">Quoted pipeline</p><p className="mt-1 font-semibold">{formatUsd(quoted)}</p></div><div className="border-y border-[#e5e7eb] p-4 sm:border-x sm:border-y-0"><p className="text-xs text-[#64748b]">Closed jobs</p><p className="mt-1 font-semibold">{closedJobs.length}</p></div><div className="p-4"><p className="text-xs text-[#64748b]">Dashboard margin snapshot</p><p className="mt-1 font-semibold">{formatPercent(dashboardData.grossMarginWeek)}</p></div></div></section>
  </section>;
}
