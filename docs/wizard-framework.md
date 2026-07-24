# Wizard Framework Documentation

## Overview

The new wizard framework provides reusable components and hooks for creating multi-step workflows with clear progression, validation, and error handling.

## Components

### 1. `WizardStep` Component

Displays a single step indicator with status, description, and click handler.

**Features:**
- Visual status indicators (✓ complete, ! error, → current, ◯ incomplete)
- Step title and description
- Color-coded styling based on status
- Disabled state for incomplete steps
- Accessible (aria-current, role=button)

**Usage:**
```tsx
import { WizardStep, type WizardStepConfig } from '@/app/components/wizard-step';

const stepConfig: WizardStepConfig = {
  stepNumber: 1,
  title: 'Customer Details',
  description: 'Enter customer name and location',
  isComplete: true,
  hasError: false,
};

<WizardStep
  step={stepConfig}
  isCurrent={true}
  onClick={() => handleStepClick(1)}
/>
```

**Helper Functions:**
- `getWizardStepStatus()` - Returns step status type
- `getStepStatusStyles()` - Returns Tailwind classes for styling
- `validateWizardStepFields()` - Validates required fields
- `getStepProgressPercentage()` - Calculates progress %

### 2. `useWizardController` Hook

Manages wizard state, navigation, and validation.

**Features:**
- Step progression with validation
- Error tracking per step
- Completion tracking
- Progress calculation
- Reset capability

**Usage:**
```tsx
import { useWizardController } from '@/app/components/wizard-controller';

const wizard = useWizardController({
  totalSteps: 4,
  onStepChange: (step) => console.log('Moved to step', step),
  onComplete: () => console.log('Wizard complete!'),
});

// Navigate
wizard.advance();
wizard.goBack();
wizard.goToStep(2);

// Validation
wizard.setErrorsForStep(1, ['Field is required']);
wizard.clearErrorsForStep(1);

// State
const { currentStep, isComplete, progress } = wizard.state;
```

### 3. `WizardProgressBar` Component

Displays progress with step count.

**Usage:**
```tsx
import { WizardProgressBar } from '@/app/components/wizard-controller';

<WizardProgressBar
  currentStep={2}
  totalSteps={4}
  completedSteps={new Set([1])}
/>
```

### 4. `WizardNavigation` Component

Provides Back, Next/Submit buttons with proper state management.

**Usage:**
```tsx
import { WizardNavigation } from '@/app/components/wizard-controller';

<WizardNavigation
  canGoBack={currentStep > 1}
  canAdvance={isCurrentStepValid}
  isLastStep={currentStep === 4}
  onBack={() => wizard.goBack()}
  onAdvance={() => wizard.advance()}
  onSubmit={handleSubmit}
  isPending={isSubmitting}
/>
```

## Complete Example: Add Job Wizard

See `app/components/add-job-wizard-enhanced.tsx` for a full implementation.

**Key patterns:**
1. State management for form fields
2. Step-specific validation in `validateStep()`
3. Conditional rendering based on `currentStep`
4. Error display with specific field errors
5. Review step before final submission
6. Proper cleanup and reset after submission

## Validation Pattern

```tsx
function validateStep(step: number) {
  const errors: string[] = [];

  if (step === 1) {
    if (!customerName.trim()) errors.push('Customer name is required');
    if (!site.trim()) errors.push('Service location is required');
  }

  if (errors.length > 0) {
    wizard.setErrorsForStep(step, errors);
  } else {
    wizard.clearErrorsForStep(step);
    wizard.completeStep(step);
  }
}

// Call before advancing
function handleAdvance() {
  validateStep(wizard.state.currentStep);
  if (wizard.canAdvance(wizard.state.currentStep)) {
    wizard.advance();
  }
}
```

## Styling

All components use the existing design system colors:
- Primary: `#0f766e` (teal)
- Text: `#0f172a` (dark), `#475569` (medium), `#64748b` (light)
- Borders: `#d1d5db`, `#cbd5e1`
- Status: Red (error), Green (complete), Yellow (in progress)

## Testing

The framework includes comprehensive tests:
- `wizard-step.test.ts` - 15 tests for step logic
- `wizard-controller.test.ts` - 21 tests for navigation and state

Run tests with: `pnpm run test`

## Migration Path

To add the enhanced wizard to existing jobs workflow:

1. Replace existing wizard state with `useWizardController`
2. Create `WizardStepConfig` objects for each step
3. Use `WizardStep` component for step indicators
4. Use `WizardProgressBar` and `WizardNavigation` for UX
5. Add step-specific validation in `validateStep()`
6. Test with `pnpm run test` and `pnpm run typecheck`

## Benefits

✓ **Reusable** - Use across multiple workflows (Quotes, POs, Transfers, etc.)
✓ **Clear UX** - Visual progress indicators and step descriptions
✓ **Validated** - Per-step validation with error tracking
✓ **Accessible** - Proper ARIA attributes and keyboard support
✓ **Tested** - 36+ tests for framework reliability
✓ **Type-safe** - Full TypeScript support with no `any` types
