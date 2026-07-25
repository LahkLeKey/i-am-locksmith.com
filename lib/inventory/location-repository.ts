import {prisma} from '@/lib/db/prisma';

import {LOCATION_TYPES, type LocationType} from './locations';

export type InventoryLocationRecord = {
  id: string; orgId: string; name: string; type: LocationType;
  address: string | null; latitude: number | null; longitude: number | null;
};

function isLocationType(value: string): value is LocationType {
  return LOCATION_TYPES.includes(value as LocationType);
}

function toRecord(row: {id: string; orgId: string; name: string; type: string; address: string | null; latitude: unknown; longitude: unknown}):
    InventoryLocationRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    type: isLocationType(row.type) ? row.type : 'garage',
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
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
  type: LocationType, geo?: {address: string; latitude: number; longitude: number}): Promise<InventoryLocationRecord> {
  const normalizedName = name.trim();
  const row = await prisma.inventoryLocation.upsert({
    where: {orgId_name: {orgId, name: normalizedName}},
    create: {orgId, name: normalizedName, type, ...geo},
    update: {type, ...geo},
  });
  return toRecord(row);
}
