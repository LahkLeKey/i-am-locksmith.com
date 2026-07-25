"use client";

import { useMemo } from 'react';
import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

interface JobListSectionProps {
    jobs: JobQueueItem[];
    selectedJobId: string | null;
    onSelectJob: (jobId: string) => void;
    onDeleteJob: (jobId: string) => void;
}

const PRIORITY_COLORS: Record<JobQueuePriority, string> = {
    low: 'bg-blue-50 border-blue-200',
    normal: 'bg-gray-50 border-gray-200',
    high: 'bg-yellow-50 border-yellow-200',
    urgent: 'bg-red-50 border-red-200',
};

const PRIORITY_TEXT_COLORS: Record<JobQueuePriority, string> = {
    low: 'text-blue-700',
    normal: 'text-gray-700',
    high: 'text-yellow-700',
    urgent: 'text-red-700',
};

const STATUS_LABELS: Record<JobQueueStatus, string> = {
    queued: '📋 Queued',
    scheduled: '📅 Scheduled',
    in_progress: '🔧 In Progress',
    blocked: '⛔ Blocked',
    ready_for_payment: 'Ready for Payment',
    closed: '✅ Closed',
    completed: '🎉 Completed',
};

/**
 * JobListSection displays a list of jobs with filtering and selection.
 */
export function JobListSection({
    jobs,
    selectedJobId,
    onSelectJob,
    onDeleteJob,
}: JobListSectionProps) {
    const sortedJobs = useMemo(
        () =>
            [...jobs].sort((a, b) => {
                // Sort by status priority, then by scheduled date
                const statusOrder: Record<JobQueueStatus, number> = {
                    blocked: 0,
                    in_progress: 1,
                    scheduled: 2,
                    queued: 3,
                    ready_for_payment: 4,
                    closed: 5,
                    completed: 6,
                };

                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;

                const aDate = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
                const bDate = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
                return aDate - bDate;
            }),
        [jobs]
    );

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0f172a]">Jobs Queue ({jobs.length})</h3>

            {jobs.length === 0 ? (
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 text-center">
                    <p className="text-sm text-[#64748b]">No jobs yet. Create one to get started.</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-125 overflow-y-auto">
                    {sortedJobs.map((job) => (
                        <div
                            key={job.id}
                            onClick={() => onSelectJob(job.id)}
                            className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${selectedJobId === job.id
                                ? 'border-[#0f766e] bg-[#ecfeff]'
                                : `border-[#e2e8f0] ${PRIORITY_COLORS[job.priority]}`
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#334155]">{job.customerName}</span>
                                        <span
                                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${PRIORITY_TEXT_COLORS[job.priority]}`}
                                        >
                                            {job.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-[#64748b]">{job.site}</p>
                                    <p className="mt-1 text-[10px] text-[#94a3b8]">
                                        {STATUS_LABELS[job.status]}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteJob(job.id);
                                    }}
                                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
