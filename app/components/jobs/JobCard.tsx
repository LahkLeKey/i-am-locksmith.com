"use client";

import type { JobQueueItem } from '@/lib/dashboard/types';

interface JobCardProps {
    job: JobQueueItem;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

/**
 * JobCard displays a single job in a card format.
 */
export function JobCard({ job, isSelected, onSelect, onDelete }: JobCardProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${isSelected ? 'border-[#0f766e] bg-[#ecfeff]' : 'border-[#e2e8f0] bg-white hover:border-[#0f766e]'
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="font-semibold text-[#0f172a]">{job.customerName}</h4>
                    <p className="mt-1 text-sm text-[#64748b]">{job.site}</p>
                    <div className="mt-2 flex gap-2">
                        <span className="inline-block rounded bg-[#ecfeff] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                            {job.status}
                        </span>
                        <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-[#334155]">
                            {job.priority}
                        </span>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="text-red-600 hover:text-red-800"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
