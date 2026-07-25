import {describe, expect, it} from 'vitest';

import {ALL_PERMISSIONS, hasPermission, type Permission, resolveEffectivePermissions, ROUTE_PERMISSION_MAP,} from './policy';

describe('resolveEffectivePermissions', () => {
  it('returns no permissions when org role is missing', () => {
    const result =
        resolveEffectivePermissions({orgRole: null, userRole: 'dispatcher'});

    expect(result.size).toBe(0);
  });

  it('uses org role permissions when user role is not provided', () => {
    const result = resolveEffectivePermissions(
        {orgRole: 'inventory_manager', userRole: null});

    expect(result.size).toBeGreaterThan(0);
    expect(result.has('inventory.transfer')).toBe(true);
    expect(result.has('settings.update')).toBe(false);
  });

  it('intersects org role and user role permissions', () => {
    const result = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'technician'});

    expect(result.has('jobs.update')).toBe(true);
    expect(result.has('settings.update')).toBe(false);
    expect(result.has('reports.read')).toBe(false);
  });
});

describe('permission helpers', () => {
  it('recognizes permission membership', () => {
    const permissions = new Set<Permission>(['dashboard.read', 'jobs.read']);

    expect(hasPermission(permissions, 'dashboard.read')).toBe(true);
    expect(hasPermission(permissions, 'inventory.adjust')).toBe(false);
  });

  it('keeps route map entries bound to known permissions', () => {
    const allowed = new Set<Permission>(ALL_PERMISSIONS);

    Object.values(ROUTE_PERMISSION_MAP).forEach((permission) => {
      expect(allowed.has(permission)).toBe(true);
    });
  });

  it('contains protected shell routes required for navigation', () => {
    expect(ROUTE_PERMISSION_MAP['/jobs']).toBe('jobs.read');
    expect(ROUTE_PERMISSION_MAP['/customers']).toBe('customers.read');
    expect(ROUTE_PERMISSION_MAP['/technicians']).toBe('technicians.manage');
    expect(ROUTE_PERMISSION_MAP['/inventory']).toBe('inventory.read');
    expect(ROUTE_PERMISSION_MAP['/invoices']).toBe('invoices.read');
    expect(ROUTE_PERMISSION_MAP['/reports']).toBe('reports.read');
    expect(ROUTE_PERMISSION_MAP['/settings']).toBe('settings.read');
  });

  it('keeps customer management with owners and dispatchers', () => {
    const owner = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'owner_admin'});
    const dispatcher = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'dispatcher'});
    const technician = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'technician'});

    expect(owner.has('customers.manage')).toBe(true);
    expect(dispatcher.has('customers.manage')).toBe(true);
    expect(technician.has('customers.read')).toBe(true);
    expect(technician.has('customers.manage')).toBe(false);
  });

  it('keeps technician assignment constraints by role', () => {
    const owner = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'owner_admin'});
    expect(owner.has('technicians.manage')).toBe(true);

    const tech = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'technician'});
    expect(tech.has('technicians.manage')).toBe(false);
    expect(tech.has('technicians.read')).toBe(true);
  });

  it('limits offline payment recording to accounting roles', () => {
    const owner = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'owner_admin'});
    const accountant = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'accountant'});
    const dispatcher = resolveEffectivePermissions(
        {orgRole: 'owner_admin', userRole: 'dispatcher'});

    expect(owner.has('invoices.mark_paid')).toBe(true);
    expect(accountant.has('invoices.mark_paid')).toBe(true);
    expect(dispatcher.has('invoices.mark_paid')).toBe(false);
  });
});
