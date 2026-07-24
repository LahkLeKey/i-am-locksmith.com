"use client";

import { useState } from 'react';
import { type JobQueueItem, type JobQueuePriority } from '@/lib/dashboard/types';
import type { JobDraft, AddJobWizardStep } from '@/lib/domains/jobs/types';
import type { TechnicianOption, InventoryPart, SelectedInventoryLookup } from '@/lib/domains/shared/types';
import { JobService, JobWorkflowService } from '@/lib/domains/jobs';
import { WizardProgressBar, WizardNavigation } from '@/app/components/shared/ui';
import { WizardStep as WizardStepComponent, type WizardStepConfig } from '@/app/components/shared/ui';

interface AddJobWizardContainerProps {
    isOpen: boolean;
    onClose: () => void;
    onJobCreated: (job: JobQueueItem) => void;
    inventoryParts: InventoryPart[];
    technicians: TechnicianOption[];
    existingJobs: JobQueueItem[];
}

const ACTIVE_WIZARD_STEPS: Array<{ step: AddJobWizardStep; label: string }> = [
    { step: 1, label: 'Customer & Site' },
    { step: 2, label: 'Parts & Schedule' },
    { step: 3, label: 'Technician & Time' },
    { step: 4, label: 'Quote & Submit' },
];

/**
 * AddJobWizardContainer handles the 4-step wizard for creating new jobs.
 * Uses JobWorkflowService for step validation.
 */
export function AddJobWizardContainer({
    isOpen,
    onClose,
    onJobCreated,
    inventoryParts,
    technicians,
    existingJobs,
}: AddJobWizardContainerProps) {
    const [step, setStep] = useState<AddJobWizardStep>(1);
    const [draft, setDraft] = useState<JobDraft>(JobService.createJobDraft());
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    if (!isOpen) {
        return null;
    }

    const canAdvance = (): boolean => {
        const errors = JobWorkflowService.validateWorkflowStep(step, draft);
        setError(errors.length > 0 ? errors[0] : null);
        return errors.length === 0;
    };

    const handleNext = (): void => {
        if (!canAdvance()) {
            return;
        }

        if (step < 4) {
            setStep((step + 1) as AddJobWizardStep);
            setError(null);
        }
    };

    const handleBack = (): void => {
        if (step > 1) {
            setStep((step - 1) as AddJobWizardStep);
            setError(null);
        }
    };

    const handleSubmit = async (): Promise<void> => {
        if (!canAdvance()) {
            return;
        }

        setIsPending(true);

        try {
            // TODO: Call API to create job with draft
            // For now, just create a mock job object
            const newJob: JobQueueItem = {
                id: `job-${Date.now()}`,
                customerName: draft.customerName,
                site: draft.site,
                priority: draft.priority,
                status: draft.status,
                scheduledFor: draft.scheduledFor || null,
                etaMinutes: Number(draft.etaMinutes) || null,
                followUpNote: draft.followUpNote,
                requiredSkus: draft.requiredSkus,
                assignedTechnician: draft.assignedTechnicianIds[0]
                    ? {
                        id: draft.assignedTechnicianIds[0],
                        fullName: technicians.find((t) => t.id === draft.assignedTechnicianIds[0])?.fullName || '',
                        laborRate: technicians.find((t) => t.id === draft.assignedTechnicianIds[0])?.hourlyRate || 0,
                    }
                    : null,
                quote: draft.quotePartEstimate
                    ? {
                        partEstimate: Number(draft.quotePartEstimate) || 0,
                        laborEstimate: Number(draft.quoteLaborEstimate) || 0,
                        estimatedMinutes: Number(draft.quoteEstimatedMinutes) || 0,
                        estimatedTotal: Number(draft.quoteEstimatedTotal) || 0,
                        notes: draft.quoteNotes,
                    }
                    : undefined,
            };

            onJobCreated(newJob);
            setDraft(JobService.createJobDraft());
            setStep(1);
            setError(null);
            onClose();
        } catch (err) {
            setError(`Failed to create job: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsPending(false);
        }
    };

    const handleClose = (): void => {
        setDraft(JobService.createJobDraft());
        setStep(1);
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
                <h2 className="mb-4 text-2xl font-bold text-[#0f172a]">Add New Job</h2>

                <WizardProgressBar
                    currentStep={step}
                    totalSteps={4}
                    completedSteps={new Set([1, 2, 3, 4].filter((s) => s < step))}
                />

                {/* Step content would be rendered here based on step */}
                <div className="my-6 min-h-[300px]">
                    <p className="text-sm text-[#475569]">Step {step} content would render here</p>
                </div>

                {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                <WizardNavigation
                    canGoBack={step > 1}
                    canAdvance={step < 4}
                    isLastStep={step === 4}
                    onBack={handleBack}
                    onAdvance={handleNext}
                    onSubmit={step === 4 ? handleSubmit : undefined}
                    isPending={isPending}
                />
            </div>
        </div>
    );
}
