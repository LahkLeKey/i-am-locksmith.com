import { requireRoutePermission } from '@/lib/rbac/guard';
import { getAuthorizationContext } from '@/lib/rbac/server';
import { formatPercent, formatSchedule, formatTimeLabel, formatUsd } from '@/lib/dashboard/format';
import { DASHBOARD_DEMO_DATA } from '@/lib/dashboard/demo-data';
import { buildVisibleWidgets } from '@/lib/dashboard/widget-policy';

export default async function DashboardPage() {
  await requireRoutePermission('/dashboard');
  const context = await getAuthorizationContext();

  const widgets = buildVisibleWidgets(context?.effectivePermissions ?? new Set());
  const visibleWidgetIds = new Set(widgets.map((widget) => widget.id));

  const revenueToday = DASHBOARD_DEMO_DATA.revenueToday;
  const openInvoices = DASHBOARD_DEMO_DATA.openInvoices;
  const grossMarginWeek = DASHBOARD_DEMO_DATA.grossMarginWeek;
  const lowStockSkus = DASHBOARD_DEMO_DATA.lowStockSkus;
  const vansBelowMin = DASHBOARD_DEMO_DATA.vansBelowMin;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
      <p className="text-sm text-[#4b5563]">Live role-aware view with seeded demo signals for dispatch and inventory.</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {visibleWidgetIds.has('kpi_revenue_today') ? (
          <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">Revenue Today</p>
            <p className="mt-2 text-xl font-semibold">{formatUsd(revenueToday)}</p>
          </article>
        ) : null}
        {visibleWidgetIds.has('kpi_open_invoices') ? (
          <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">Open Invoices</p>
            <p className="mt-2 text-xl font-semibold">{openInvoices}</p>
          </article>
        ) : null}
        {visibleWidgetIds.has('kpi_gross_margin') ? (
          <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">Gross Margin This Week</p>
            <p className="mt-2 text-xl font-semibold">{formatPercent(grossMarginWeek)}</p>
          </article>
        ) : null}
        {visibleWidgetIds.has('kpi_low_stock_skus') ? (
          <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">Low-stock SKUs</p>
            <p className="mt-2 text-xl font-semibold">{lowStockSkus}</p>
          </article>
        ) : null}
        {visibleWidgetIds.has('kpi_vans_below_min') ? (
          <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">Vans Below Minimum</p>
            <p className="mt-2 text-xl font-semibold">{vansBelowMin}</p>
          </article>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleWidgetIds.has('trend') ? (
          <article className="rounded-md border border-[#e5e7eb] p-4">
            <h2 className="text-sm font-semibold">Revenue / Expense / Profit Trend</h2>
            <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
              {DASHBOARD_DEMO_DATA.financialTrend.revenue.map((point, index) => (
                <li key={point.at} className="flex items-center justify-between rounded bg-[#f8fafc] px-3 py-2">
                  <span>{formatTimeLabel(point.at)}</span>
                  <span className="font-semibold">
                    Rev {formatUsd(point.value)} / Exp {formatUsd(DASHBOARD_DEMO_DATA.financialTrend.expenses[index]?.value ?? 0)} / Profit {formatUsd(DASHBOARD_DEMO_DATA.financialTrend.profit[index]?.value ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {visibleWidgetIds.has('jobs_queue') ? (
          <article className="rounded-md border border-[#e5e7eb] p-4">
            <h2 className="text-sm font-semibold">Jobs In Progress</h2>
            <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
              {DASHBOARD_DEMO_DATA.jobsQueue.map((job) => (
                <li key={job.id} className="rounded bg-[#f8fafc] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{job.id}</span>
                    <span className="uppercase">{job.status.replace('_', ' ')}</span>
                  </div>
                  <p>{job.customerName} - {job.site}</p>
                  <p>{formatSchedule(job.scheduledFor)}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleWidgetIds.has('critical_replenishment') ? (
          <article className="rounded-md border border-[#e5e7eb] p-4">
            <h2 className="text-sm font-semibold">Critical Replenishment</h2>
            <ul className="mt-3 space-y-2 text-xs text-[#4b5563]">
              {DASHBOARD_DEMO_DATA.replenishmentAlerts.map((alert) => (
                <li key={alert.id} className="rounded bg-[#fff7ed] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{alert.sku}</span>
                    <span className="uppercase">{alert.severity}</span>
                  </div>
                  <p>{alert.itemName} ({alert.location})</p>
                  <p>On hand {alert.onHand} / Min {alert.reorderPoint} / Reorder {alert.suggestedOrderQty}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  );
}
