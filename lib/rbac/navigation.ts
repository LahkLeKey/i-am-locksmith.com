import {hasPermission, type Permission} from './policy';

export type NavItem = {
  href: string;
  label: string;
  permission: Permission;
};

export const NAV_ITEMS: readonly NavItem[] = [
  {href: '/dashboard', label: 'Dashboard', permission: 'dashboard.read'},
  {href: '/jobs', label: 'Jobs', permission: 'jobs.read'},
  {href: '/inventory', label: 'Inventory', permission: 'inventory.read'},
  {href: '/customers', label: 'Customers', permission: 'customers.read'},
  {href: '/invoices', label: 'Invoices', permission: 'invoices.read'},
  {href: '/reports', label: 'Reports', permission: 'reports.read'},
  {href: '/settings', label: 'Settings', permission: 'settings.read'},
] as const;

export function buildVisibleNavigation(
  effectivePermissions: Set<Permission>
): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    hasPermission(effectivePermissions, item.permission)
  );
}
