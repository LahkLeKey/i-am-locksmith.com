import {formatPercent, formatUsd} from '../dashboard/format';
import type {DashboardData} from '../dashboard/types';

import type {WorkflowActionType} from './workflow-actions';

export const MVP_WORKSPACE_KEYS = [
  'jobs',
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
  jobs: {
    title: 'Jobs Workspace',
    subtitle:
        'Move work from customer follow-up and quote intake to dispatched and completed with inventory context.',
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
      'Record customer follow-up outcomes on jobs before assigning technicians.',
      'Capture quote intake details before dispatch scheduling.',
      'Attach inventory reservations before assigning technicians.',
      'Track eta changes to reduce customer no-answer rates.',
      'Mark completed jobs with parts consumed for margin visibility.',
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

  if (workspaceKey === 'jobs') {
    const activeCustomers =
        new Set(dashboardData.jobsQueue.map((job) => job.customerName)).size;

    return {
      ...shared,
      kpis: [
        {
          label: 'Open jobs',
          value: String(dashboardData.jobsQueue.length),
          trend: `${urgentJobCount} urgent or blocked`,
        },
        {
          label: 'Active customers in queue',
          value: String(activeCustomers),
          trend: 'Use follow-up notes to reduce no-answer dispatch delays',
        },
        {
          label: 'Quote + job revenue pipeline',
          value: formatUsd(dashboardData.revenueToday),
          trend: `${
              dashboardData
                  .lowStockSkus} low-stock SKUs can delay quote-to-job conversion`,
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
