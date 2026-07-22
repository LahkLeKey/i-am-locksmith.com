import type {DashboardData} from '@/lib/dashboard/types';
import {describe, expect, it} from 'vitest';

import {getWorkspaceMvpSnapshot, MVP_WORKSPACE_KEYS} from './mvp';

const SIGNAL_DASHBOARD_DATA: DashboardData = {
  generatedAt: '2026-07-21T14:00:00.000Z',
  revenueToday: 12345,
  openInvoices: 17,
  grossMarginWeek: 41.2,
  lowStockSkus: 9,
  vansBelowMin: 3,
  financialTrend: {
    revenue: [],
    expenses: [],
    profit: [],
  },
  kpis: [],
  jobsQueue: [
    {
      id: 'JOB-100',
      customerName: 'Acme Campus',
      site: 'Building A',
      priority: 'urgent',
      status: 'blocked',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: ['SKU-1'],
    },
    {
      id: 'JOB-200',
      customerName: 'Acme Campus',
      site: 'Building B',
      priority: 'normal',
      status: 'scheduled',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: ['SKU-2'],
    },
  ],
  replenishmentAlerts: [
    {
      id: 'ALERT-1',
      sku: 'CYL-44',
      itemName: 'Cylinder 44',
      location: 'Main Warehouse',
      onHand: 1,
      reorderPoint: 5,
      suggestedOrderQty: 12,
      severity: 'critical',
      supplier: 'SecureSupply',
      etaDays: 2,
      createdAt: '2026-07-21T13:00:00.000Z',
    },
  ],
};

describe('workspace mvp snapshots', () => {
  it('ships all remaining protected placeholder workspaces', () => {
    expect(MVP_WORKSPACE_KEYS).toEqual([
      'customers',
      'jobs',
      'invoices',
      'reports',
      'settings',
    ]);
  });

  it('returns structured, non-placeholder content for every workspace', () => {
    MVP_WORKSPACE_KEYS.forEach((workspaceKey) => {
      const snapshot = getWorkspaceMvpSnapshot(workspaceKey);

      expect(snapshot.title.length).toBeGreaterThan(3);
      expect(snapshot.subtitle.toLowerCase()).not.toContain('placeholder');
      expect(snapshot.primaryAction.label.length).toBeGreaterThan(3);
      expect(snapshot.kpis.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.queue.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.checklist.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('overlays persisted dashboard signals when provided', () => {
    const snapshot = getWorkspaceMvpSnapshot('invoices', SIGNAL_DASHBOARD_DATA);

    expect(snapshot.generatedAtLabel).toContain('Live snapshot from');
    expect(snapshot.dataSourceLabel)
        .toBe('Computed from persisted dashboard events');
    expect(snapshot.telemetry?.openInvoices).toBe(17);
    expect(snapshot.primaryAction.actionType).toBe('invoices.send_one');
    expect(snapshot.kpis[0]?.label).toBe('Open invoices');
    expect(snapshot.kpis[0]?.value).toBe('17');
    expect(snapshot.queue[0]?.title).toContain('Blocked job');
  });
});
