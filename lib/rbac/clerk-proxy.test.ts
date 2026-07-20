import {describe, expect, it} from 'vitest';

import {config} from '../../proxy';

describe('clerk proxy matcher coverage', () => {
  it('includes the Clerk frontend API proxy path', () => {
    expect(config.matcher).toContain('/__clerk/(.*)');
  });
});
