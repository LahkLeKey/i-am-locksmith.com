import React, { useCallback, useState } from 'react';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardStepValidation {
  [key: number]: boolean;
}

export interface WizardStepErrors {
  [key: number]: string[];
}

export interface WizardControllerConfig {
  totalSteps: number;
  onStepChange?: (step: WizardStep) => void;
  onComplete?: () => void;
}

export interface WizardControllerState {
  currentStep: WizardStep;
  completedSteps: Set<number>;
  stepErrors: WizardStepErrors;
  isComplete: boolean;
  progress: number;
}

export function useWizardController(config: WizardControllerConfig) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1 as WizardStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepErrors, setStepErrors] = useState<WizardStepErrors>({});

  const progress = (currentStep / config.totalSteps) * 100;
  const isComplete = currentStep === config.totalSteps;

  const canAdvance = useCallback((step: number): boolean => {
    return !stepErrors[step] || stepErrors[step].length === 0;
  }, [stepErrors]);

  const advance = useCallback(() => {
    if (!canAdvance(currentStep)) {
      return false;
    }
    
    if (currentStep < config.totalSteps) {
      const nextStep = (currentStep + 1) as WizardStep;
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(nextStep);
      config.onStepChange?.(nextStep);
      return true;
    }
    
    return false;
  }, [currentStep, config, canAdvance]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as WizardStep;
      setCurrentStep(prevStep);
      config.onStepChange?.(prevStep);
      return true;
    }
    return false;
  }, [currentStep, config]);

  const goToStep = useCallback((step: WizardStep) => {
    if (step >= 1 && step <= config.totalSteps) {
      setCurrentStep(step);
      config.onStepChange?.(step);
      return true;
    }
    return false;
  }, [config]);

  const setErrorsForStep = useCallback((step: number, errors: string[]) => {
    setStepErrors(prev => ({
      ...prev,
      [step]: errors,
    }));
  }, []);

  const clearErrorsForStep = useCallback((step: number) => {
    setStepErrors(prev => ({
      ...prev,
      [step]: [],
    }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(1 as WizardStep);
    setCompletedSteps(new Set());
    setStepErrors({});
  }, []);

  const completeStep = useCallback((step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  }, []);

  const isStepComplete = useCallback((step: number): boolean => {
    return completedSteps.has(step);
  }, [completedSteps]);

  const getStepErrors = useCallback((step: number): string[] => {
    return stepErrors[step] || [];
  }, [stepErrors]);

  const hasErrors = Object.values(stepErrors).some(errors => errors.length > 0);

  const state: WizardControllerState = {
    currentStep,
    completedSteps,
    stepErrors,
    isComplete,
    progress,
  };

  return {
    state,
    canAdvance,
    advance,
    goBack,
    goToStep,
    setErrorsForStep,
    clearErrorsForStep,
    reset,
    completeStep,
    isStepComplete,
    getStepErrors,
    hasErrors,
  };
}

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
}

export const WizardProgressBar = React.memo(({
  currentStep,
  totalSteps,
  completedSteps,
}: WizardProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#475569]">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs text-[#64748b]">
          {completedSteps.size} of {totalSteps} complete
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#e5e7eb] overflow-hidden">
        <div
          className="h-full bg-[#0f766e] transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
    </div>
  );
});

WizardProgressBar.displayName = 'WizardProgressBar';

interface WizardNavigationProps {
  canGoBack: boolean;
  canAdvance: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onAdvance: () => void;
  onSubmit?: () => void;
  isPending?: boolean;
  className?: string;
}

export const WizardNavigation = React.memo(({
  canGoBack,
  canAdvance,
  isLastStep,
  onBack,
  onAdvance,
  onSubmit,
  isPending = false,
  className = '',
}: WizardNavigationProps) => {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack || isPending}
        className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Back
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canAdvance || isPending}
          className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d5d5a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdvance}
          disabled={!canAdvance || isPending}
          className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d5d5a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      )}
    </div>
  );
});

WizardNavigation.displayName = 'WizardNavigation';
