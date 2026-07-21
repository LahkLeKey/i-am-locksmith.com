import {describe, expect, it, vi} from 'vitest';

import {getDashboardData} from './repository';

describe('getDashboardData', () => {
  it('returns zero-state values when there is no persisted snapshot',
     async () => {
       const findFirst = vi.fn().mockResolvedValue(null);

       const data = await getDashboardData({
         client: {dashboardSnapshot: {findFirst}},
       });

       expect(findFirst).toHaveBeenCalledWith({
         orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
       });
       expect(data.revenueToday).toBe(0);
       expect(data.kpis).toEqual([]);
       expect(data.jobsQueue).toEqual([]);
     });

  it('maps a persisted snapshot into dashboard data', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'snapshot_1',
      orgId: 'org_1',
      generatedAt: new Date('2026-07-20T09:00:00.000Z'),
      revenueToday: 4280,
      openInvoices: 18,
      grossMarginWeek: '46.2',
      lowStockSkus: 3,
      vansBelowMin: 1,
      financialTrend: {
        revenue: [{at: '2026-07-20', value: 4280}],
        expenses: [{at: '2026-07-20', value: 2305}],
        profit: [{at: '2026-07-20', value: 1975}],
      },
      kpis: [{
        id: 'open-jobs',
        label: 'Open Jobs',
        value: 37,
        changePct: 8.4,
        direction: 'up',
        trend: []
      }],
      jobsQueue: [{
        id: 'JOB-1042',
        customerName: 'Northside Medical',
        site: 'Denver, CO',
        priority: 'urgent',
        status: 'in_progress',
        scheduledFor: null,
        etaMinutes: null,
        requiredSkus: []
      }],
      replenishmentAlerts: [{
        id: 'ALERT-2001',
        sku: 'LOCK-CYL-01',
        itemName: 'Cylinder Lock Core',
        location: 'Warehouse A',
        onHand: 6,
        reorderPoint: 12,
        suggestedOrderQty: 24,
        severity: 'critical',
        supplier: 'KeyCore Supply',
        etaDays: 2,
        createdAt: '2026-07-20T08:15:00.000Z'
      }],
      createdAt: new Date('2026-07-20T09:00:00.000Z'),
      updatedAt: new Date('2026-07-20T09:00:00.000Z'),
    });

    const data = await getDashboardData({
      client: {dashboardSnapshot: {findFirst}},
    });

    expect(data.generatedAt).toBe('2026-07-20T09:00:00.000Z');
    expect(data.grossMarginWeek).toBeCloseTo(46.2, 5);
    expect(data.jobsQueue).toHaveLength(1);
    expect(data.replenishmentAlerts).toHaveLength(1);
  });

  it('queries snapshots scoped to the provided org id', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);

    await getDashboardData({
      orgId: 'org_123',
      client: {dashboardSnapshot: {findFirst}},
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {orgId: 'org_123'},
      orderBy: [{generatedAt: 'desc'}, {id: 'desc'}],
    });
  });

  it('falls back to zero-state when database query fails', async () => {
    const findFirst = vi.fn().mockRejectedValue(new Error('db unavailable'));

    const data = await getDashboardData({
      client: {dashboardSnapshot: {findFirst}},
    });

    expect(data.revenueToday).toBe(0);
    expect(data.financialTrend.revenue).toEqual([]);
  });

  it('falls back to zero-state when snapshot shape is invalid', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      orgId: 'org_1',
      generatedAt: new Date('2026-07-20T09:00:00.000Z'),
      revenueToday: 100,
      openInvoices: 4,
      grossMarginWeek: 'not-a-number',
      lowStockSkus: 1,
      vansBelowMin: 0,
      financialTrend: [],
      kpis: [],
      jobsQueue: [],
      replenishmentAlerts: [],
    });

    const data = await getDashboardData({
      client: {dashboardSnapshot: {findFirst}},
    });

    expect(data.revenueToday).toBe(0);
    expect(data.grossMarginWeek).toBe(0);
  });

  it('falls back to zero-state when financial trend arrays are missing',
     async () => {
       const findFirst = vi.fn().mockResolvedValue({
         orgId: 'org_1',
         generatedAt: new Date('2026-07-20T09:00:00.000Z'),
         revenueToday: 100,
         openInvoices: 4,
         grossMarginWeek: 10,
         lowStockSkus: 1,
         vansBelowMin: 0,
         financialTrend: {revenue: [], expenses: []},
         kpis: [],
         jobsQueue: [],
         replenishmentAlerts: [],
       });

       const data = await getDashboardData({
         client: {dashboardSnapshot: {findFirst}},
       });

       expect(data.revenueToday).toBe(0);
       expect(data.financialTrend.profit).toEqual([]);
     });
});
