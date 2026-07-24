/**
 * Jobs Domain Service Tests
 */

import { describe, it, expect } from 'vitest';
import { JobService, QuoteService, JobWorkflowService } from './services';
import type { JobDraft, JobQuote } from './types';

describe('Jobs Domain Services', () => {
    // ========================================================================
    // JobService
    // ========================================================================

    describe('JobService', () => {
        describe('createJobDraft', () => {
            it('creates a draft with default values', () => {
                const draft = JobService.createJobDraft();
                expect(draft.priority).toBe('normal');
                expect(draft.status).toBe('queued');
                expect(draft.requiredSkus).toEqual([]);
            });

            it('merges overrides into defaults', () => {
                const draft = JobService.createJobDraft({
                    customerName: 'John Doe',
                    priority: 'urgent',
                });
                expect(draft.customerName).toBe('John Doe');
                expect(draft.priority).toBe('urgent');
                expect(draft.status).toBe('queued');
            });
        });

        describe('isDraftDirty', () => {
            it('detects clean draft (no base) - all empty', () => {
                const draft = JobService.createJobDraft();
                // Default draft with all empty values is considered clean
                expect(JobService.isDraftDirty(draft)).toBe(false);
            });

            it('detects dirty draft (has filled values)', () => {
                const draft = JobService.createJobDraft({ customerName: 'John' });
                expect(JobService.isDraftDirty(draft)).toBe(true);
            });

            it('compares against base correctly', () => {
                const base = JobService.createJobDraft();
                const modified = { ...base, customerName: 'John' };
                expect(JobService.isDraftDirty(modified, base)).toBe(true);
            });
        });

        describe('validateJobDraft', () => {
            it('returns no errors for valid draft', () => {
                const draft: JobDraft = {
                    customerName: 'John Doe',
                    site: 'Main Office',
                    priority: 'normal',
                    status: 'queued',
                    scheduledFor: '2024-01-20',
                    etaMinutes: '120',
                    followUpNote: '',
                    requiredSkus: ['SKU-001'],
                    assignedTechnicianId: 'tech-001',
                    estimatedMinutes: '90',
                    quotePartEstimate: '100',
                    quoteNotes: '',
                };
                const errors = JobService.validateJobDraft(draft);
                expect(errors).toHaveLength(0);
            });

            it('detects missing required fields', () => {
                const draft = JobService.createJobDraft();
                const errors = JobService.validateJobDraft(draft);
                expect(errors.length).toBeGreaterThan(0);
                expect(errors.some((e) => e.includes('Customer name'))).toBe(true);
            });
        });

        describe('canTransitionToStatus', () => {
            it('allows valid transitions', () => {
                expect(JobService.canTransitionToStatus('queued', 'scheduled')).toBe(true);
                expect(JobService.canTransitionToStatus('scheduled', 'in_progress')).toBe(true);
                expect(JobService.canTransitionToStatus('in_progress', 'closed')).toBe(true);
            });

            it('prevents invalid transitions', () => {
                expect(JobService.canTransitionToStatus('closed', 'queued')).toBe(false);
                expect(JobService.canTransitionToStatus('queued', 'closed')).toBe(false);
            });
        });

        describe('getNextRecommendedStatus', () => {
            it('returns correct next status for each status', () => {
                expect(JobService.getNextRecommendedStatus('queued')).toBe('scheduled');
                expect(JobService.getNextRecommendedStatus('scheduled')).toBe('in_progress');
                expect(JobService.getNextRecommendedStatus('in_progress')).toBe('closed');
                expect(JobService.getNextRecommendedStatus('closed')).toBe('completed');
                expect(JobService.getNextRecommendedStatus('completed')).toBe('completed');
            });
        });
    });

    // ========================================================================
    // QuoteService
    // ========================================================================

    describe('QuoteService', () => {
        const parts = [
            { sku: 'LOCK-001', estimatedUnitCost: 50.00 } as any,
            { sku: 'KEY-001', estimatedUnitCost: 10.00 } as any,
        ];

        describe('generateQuote', () => {
            it('generates quote with parts and labor', () => {
                const quote = QuoteService.generateQuote(
                    'job-001',
                    ['LOCK-001', 'KEY-001'],
                    parts,
                    120, // 120 minutes = 2 hours
                    50, // $50/hour
                );

                expect(quote.jobId).toBe('job-001');
                expect(quote.partEstimate).toBe(60.00); // 50 + 10
                expect(quote.laborEstimate).toBe(100.00); // 2 * 50
            });
        });

        describe('calculateTotalQuote', () => {
            it('sums parts and labor', () => {
                const quote: JobQuote = {
                    jobId: 'job-001',
                    partEstimate: 60.00,
                    laborEstimate: 100.00,
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                expect(QuoteService.calculateTotalQuote(quote)).toBe(160.00);
            });
        });

        describe('applyMarkup', () => {
            it('applies markup percentage', () => {
                const quote: JobQuote = {
                    jobId: 'job-001',
                    partEstimate: 100.00,
                    laborEstimate: 100.00,
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const marked = QuoteService.applyMarkup(quote, 10); // 10% markup
                expect(marked.partEstimate).toBeCloseTo(110.00, 2);
                expect(marked.laborEstimate).toBeCloseTo(110.00, 2);
            });
        });

        describe('applyDiscount', () => {
            it('applies flat discount', () => {
                const quote: JobQuote = {
                    jobId: 'job-001',
                    partEstimate: 100.00,
                    laborEstimate: 100.00,
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const discounted = QuoteService.applyDiscount(quote, 25);
                expect(discounted.partEstimate).toBe(75.00);
            });

            it('prevents negative part estimate', () => {
                const quote: JobQuote = {
                    jobId: 'job-001',
                    partEstimate: 10.00,
                    laborEstimate: 100.00,
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const discounted = QuoteService.applyDiscount(quote, 50);
                expect(discounted.partEstimate).toBeGreaterThanOrEqual(0);
            });
        });
    });

    // ========================================================================
    // JobWorkflowService
    // ========================================================================

    describe('JobWorkflowService', () => {
        describe('canBeQuoted', () => {
            it('returns true when requirements met', () => {
                const draft: JobDraft = {
                    customerName: 'John',
                    site: 'Main',
                    requiredSkus: ['SKU-001'],
                    priority: 'normal',
                    status: 'queued',
                    scheduledFor: '',
                    etaMinutes: '',
                    followUpNote: '',
                    assignedTechnicianId: '',
                    estimatedMinutes: '',
                    quotePartEstimate: '',
                    quoteNotes: '',
                };
                expect(JobWorkflowService.canBeQuoted(draft)).toBe(true);
            });

            it('returns false when missing parts', () => {
                const draft = JobService.createJobDraft({
                    customerName: 'John',
                    site: 'Main',
                });
                expect(JobWorkflowService.canBeQuoted(draft)).toBe(false);
            });
        });

        describe('canBeScheduled', () => {
            it('returns true when fully qualified', () => {
                const draft: JobDraft = {
                    customerName: 'John',
                    site: 'Main',
                    requiredSkus: ['SKU-001'],
                    quotePartEstimate: '100',
                    scheduledFor: '2024-01-20',
                    assignedTechnicianId: 'tech-001',
                    priority: 'normal',
                    status: 'queued',
                    etaMinutes: '',
                    followUpNote: '',
                    estimatedMinutes: '',
                    quoteNotes: '',
                };
                expect(JobWorkflowService.canBeScheduled(draft)).toBe(true);
            });
        });

        describe('validateWorkflowStep', () => {
            it('validates step 1 requirements', () => {
                const draft = JobService.createJobDraft();
                const errors = JobWorkflowService.validateWorkflowStep(1, draft);
                expect(errors.length).toBeGreaterThan(0);
                expect(errors.some((e) => e.includes('Customer'))).toBe(true);
            });

            it('validates step 2 requirements', () => {
                const draft = JobService.createJobDraft();
                const errors = JobWorkflowService.validateWorkflowStep(2, draft);
                expect(errors.some((e) => e.includes('Scheduled'))).toBe(true);
                expect(errors.some((e) => e.includes('part'))).toBe(true);
            });
        });
    });
});
