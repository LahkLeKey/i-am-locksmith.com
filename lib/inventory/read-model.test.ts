import {describe, expect, it} from 'vitest';

import {type DashboardData} from '../dashboard/types';

import {buildInventoryReadModel} from './read-model';

const BASE_DATA: DashboardData = {
  generatedAt: '2026-07-20T09:00:00.000Z',
  revenueToday: 0,
  openInvoices: 0,
  grossMarginWeek: 0,
  lowStockSkus: 3,
  vansBelowMin: 0,
  financialTrend: {
    revenue: [],
    expenses: [],
    profit: [],
  },
  kpis: [],
  jobsQueue: [],
  replenishmentAlerts: [
    {
      id: 'ALERT-1',
      sku: 'AUTO-FOB-01',
      itemName: 'Automotive fob shell',
      location: 'Van 3',
      onHand: 1,
      reorderPoint: 10,
      suggestedOrderQty: 20,
      severity: 'high',
      supplier: 'Supplier 1',
      etaDays: 2,
      createdAt: '2026-07-20T08:00:00.000Z',
    },
    {
      id: 'ALERT-2',
      sku: 'CYL-CORE-02',
      itemName: 'Cylinder core kit',
      location: 'Warehouse B',
      onHand: 5,
      reorderPoint: 12,
      suggestedOrderQty: 14,
      severity: 'critical',
      supplier: 'Supplier 2',
      etaDays: 1,
      createdAt: '2026-07-20T09:00:00.000Z',
    },
    {
      id: 'ALERT-3',
      sku: 'VAN-KIT-03',
      itemName: 'Mobile rekey kit',
      location: 'Van 3',
      onHand: 3,
      reorderPoint: 5,
      suggestedOrderQty: 8,
      severity: 'high',
      supplier: 'Supplier 3',
      etaDays: null,
      createdAt: '2026-07-20T09:30:00.000Z',
    },
  ],
};

describe('buildInventoryReadModel', () => {
  it('prioritizes queue by severity and deficit', () => {
    const model = buildInventoryReadModel(BASE_DATA);

    expect(model.lowStockQueue.map((value) => value.id)).toEqual([
      'ALERT-2',
      'ALERT-1',
      'ALERT-3',
    ]);
    expect(model.criticalCount).toBe(1);
  });

  it('builds timeline sorted newest-first', () => {
    const model = buildInventoryReadModel(BASE_DATA);

    expect(model.timeline.map((value) => value.id)).toEqual([
      'event-ALERT-3',
      'event-ALERT-2',
      'event-ALERT-1',
    ]);
    expect(model.timeline[0]?.summary).toContain('dropped below reorder point');
  });

  it('orders timeline by actual timestamp when offsets differ', () => {
    const data: DashboardData = {
      ...BASE_DATA,
      replenishmentAlerts: [
        {
          ...BASE_DATA.replenishmentAlerts[0],
          id: 'ALERT-TZ-1',
          createdAt: '2026-07-20T10:00:00+02:00',
        },
        {
          ...BASE_DATA.replenishmentAlerts[1],
          id: 'ALERT-TZ-2',
          createdAt: '2026-07-20T08:30:00Z',
        },
      ],
    };

    const model = buildInventoryReadModel(data);

    expect(model.timeline.map((value) => value.id)).toEqual([
      'event-ALERT-TZ-2',
      'event-ALERT-TZ-1',
    ]);
  });

  it('uses newest timestamp as tie-break when severity and deficit match',
     () => {
       const data: DashboardData = {
         ...BASE_DATA,
         replenishmentAlerts: [
           {
             ...BASE_DATA.replenishmentAlerts[0],
             id: 'ALERT-TIE-OLD',
             severity: 'high',
             onHand: 2,
             reorderPoint: 12,
             createdAt: '2026-07-20T08:00:00.000Z',
           },
           {
             ...BASE_DATA.replenishmentAlerts[1],
             id: 'ALERT-TIE-NEW',
             severity: 'high',
             onHand: 2,
             reorderPoint: 12,
             createdAt: '2026-07-20T09:00:00.000Z',
           },
         ],
       };

       const model = buildInventoryReadModel(data);

       expect(model.lowStockQueue.map((value) => value.id)).toEqual([
         'ALERT-TIE-NEW',
         'ALERT-TIE-OLD',
       ]);
     });

  it('treats invalid timestamps as oldest for ordering', () => {
    const data: DashboardData = {
      ...BASE_DATA,
      replenishmentAlerts: [
        {
          ...BASE_DATA.replenishmentAlerts[0],
          id: 'ALERT-BAD-TIME',
          severity: 'high',
          onHand: 2,
          reorderPoint: 12,
          createdAt: 'not-a-date',
        },
        {
          ...BASE_DATA.replenishmentAlerts[1],
          id: 'ALERT-GOOD-TIME',
          severity: 'high',
          onHand: 2,
          reorderPoint: 12,
          createdAt: '2026-07-20T09:00:00.000Z',
        },
      ],
    };

    const model = buildInventoryReadModel(data);

    expect(model.lowStockQueue.map((value) => value.id)).toEqual([
      'ALERT-GOOD-TIME',
      'ALERT-BAD-TIME',
    ]);
    expect(model.timeline.map((value) => value.id)).toEqual([
      'event-ALERT-GOOD-TIME',
      'event-ALERT-BAD-TIME',
    ]);
  });

  it('builds a parts catalog with service-line coverage notes', () => {
    const model = buildInventoryReadModel(BASE_DATA);

    const automotiveRow = model.catalogRows.find((value) => value.id === 'ALERT-1');
    const shopRow = model.catalogRows.find((value) => value.id === 'ALERT-2');
    const mobileRow = model.catalogRows.find((value) => value.id === 'ALERT-3');

    expect(automotiveRow?.serviceLines).toContain('automotive');
    expect(shopRow?.serviceLines).toContain('shop');
    expect(mobileRow?.serviceLines).toContain('mobile');
    expect(model.serviceLineSummary.map((entry) => entry.id)).toEqual([
      'automotive',
      'mobile',
      'shop',
    ]);
    expect(model.serviceLineSummary[0]?.count).toBe(1);
    expect(model.serviceLineSummary[1]?.count).toBe(3);
    expect(model.serviceLineSummary[2]?.count).toBe(1);
  });
});
