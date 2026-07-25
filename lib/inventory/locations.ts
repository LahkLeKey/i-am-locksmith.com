import type {InventoryCatalogRow} from './read-model';

export type LocationType = 'garage'|'van'|'shop';

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  garage: 'Garage',
  van: 'Van Stock',
  shop: 'Shop / Counter',
};

const VAN_PATTERN = /van|truck|mobile/i;
const SHOP_PATTERN = /shop|counter|store|front/i;

export function categorizeLocation(location: string): LocationType {
  if (VAN_PATTERN.test(location)) return 'van';
  if (SHOP_PATTERN.test(location)) return 'shop';
  return 'garage';
}

export function formatLocationLabel(location: string): string {
  return location.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export type LocationSummary = {
  total: number; garage: number; van: number; shop: number; locations: string[];
};

export function buildLocationSummary(rows: InventoryCatalogRow[]):
    LocationSummary {
  const locationSet = new Set<string>();
  let garage = 0;
  let van = 0;
  let shop = 0;

  for (const row of rows) {
    locationSet.add(row.location);
    const type = categorizeLocation(row.location);
    if (type === 'garage')
      garage++;
    else if (type === 'van')
      van++;
    else
      shop++;
  }

  return {
    total: rows.length,
    garage,
    van,
    shop,
    locations: Array.from(locationSet),
  };
}
