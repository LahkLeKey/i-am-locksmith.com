/**
 * Jobs Domain Utilities
 *
 * Pure functions for Jobs domain operations:
 * - Quote calculations
 * - Time clock computations
 * - Job state transitions
 * - Ledger pair analysis
 *
 * These are all pure functions with no side effects.
 */

import type {JobQueueItem} from '@/lib/dashboard/types';
import type {InventoryPart} from '@/lib/domains/shared/types';

import type {EditableLedgerEntry, JobDraft, LedgerAnnotatedEntry, LedgerPairAnalysis, LedgerPairStatus, LedgerPairValidation,} from './types';

// ============================================================================
// Type Conversions
// ============================================================================

/**
 * Convert string to number, defaulting to 0 if invalid
 */
export function toNumber(value: string): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert ISO string to local date-time string
 */
export function toLocalDateTime(value: string|null): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format ISO string to readable date-time format
 */
export function formatDateTime(value: string|null): string {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  } catch {
    return '';
  }
}

// ============================================================================
// Quote Calculations
// ============================================================================

/**
 * Calculate quote estimate from selected part SKUs
 */
export function computePartEstimateFromSkus(
    requiredSkus: string[], parts: InventoryPart[]): number {
  return requiredSkus.reduce((total, sku) => {
    const part = parts.find((p) => p.sku === sku);
    return total + (part?.estimatedUnitCost ?? 0);
  }, 0);
}

/**
 * Convert job's quote fields to string format
 */
export function quoteAsStrings(job: JobQueueItem):
    {estimatedPartsCost: string; estimatedLaborCost: string;} {
  return {
    estimatedPartsCost: job.quote?.partEstimate?.toString() ?? '0',
    estimatedLaborCost: job.quote?.laborEstimate?.toString() ?? '0',
  };
}

// ============================================================================
// Inventory SKU Comparisons
// ============================================================================

/**
 * Check if two SKU arrays are equal (same contents, any order)
 */
export function sameSkus(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((sku) => leftSet.has(sku));
}

/**
 * Check if two ID arrays are equal (same contents, any order)
 */
export function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((id) => leftSet.has(id));
}

// ============================================================================
// Job State Transitions
// ============================================================================

/**
 * Build auto-populated closeout draft from completed job
 */
export function buildAutoCloseoutDraft(job: JobQueueItem): {
  jobId: string; closureStatus: string; actualPartsCost: string;
  actualLaborCost: string;
  closureNotes: string;
} {
  return {
    jobId: job.id ?? '',
    closureStatus: 'completed',
    actualPartsCost: job.quote?.partEstimate?.toString() ?? '0',
    actualLaborCost: job.quote?.laborEstimate?.toString() ?? '0',
    closureNotes: '',
  };
}

/**
 * Build closeout draft from existing completed job
 */
export function closeoutAsDraft(job: JobQueueItem) {
  return buildAutoCloseoutDraft(job);
}

/**
 * Merge a job into job queue (update if exists, add if new)
 */
export function upsertJob(
    current: JobQueueItem[], nextJob: JobQueueItem): JobQueueItem[] {
  const index = current.findIndex((j) => j.id === nextJob.id);
  if (index !== -1) {
    const updated = [...current];
    updated[index] = nextJob;
    return updated;
  }
  return [...current, nextJob];
}

// ============================================================================
// Time Clock & Ledger Pair Analysis
// ============================================================================

/**
 * Ensure ledger has at least one entry
 */
export function ensureLedgerPairs(ledger: EditableLedgerEntry[]):
    EditableLedgerEntry[] {
  if (ledger.length === 0) {
    return [{
      id: 'temp-0',
      jobId: '',
      technicianId: '',
      type: 'clock_in',
      timestamp: '',
    }];
  }
  return ledger;
}

/**
 * Validate time clock pairs (clock in must come before clock out)
 */
export function validateLedgerPairs(ledger: EditableLedgerEntry[]):
    LedgerPairValidation {
  const errors: string[] = [];

  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];

    // Check required fields
    if (!entry.timestamp) {
      errors.push(`Entry ${i + 1}: timestamp is required`);
    }

    // Check for unmatched clock out
    if (entry.type === 'clock_out') {
      const hasPrecedingClockIn =
          ledger.slice(0, i).some((e) => e.type === 'clock_in' && !e.editNote);
      if (!hasPrecedingClockIn) {
        errors.push(`Entry ${i + 1}: clock_out without preceding clock_in`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Determine the pair status of a time entry
 */
export function determinePairStatus(
    entry: EditableLedgerEntry,
    ledger: EditableLedgerEntry[]): LedgerPairStatus {
  const entryIndex = ledger.indexOf(entry);

  if (entry.type === 'clock_in') {
    // Look for following clock out
    const followingClockOut =
        ledger.slice(entryIndex + 1).find((e) => e.type === 'clock_out');
    return followingClockOut ? 'paired' : 'open_clock_in';
  }

  if (entry.type === 'clock_out') {
    // Look for preceding clock in
    const precedingClockIn = ledger.slice(0, entryIndex)
                                 .reverse()
                                 .find((e) => e.type === 'clock_in');
    return precedingClockIn ? 'paired' : 'unmatched_clock_out';
  }

  return 'paired';
}

/**
 * Analyze ledger pairs to determine pairing status
 */
export function analyzeLedgerPairs(ledger: EditableLedgerEntry[]):
    LedgerPairAnalysis {
  const entries: LedgerAnnotatedEntry[] =
      ledger.map((entry) => ({
                   ...entry,
                   pairStatus: determinePairStatus(entry, ledger),
                 }));

  const pairedCount = entries.filter((e) => e.pairStatus === 'paired').length;
  const openCount =
      entries.filter((e) => e.pairStatus === 'open_clock_in').length;
  const unmatchedCount =
      entries.filter((e) => e.pairStatus === 'unmatched_clock_out').length;

  return {
    entries,
    pairedCount,
    openCount,
    unmatchedCount,
  };
}

/**
 * Compute elapsed minutes from clock in/out pair
 */
export function computeElapsedMinutesFromLedger(
    clockIn: EditableLedgerEntry|null,
    clockOut: EditableLedgerEntry|null,
    ): number {
  if (!clockIn || !clockOut || !clockIn.timestamp || !clockOut.timestamp) {
    return 0;
  }

  try {
    const inTime = new Date(clockIn.timestamp).getTime();
    const outTime = new Date(clockOut.timestamp).getTime();
    return Math.max(0, Math.floor((outTime - inTime) / (1000 * 60)));
  } catch {
    return 0;
  }
}
