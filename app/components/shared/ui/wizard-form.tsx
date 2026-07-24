/**
 * Centralized form state management for wizards
 * 
 * Provides a data-driven approach where wizards are configured via a schema
 * rather than scattered useState calls. Reduces boilerplate and improves
 * maintainability by centralizing state, validation, and field logic.
 * 
 * The form logic is organized as:
 * 1. Pure validator functions (no React dependencies)
 * 2. Pure field/step validation logic
 * 3. React hook wrapper (useFormWizard) for state management
 */

import { useCallback, useState } from 'react';

/**
 * Field validator function signature
 */
export type FieldValidator<T = any> = (value: T) => string | null;

/**
 * Field configuration - declaratively define what a field is
 */
export interface FieldConfig {
    name: string;
    type: 'text' | 'email' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    validators?: FieldValidator[];
    options?: Array<{ value: string | number; label: string }>;
    defaultValue?: any;
}

/**
 * Step configuration - groups related fields
 */
export interface StepConfig {
    id: string;
    title: string;
    description?: string;
    fields: FieldConfig[];
}

/**
 * Wizard schema - full workflow definition
 */
export interface WizardSchema {
    id: string;
    title: string;
    description?: string;
    steps: StepConfig[];
}

/**
 * Form state - tracks all field values and errors
 */
export interface FormState {
    values: Record<string, any>;
    errors: Record<string, string | null>;
    touched: Record<string, boolean>;
    isDirty: Record<string, boolean>;
}

/**
 * Form actions available to components
 */
export interface FormActions {
    setField: (name: string, value: any) => void;
    setError: (name: string, error: string | null) => void;
    validateField: (name: string) => boolean;
    validateStep: (stepId: string) => boolean;
    validateAll: () => boolean;
    reset: (initialValues?: Record<string, any>) => void;
    getFieldState: (name: string) => {
        value: any;
        error: string | null;
        touched: boolean;
        isDirty: boolean;
    };
}

/**
 * Combined state and actions for form management
 */
export interface FormWizardState extends FormState, FormActions {
    schema: WizardSchema;
    currentStep: number;
}

/**
 * Hook for managing wizard form state and validation
 * 
 * Usage:
 * ```
 * const form = useFormWizard(schema, { customerName: '', site: '' });
 * 
 * // Access values
 * form.values.customerName
 * 
 * // Update field
 * form.setField('customerName', 'John Doe')
 * 
 * // Check validity
 * const isStepValid = form.validateStep('customer-details')
 * 
 * // Get field state
 * const { value, error, touched } = form.getFieldState('customerName')
 * ```
 */
export function useFormWizard(
    schema: WizardSchema,
    initialValues?: Record<string, any>,
    currentStep: number = 0
): FormWizardState {
    const [values, setValues] = useState<Record<string, any>>(
        initialValues || {}
    );
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isDirty, setIsDirty] = useState<Record<string, boolean>>({});

    /**
     * Get field config by name
     */
    const getFieldConfig = useCallback(
        (fieldName: string): FieldConfig | undefined => {
            for (const step of schema.steps) {
                const field = step.fields.find((f) => f.name === fieldName);
                if (field) return field;
            }
            return undefined;
        },
        [schema]
    );

    /**
     * Run validators for a field
     */
    const validateField = useCallback(
        (fieldName: string): boolean => {
            const fieldConfig = getFieldConfig(fieldName);
            if (!fieldConfig) return true;

            const value = values[fieldName];

            // Check required
            if (fieldConfig.required && !value) {
                setErrors((prev) => ({
                    ...prev,
                    [fieldName]: `${fieldConfig.label} is required`,
                }));
                return false;
            }

            // Run custom validators
            if (fieldConfig.validators) {
                for (const validator of fieldConfig.validators) {
                    const error = validator(value);
                    if (error) {
                        setErrors((prev) => ({
                            ...prev,
                            [fieldName]: error,
                        }));
                        return false;
                    }
                }
            }

            // Clear error if validation passes
            setErrors((prev) => ({
                ...prev,
                [fieldName]: null,
            }));
            return true;
        },
        [values, getFieldConfig]
    );

    /**
     * Validate all fields in a step
     */
    const validateStep = useCallback(
        (stepId: string): boolean => {
            const step = schema.steps.find((s) => s.id === stepId);
            if (!step) return true;

            let isValid = true;
            for (const field of step.fields) {
                if (!validateField(field.name)) {
                    isValid = false;
                }
                setTouched((prev) => ({
                    ...prev,
                    [field.name]: true,
                }));
            }
            return isValid;
        },
        [schema, validateField]
    );

    /**
     * Validate all fields in all steps
     */
    const validateAll = useCallback((): boolean => {
        let isValid = true;
        for (const step of schema.steps) {
            if (!validateStep(step.id)) {
                isValid = false;
            }
        }
        return isValid;
    }, [schema, validateStep]);

    /**
     * Update a field value and run validation
     */
    const setField = useCallback(
        (name: string, value: any) => {
            setValues((prev) => ({
                ...prev,
                [name]: value,
            }));
            setIsDirty((prev) => ({
                ...prev,
                [name]: true,
            }));
            setTouched((prev) => ({
                ...prev,
                [name]: true,
            }));
            // Validate as user types (for UX feedback)
            validateField(name);
        },
        [validateField]
    );

    /**
     * Manually set an error for a field
     */
    const setError = useCallback((name: string, error: string | null) => {
        setErrors((prev) => ({
            ...prev,
            [name]: error,
        }));
    }, []);

    /**
     * Reset form to initial state
     */
    const reset = useCallback((newInitialValues?: Record<string, any>) => {
        setValues(newInitialValues || initialValues || {});
        setErrors({});
        setTouched({});
        setIsDirty({});
    }, [initialValues]);

    /**
     * Get all state for a field
     */
    const getFieldState = useCallback(
        (name: string) => ({
            value: values[name],
            error: errors[name] || null,
            touched: touched[name] || false,
            isDirty: isDirty[name] || false,
        }),
        [values, errors, touched, isDirty]
    );

    return {
        schema,
        currentStep,
        values,
        errors,
        touched,
        isDirty,
        setField,
        setError,
        validateField,
        validateStep,
        validateAll,
        reset,
        getFieldState,
    };
}

/**
 * Common validators for reuse across wizards
 */
export const validators = {
    /**
     * Ensure field is not empty
     */
    required: (fieldName: string): FieldValidator => {
        return (value) => {
            // Handle null and undefined
            if (value === null || value === undefined) {
                return `${fieldName} is required`;
            }
            // Handle empty string
            if (typeof value === 'string' && !value.trim()) {
                return `${fieldName} is required`;
            }
            // Handle empty array
            if (Array.isArray(value) && value.length === 0) {
                return `${fieldName} is required`;
            }
            // 0 and false are valid values, not empty
            return null;
        };
    },

    /**
     * Validate email format
     */
    email: (): FieldValidator => {
        return (value) => {
            if (!value) return null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return 'Please enter a valid email address';
            }
            return null;
        };
    },

    /**
     * Validate phone number (basic)
     */
    phone: (): FieldValidator => {
        return (value) => {
            if (!value) return null;
            const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
            if (!phoneRegex.test(value)) {
                return 'Please enter a valid phone number';
            }
            return null;
        };
    },

    /**
     * Validate minimum length
     */
    minLength: (min: number): FieldValidator => {
        return (value) => {
            if (!value) return null;
            if (value.length < min) {
                return `Must be at least ${min} characters`;
            }
            return null;
        };
    },

    /**
     * Validate maximum length
     */
    maxLength: (max: number): FieldValidator => {
        return (value) => {
            if (!value) return null;
            if (value.length > max) {
                return `Must be at most ${max} characters`;
            }
            return null;
        };
    },

    /**
     * Validate minimum number
     */
    min: (minValue: number): FieldValidator => {
        return (value) => {
            if (value === null || value === undefined) return null;
            if (Number(value) < minValue) {
                return `Must be at least ${minValue}`;
            }
            return null;
        };
    },

    /**
     * Validate maximum number
     */
    max: (maxValue: number): FieldValidator => {
        return (value) => {
            if (value === null || value === undefined) return null;
            if (Number(value) > maxValue) {
                return `Must be at most ${maxValue}`;
            }
            return null;
        };
    },

    /**
     * Validate at least one item selected
     */
    minItems: (min: number): FieldValidator => {
        return (value) => {
            if (!Array.isArray(value)) return null;
            if (value.length < min) {
                return `Select at least ${min} item(s)`;
            }
            return null;
        };
    },

    /**
     * Custom validation
     */
    custom: (validateFn: (value: any) => boolean, message: string): FieldValidator => {
        return (value) => {
            if (!validateFn(value)) {
                return message;
            }
            return null;
        };
    },
};
