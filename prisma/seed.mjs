import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

const snapshot = {
  orgId: 'org_seed_default',
  generatedAt: new Date('2026-07-20T09:00:00.000Z'),
  revenueToday: 4280,
  openInvoices: 18,
  grossMarginWeek: 46.2,
  lowStockSkus: 3,
  vansBelowMin: 1,
  financialTrend: {
    revenue: [
      {at: '2026-07-14', value: 3510},
      {at: '2026-07-15', value: 3720},
      {at: '2026-07-16', value: 3890},
      {at: '2026-07-17', value: 4010},
      {at: '2026-07-18', value: 4175},
      {at: '2026-07-19', value: 4230},
      {at: '2026-07-20', value: 4280},
    ],
    expenses: [
      {at: '2026-07-14', value: 1980},
      {at: '2026-07-15', value: 2030},
      {at: '2026-07-16', value: 2100},
      {at: '2026-07-17', value: 2150},
      {at: '2026-07-18', value: 2215},
      {at: '2026-07-19', value: 2270},
      {at: '2026-07-20', value: 2305},
    ],
    profit: [
      {at: '2026-07-14', value: 1530},
      {at: '2026-07-15', value: 1690},
      {at: '2026-07-16', value: 1790},
      {at: '2026-07-17', value: 1860},
      {at: '2026-07-18', value: 1960},
      {at: '2026-07-19', value: 1960},
      {at: '2026-07-20', value: 1975},
    ],
  },
  kpis: [
    {
      id: 'open-jobs',
      label: 'Open Jobs',
      value: 37,
      unit: 'count',
      changePct: 8.4,
      direction: 'up',
      trend: [
        {at: '2026-07-14', value: 28},
        {at: '2026-07-15', value: 31},
        {at: '2026-07-16', value: 29},
        {at: '2026-07-17', value: 34},
        {at: '2026-07-18', value: 35},
        {at: '2026-07-19', value: 36},
        {at: '2026-07-20', value: 37},
      ],
    },
    {
      id: 'jobs-completed-today',
      label: 'Jobs Completed Today',
      value: 14,
      unit: 'count',
      changePct: -6.7,
      direction: 'down',
      trend: [
        {at: '2026-07-14', value: 15},
        {at: '2026-07-15', value: 16},
        {at: '2026-07-16', value: 14},
        {at: '2026-07-17', value: 17},
        {at: '2026-07-18', value: 15},
        {at: '2026-07-19', value: 15},
        {at: '2026-07-20', value: 14},
      ],
    },
    {
      id: 'avg-time-to-dispatch',
      label: 'Avg Time to Dispatch',
      value: 42,
      unit: 'minutes',
      changePct: 0,
      direction: 'flat',
      trend: [
        {at: '2026-07-14', value: 44},
        {at: '2026-07-15', value: 43},
        {at: '2026-07-16', value: 42},
        {at: '2026-07-17', value: 41},
        {at: '2026-07-18', value: 42},
        {at: '2026-07-19', value: 42},
        {at: '2026-07-20', value: 42},
      ],
    },
  ],
  jobsQueue: [
    {
      id: 'JOB-1042',
      customerName: 'Northside Medical',
      site: 'Denver, CO',
      priority: 'urgent',
      status: 'in_progress',
      scheduledFor: '2026-07-20T10:30:00.000Z',
      etaMinutes: 25,
      requiredSkus: ['LOCK-CYL-01', 'STRIKE-PLATE-02'],
    },
    {
      id: 'JOB-1046',
      customerName: 'Arcadia Storage',
      site: 'Boulder, CO',
      priority: 'high',
      status: 'scheduled',
      scheduledFor: '2026-07-20T13:00:00.000Z',
      etaMinutes: 90,
      requiredSkus: ['PADLOCK-HEAVY-10'],
    },
    {
      id: 'JOB-1050',
      customerName: 'Elm Street Retail',
      site: 'Aurora, CO',
      priority: 'normal',
      status: 'queued',
      scheduledFor: null,
      etaMinutes: null,
      requiredSkus: ['DEADBOLT-STD-04'],
    },
  ],
  replenishmentAlerts: [
    {
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
      createdAt: '2026-07-20T08:15:00.000Z',
    },
    {
      id: 'ALERT-2005',
      sku: 'PADLOCK-HEAVY-10',
      itemName: 'Hardened Padlock 70mm',
      location: 'Warehouse B',
      onHand: 11,
      reorderPoint: 15,
      suggestedOrderQty: 20,
      severity: 'high',
      supplier: 'SecureSteel Inc',
      etaDays: 4,
      createdAt: '2026-07-20T08:45:00.000Z',
    },
    {
      id: 'ALERT-2008',
      sku: 'STRIKE-PLATE-02',
      itemName: 'Reinforced Strike Plate',
      location: 'Van Stock - Team 3',
      onHand: 4,
      reorderPoint: 5,
      suggestedOrderQty: 10,
      severity: 'medium',
      supplier: 'DoorGuard Parts',
      etaDays: null,
      createdAt: '2026-07-20T09:00:00.000Z',
    },
  ],
};

async function main() {
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.inventoryPart.deleteMany();
  await prisma.dashboardSnapshot.create({data: snapshot});
  await prisma.inventoryPart.createMany({
    data: [
      {
        orgId: 'org_seed_default',
        sku: 'AUTO-FOB-01',
        itemName: 'Automotive fob shell',
        serviceLines: ['automotive', 'mobile'],
        location: 'Van 3',
        onHand: 12,
        reorderPoint: 18,
        suggestedOrderQty: 24,
        supplier: 'KeyCore Supply',
        severity: 'high',
        compatibilityNote: 'Move-ready for van stock and automotive calls from Van 3.',
      },
      {
        orgId: 'org_seed_default',
        sku: 'CYL-CORE-02',
        itemName: 'Cylinder core kit',
        serviceLines: ['shop'],
        location: 'Warehouse A',
        onHand: 6,
        reorderPoint: 12,
        suggestedOrderQty: 20,
        supplier: 'Banner Lock Supply',
        severity: 'critical',
        compatibilityNote: 'Bench and counter stock suited to shop workflows.',
      },
      {
        orgId: 'org_seed_default',
        sku: 'VAN-KIT-03',
        itemName: 'Mobile rekey kit',
        serviceLines: ['mobile', 'shop'],
        location: 'Van 3',
        onHand: 9,
        reorderPoint: 10,
        suggestedOrderQty: 16,
        supplier: 'DoorGuard Parts',
        severity: 'medium',
        compatibilityNote: 'Best for mobile van restock and field work.',
      },
    ],
  });
}

main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
