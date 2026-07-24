/**
 * Jobs Domain Service
 * 
 * High-level business logic and orchestration for job operations.
 * This is the bridge between the UI components and the data layer.
 * 
 * Services should be:
 * - Pure functions or classes with minimal side effects
 * - Focused on business rules, not UI concerns
 * - Easily testable and mockable
 * - Reusable across multiple components
 */

import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';
import type { InventoryPart } from '@/lib/domains/shared/types';
import type { JobDraft, JobQuote, JobsMutationOptions } from './types';
import { computePartEstimateFromSkus } from './utils';

/**
 * JobService handles all job-related business operations
 */
export class JobService {
    /**
     * Create a new job draft with default values
     */
    static createJobDraft(overrides?: Partial<JobDraft>): JobDraft {
        return {
            customerName: '',
            site: '',
            priority: 'normal',
            status: 'queued',
            scheduledFor: '',
            etaMinutes: '',
            followUpNote: '',
            requiredSkus: [],
            assignedTechnicianId: '',
            estimatedMinutes: '',
            quotePartEstimate: '',
            quoteNotes: '',
            ...overrides,
        };
    }

    /**
     * Check if a job draft is dirty (has changes from base)
     */
    static isDraftDirty(current: JobDraft, base?: JobDraft): boolean {
        const baseToCompare = base || this.createJobDraft();
        return JSON.stringify(current) !== JSON.stringify(baseToCompare);
    }

    /**
     * Validate job draft before submission
     * Returns array of validation errors (empty = valid)
     */
    static validateJobDraft(draft: JobDraft): string[] {
        const errors: string[] = [];

        if (!draft.customerName?.trim()) errors.push('Customer name is required');
        if (!draft.site?.trim()) errors.push('Site/Location is required');
        if (!draft.scheduledFor?.trim()) errors.push('Scheduled date is required');
        if (!draft.assignedTechnicianId?.trim()) errors.push('Technician assignment is required');
        if (!draft.estimatedMinutes || Number(draft.estimatedMinutes) <= 0) {
            errors.push('Estimated minutes must be greater than 0');
        }

        return errors;
    }

    /**
     * Can a job transition to a new status?
     * Checks business rules for valid state transitions
     */
    static canTransitionToStatus(
        currentStatus: JobQueueStatus,
        nextStatus: JobQueueStatus,
    ): boolean {
        const validTransitions: Record<JobQueueStatus, JobQueueStatus[]> = {
            queued: ['scheduled', 'blocked'],
            scheduled: ['in_progress', 'blocked', 'queued'],
            in_progress: ['blocked', 'closed'],
            blocked: ['scheduled', 'in_progress'],
            closed: ['completed'],
            completed: [], // terminal state
        };

        return validTransitions[currentStatus]?.includes(nextStatus) ?? false;
    }

    /**
     * Get the next recommended status for a job in workflow
     */
    static getNextRecommendedStatus(currentStatus: JobQueueStatus): JobQueueStatus {
        const nextMap: Record<JobQueueStatus, JobQueueStatus> = {
            queued: 'scheduled',
            scheduled: 'in_progress',
            in_progress: 'closed',
            blocked: 'scheduled',
            closed: 'completed',
            completed: 'completed', // terminal
        };
        return nextMap[currentStatus];
    }
}

/**
 * QuoteService handles quote generation and calculations
 */
export class QuoteService {
    /**
     * Generate quote from job details
     */
    static generateQuote(
        jobId: string,
        requiredSkus: string[],
        parts: InventoryPart[],
        estimatedLaborMinutes: number,
        laborRatePerHour: number,
    ): JobQuote {
        const partEstimate = computePartEstimateFromSkus(requiredSkus, parts);
        const laborEstimate = (estimatedLaborMinutes / 60) * laborRatePerHour;

        return {
            jobId,
            partEstimate,
            laborEstimate,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Calculate total quote amount
     */
    static calculateTotalQuote(quote: JobQuote): number {
        return quote.partEstimate + quote.laborEstimate;
    }

    /**
     * Apply markup percentage to quote
     */
    static applyMarkup(quote: JobQuote, markupPercent: number): JobQuote {
        const multiplier = 1 + markupPercent / 100;
        return {
            ...quote,
            partEstimate: quote.partEstimate * multiplier,
            laborEstimate: quote.laborEstimate * multiplier,
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Apply flat discount to quote
     */
    static applyDiscount(quote: JobQuote, discountAmount: number): JobQuote {
        return {
            ...quote,
            partEstimate: Math.max(0, quote.partEstimate - discountAmount),
            updatedAt: new Date().toISOString(),
        };
    }
}

/**
 * JobWorkflowService manages job state transitions and workflow logic
 */
export class JobWorkflowService {
    /**
     * Can a job be quoted?
     * Requires: customer name, site, parts selected
     */
    static canBeQuoted(draft: JobDraft): boolean {
        return !!(
            draft.customerName?.trim() &&
            draft.site?.trim() &&
            draft.requiredSkus?.length > 0
        );
    }

    /**
     * Can a job be scheduled?
     * Requires: quote complete, scheduled date, technician
     */
    static canBeScheduled(draft: JobDraft): boolean {
        return !!(
            draft.quotePartEstimate &&
            Number(draft.quotePartEstimate) > 0 &&
            draft.scheduledFor &&
            draft.assignedTechnicianId
        );
    }

    /**
     * Can a job start (clock in)?
     * Requires: scheduled, technician assigned
     */
    static canStartJob(job: JobQueueItem): boolean {
        return job.status === 'scheduled' && !!job.assignedTechnician;
    }

    /**
     * Can a job be closed?
     * Requires: actual costs filled in
     */
    static canCloseJob(job: JobQueueItem): boolean {
        return job.status === 'in_progress';
    }

    /**
     * Get validation errors for workflow step
     */
    static validateWorkflowStep(
        step: number,
        draft: JobDraft,
    ): string[] {
        const errors: string[] = [];

        switch (step) {
            case 1: // Customer details
                if (!draft.customerName?.trim()) errors.push('Customer name required');
                if (!draft.site?.trim()) errors.push('Site/Location required');
                break;

            case 2: // Schedule and parts
                if (!draft.scheduledFor) errors.push('Scheduled date required');
                if (!draft.priority) errors.push('Priority required');
                if (draft.requiredSkus?.length === 0) errors.push('Select at least one part');
                break;

            case 3: // Technician and estimates
                if (!draft.assignedTechnicianId) errors.push('Technician assignment required');
                if (!draft.estimatedMinutes || Number(draft.estimatedMinutes) <= 0) {
                    errors.push('Estimated minutes required');
                }
                break;

            case 4: // Review and submit
                if (!draft.quotePartEstimate || Number(draft.quotePartEstimate) <= 0) {
                    errors.push('Quote must be generated');
                }
                break;
        }

        return errors;
    }
}
