import {describe, expect, it} from 'vitest';

import {INTEGRATION_CATEGORIES, PLATFORM_PILLARS, REPORT_TEMPLATES, ROADMAP_PHASES,} from './scaffold';

describe('platform scaffold constants', () => {
  it('defines an inventory-first pillar set', () => {
    expect(PLATFORM_PILLARS.map((value) => value.id))
        .toContain('inventory-core');
    expect(PLATFORM_PILLARS).toHaveLength(4);
  });

  it('keeps roadmap phases ordered from mvp to v2', () => {
    expect(ROADMAP_PHASES.map((value) => value.id)).toEqual([
      'mvp', 'v1', 'v2'
    ]);
  });

  it('includes core integration categories from platform strategy', () => {
    expect(INTEGRATION_CATEGORIES.map((value) => value.category)).toEqual([
      'Accounting',
      'Payments',
      'Hardware',
      'Suppliers',
    ]);
  });

  it('exposes report templates with non-empty core columns', () => {
    expect(REPORT_TEMPLATES.every((value) => value.coreColumns.length > 0))
        .toBe(
            true,
        );
  });
});
