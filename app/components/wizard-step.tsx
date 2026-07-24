import React from 'react';

export type WizardStepStatus = 'incomplete' | 'complete' | 'error' | 'current';

export interface WizardStepField {
  name: string;
  required: boolean;
  value: string | number | boolean;
}

export interface WizardStepConfig {
  stepNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  description?: string;
  isComplete: boolean;
  hasError: boolean;
  isRequired?: boolean;
  fields?: WizardStepField[];
}

export function getWizardStepStatus(config: WizardStepConfig): WizardStepStatus {
  if (config.hasError) return 'error';
  if (config.isComplete) return 'complete';
  return 'incomplete';
}

export function validateWizardStepFields(fields: WizardStepField[]): boolean {
  return fields.every(field => !field.required || field.value);
}

export function getStepStatusStyles(status: WizardStepStatus, isCurrent: boolean) {
  const baseClasses = 'rounded border px-3 py-2 text-xs font-medium transition-all';
  
  if (status === 'error') {
    return `${baseClasses} border-red-300 bg-red-50 text-red-700`;
  }
  
  if (status === 'complete') {
    return `${baseClasses} border-green-300 bg-green-50 text-green-700`;
  }
  
  if (isCurrent) {
    return `${baseClasses} border-[#0f766e] bg-white text-[#0f766e]`;
  }
  
  return `${baseClasses} border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]`;
}

export function getStepProgressPercentage(currentStep: number, totalSteps: number): number {
  return (currentStep / totalSteps) * 100;
}

interface WizardStepProps {
  step: WizardStepConfig;
  isCurrent: boolean;
  onClick?: () => void;
  className?: string;
}

export const WizardStep = React.memo(({
  step,
  isCurrent,
  onClick,
  className = '',
}: WizardStepProps) => {
  const status = getWizardStepStatus(step);
  const statusStyles = getStepStatusStyles(status, isCurrent);
  
  const statusIcon = {
    complete: '✓',
    error: '!',
    current: '→',
    incomplete: '◯',
  }[status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === 'incomplete' && !isCurrent}
      className={`${statusStyles} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">{statusIcon} Step {step.stepNumber}</span>
        <span>{step.title}</span>
      </div>
      {step.description && (
        <p className="text-[11px] opacity-75 mt-1">{step.description}</p>
      )}
    </button>
  );
});

WizardStep.displayName = 'WizardStep';
