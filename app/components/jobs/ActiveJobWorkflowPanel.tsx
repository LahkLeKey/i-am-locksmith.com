"use client";

import { useState } from 'react';
import { type JobQueueItem, type JobQueueStatus } from '@/lib/dashboard/types';
import type { TechnicianOption, InventoryPart } from '@/lib/domains/shared/types';
import { JobService } from '@/lib/domains/jobs';

interface ActiveJobWorkflowPanelProps {
    job: JobQueueItem | null;
    inventoryParts: InventoryPart[];
    technicians: TechnicianOption[];
    onJobUpdate: (job: JobQueueItem) => void;
}

/**
 * ActiveJobWorkflowPanel displays the active job and handles workflow operations.
 * Includes: viewing job details, updating status, managing time clock, and closeout.
 */
export function ActiveJobWorkflowPanel({
    job,
    inventoryParts,
    technicians,
    onJobUpdate,
}: ActiveJobWorkflowPanelProps) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!job) {
        return (
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 text-center">
                <p className="text-sm text-[#64748b]">Select a job to view details and manage workflow</p>
            </div>
        );
    }

    const handleStatusChange = async (newStatus: JobQueueStatus): Promise<void> => {
        setIsPending(true);
        setError(null);

        try {
            // Validate status transition using JobService
            const canTransition = JobService.canTransitionToStatus(job.status, newStatus);

            if (!canTransition) {
                setError(`Cannot transition from ${job.status} to ${newStatus}`);
                return;
            }

            // TODO: Call API to update job status
            const updatedJob: JobQueueItem = {
                ...job,
                status: newStatus,
            };

            onJobUpdate(updatedJob);
        } catch (err) {
            setError(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
                <h3 className="mb-4 text-lg font-semibold text-[#0f172a]">Job Details</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-semibold text-[#475569]">Customer</label>
                        <p className="mt-1 text-sm text-[#0f172a]">{job.customerName}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569]">Site</label>
                        <p className="mt-1 text-sm text-[#0f172a]">{job.site}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569]">Status</label>
                        <p className="mt-1 text-sm text-[#0f172a]">{job.status}</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569]">Priority</label>
                        <p className="mt-1 text-sm text-[#0f172a]">{job.priority}</p>
                    </div>
                </div>

                {error && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isPending || job.status === 'in_progress'}
                        className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Start Job
                    </button>
                    <button
                        onClick={() => handleStatusChange('closed')}
                        disabled={isPending || job.status === 'closed'}
                        className="rounded bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Complete Job
                    </button>
                </div>
            </div>
        </div>
    );
}
