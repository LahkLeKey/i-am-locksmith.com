"use client";

import { useState } from 'react';
import type { JobQueueItem } from '@/lib/dashboard/types';
import type { TechnicianOption, InventoryPart } from '@/lib/domains/shared/types';
import { AddJobWizardContainer } from './AddJobWizardContainer';
import { ActiveJobWorkflowPanel } from './ActiveJobWorkflowPanel';
import { JobListSection } from './JobListSection';

interface JobsOperationsPanelProps {
    initialJobs: JobQueueItem[];
    inventoryParts: InventoryPart[];
    technicians: TechnicianOption[];
}

/**
 * JobsOperationsPanel is the main orchestrator for job management.
 * It combines AddJobWizard, ActiveJobWorkflow, and JobList components.
 * Serves as the command center for pending work (per AGENTS.md).
 */
export function JobsOperationsPanel({
    initialJobs,
    inventoryParts,
    technicians,
}: JobsOperationsPanelProps) {
    const [jobs, setJobs] = useState<JobQueueItem[]>(initialJobs);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);

    const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

    const handleJobCreated = (newJob: JobQueueItem): void => {
        setJobs((current) => [...current, newJob]);
    };

    const handleJobUpdate = (updatedJob: JobQueueItem): void => {
        setJobs((current) => current.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
    };

    const handleJobDelete = (jobId: string): void => {
        setJobs((current) => current.filter((j) => j.id !== jobId));
        if (selectedJobId === jobId) {
            setSelectedJobId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Add Job button */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#0f172a]">Jobs Operations</h2>
                <button
                    onClick={() => setIsAddWizardOpen(true)}
                    className="rounded bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5e58]"
                >
                    + Add Job
                </button>
            </div>

            {/* Main layout: Jobs list on left, Active job details on right */}
            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
                {/* Jobs List */}
                <JobListSection
                    jobs={jobs}
                    selectedJobId={selectedJobId}
                    onSelectJob={setSelectedJobId}
                    onDeleteJob={handleJobDelete}
                />

                {/* Active Job Workflow Panel */}
                <ActiveJobWorkflowPanel
                    job={selectedJob}
                    inventoryParts={inventoryParts}
                    technicians={technicians}
                    onJobUpdate={handleJobUpdate}
                />
            </div>

            {/* Add Job Wizard Modal */}
            <AddJobWizardContainer
                isOpen={isAddWizardOpen}
                onClose={() => setIsAddWizardOpen(false)}
                onJobCreated={handleJobCreated}
                inventoryParts={inventoryParts}
                technicians={technicians}
                existingJobs={jobs}
            />
        </div>
    );
}
