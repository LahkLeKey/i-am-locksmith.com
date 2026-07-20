import {describe, expect, it, vi} from 'vitest';

import {warnIfDatabaseUrlMissing} from './database-url-warning';

describe('warnIfDatabaseUrlMissing', () => {
  it('does not warn in test environments', () => {
    const warn = vi.fn();

    warnIfDatabaseUrlMissing({NODE_ENV: 'test'}, warn);

    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when DATABASE_URL is present', () => {
    const warn = vi.fn();

    warnIfDatabaseUrlMissing({DATABASE_URL: 'postgresql://example'}, warn);

    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when DATABASE_URL is missing', () => {
    const warn = vi.fn();

    warnIfDatabaseUrlMissing({}, warn);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
        'DATABASE_URL is not set. Prisma-backed dashboard data will fall back to zero-state until the variable is configured.');
  });

  it('warns when DATABASE_URL is whitespace only', () => {
    const warn = vi.fn();

    warnIfDatabaseUrlMissing({DATABASE_URL: '   '}, warn);

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
