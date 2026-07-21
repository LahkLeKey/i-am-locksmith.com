import {formatPercent, formatUsd} from '../dashboard/format';
import type {DashboardData} from '../dashboard/types';

import type {WorkflowActionType} from './workflow-actions';

export const MVP_WORKSPACE_KEYS = [
  'customers',
  'jobs',
  'quotes',
  'invoices',
  'reports',
  'settings',
] as const;

export type MvpWorkspaceKey = (typeof MVP_WORKSPACE_KEYS)[number];

export type WorkspaceMvpSnapshot = {
  title: string; subtitle: string;
  generatedAtLabel?: string;
  dataSourceLabel?: string;
  telemetry?: {
    blockedJobs: number; criticalAlerts: number; openInvoices: number;
    lowStockSkus: number;
  };
  primaryAction:
      {label: string; actionType: WorkflowActionType; summary: string;};
  kpis: Array<{label: string; value: string; trend: string;}>;
  queue: Array<{
    title: string; detail: string; status: 'urgent' | 'attention' | 'scheduled';
  }>;
  checklist: string[];
};

const WORKSPACE_MVP_SNAPSHOTS: Record<MvpWorkspaceKey, WorkspaceMvpSnapshot> = {
  customers: {
    title: 'Customer Workspace',
    subtitle:
        'Track customer records, service history, and outreach tasks tied to active field work.',
    primaryAction: {
      label: 'Record customer follow-up',
      actionType: 'customers.record_follow_up',
      summary:
          'Logs outreach completion and refreshes customer pipeline context.',
    },
    kpis: [
      {label: 'Active customers', value: '182', trend: '+7 this week'},
      {label: 'Service agreements', value: '64', trend: '91% renewed on time'},
      {
        label: 'At-risk accounts',
        value: '11',
        trend: '4 require callback today'
      },
    ],
    queue: [
      {
        title: 'Follow up expiring service contract',
        detail: 'Northgate Retail - expires in 4 days',
        status: 'urgent',
      },
      {
        title: 'Confirm site access instructions',
        detail: 'Pioneer Apartments - lockbox code changed',
        status: 'attention',
      },
      {
        title: 'Complete onboarding profile',
        detail: 'Brightline Office Park - add after-hours contacts',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Verify customer emergency contacts before dispatching after-hours jobs.',
      'Tag accounts with managed inventory to improve replenishment forecasting.',
      'Capture contract start/end dates to drive automated retention prompts.',
    ],
  },
  jobs: {
    title: 'Jobs Workspace',
    subtitle:
        'Move work from quote-approved to dispatched and completed with inventory context.',
    primaryAction: {
      label: 'Dispatch next queued job',
      actionType: 'jobs.dispatch_next',
      summary: 'Promotes the next queued job into active dispatch with ETA.',
    },
    kpis: [
      {label: 'Open jobs', value: '37', trend: '9 assigned this morning'},
      {label: 'On-time completion', value: '94%', trend: '+3% vs last week'},
      {
        label: 'Blocked by stock',
        value: '5',
        trend: '2 escalated to inventory'
      },
    ],
    queue: [
      {
        title: 'Rekey package - downtown clinic',
        detail: 'Awaiting van transfer for cylinder set',
        status: 'urgent',
      },
      {
        title: 'Emergency lockout response',
        detail: 'Technician eta 18 minutes - verify customer callback',
        status: 'attention',
      },
      {
        title: 'Scheduled hardware upgrade',
        detail: 'Tomorrow 8:00 AM - pre-stage kit in van 12',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Attach inventory reservations before assigning technicians.',
      'Track eta changes to reduce customer no-answer rates.',
      'Mark completed jobs with parts consumed for margin visibility.',
    ],
  },
  quotes: {
    title: 'Quotes Workspace',
    subtitle:
        'Prepare scoped quotes with labor, parts, and approval timing at a glance.',
    primaryAction: {
      label: 'Approve pending quote',
      actionType: 'quotes.approve_pending',
      summary: 'Advances quote workflow and updates projected daily revenue.',
    },
    kpis: [
      {label: 'Draft quotes', value: '23', trend: '6 created today'},
      {label: 'Approval rate', value: '62%', trend: '+8% month over month'},
      {label: 'Average turnaround', value: '19h', trend: 'Target < 24h'},
    ],
    queue: [
      {
        title: 'Access control retrofit proposal',
        detail: 'Awaiting final hardware cost from supplier',
        status: 'urgent',
      },
      {
        title: 'Multi-site rekey estimate',
        detail: 'Need site visit notes from technician',
        status: 'attention',
      },
      {
        title: 'Preventive maintenance renewal',
        detail: 'Schedule send after customer budget meeting',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Reuse approved labor templates to keep quote margins consistent.',
      'Flag parts with low stock before sending customer-facing totals.',
      'Track approval blockers to shorten close cycles.',
    ],
  },
  invoices: {
    title: 'Invoices Workspace',
    subtitle:
        'Close completed jobs with accurate billing, status tracking, and follow-through.',
    primaryAction: {
      label: 'Send next invoice',
      actionType: 'invoices.send_one',
      summary: 'Closes one invoice send step and updates open invoice counts.',
    },
    kpis: [
      {label: 'Open invoices', value: '41', trend: '12 due this week'},
      {
        label: 'Collected this month',
        value: '$84,200',
        trend: '+$9,400 vs last month'
      },
      {label: 'Average days to pay', value: '16', trend: 'Down from 21'},
    ],
    queue: [
      {
        title: 'Past-due invoice review',
        detail: 'Horizon Estates - 14 days overdue',
        status: 'urgent',
      },
      {
        title: 'Bundle materials + labor lines',
        detail: 'Job J-1402 requires revised billing memo',
        status: 'attention',
      },
      {
        title: 'Send monthly statement batch',
        detail: 'Scheduled for 4:00 PM with account summaries',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Reconcile job completion timestamps before invoice send.',
      'Surface disputed invoices with owner follow-up notes.',
      'Monitor collection aging by customer segment.',
    ],
  },
  reports: {
    title: 'Reports Workspace',
    subtitle:
        'Review operational trends, profitability, and service outcomes from persisted events.',
    primaryAction: {
      label: 'Refresh reporting snapshot',
      actionType: 'reports.refresh_snapshot',
      summary:
          'Recalculates freshness timestamp for operational reporting views.',
    },
    kpis: [
      {
        label: 'Weekly gross margin',
        value: '42.1%',
        trend: '+1.8% week over week'
      },
      {label: 'Revisit rate', value: '6.4%', trend: 'Down 1.2% this quarter'},
      {label: 'Inventory turns', value: '5.7x', trend: '+0.6x year to date'},
    ],
    queue: [
      {
        title: 'Publish executive summary',
        detail: 'Include low-stock impact by service region',
        status: 'urgent',
      },
      {
        title: 'Validate dispatch latency chart',
        detail: 'Check missing event data for Sunday window',
        status: 'attention',
      },
      {
        title: 'Schedule monthly ops review deck',
        detail: 'Auto-export set for first business day',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Align revenue metrics with invoice close dates.',
      'Track job revisit causes against technician training plans.',
      'Segment inventory exceptions by warehouse and van pool.',
    ],
  },
  settings: {
    title: 'Settings Workspace',
    subtitle:
        'Manage access controls, workflow defaults, and operational guardrails for your org.',
    primaryAction: {
      label: 'Apply replenishment guardrail',
      actionType: 'settings.apply_replenishment_guardrail',
      summary: 'Enforces safer reorder quantities across replenishment alerts.',
    },
    kpis: [
      {label: 'Active users', value: '29', trend: '3 pending invites'},
      {
        label: 'Role mappings',
        value: '6 profiles',
        trend: '2 updated this month'
      },
      {label: 'Automation rules', value: '14', trend: '1 requires review'},
    ],
    queue: [
      {
        title: 'Review privileged access changes',
        detail: 'Owner role granted to 1 new member',
        status: 'urgent',
      },
      {
        title: 'Finalize dispatch default windows',
        detail: 'Pending timezone update for west region',
        status: 'attention',
      },
      {
        title: 'Rotate integration credentials',
        detail: 'Quarterly security task due Friday',
        status: 'scheduled',
      },
    ],
    checklist: [
      'Confirm new users are mapped to org-specific roles.',
      'Audit automation rules after workflow policy changes.',
      'Log critical settings edits for compliance reviews.',
    ],
  },
};

function toDashboardTimestampLabel(generatedAtIso: string): string {
  const date = new Date(generatedAtIso);

  if (Number.isNaN(date.getTime())) {
    return 'Live snapshot unavailable';
  }

  return `Live snapshot from ${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function buildTelemetry(dashboardData: DashboardData):
    WorkspaceMvpSnapshot['telemetry'] {
  return {
    blockedJobs:
        dashboardData.jobsQueue.filter((job) => job.status === 'blocked')
            .length,
    criticalAlerts: dashboardData.replenishmentAlerts
                        .filter((alert) => alert.severity === 'critical')
                        .length,
    openInvoices: dashboardData.openInvoices,
    lowStockSkus: dashboardData.lowStockSkus,
  };
}

function buildSignalQueue(
    dashboardData: DashboardData, fallbackQueue: WorkspaceMvpSnapshot['queue']):
    WorkspaceMvpSnapshot['queue'] {
  const signalQueue: WorkspaceMvpSnapshot['queue'] = [];

  const blockedJobs =
      dashboardData.jobsQueue.filter((job) => job.status === 'blocked')
          .slice(0, 1);
  blockedJobs.forEach((job) => {
    signalQueue.push({
      title: `Blocked job ${job.id}`,
      detail: `${job.customerName} - ${job.site}`,
      status: 'urgent',
    });
  });

  const criticalAlerts = dashboardData.replenishmentAlerts
                             .filter((alert) => alert.severity === 'critical')
                             .slice(0, 1);
  criticalAlerts.forEach((alert) => {
    signalQueue.push({
      title: `Critical stock ${alert.sku}`,
      detail: `${alert.location}: on hand ${alert.onHand} / min ${
          alert.reorderPoint}`,
      status: 'attention',
    });
  });

  const scheduledJobs =
      dashboardData.jobsQueue.filter((job) => job.status === 'scheduled')
          .slice(0, 1);
  scheduledJobs.forEach((job) => {
    signalQueue.push({
      title: `Scheduled ${job.id}`,
      detail: `${job.customerName} - ${job.site}`,
      status: 'scheduled',
    });
  });

  if (signalQueue.length >= 3) {
    return signalQueue;
  }

  return [...signalQueue, ...fallbackQueue].slice(0, 3);
}

function withDashboardSignals(
    workspaceKey: MvpWorkspaceKey, baseSnapshot: WorkspaceMvpSnapshot,
    dashboardData: DashboardData): WorkspaceMvpSnapshot {
  const blockedJobCount =
      dashboardData.jobsQueue.filter((job) => job.status === 'blocked').length;
  const urgentJobCount =
      dashboardData.jobsQueue
          .filter(
              (job) => job.priority === 'urgent' || job.status === 'blocked')
          .length;
  const activeCustomers =
      new Set(dashboardData.jobsQueue.map((job) => job.customerName)).size;
  const criticalAlertCount =
      dashboardData.replenishmentAlerts
          .filter((alert) => alert.severity === 'critical')
          .length;

  const shared = {
    ...baseSnapshot,
    generatedAtLabel: toDashboardTimestampLabel(dashboardData.generatedAt),
    dataSourceLabel: 'Computed from persisted dashboard events',
    telemetry: buildTelemetry(dashboardData),
    queue: buildSignalQueue(dashboardData, baseSnapshot.queue),
  };

  if (workspaceKey === 'customers') {
    return {
      ...shared,
      kpis: [
        {
          label: 'Customers in active queue',
          value: String(activeCustomers),
          trend: `${dashboardData.jobsQueue.length} active jobs linked`,
        },
        {
          label: 'Accounts with stock risk',
          value: String(dashboardData.lowStockSkus),
          trend: `${criticalAlertCount} critical replenishment signals`,
        },
        {
          label: 'Revenue at risk today',
          value: formatUsd(dashboardData.revenueToday),
          trend: 'Prioritize callbacks for blocked field work',
        },
      ],
    };
  }

  if (workspaceKey === 'jobs') {
    return {
      ...shared,
      kpis: [
        {
          label: 'Open jobs',
          value: String(dashboardData.jobsQueue.length),
          trend: `${urgentJobCount} urgent or blocked`,
        },
        {
          label: 'Blocked jobs',
          value: String(blockedJobCount),
          trend: `${dashboardData.vansBelowMin} vans below min levels`,
        },
        {
          label: 'Revenue tied to active jobs',
          value: formatUsd(dashboardData.revenueToday),
          trend: 'Use dispatch sequencing to protect completion velocity',
        },
      ],
    };
  }

  if (workspaceKey === 'quotes') {
    return {
      ...shared,
      kpis: [
        {
          label: 'Pipeline jobs for quoting',
          value: String(dashboardData.jobsQueue.length),
          trend: `${urgentJobCount} high-priority jobs need fast turnarounds`,
        },
        {
          label: 'Gross margin this week',
          value: formatPercent(dashboardData.grossMarginWeek),
          trend: 'Use margin guardrails when pricing parts + labor',
        },
        {
          label: 'Low-stock influence',
          value: String(dashboardData.lowStockSkus),
          trend: 'Flag stock-sensitive quotes before approval',
        },
      ],
    };
  }

  if (workspaceKey === 'invoices') {
    return {
      ...shared,
      kpis: [
        {
          label: 'Open invoices',
          value: String(dashboardData.openInvoices),
          trend: 'Collections queue synced with operations status',
        },
        {
          label: 'Revenue booked today',
          value: formatUsd(dashboardData.revenueToday),
          trend: 'Track completed work against invoice issuance',
        },
        {
          label: 'Jobs awaiting closeout',
          value: String(dashboardData.jobsQueue.length),
          trend: `${blockedJobCount} blocked jobs may delay billing`,
        },
      ],
    };
  }

  if (workspaceKey === 'reports') {
    return {
      ...shared,
      kpis: [
        {
          label: 'Weekly gross margin',
          value: formatPercent(dashboardData.grossMarginWeek),
          trend: 'Realtime from persisted finance trend snapshots',
        },
        {
          label: 'Revenue today',
          value: formatUsd(dashboardData.revenueToday),
          trend: `${dashboardData.openInvoices} invoices remain open`,
        },
        {
          label: 'Low-stock SKUs',
          value: String(dashboardData.lowStockSkus),
          trend: `${criticalAlertCount} critical replenishment signals`,
        },
      ],
    };
  }

  return {
    ...shared,
    kpis: [
      {
        label: 'Open workflow jobs',
        value: String(dashboardData.jobsQueue.length),
        trend: `${urgentJobCount} need immediate action`,
      },
      {
        label: 'Critical stock alerts',
        value: String(criticalAlertCount),
        trend: `${dashboardData.lowStockSkus} SKUs below threshold`,
      },
      {
        label: 'Vans below minimums',
        value: String(dashboardData.vansBelowMin),
        trend: 'Adjust rules and assignments to avoid service delays',
      },
    ],
  };
}

export function getWorkspaceMvpSnapshot(
    workspaceKey: MvpWorkspaceKey,
    dashboardData?: DashboardData): WorkspaceMvpSnapshot {
  const baseSnapshot = WORKSPACE_MVP_SNAPSHOTS[workspaceKey];

  if (!dashboardData) {
    return baseSnapshot;
  }

  return withDashboardSignals(workspaceKey, baseSnapshot, dashboardData);
}
