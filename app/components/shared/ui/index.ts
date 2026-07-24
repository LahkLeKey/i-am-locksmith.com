/**
 * Shared UI components - reusable across all domains
 */

export { WizardProgressBar, WizardNavigation, useWizardController } from './wizard-controller';
export type { WizardControllerConfig, WizardControllerState, WizardStepValidation, WizardStepErrors } from './wizard-controller';
// Note: WizardStep type (1 | 2 | 3 | 4 | 5) is available as WizardStepNumber if needed
export type { WizardStep as WizardStepNumber } from './wizard-controller';

export { WizardStep, getWizardStepStatus, getStepStatusStyles, getStepProgressPercentage, validateWizardStepFields } from './wizard-step';
export type { WizardStepConfig, WizardStepField, WizardStepStatus } from './wizard-step';

export { useFormWizard, validators } from './wizard-form';
export type { FieldValidator, FieldConfig, StepConfig, WizardSchema, FormState, FormActions, FormWizardState } from './wizard-form';

export { FieldRenderer, StepRenderer } from './wizard-field-renderer';

export { CodeSwitcher } from './code-switcher';
