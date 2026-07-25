import {describe, expect, it} from 'vitest';

import {buildLocationSummary, categorizeLocation, formatLocationLabel} from './locations';
import type {InventoryCatalogRow} from './read-model';

describe('categorizeLocation', () => {
  it('classifies van and mobile locations as van stock', () => {
    expect(categorizeLocation('mobile_van_1')).toBe('van');
    expect(categorizeLocation('mobile_van_2')).toBe('van');
    expect(categorizeLocation('Van 3')).toBe('van');
    expect(categorizeLocation('truck_1')).toBe('van');
  });

  it('classifies shop and counter locations as shop stock', () => {
    expect(categorizeLocation('shop')).toBe('shop');
    expect(categorizeLocation('counter')).toBe('shop');
    expect(categorizeLocation('Shop Front')).toBe('shop');
    expect(categorizeLocation('store')).toBe('shop');
  });

  it('defaults to garage for warehouse, storage, and unknown locations', () => {
    expect(categorizeLocation('warehouse')).toBe('garage');
    expect(categorizeLocation('Warehouse A')).toBe('garage');
    expect(categorizeLocation('garage')).toBe('garage');
    expect(categorizeLocation('Garage B')).toBe('garage');
    expect(categorizeLocation('storage')).toBe('garage');
    expect(categorizeLocation('unknown-location')).toBe('garage');
  });
});

describe('formatLocationLabel', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatLocationLabel('mobile_van_1')).toBe('Mobile Van 1');
    expect(formatLocationLabel('mobile_van_2')).toBe('Mobile Van 2');
  });

  it('preserves existing Title Case', () => {
    expect(formatLocationLabel('Warehouse A')).toBe('Warehouse A');
    expect(formatLocationLabel('Van 3')).toBe('Van 3');
  });

  it('handles simple lowercase', () => {
    expect(formatLocationLabel('shop')).toBe('Shop');
    expect(formatLocationLabel('warehouse')).toBe('Warehouse');
  });
});

describe('buildLocationSummary', () => {
  const makeRow = (location: string): InventoryCatalogRow => ({
    id: location,
    sku: `SKU-${location}`,
    itemName: location,
    serviceLines: [],
    estimatedUnitCost: 0,
    location,
    createdAt: new Date().toISOString(),
    onHand: 5,
    reserved: 0,
    available: 5,
    reorderPoint: 2,
    suggestedOrderQty: 10,
    supplier: 'Test',
    severity: 'low',
    compatibilityNote: '',
  });

  it('groups catalog rows by location type', () => {
    const rows = [
      makeRow('warehouse'),
      makeRow('mobile_van_1'),
      makeRow('mobile_van_1'),
      makeRow('shop'),
    ];

    const summary = buildLocationSummary(rows);
    expect(summary.garage).toBe(1);
    expect(summary.van).toBe(2);
    expect(summary.shop).toBe(1);
    expect(summary.total).toBe(4);
    expect(summary.locations).toEqual(['warehouse', 'mobile_van_1', 'shop']);
  });

  it('returns zeros for empty catalog', () => {
    const summary = buildLocationSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.garage).toBe(0);
    expect(summary.van).toBe(0);
    expect(summary.shop).toBe(0);
    expect(summary.locations).toEqual([]);
  });
});
