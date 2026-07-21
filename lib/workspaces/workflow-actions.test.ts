import type {DashboardData} from '@/lib/dashboard/types';
import {describe, expect, it} from 'vitest';

import {applyWorkflowAction, type WorkflowActionType} from './workflow-actions';

const BASE_DATA: DashboardData = {
  generatedAt: '2026-07-21T14:00:00.000Z',
  revenueToday: 5000,
  openInvoices: 12,
  grossMarginWeek: 42,
  lowStockSkus: 4,
  vansBelowMin: 2,
  financialTrend: {
    revenue: [],
    expenses: [],
    profit: [],
  },
  kpis: [],
  jobsQueue: [
    {
      id: 'JOB-1',
      customerName: 'Acme',
      site: 'A',
      priority: 'normal',
      status: 'queued',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: [],
    },
    {
      id: 'JOB-2',
      customerName: 'Beta',
      site: 'B',
      priority: 'urgent',
      status: 'blocked',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: [],
    },
  ],
  replenishmentAlerts: [
    {
      id: 'ALERT-1',
      sku: 'SKU-1',
      itemName: 'Part',
      location: 'Main',
      onHand: 1,
      reorderPoint: 5,
      suggestedOrderQty: 10,
      severity: 'critical',
      supplier: 'Supply',
      etaDays: 2,
      createdAt: '2026-07-21T14:00:00.000Z',
    },
  ],
};

describe('applyWorkflowAction', () => {
  it('applies invoices send action', () => {
    const next = applyWorkflowAction(BASE_DATA, 'invoices.send_one');

    expect(next.data.openInvoices).toBe(11);
    expect(next.message).toContain('Invoice');
  });

  it('dispatches the next queued job', () => {
    const next = applyWorkflowAction(BASE_DATA, 'jobs.dispatch_next');

    expect(next.data.jobsQueue[0]?.status).toBe('in_progress');
    expect(next.data.jobsQueue[0]?.etaMinutes).toBe(30);
  });

  it('increments revenue when quote approved', () => {
    const next = applyWorkflowAction(BASE_DATA, 'quotes.approve_pending');

    expect(next.data.revenueToday).toBe(5750);
  });

  it.each<WorkflowActionType>([
    'customers.record_follow_up',
    'reports.refresh_snapshot',
    'settings.apply_replenishment_guardrail',
  ])('returns updated generatedAt for %s', (actionType) => {
    const next = applyWorkflowAction(BASE_DATA, actionType);

    expect(new Date(next.data.generatedAt).getTime())
        .toBeGreaterThanOrEqual(new Date(BASE_DATA.generatedAt).getTime());
  });
});
