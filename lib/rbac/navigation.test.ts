import {describe, expect, it} from 'vitest';

import {buildVisibleNavigation, NAV_ITEMS} from './navigation';
import {getRolePermissions} from './policy';

describe('buildVisibleNavigation', () => {
  it('shows dashboard for viewer_auditor', () => {
    const nav = buildVisibleNavigation(getRolePermissions('viewer_auditor'));
    expect(nav.some((item) => item.href === '/dashboard')).toBe(true);
  });

  it('hides settings for technician', () => {
    const nav = buildVisibleNavigation(getRolePermissions('technician'));
    expect(nav.some((item) => item.href === '/settings')).toBe(false);
  });

  it('shows settings for owner_admin', () => {
    const nav = buildVisibleNavigation(getRolePermissions('owner_admin'));
    expect(nav.some((item) => item.href === '/settings')).toBe(true);
    expect(nav.some((item) => item.href === '/technicians')).toBe(true);
    expect(nav.some((item) => item.href === '/customers')).toBe(true);
  });

  it('shows customers to dispatch and field roles with customer context', () => {
    const dispatcher = buildVisibleNavigation(getRolePermissions('dispatcher'));
    const technician = buildVisibleNavigation(getRolePermissions('technician'));

    expect(dispatcher.some((item) => item.href === '/customers')).toBe(true);
    expect(technician.some((item) => item.href === '/customers')).toBe(true);
  });

  it('hides technicians for dispatcher', () => {
    const nav = buildVisibleNavigation(getRolePermissions('dispatcher'));
    expect(nav.some((item) => item.href === '/technicians')).toBe(false);
  });

  it('binds each nav item to an expected permission', () => {
    expect(NAV_ITEMS.length).toBeGreaterThanOrEqual(6);
    NAV_ITEMS.forEach((item) => {
      expect(item.permission).toMatch(/\./);
    });
  });
});
