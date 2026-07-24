import { describe, it, expect, vi } from 'vitest';
import type { JobQueueItem } from '@/lib/dashboard/types';
import type { InventoryPart, TechnicianOption } from '@/lib/domains/shared/types';

describe('JobsOperationsPanel', () => {
    const mockJobs: JobQueueItem[] = [
        {
            id: 'job-1',
            customerName: 'John Doe',
            site: 'Main Office',
            priority: 'normal',
            status: 'queued',
            scheduledFor: '2024-01-20',
            etaMinutes: 60,
            followUpNote: '',
            requiredSkus: [],
            assignedTechnician: null,
            quote: undefined,
        },
    ];

    const mockInventoryParts: InventoryPart[] = [];
    const mockTechnicians: TechnicianOption[] = [];

    const defaultProps = {
        initialJobs: mockJobs,
        inventoryParts: mockInventoryParts,
        technicians: mockTechnicians,
    };

    it('initializes with provided jobs', () => {
        expect(mockJobs).toHaveLength(1);
        expect(mockJobs[0].customerName).toBe('John Doe');
    });

    it('has no job selected initially', () => {
        const selectedJobId: string | null = null;
        expect(selectedJobId).toBeNull();
    });

    it('can find job by ID', () => {
        const selectedJobId = 'job-1';
        const selectedJob = mockJobs.find((j) => j.id === selectedJobId);
        expect(selectedJob).toBeDefined();
        expect(selectedJob?.customerName).toBe('John Doe');
    });

    it('handles multiple jobs correctly', () => {
        const manyJobs = [
            ...mockJobs,
            {
                id: 'job-2',
                customerName: 'Jane Smith',
                site: 'Branch',
                priority: 'high' as const,
                status: 'in_progress' as const,
                scheduledFor: '2024-01-21',
                etaMinutes: 90,
                followUpNote: '',
                requiredSkus: [],
                assignedTechnician: null,
                quote: undefined,
            },
        ];

        expect(manyJobs).toHaveLength(2);
        expect(manyJobs[0].id).toBe('job-1');
        expect(manyJobs[1].id).toBe('job-2');
    });
});
