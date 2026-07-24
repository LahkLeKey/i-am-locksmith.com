import React, { useState, useMemo } from 'react';
import { WizardStep as WizardStepComponent, getWizardStepStatus, validateWizardStepFields } from '@/app/components/wizard-step';
import { useWizardController, WizardProgressBar, WizardNavigation } from '@/app/components/wizard-controller';
import type { WizardStepConfig } from '@/app/components/wizard-step';

interface AddJobWizardEnhancedProps {
  onSubmit: (jobData: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

/**
 * Enhanced Add Job Wizard using the new wizard framework
 * Provides better UX with clear step progression, validation, and error handling
 */
export function AddJobWizardEnhanced({
  onSubmit,
  onCancel,
  isOpen,
}: AddJobWizardEnhancedProps) {
  const [isPending, setIsPending] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [site, setSite] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [estimatedLabor, setEstimatedLabor] = useState(0);
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);

  // Wizard controller
  const wizard = useWizardController({
    totalSteps: 4,
    onStepChange: (step) => {
      validateStep(step);
    },
  });

  // Step configurations
  const steps: Record<number, WizardStepConfig> = {
    1: {
      stepNumber: 1 as const,
      title: 'Customer Details',
      description: 'Enter customer name and service location',
      isComplete: !!customerName && !!site,
      hasError: wizard.state.stepErrors[1]?.length > 0,
      isRequired: true,
    },
    2: {
      stepNumber: 2 as const,
      title: 'Schedule + Parts',
      description: 'Choose when to visit and what parts are needed',
      isComplete: !!scheduledFor && selectedParts.length > 0,
      hasError: wizard.state.stepErrors[2]?.length > 0,
      isRequired: true,
    },
    3: {
      stepNumber: 3 as const,
      title: 'Technician + Labor',
      description: 'Assign a technician and set labor estimate',
      isComplete: !!assignedTechnician && estimatedLabor > 0,
      hasError: wizard.state.stepErrors[3]?.length > 0,
      isRequired: true,
    },
    4: {
      stepNumber: 4 as const,
      title: 'Review + Submit',
      description: 'Review all details and submit the job',
      isComplete: false,
      hasError: false,
      isRequired: true,
    },
  };

  function validateStep(step: number) {
    const errors: string[] = [];

    if (step === 1) {
      if (!customerName.trim()) errors.push('Customer name is required');
      if (!site.trim()) errors.push('Service location is required');
    } else if (step === 2) {
      if (!scheduledFor) errors.push('Schedule date/time is required');
      if (selectedParts.length === 0) errors.push('At least one part is required');
    } else if (step === 3) {
      if (!assignedTechnician) errors.push('Technician selection is required');
      if (estimatedLabor <= 0) errors.push('Labor estimate must be greater than 0');
    }

    if (errors.length > 0) {
      wizard.setErrorsForStep(step, errors);
    } else {
      wizard.clearErrorsForStep(step);
      wizard.completeStep(step);
    }
  }

  async function handleSubmit() {
    validateStep(wizard.state.currentStep);

    if (wizard.hasErrors) {
      return;
    }

    setIsPending(true);
    try {
      await onSubmit({
        customerName,
        site,
        priority,
        scheduledFor,
        notes,
        requiredSkus: selectedParts,
        assignedTechnicianId: assignedTechnician,
        estimatedLabor,
        hourlyRate,
      });

      // Reset form
      wizard.reset();
      onCancel();
    } catch (error) {
      wizard.setErrorsForStep(wizard.state.currentStep, [
        error instanceof Error ? error.message : 'Failed to create job',
      ]);
    } finally {
      setIsPending(false);
    }
  }

  if (!isOpen) return null;

  const currentStepConfig = steps[wizard.state.currentStep];
  const errors = wizard.getStepErrors(wizard.state.currentStep);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">Add Job</h2>
            <p className="text-sm text-[#64748b] mt-1">
              {currentStepConfig.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#64748b] hover:text-[#0f172a]"
            aria-label="Close wizard"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <WizardProgressBar
            currentStep={wizard.state.currentStep}
            totalSteps={4}
            completedSteps={wizard.state.completedSteps}
          />
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {Object.values(steps).map((step) => (
            <WizardStepComponent
              key={step.stepNumber}
              step={step}
              isCurrent={wizard.state.currentStep === step.stepNumber}
              onClick={() => wizard.goToStep(step.stepNumber as any)}
            />
          ))}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-semibold text-red-700 mb-2">Please fix the following errors:</p>
            <ul className="text-sm text-red-600 space-y-1">
              {errors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6 min-h-[200px]">
          {wizard.state.currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Service Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="Enter service address"
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          )}

          {wizard.state.currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Scheduled Date/Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Customer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or context..."
                  rows={3}
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Select Parts <span className="text-red-500">*</span>
                </label>
                <div className="rounded-md border border-[#d1d5db] p-3 space-y-2 max-h-[150px] overflow-auto">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedParts.includes('KEY-001')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParts([...selectedParts, 'KEY-001']);
                        } else {
                          setSelectedParts(selectedParts.filter(p => p !== 'KEY-001'));
                        }
                      }}
                    />
                    <span className="text-sm">KEY-001 - Blank Key A</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedParts.includes('KEY-002')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParts([...selectedParts, 'KEY-002']);
                        } else {
                          setSelectedParts(selectedParts.filter(p => p !== 'KEY-002'));
                        }
                      }}
                    />
                    <span className="text-sm">KEY-002 - Blank Key B</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {wizard.state.currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Assigned Technician <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                >
                  <option value="">Select a technician</option>
                  <option value="tech-001">John Smith</option>
                  <option value="tech-002">Jane Doe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Labor Estimate (Minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={estimatedLabor}
                  onChange={(e) => setEstimatedLabor(parseInt(e.target.value) || 0)}
                  placeholder="Enter estimated minutes"
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-2">
                  Hourly Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                  placeholder="Enter hourly rate"
                  className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {wizard.state.currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-md bg-[#f9fafb] border border-[#e5e7eb] p-4">
                <h3 className="font-semibold text-[#0f172a] mb-3">Review Job Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Customer:</dt>
                    <dd className="font-medium text-[#0f172a]">{customerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Location:</dt>
                    <dd className="font-medium text-[#0f172a]">{site}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Scheduled:</dt>
                    <dd className="font-medium text-[#0f172a]">{scheduledFor}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Priority:</dt>
                    <dd className="font-medium text-[#0f172a] capitalize">{priority}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Parts:</dt>
                    <dd className="font-medium text-[#0f172a]">{selectedParts.length} selected</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#475569]">Technician:</dt>
                    <dd className="font-medium text-[#0f172a]">{assignedTechnician}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-700">
                  ✓ All required fields are complete. Click Submit to create the job.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={wizard.goBack}
            disabled={wizard.state.currentStep === 1 || isPending}
            className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <div className="text-xs text-[#64748b]">
            Step {wizard.state.currentStep} of 4
          </div>

          {wizard.state.currentStep === 4 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5d5a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating...' : 'Create Job'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                validateStep(wizard.state.currentStep);
                if (wizard.canAdvance(wizard.state.currentStep)) {
                  wizard.advance();
                }
              }}
              disabled={!wizard.canAdvance(wizard.state.currentStep) || isPending}
              className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5d5a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
