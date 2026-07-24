/**
 * Jobs Domain Index
 * 
 * Public API for the Jobs domain.
 * Exports types, services, and utilities.
 */

// Types
export type {
    AddJobWizardStep,
    ActiveJobWizardStep,
    JobDraft,
    JobQuote,
    TimeClockEntry,
    EditableLedgerEntry,
    TimeClockTableActionMode,
    TimeClockTableActionDraft,
    LedgerPairValidation,
    LedgerPairStatus,
    LedgerAnnotatedEntry,
    LedgerPairAnalysis,
    LedgerPairRowStatus,
    LedgerPairRow,
    CloseoutDraft,
    JobCloseout,
    JobsMutationOptions,
} from './types';

// Services
export { JobService, QuoteService, JobWorkflowService } from './services';

// Utilities
export {
    toNumber,
    toLocalDateTime,
    formatDateTime,
    computePartEstimateFromSkus,
    quoteAsStrings,
    sameSkus,
    sameIds,
    buildAutoCloseoutDraft,
    closeoutAsDraft,
    upsertJob,
    ensureLedgerPairs,
    validateLedgerPairs,
    determinePairStatus,
    analyzeLedgerPairs,
    computeElapsedMinutesFromLedger,
} from './utils';
