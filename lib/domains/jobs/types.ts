/**
 * Jobs Domain Types
 * 
 * The Jobs domain encompasses the complete job lifecycle:
 * - Job creation and queuing
 * - Quote generation and updates
 * - Technician assignment and scheduling
 * - Active job workflow (time tracking, inventory allocation)
 * - Job closeout and completion
 * 
 * Key Invariants:
 * - A job can only transition through valid state sequences
 * - Quotes must be generated before job can be scheduled
 * - Inventory must be allocated before technician can clock in
 * - All changes must be attributed to a user
 */

import type { SelectedInventoryLookup, TechnicianOption } from '@/lib/domains/shared/types';
import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

// ============================================================================
// Job Workflow State
// ============================================================================

/**
 * Wizard step for adding a new job (1-4)
 */
export type AddJobWizardStep = 1 | 2 | 3 | 4;

/**
 * Wizard step for managing an active job (1-4)
 */
export type ActiveJobWizardStep = 1 | 2 | 3 | 4;

/**
 * Job draft represents the form state while creating or editing a job
 * before it's persisted to the database.
 */
export type JobDraft = {
    customerName: string;
    site: string;
    priority: JobQueuePriority;
    status: JobQueueStatus;
    scheduledFor: string;
    etaMinutes: string;
    followUpNote: string;
    requiredSkus: string[];
    assignedTechnicianId: string;
    estimatedMinutes: string;
    quotePartEstimate: string;
    quoteNotes: string;
};

// ============================================================================
// Quote Types
// ============================================================================

/**
 * Quote represents the cost estimation for a job
 * including parts and labor estimates.
 */
export type JobQuote = {
    jobId: string;
    partEstimate: number;
    laborEstimate: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
};

// ============================================================================
// Time Clock & Ledger Types
// ============================================================================

/**
 * Time clock entry for tracking technician hours on a job
 */
export type TimeClockEntry = {
    id: string;
    jobId: string;
    technicianId: string;
    type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
    timestamp: string;
    notes?: string;
};

/**
 * Editable ledger entry represents a mutable view of a time clock entry
 */
export type EditableLedgerEntry = TimeClockEntry & {
    editNote?: string;
};

/**
 * Time clock action modes for UI interaction
 */
export type TimeClockTableActionMode = 'break' | 'notes';

/**
 * Time clock table action draft for editing
 */
export type TimeClockTableActionDraft = {
    entryId: string;
    mode: TimeClockTableActionMode;
    value: string;
};

/**
 * Validation result for a pair of clock in/out entries
 */
export type LedgerPairValidation = {
    isValid: boolean;
    errors: string[];
};

/**
 * Status of a time clock pair (matched clock in/out)
 */
export type LedgerPairStatus = 'paired' | 'open_clock_in' | 'unmatched_clock_out';

/**
 * Annotated ledger entry with additional metadata
 */
export type LedgerAnnotatedEntry = EditableLedgerEntry & {
    pairStatus: LedgerPairStatus;
};

/**
 * Ledger pair analysis for determining matching/unmatched clock entries
 */
export type LedgerPairAnalysis = {
    entries: LedgerAnnotatedEntry[];
    pairedCount: number;
    openCount: number;
    unmatchedCount: number;
};

/**
 * Row status in ledger pair table
 */
export type LedgerPairRowStatus = 'paired' | 'open' | 'unmatched_clock_out';

/**
 * Single row representation in ledger pair table
 */
export type LedgerPairRow = {
    id: string;
    clockIn: TimeClockEntry | null;
    clockOut: TimeClockEntry | null;
    status: LedgerPairRowStatus;
    elapsedMinutes: number;
};

// ============================================================================
// Job Closeout Types
// ============================================================================

/**
 * Closeout draft represents the final state of a completed job
 * including actual costs and completion status.
 */
export type CloseoutDraft = {
    jobId: string;
    closureStatus: string;
    actualPartsCost: string;
    actualLaborCost: string;
    closureNotes: string;
};

/**
 * Closeout represents a finalized job completion record
 */
export type JobCloseout = {
    jobId: string;
    closureStatus: string;
    actualPartsCost: number;
    actualLaborCost: number;
    closureNotes: string;
    completedAt: string;
};

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Options for job mutations (create, update, close)
 */
export type JobsMutationOptions = {
    shouldShowSuccess?: boolean;
    shouldRefresh?: boolean;
};
