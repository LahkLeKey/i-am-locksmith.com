export const RBAC_MATRIX_VERSION = '2026-07-20';

export const ROLES = [
  'owner_admin',
  'dispatcher',
  'technician',
  'inventory_manager',
  'accountant',
  'viewer_auditor',
] as const;

export type Role = (typeof ROLES)[number];

export const ALL_PERMISSIONS = [
  'dashboard.read',    'customers.read',     'customers.create',
  'customers.update',  'jobs.read',          'jobs.create',
  'jobs.assign',       'jobs.update',        'jobs.complete',
  'quotes.read',       'quotes.create',      'quotes.update',
  'quotes.approve',    'invoices.read',      'invoices.create',
  'invoices.send',     'invoices.void',      'inventory.read',
  'inventory.adjust',  'inventory.transfer', 'inventory.receive',
  'inventory.reserve', 'reports.read',       'settings.read',
  'settings.update',   'users.read',         'users.invite',
  'users.role.update',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const OWNER_ADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];
const DISPATCHER_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'customers.read',
  'customers.create',
  'customers.update',
  'jobs.read',
  'jobs.create',
  'jobs.assign',
  'jobs.update',
  'jobs.complete',
  'quotes.read',
  'quotes.create',
  'quotes.update',
  'quotes.approve',
  'invoices.read',
  'invoices.create',
  'invoices.send',
  'reports.read',
];
const TECHNICIAN_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'customers.read',
  'jobs.read',
  'jobs.update',
  'jobs.complete',
  'inventory.read',
  'inventory.reserve',
];
const INVENTORY_MANAGER_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'inventory.read',
  'inventory.adjust',
  'inventory.transfer',
  'inventory.receive',
  'inventory.reserve',
  'reports.read',
];
const ACCOUNTANT_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'invoices.read',
  'invoices.create',
  'invoices.send',
  'invoices.void',
  'reports.read',
  'settings.read',
];
const VIEWER_AUDITOR_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'customers.read',
  'jobs.read',
  'quotes.read',
  'invoices.read',
  'inventory.read',
  'reports.read',
  'settings.read',
  'users.read',
];

export const RBAC_MATRIX: Record<Role, readonly Permission[]> = {
  owner_admin: OWNER_ADMIN_PERMISSIONS,
  dispatcher: DISPATCHER_PERMISSIONS,
  technician: TECHNICIAN_PERMISSIONS,
  inventory_manager: INVENTORY_MANAGER_PERMISSIONS,
  accountant: ACCOUNTANT_PERMISSIONS,
  viewer_auditor: VIEWER_AUDITOR_PERMISSIONS,
};

export const ROUTE_PERMISSION_MAP = {
  '/dashboard': 'dashboard.read',
  '/jobs': 'jobs.read',
  '/inventory': 'inventory.read',
  '/customers': 'customers.read',
  '/quotes': 'quotes.read',
  '/invoices': 'invoices.read',
  '/reports': 'reports.read',
  '/settings': 'settings.read',
  'GET /api/protected': 'dashboard.read',
  'POST /api/protected': 'settings.update',
} as const satisfies Record<string, Permission>;

export function normalizeRole(value: unknown): Role|null {
  if (typeof value !== 'string') {
    return null;
  }

  return (ROLES as readonly string[]).includes(value) ? (value as Role) : null;
}

export function getRolePermissions(role: Role): Set<Permission> {
  return new Set(RBAC_MATRIX[role]);
}

export function intersectPermissions(
    left: Set<Permission>, right: Set<Permission>): Set<Permission> {
  const output = new Set<Permission>();

  left.forEach((permission) => {
    if (right.has(permission)) {
      output.add(permission);
    }
  });

  return output;
}

export function resolveEffectivePermissions({
  orgRole,
  userRole,
}: {orgRole: Role|null; userRole: Role | null;}): Set<Permission> {
  if (!orgRole) {
    return new Set<Permission>();
  }

  const orgPermissions = getRolePermissions(orgRole);
  if (!userRole) {
    return orgPermissions;
  }

  return intersectPermissions(orgPermissions, getRolePermissions(userRole));
}

export function hasPermission(
    permissions: Set<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}
