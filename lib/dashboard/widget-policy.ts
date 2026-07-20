import {hasPermission, type Permission} from '../rbac/policy';

export type DashboardWidgetId =
  | 'kpi_revenue_today'
  | 'kpi_open_invoices'
  | 'kpi_gross_margin'
  | 'kpi_low_stock_skus'
  | 'kpi_vans_below_min'
  | 'trend'
  | 'jobs_queue'
  | 'critical_replenishment';

export type DashboardWidget = {
  id: DashboardWidgetId;
  title: string;
  requiredAny: Permission[];
};

export const DASHBOARD_WIDGETS: readonly DashboardWidget[] = [
  {
    id: 'kpi_revenue_today',
    title: 'Revenue Today',
    requiredAny: ['invoices.read'],
  },
  {
    id: 'kpi_open_invoices',
    title: 'Open Invoices',
    requiredAny: ['invoices.read'],
  },
  {
    id: 'kpi_gross_margin',
    title: 'Gross Margin This Week',
    requiredAny: ['reports.read'],
  },
  {
    id: 'kpi_low_stock_skus',
    title: 'Low-stock SKUs',
    requiredAny: ['inventory.read'],
  },
  {
    id: 'kpi_vans_below_min',
    title: 'Vans Below Minimum',
    requiredAny: ['inventory.read'],
  },
  {
    id: 'trend',
    title: 'Revenue, Expense, Profit Trend',
    requiredAny: ['invoices.read', 'reports.read'],
  },
  {
    id: 'jobs_queue',
    title: 'Jobs In Progress',
    requiredAny: ['jobs.read'],
  },
  {
    id: 'critical_replenishment',
    title: 'Critical Replenishment',
    requiredAny: ['inventory.read'],
  },
] as const;

export function buildVisibleWidgets(
  permissions: Set<Permission>
): DashboardWidget[] {
  if (!hasPermission(permissions, 'dashboard.read')) {
    return [];
  }

  return DASHBOARD_WIDGETS.filter((widget) =>
    widget.requiredAny.some((permission) => hasPermission(permissions, permission))
  );
}
