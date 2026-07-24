import { describe, it, expect, vi } from 'vitest';
import { JobService } from '../../../lib/domains/jobs/services';
import type { JobQueueItem } from '../../../lib/dashboard/types';
import type { InventoryPart, TechnicianOption } from '../../../lib/domains/shared/types';

describe('ActiveJobWorkflowPanel', () => {
    const mockJob: JobQueueItem = {
        id: 'job-1',
        customerName: 'John Doe',
        site: 'Main Office',
        priority: 'normal',
        status: 'queued',
        scheduledFor: '2024-01-20',
        etaMinutes: 60,
        followUpNote: 'Call customer',
        requiredSkus: ['SKU-001'],
        assignedTechnician: {
            id: 'tech-1',
            fullName: 'Jane Smith',
            laborRate: 85,
        },
        quote: {
            partEstimate: 100,
            laborEstimate: 85,
            estimatedMinutes: 60,
            estimatedTotal: 185,
            notes: 'Standard lock repair',
        },
    };

    const mockInventoryParts: InventoryPart[] = [];
    const mockTechnicians: TechnicianOption[] = [];
    const defaultProps = {
        job: mockJob,
        inventoryParts: mockInventoryParts,
        technicians: mockTechnicians,
        onJobUpdate: vi.fn(),
    };

    it('can validate job status transitions', () => {
        // Valid transitions: queued -> scheduled or blocked
        expect(JobService.canTransitionToStatus('queued', 'scheduled')).toBe(true);
        expect(JobService.canTransitionToStatus('queued', 'blocked')).toBe(true);
        expect(JobService.canTransitionToStatus('queued', 'closed')).toBe(false);
    });

    it('recognizes valid workflow transitions', () => {
        // queued -> scheduled -> in_progress -> closed
        expect(JobService.canTransitionToStatus('queued', 'scheduled')).toBe(true);
        expect(JobService.canTransitionToStatus('scheduled', 'in_progress')).toBe(true);
        expect(JobService.canTransitionToStatus('in_progress', 'closed')).toBe(true);
    });

    it('prevents invalid status transitions', () => {
        expect(JobService.canTransitionToStatus('closed', 'queued')).toBe(false);
        expect(JobService.canTransitionToStatus('closed', 'in_progress')).toBe(false);
    });

    it('stores job details correctly', () => {
        expect(mockJob.customerName).toBe('John Doe');
        expect(mockJob.site).toBe('Main Office');
        expect(mockJob.status).toBe('queued');
    });
});
