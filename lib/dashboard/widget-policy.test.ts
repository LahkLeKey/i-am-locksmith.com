import {describe, expect, it} from 'vitest';

import {buildVisibleWidgets, type DashboardWidgetId} from './widget-policy';

function ids(values: {id: DashboardWidgetId}[]) {
  return values.map((value) => value.id);
}

describe('buildVisibleWidgets', () => {
  it('shows all dashboard widgets for owner-style permissions', () => {
    const permissions = new Set([
      'dashboard.read',
      'invoices.read',
      'reports.read',
      'inventory.read',
      'jobs.read',
      'settings.read',
      'customers.read',
    ]);

    const visible = buildVisibleWidgets(permissions as never);

    expect(ids(visible)).toEqual([
      'kpi_revenue_today',
      'kpi_open_invoices',
      'kpi_gross_margin',
      'kpi_low_stock_skus',
      'kpi_vans_below_min',
      'trend',
      'jobs_queue',
      'critical_replenishment',
    ]);
  });

  it('hides financial widgets for technician profile', () => {
    const permissions =
        new Set(['dashboard.read', 'jobs.read', 'inventory.read']);

    const visible = buildVisibleWidgets(permissions as never);

    expect(ids(visible)).toEqual([
      'kpi_low_stock_skus',
      'kpi_vans_below_min',
      'jobs_queue',
      'critical_replenishment',
    ]);
  });

  it('fails closed when dashboard.read is missing', () => {
    const permissions =
        new Set(['jobs.read', 'inventory.read', 'reports.read']);

    const visible = buildVisibleWidgets(permissions as never);

    expect(visible).toEqual([]);
  });
});
