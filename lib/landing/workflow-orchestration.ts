import {hasPermission, type Permission} from '../rbac/policy';

export type WorkflowState = 'ready'|'signin_required'|'permission_required';

export type LandingWorkflow = {
  id: string; title: string; description: string; href: string;
  requiredPermission: Permission;
  state: WorkflowState;
  ctaLabel: string;
  ctaHref: string;
};

export type LandingPrimaryAction = {label: string; href: string};

const WORKFLOW_DEFINITIONS: Array<{
  id: string; title: string; description: string; href: string;
  requiredPermission: Permission;
}> =
    [
      {
        id: 'inventory',
        title: 'Inventory Command Center',
        description:
            'Prioritize low-stock risk, reconcile variance, and keep field teams in motion.',
        href: '/inventory',
        requiredPermission: 'inventory.read',
      },
      {
        id: 'jobs',
        title: 'Dispatch Workflow',
        description:
            'Move from quote-approved work to assigned jobs with current stock context.',
        href: '/jobs',
        requiredPermission: 'jobs.read',
      },
      {
        id: 'customers',
        title: 'Customer Desk',
        description:
            'Track customer context and service history without leaving operations flow.',
        href: '/customers',
        requiredPermission: 'customers.read',
      },
      {
        id: 'invoices',
        title: 'Revenue Follow-through',
        description:
            'Close operational loops with invoice visibility tied to completed field work.',
        href: '/invoices',
        requiredPermission: 'invoices.read',
      },
      {
        id: 'reports',
        title: 'Reporting Add-on',
        description:
            'Read-only analytics built from persisted core events and inventory outcomes.',
        href: '/reports',
        requiredPermission: 'reports.read',
      },
    ];

export function buildLandingWorkflows({
  isAuthenticated,
  permissions,
}: {isAuthenticated: boolean; permissions: Set<Permission>;}):
    LandingWorkflow[] {
  return WORKFLOW_DEFINITIONS.map((workflow) => {
    if (!isAuthenticated) {
      return {
        ...workflow,
        state: 'signin_required',
        ctaLabel: 'Sign in to start',
        ctaHref: '/sign-in',
      };
    }

    if (!hasPermission(permissions, workflow.requiredPermission)) {
      return {
        ...workflow,
        state: 'permission_required',
        ctaLabel: 'Review access guidance',
        ctaHref: '/access',
      };
    }

    return {
      ...workflow,
      state: 'ready',
      ctaLabel: 'Open workflow',
      ctaHref: workflow.href,
    };
  });
}

export function buildPrimaryAction({
  isAuthenticated,
  permissions,
}: {isAuthenticated: boolean; permissions: Set<Permission>;}):
    LandingPrimaryAction {
  if (!isAuthenticated) {
    return {label: 'Sign in', href: '/sign-in'};
  }

  if (hasPermission(permissions, 'inventory.read')) {
    return {label: 'Open inventory', href: '/inventory'};
  }

  const firstPermittedWorkflow = WORKFLOW_DEFINITIONS.find((workflow) =>
    hasPermission(permissions, workflow.requiredPermission));

  if (firstPermittedWorkflow) {
    return {label: 'Open workflow', href: firstPermittedWorkflow.href};
  }

  return {label: 'Review access guidance', href: '/access'};
}
