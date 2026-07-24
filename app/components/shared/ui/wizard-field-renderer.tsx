/**
 * Composable field renderer system for data-driven form wizards
 * 
 * Eliminates repetitive field markup by providing a registry of field types
 * that can be rendered based on field configuration. Reduces component code
 * and makes adding new field types much simpler.
 * 
 * Usage:
 * ```
 * <FieldRenderer
 *   config={{ name: 'email', type: 'email', label: 'Email' }}
 *   value={form.values.email}
 *   error={form.errors.email}
 *   onChange={(value) => form.setField('email', value)}
 * />
 * ```
 */

import React from 'react';
import type { FieldConfig } from './wizard-form';

interface FieldRendererProps {
    config: FieldConfig;
    value: any;
    error: string | null;
    onChange: (value: any) => void;
    onBlur?: () => void;
}

/**
 * Text input field
 */
function TextField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={config.placeholder}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            />
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Email input field
 */
function EmailField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <input
                type="email"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={config.placeholder}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            />
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Number input field
 */
function NumberField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <input
                type="number"
                value={value || ''}
                onChange={(e) => onChange(e.target.valueAsNumber)}
                onBlur={onBlur}
                placeholder={config.placeholder}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            />
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Date input field
 */
function DateField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <input
                type="date"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            />
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Select dropdown field
 */
function SelectField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            >
                <option value="">Select an option...</option>
                {config.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Checkbox field
 */
function CheckboxField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-2">
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    onBlur={onBlur}
                    className="h-4 w-4 cursor-pointer accent-[#0f766e]"
                    aria-invalid={!!error}
                    aria-describedby={error ? `${config.name}-error` : undefined}
                />
                <span className="text-xs font-medium text-[#0f172a]">
                    {config.label}
                    {config.required && <span className="text-[#dc2626]">*</span>}
                </span>
            </div>
            {config.description && (
                <p className="text-[11px] text-[#64748b]">{config.description}</p>
            )}
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Textarea field
 */
function TextareaField({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    return (
        <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {config.label}
                {config.required && <span className="text-[#dc2626]">*</span>}
            </span>
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={config.placeholder}
                rows={4}
                className={`w-full rounded-md border px-3 py-2 text-xs ${error
                        ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]'
                        : 'border-[#d1d5db] text-[#0f172a]'
                    }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${config.name}-error` : undefined}
            />
            {error && (
                <p
                    id={`${config.name}-error`}
                    className="text-xs text-[#dc2626]"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </label>
    );
}

/**
 * Field type registry - maps field types to rendering components
 */
const FIELD_RENDERER_REGISTRY: Record<
    string,
    React.FC<FieldRendererProps>
> = {
    text: TextField,
    email: EmailField,
    number: NumberField,
    date: DateField,
    select: SelectField,
    checkbox: CheckboxField,
    textarea: TextareaField,
};

/**
 * Main FieldRenderer component
 * 
 * Automatically selects and renders the appropriate field component
 * based on the field config type. Consistent error handling and styling.
 */
export function FieldRenderer({
    config,
    value,
    error,
    onChange,
    onBlur,
}: FieldRendererProps) {
    const FieldComponent =
        FIELD_RENDERER_REGISTRY[config.type] || TextField;

    return (
        <FieldComponent
            config={config}
            value={value}
            error={error}
            onChange={onChange}
            onBlur={onBlur}
        />
    );
}

/**
 * StepRenderer component - renders all fields in a step
 * 
 * Eliminates the need to manually render each field in a step.
 * Just pass the step config and form state, everything is handled.
 */
export function StepRenderer({
    step,
    formValues,
    formErrors,
    onFieldChange,
    gridCols = 'sm:grid-cols-2 lg:grid-cols-3',
}: {
    step: any;
    formValues: Record<string, any>;
    formErrors: Record<string, string | null>;
    onFieldChange: (fieldName: string, value: any) => void;
    gridCols?: string;
}) {
    return (
        <div className={`grid gap-3 ${gridCols}`}>
            {step.fields.map((field: FieldConfig) => (
                <FieldRenderer
                    key={field.name}
                    config={field}
                    value={formValues[field.name]}
                    error={formErrors[field.name] || null}
                    onChange={(value) => onFieldChange(field.name, value)}
                />
            ))}
        </div>
    );
}
