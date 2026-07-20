export type PlatformPillar = {
  id: string;
  title: string;
  summary: string;
};

export type RoadmapPhase = {
  id: 'mvp'|'v1'|'v2';
  title: string;
  duration: string;
  team: string;
  highlights: string[];
};

export type IntegrationCategory = {
  category: string;
  providers: string[];
  rationale: string;
};

export type ReportTemplate = {
  id: string;
  name: string;
  purpose: string;
  coreColumns: string[];
};

export const PLATFORM_PILLARS: PlatformPillar[] = [
  {
    id: 'inventory-core',
    title: 'Inventory-First Core',
    summary:
      'Van, shop, and multi-location stock as the center of daily operations.',
  },
  {
    id: 'audit-truth',
    title: 'Immutable Operational Truth',
    summary:
      'Append-only stock movements and accounting journals for reliable reconciliation.',
  },
  {
    id: 'field-speed',
    title: 'Field-Speed Workflow',
    summary:
      'Fast quote-to-job execution with mobile-friendly, role-scoped actions.',
  },
  {
    id: 'accounting-rigor',
    title: 'Accounting Discipline',
    summary:
      'Costing policy awareness, COGS linkage, and job-level profitability outputs.',
  },
];

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: 'mvp',
    title: 'MVP',
    duration: '4-6 months',
    team: '5-7 FTE',
    highlights: [
      'Inventory core with low-stock and transfer workflows',
      'Quotes, jobs, invoices, and purchase/receive loop',
      'Baseline stock ledger and accounting posting rules',
    ],
  },
  {
    id: 'v1',
    title: 'v1 Expansion',
    duration: '8-12 months total',
    team: '7-10 FTE',
    highlights: [
      'Mature journal controls and valuation reporting',
      'Integration depth for accounting and payments',
      'Advanced dashboarding and role approvals',
    ],
  },
  {
    id: 'v2',
    title: 'v2 Optimization',
    duration: '12-18 months total',
    team: 'Scaled product team',
    highlights: [
      'Forecasting and anomaly detection layers',
      'Supplier and procurement automation',
      'Branch consolidation and deeper analytics',
    ],
  },
];

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    category: 'Accounting',
    providers: ['QuickBooks Online', 'Xero'],
    rationale: 'Keep operational close and financial close aligned.',
  },
  {
    category: 'Payments',
    providers: ['Stripe', 'Square', 'PayPal'],
    rationale: 'Support counter, mobile, and invoice settlement paths.',
  },
  {
    category: 'Hardware',
    providers: ['Zebra scanners', 'Barcode printers'],
    rationale: 'Reduce stock movement friction in vans and shop floors.',
  },
  {
    category: 'Suppliers',
    providers: ['CSV and email PO', 'API catalog connectors'],
    rationale: 'Shorten replenishment loops and improve item matching quality.',
  },
];

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'job-profitability',
    name: 'Daily Job Profitability',
    purpose: 'Expose margin leakage quickly at technician and job granularity.',
    coreColumns: [
      'Job Number',
      'Technician',
      'Revenue',
      'Parts COGS',
      'Gross Margin %',
    ],
  },
  {
    id: 'inventory-valuation',
    name: 'Inventory Valuation by Location',
    purpose: 'Track stock value and costing method outcomes across locations.',
    coreColumns: ['SKU', 'Location', 'Qty On Hand', 'Unit Cost', 'Extended Cost'],
  },
  {
    id: 'reorder',
    name: 'Low Stock and Reorder',
    purpose: 'Prioritize replenishment to avoid field stockouts.',
    coreColumns: [
      'SKU',
      'Preferred Supplier',
      'Current Qty',
      'Min Stock',
      'Suggested Reorder Qty',
    ],
  },
  {
    id: 'sales-tax',
    name: 'Sales Tax Liability',
    purpose: 'Prepare filing-ready jurisdictional liabilities.',
    coreColumns: [
      'Jurisdiction',
      'Taxable Sales',
      'Tax Collected',
      'Liability Account',
    ],
  },
];
