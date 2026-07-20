import {describe, expect, it} from 'vitest';

import {buildLandingWorkflows, buildPrimaryAction} from './workflow-orchestration';

describe('buildLandingWorkflows', () => {
  it('requires sign in for guest users across all workflows', () => {
    const workflows = buildLandingWorkflows({
      isAuthenticated: false,
      permissions: new Set(),
    });

    expect(workflows.every((workflow) => workflow.state === 'signin_required'))
        .toBe(true);
    expect(workflows.every((workflow) => workflow.ctaHref === '/sign-in'))
        .toBe(true);
  });

  it('marks only permitted workflows ready for inventory manager style access',
     () => {
       const workflows = buildLandingWorkflows({
         isAuthenticated: true,
         permissions:
             new Set(['inventory.read', 'reports.read', 'dashboard.read']),
       });

       const byId =
           Object.fromEntries(workflows.map((value) => [value.id, value]));

       expect(byId.inventory?.state).toBe('ready');
       expect(byId.reports?.state).toBe('ready');
       expect(byId.jobs?.state).toBe('permission_required');
       expect(byId.invoices?.state).toBe('permission_required');
       expect(byId.jobs?.ctaHref).toBe('/access');
     });
});

describe('buildPrimaryAction', () => {
  it('uses sign-in for guests', () => {
    expect(buildPrimaryAction({isAuthenticated: false, permissions: new Set()}))
        .toEqual({label: 'Sign in', href: '/sign-in'});
  });

  it('routes authenticated users with inventory access to inventory workflow',
     () => {
       expect(buildPrimaryAction({
         isAuthenticated: true,
         permissions: new Set(['inventory.read']),
       })).toEqual({label: 'Open inventory', href: '/inventory'});
     });

  it('routes to first permitted workflow when inventory is not permitted',
     () => {
       expect(buildPrimaryAction({
         isAuthenticated: true,
         permissions: new Set(['jobs.read']),
       })).toEqual({label: 'Open workflow', href: '/jobs'});
     });

  it('uses access guidance when authenticated user has no workflow permissions',
     () => {
       expect(buildPrimaryAction({
         isAuthenticated: true,
         permissions: new Set(),
       })).toEqual({label: 'Review access guidance', href: '/access'});
     });
});
