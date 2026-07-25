import { InvoiceActions } from '@/app/components/invoices/invoice-actions';
import { formatSchedule, formatUsd } from '@/lib/dashboard/format';
import { listInvoices } from '@/lib/invoices/repository';
import { listJobRecords } from '@/lib/jobs/repository';
import { requireRouteContext } from '@/lib/rbac/guard';
import { hasPermission } from '@/lib/rbac/policy';
import Link from 'next/link';

type Props = { searchParams: Promise<{ view?: string }> };

export default async function InvoicesPage({ searchParams }: Props) {
  const context = await requireRouteContext('/invoices');
  if (!context.orgId) throw new Error('Invoices requires an active organization');
  const [{ view }, jobs, invoices] = await Promise.all([
    searchParams,
    listJobRecords(context.orgId),
    listInvoices(context.orgId),
  ]);
  const invoicedJobs = new Set(invoices.map((invoice) => invoice.jobNumber));
  const legacyUninvoicedJobs = jobs.filter((job) =>
    (job.status === 'closed' || job.status === 'completed') &&
    !invoicedJobs.has(job.id));
  const activeView = view === 'paid' || view === 'all' || view === 'ready' ?
    view : 'outstanding';
  const displayedInvoices = activeView === 'paid' ?
    invoices.filter((invoice) => invoice.status === 'paid') :
    activeView === 'outstanding' ?
      invoices.filter((invoice) =>
        invoice.status === 'finalized' && invoice.balanceDue > 0) : invoices;
  const outstanding = invoices.reduce(
    (total, invoice) => total +
      (invoice.status === 'finalized' ? invoice.balanceDue : 0), 0);
  const collected = invoices.reduce(
    (total, invoice) => total + invoice.paidAmount, 0);

  const canFinalize = hasPermission(
    context.effectivePermissions, 'invoices.create');
  const canRecordPayment = hasPermission(
    context.effectivePermissions, 'invoices.mark_paid');

  return <section className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Invoices</h1><p className="mt-1 text-sm text-[#4b5563]">Review job invoices, record offline payments, and preserve financial history.</p></div>
      <Link href="/jobs?view=closed" className="rounded-md border border-[#cbd5e1] px-4 py-2 text-xs font-semibold">Review closeouts</Link>
    </header>
    <div className="grid border-y border-[#e5e7eb] sm:grid-cols-3">
      <div className="p-4"><p className="text-xs text-[#64748b]">Legacy uninvoiced</p><p className="mt-1 text-xl font-semibold">{legacyUninvoicedJobs.length}</p></div>
      <div className="border-y border-[#e5e7eb] p-4 sm:border-x sm:border-y-0"><p className="text-xs text-[#64748b]">Outstanding</p><p className="mt-1 text-xl font-semibold">{formatUsd(outstanding)}</p></div>
      <div className="p-4"><p className="text-xs text-[#64748b]">Collected</p><p className="mt-1 text-xl font-semibold">{formatUsd(collected)}</p></div>
    </div>
    <nav aria-label="Invoice views" className="flex gap-1 overflow-x-auto border-b border-[#e5e7eb]">
      {([['ready', `Legacy (${legacyUninvoicedJobs.length})`], ['outstanding', 'Outstanding'], ['paid', 'Paid'], ['all', 'All']] as const).map(([key, label]) =>
        <Link key={key} href={`/invoices?view=${key}`} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${activeView === key ? 'border-[#0f766e] text-[#0f766e]' : 'border-transparent text-[#64748b]'}`}>{label}</Link>)}
    </nav>
    {activeView === 'ready' ?
      <InvoiceTable heading="Legacy closed jobs without invoices" rows={legacyUninvoicedJobs.map((job) => ({
        id: job.id,
        customer: job.customerName,
        site: job.site,
        date: job.closeout?.closedOutAt ?? null,
        total: job.closeout?.finalTotal ?? 0,
        paid: null,
        balance: null,
        action: <InvoiceActions kind="finalize" jobNumber={job.id} canAct={canFinalize} />,
      }))} /> :
      <InvoiceTable heading={`${activeView[0].toUpperCase()}${activeView.slice(1)} invoices`} rows={displayedInvoices.map((invoice) => ({
        id: invoice.invoiceNumber,
        customer: invoice.customerName,
        site: invoice.site,
        date: invoice.finalizedAt?.toISOString() ?? null,
        total: invoice.totalAmount,
        paid: invoice.paidAmount,
        balance: invoice.balanceDue,
        action: invoice.status === 'finalized' ?
          <InvoiceActions kind="payment" invoiceId={invoice.id} balanceDue={invoice.balanceDue} canAct={canRecordPayment} /> :
          <span className="font-semibold capitalize text-[#475569]">{invoice.status}</span>,
      }))} />}
  </section>;
}

type InvoiceTableRow = {
  id: string; customer: string; site: string; date: string | null; total: number;
  paid: number | null; balance: number | null; action: React.ReactNode;
};

function InvoiceTable({ heading, rows }: { heading: string; rows: InvoiceTableRow[] }) {
  return <section aria-labelledby="invoice-table-heading">
    <h2 id="invoice-table-heading" className="text-sm font-semibold">{heading}</h2>
    <div className="mt-3 overflow-x-auto border-y border-[#e5e7eb]"><table className="min-w-full text-left text-xs"><thead className="bg-[#f8fafc] text-[#475569]"><tr><th className="px-3 py-2">Invoice / job</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Finalized</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#e5e7eb]">{rows.map((row) => <tr key={row.id}><td className="px-3 py-3 font-semibold">{row.id}</td><td className="px-3 py-3"><p className="font-medium">{row.customer}</p><p className="text-[#64748b]">{row.site}</p></td><td className="px-3 py-3">{formatSchedule(row.date)}</td><td className="px-3 py-3 text-right font-semibold">{formatUsd(row.total)}</td><td className="px-3 py-3 text-right">{row.paid === null ? '—' : formatUsd(row.paid)}</td><td className="px-3 py-3 text-right font-semibold">{row.balance === null ? '—' : formatUsd(row.balance)}</td><td className="px-3 py-3 text-right">{row.action}</td></tr>)}</tbody></table></div>
    {rows.length === 0 ? <p className="py-8 text-center text-sm text-[#64748b]">No invoices in this view.</p> : null}
  </section>;
}
