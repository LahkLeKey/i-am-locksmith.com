import {prisma} from '@/lib/db/prisma';

import {LOCATION_TYPES, type LocationType} from './locations';

export type InventoryLocationRecord = {
  id: string; orgId: string; name: string; type: LocationType;
};

function isLocationType(value: string): value is LocationType {
  return LOCATION_TYPES.includes(value as LocationType);
}

function toRecord(row: {id: string; orgId: string; name: string; type: string}):
    InventoryLocationRecord {
  return {
    ...row,
    type: isLocationType(row.type) ? row.type : 'garage',
  };
}

export async function listInventoryLocations(orgId: string):
    Promise<InventoryLocationRecord[]> {
  const rows = await prisma.inventoryLocation.findMany({
    where: {orgId},
    orderBy: {name: 'asc'},
  });
  return rows.map(toRecord);
}

export async function registerInventoryLocation(
    orgId: string, name: string,
    type: LocationType): Promise<InventoryLocationRecord> {
  const normalizedName = name.trim();
  const row = await prisma.inventoryLocation.upsert({
    where: {orgId_name: {orgId, name: normalizedName}},
    create: {orgId, name: normalizedName, type},
    update: {type},
  });
  return toRecord(row);
}
