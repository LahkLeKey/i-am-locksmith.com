/**
 * Jobs Domain Utilities Tests
 *
 * Tests for all pure utility functions in the Jobs domain.
 */

import {describe, expect, it} from 'vitest';

import type {EditableLedgerEntry} from './types';
import {analyzeLedgerPairs, computeElapsedMinutesFromLedger, computePartEstimateFromSkus, determinePairStatus, ensureLedgerPairs, formatDateTime, sameIds, sameSkus, toLocalDateTime, toNumber, validateLedgerPairs,} from './utils';

describe('Jobs Domain Utilities', () => {
  // ========================================================================
  // Type Conversions
  // ========================================================================

  describe('toNumber', () => {
    it('converts valid string to number', () => {
      expect(toNumber('42')).toBe(42);
      expect(toNumber('3.14')).toBe(3.14);
      expect(toNumber('-10')).toBe(-10);
    });

    it('returns 0 for invalid strings', () => {
      expect(toNumber('abc')).toBe(0);
      expect(toNumber('')).toBe(0);
      expect(toNumber('NaN')).toBe(0);
    });
  });

  describe('toLocalDateTime', () => {
    it('converts ISO string to local datetime format', () => {
      const iso = '2024-01-15T14:30:00Z';
      const result = toLocalDateTime(iso);
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('returns empty string for null/invalid', () => {
      expect(toLocalDateTime(null)).toBe('');
      expect(toLocalDateTime('invalid')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO string to readable date', () => {
      const iso = '2024-01-15T14:30:00Z';
      const result = formatDateTime(iso);
      expect(result).toContain('2024');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty string for null/invalid', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  // ========================================================================
  // Quote Calculations
  // ========================================================================

  describe('computePartEstimateFromSkus', () => {
    const parts = [
      {sku: 'LOCK-001', estimatedUnitCost: 25.00},
      {sku: 'KEY-001', estimatedUnitCost: 5.00},
      {sku: 'BLANK-001', estimatedUnitCost: 2.50},
    ] as any;

    it('sums costs for matching SKUs', () => {
      const skus = ['LOCK-001', 'KEY-001'];
      expect(computePartEstimateFromSkus(skus, parts)).toBe(30.00);
    });

    it('handles missing SKUs by skipping them', () => {
      const skus = ['LOCK-001', 'NONEXISTENT'];
      expect(computePartEstimateFromSkus(skus, parts)).toBe(25.00);
    });

    it('returns 0 for empty SKU list', () => {
      expect(computePartEstimateFromSkus([], parts)).toBe(0);
    });
  });

  // ========================================================================
  // SKU Comparisons
  // ========================================================================

  describe('sameSkus', () => {
    it('returns true for identical SKU arrays', () => {
      expect(sameSkus(['A', 'B'], ['A', 'B'])).toBe(true);
    });

    it('returns true for same SKUs in different order', () => {
      expect(sameSkus(['A', 'B'], ['B', 'A'])).toBe(true);
    });

    it('returns false for different SKU arrays', () => {
      expect(sameSkus(['A', 'B'], ['A', 'C'])).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(sameSkus(['A'], ['A', 'B'])).toBe(false);
    });
  });

  describe('sameIds', () => {
    it('returns true for identical ID arrays', () => {
      expect(sameIds(['id1', 'id2'], ['id1', 'id2'])).toBe(true);
    });

    it('returns true for same IDs in different order', () => {
      expect(sameIds(['id1', 'id2'], ['id2', 'id1'])).toBe(true);
    });

    it('returns false for different ID arrays', () => {
      expect(sameIds(['id1'], ['id2'])).toBe(false);
    });
  });

  // ========================================================================
  // Ledger Pair Analysis
  // ========================================================================

  describe('ensureLedgerPairs', () => {
    it('returns ledger as-is if non-empty', () => {
      const ledger: EditableLedgerEntry[] = [{
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_in',
        timestamp: '2024-01-15T08:00:00Z',
      }];
      const result = ensureLedgerPairs(ledger);
      expect(result).toEqual(ledger);
    });

    it('returns default entry if empty', () => {
      const result = ensureLedgerPairs([]);
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('clock_in');
    });
  });

  describe('validateLedgerPairs', () => {
    it('returns valid for properly ordered entries', () => {
      const ledger: EditableLedgerEntry[] = [
        {
          id: '1',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_in',
          timestamp: '2024-01-15T08:00:00Z',
        },
        {
          id: '2',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_out',
          timestamp: '2024-01-15T17:00:00Z',
        },
      ];
      const result = validateLedgerPairs(ledger);
      expect(result.isValid).toBe(true);
    });

    it('returns errors for unmatched clock_out', () => {
      const ledger: EditableLedgerEntry[] = [
        {
          id: '1',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_out',
          timestamp: '2024-01-15T17:00:00Z',
        },
      ];
      const result = validateLedgerPairs(ledger);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('determinePairStatus', () => {
    const ledger: EditableLedgerEntry[] = [
      {
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_in',
        timestamp: '2024-01-15T08:00:00Z',
      },
      {
        id: '2',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_out',
        timestamp: '2024-01-15T17:00:00Z',
      },
    ];

    it('identifies paired clock_in/out', () => {
      const status = determinePairStatus(ledger[0], ledger);
      expect(status).toBe('paired');
    });

    it('identifies unmatched clock_out', () => {
      const singleClockOut: EditableLedgerEntry = {
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_out',
        timestamp: '2024-01-15T17:00:00Z',
      };
      const status = determinePairStatus(singleClockOut, [singleClockOut]);
      expect(status).toBe('unmatched_clock_out');
    });
  });

  describe('analyzeLedgerPairs', () => {
    it('analyzes mixed ledger entries', () => {
      const ledger: EditableLedgerEntry[] = [
        {
          id: '1',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_in',
          timestamp: '2024-01-15T08:00:00Z',
        },
        {
          id: '2',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_out',
          timestamp: '2024-01-15T17:00:00Z',
        },
        {
          id: '3',
          jobId: 'j1',
          technicianId: 't1',
          type: 'clock_in',
          timestamp: '2024-01-15T17:30:00Z',
        },
      ];
      const result = analyzeLedgerPairs(ledger);
      expect(result.entries.length).toBe(3);
      expect(result.pairedCount).toBe(2);
      expect(result.openCount).toBe(1);
    });
  });

  describe('computeElapsedMinutesFromLedger', () => {
    it('computes elapsed minutes between clock_in and clock_out', () => {
      const clockIn: EditableLedgerEntry = {
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_in',
        timestamp: '2024-01-15T08:00:00Z',
      };
      const clockOut: EditableLedgerEntry = {
        id: '2',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_out',
        timestamp: '2024-01-15T09:00:00Z',
      };
      expect(computeElapsedMinutesFromLedger(clockIn, clockOut)).toBe(60);
    });

    it('returns 0 if clock_in or clock_out is missing', () => {
      const clockIn: EditableLedgerEntry = {
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_in',
        timestamp: '2024-01-15T08:00:00Z',
      };
      expect(computeElapsedMinutesFromLedger(null, clockIn)).toBe(0);
      expect(computeElapsedMinutesFromLedger(clockIn, null)).toBe(0);
    });

    it('returns 0 if clock_out before clock_in', () => {
      const clockIn: EditableLedgerEntry = {
        id: '1',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_in',
        timestamp: '2024-01-15T09:00:00Z',
      };
      const clockOut: EditableLedgerEntry = {
        id: '2',
        jobId: 'j1',
        technicianId: 't1',
        type: 'clock_out',
        timestamp: '2024-01-15T08:00:00Z',
      };
      expect(computeElapsedMinutesFromLedger(clockIn, clockOut)).toBe(0);
    });
  });
});
