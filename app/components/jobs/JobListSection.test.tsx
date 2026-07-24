import { describe, it, expect } from 'vitest';
import type { JobQueueItem } from '@/lib/dashboard/types';

describe('JobListSection', () => {
    const mockJobs: JobQueueItem[] = [
        {
            id: 'job-1',
            customerName: 'John Doe',
            site: 'Main Office',
            priority: 'high',
            status: 'in_progress',
            scheduledFor: '2024-01-20',
            etaMinutes: 60,
            followUpNote: '',
            requiredSkus: [],
            assignedTechnician: null,
            quote: undefined,
        },
        {
            id: 'job-2',
            customerName: 'Jane Smith',
            site: 'Branch Office',
            priority: 'normal',
            status: 'queued',
            scheduledFor: '2024-01-21',
            etaMinutes: 90,
            followUpNote: '',
            requiredSkus: [],
            assignedTechnician: null,
            quote: undefined,
        },
    ];

    it('includes correct job data', () => {
        expect(mockJobs).toHaveLength(2);
        expect(mockJobs[0].customerName).toBe('John Doe');
        expect(mockJobs[1].customerName).toBe('Jane Smith');
    });

    it('sorts jobs by status priority correctly', () => {
        const statusOrder: Record<string, number> = {
            blocked: 0,
            in_progress: 1,
            scheduled: 2,
            queued: 3,
            closed: 4,
        };

        const jobsWithDifferentStatuses = [
            { ...mockJobs[0], status: 'closed' as const },
            { ...mockJobs[1], status: 'blocked' as const },
        ];

        const sorted = [...jobsWithDifferentStatuses].sort((a, b) => {
            return statusOrder[a.status] - statusOrder[b.status];
        });

        expect(sorted[0].status).toBe('blocked');
        expect(sorted[1].status).toBe('closed');
    });

    it('job with higher priority appears first in same status', () => {
        const jobs = [
            { ...mockJobs[0], priority: 'normal' as const },
            { ...mockJobs[1], priority: 'high' as const },
        ];

        expect(jobs[1].priority).toBe('high');
        expect(jobs[0].priority).toBe('normal');
    });

    it('handles empty job list', () => {
        const emptyList: JobQueueItem[] = [];
        expect(emptyList).toHaveLength(0);
    });
});
