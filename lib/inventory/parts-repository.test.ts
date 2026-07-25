import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
                             prisma: {
                               inventoryPart: {
                                 findFirst: vi.fn(),
                               },
                             },
                           }));

import {prisma} from '@/lib/db/prisma';

import {getInventoryPartById} from './parts-repository';

const mockedFindFirst = vi.mocked(prisma.inventoryPart.findFirst);

describe('getInventoryPartById', () => {
  beforeEach(() => {
    mockedFindFirst.mockReset();
  });

  it('scopes part lookup to the active organization', async () => {
    mockedFindFirst.mockResolvedValue(null);

    const result = await getInventoryPartById('org_1', 'part_1');

    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {id: 'part_1', orgId: 'org_1'},
    });
    expect(result).toBeNull();
  });
});
