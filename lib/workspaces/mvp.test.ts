import {describe, expect, it} from 'vitest';

import {MVP_WORKSPACE_KEYS, getWorkspaceMvpSnapshot} from './mvp';

describe('workspace mvp snapshots', () => {
  it('ships all remaining protected placeholder workspaces', () => {
    expect(MVP_WORKSPACE_KEYS).toEqual([
      'customers',
      'jobs',
      'quotes',
      'invoices',
      'reports',
      'settings',
    ]);
  });

  it('returns structured, non-placeholder content for every workspace', () => {
    MVP_WORKSPACE_KEYS.forEach((workspaceKey) => {
      const snapshot = getWorkspaceMvpSnapshot(workspaceKey);

      expect(snapshot.title.length).toBeGreaterThan(3);
      expect(snapshot.subtitle.toLowerCase()).not.toContain('placeholder');
      expect(snapshot.kpis.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.queue.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.checklist.length).toBeGreaterThanOrEqual(3);
    });
  });
});
