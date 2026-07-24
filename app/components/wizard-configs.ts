/**
 * Data-driven wizard configurations
 * 
 * Defines the structure and validation logic for common workflows.
 * By using configurations instead of hardcoded component logic,
 * we achieve:
 * 
 * - Centralized workflow definitions (single source of truth)
 * - Consistent validation and error handling
 * - Easy to modify fields without touching components
 * - Easy to add new workflows by creating new configs
 * - Automatic field rendering with FieldRenderer
 * - Fully type-safe with TypeScript
 */

import { validators, type WizardSchema } from './wizard-form';

/**
 * Add Job Wizard Configuration
 * 
 * Step 1: Customer Details - Get customer name and service location
 * Step 2: Schedule + Parts - Choose date and what parts are needed
 * Step 3: Technician + Labor - Assign technician and estimate labor
 * Step 4: Review + Submit - Review all details and create the job
 */
export const ADD_JOB_WIZARD_CONFIG: WizardSchema = {
    id: 'add-job-wizard',
    title: 'Add Job Wizard',
    description: 'Create a new job with quote details',
    steps: [
        {
            id: 'customer-details',
            title: 'Customer Details',
            description: 'Enter customer name and service location',
            fields: [
                {
                    name: 'customerName',
                    type: 'text',
                    label: 'Customer Name',
                    placeholder: 'Enter customer name',
                    required: true,
                    validators: [validators.minLength(2)],
                },
                {
                    name: 'site',
                    type: 'text',
                    label: 'Service Location / Site',
                    placeholder: 'Enter street address or location name',
                    required: true,
                    validators: [validators.minLength(5)],
                },
            ],
        },
        {
            id: 'schedule-parts',
            title: 'Schedule + Parts',
            description: 'Choose when to visit and what parts you need',
            fields: [
                {
                    name: 'scheduledFor',
                    type: 'date',
                    label: 'Scheduled Date',
                    required: true,
                },
                {
                    name: 'priority',
                    type: 'select',
                    label: 'Job Priority',
                    required: true,
                    options: [
                        { value: 'low', label: 'Low - Schedule as time allows' },
                        { value: 'normal', label: 'Normal - Regular service' },
                        { value: 'high', label: 'High - Priority appointment' },
                        { value: 'urgent', label: 'Urgent - ASAP' },
                    ],
                    defaultValue: 'normal',
                },
                {
                    name: 'requiredSkus',
                    type: 'checkbox',
                    label: 'Select Parts (if known)',
                    description: 'Select the parts you anticipate needing',
                    required: false,
                    validators: [],
                },
            ],
        },
        {
            id: 'technician-labor',
            title: 'Technician + Labor',
            description: 'Assign technician and estimate labor time',
            fields: [
                {
                    name: 'assignedTechnicianId',
                    type: 'select',
                    label: 'Assigned Technician',
                    placeholder: 'Select a technician',
                    required: false,
                },
                {
                    name: 'estimatedMinutes',
                    type: 'number',
                    label: 'Estimated Minutes',
                    placeholder: '0',
                    required: true,
                    validators: [validators.min(0)],
                },
                {
                    name: 'quotePartEstimate',
                    type: 'number',
                    label: 'Parts Estimate ($)',
                    placeholder: '0.00',
                    required: false,
                    validators: [validators.min(0)],
                },
            ],
        },
        {
            id: 'review-submit',
            title: 'Review + Submit',
            description: 'Review all details before creating the job',
            fields: [
                {
                    name: 'quoteNotes',
                    type: 'textarea',
                    label: 'Additional Notes',
                    description: 'Scope, exclusions, or customer-facing notes',
                    placeholder: 'Enter any additional notes or scope details',
                    required: false,
                },
            ],
        },
    ],
};

/**
 * Active Job Workflow Configuration
 * 
 * Step 1: Core - View job details and make any edits
 * Step 2: Quote + Inventory - Review quote and confirm inventory
 * Step 3: Time Clock - Clock in/out for technicians
 * Step 4: Closeout - Record outcomes and financial details
 */
export const ACTIVE_JOB_WORKFLOW_CONFIG: WizardSchema = {
    id: 'active-job-workflow',
    title: 'Active Job Workflow',
    description: 'Manage ongoing job from intake through closeout',
    steps: [
        {
            id: 'core',
            title: 'Core',
            description: 'Job details and status',
            fields: [
                {
                    name: 'jobId',
                    type: 'text',
                    label: 'Job ID',
                    required: false,
                },
                {
                    name: 'status',
                    type: 'select',
                    label: 'Job Status',
                    required: true,
                    options: [
                        { value: 'queued', label: 'Queued' },
                        { value: 'scheduled', label: 'Scheduled' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'blocked', label: 'Blocked' },
                        { value: 'closed', label: 'Closed' },
                    ],
                },
                {
                    name: 'priority',
                    type: 'select',
                    label: 'Priority',
                    required: true,
                    options: [
                        { value: 'low', label: 'Low' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' },
                    ],
                },
            ],
        },
        {
            id: 'quote-inventory',
            title: 'Quote + Inventory',
            description: 'Review quote and confirm parts',
            fields: [
                {
                    name: 'quotePartEstimate',
                    type: 'number',
                    label: 'Parts Estimate ($)',
                    required: false,
                    validators: [validators.min(0)],
                },
                {
                    name: 'quoteLaborEstimate',
                    type: 'number',
                    label: 'Labor Estimate ($)',
                    required: false,
                    validators: [validators.min(0)],
                },
                {
                    name: 'quoteNotes',
                    type: 'textarea',
                    label: 'Scope & Notes',
                    required: false,
                },
            ],
        },
        {
            id: 'time-clock',
            title: 'Time Clock',
            description: 'Track time spent on this job',
            fields: [
                {
                    name: 'timeClockStart',
                    type: 'date',
                    label: 'Start Time',
                    required: false,
                },
                {
                    name: 'timeClockEnd',
                    type: 'date',
                    label: 'End Time',
                    required: false,
                },
            ],
        },
        {
            id: 'closeout',
            title: 'Closeout',
            description: 'Record outcomes and financial details',
            fields: [
                {
                    name: 'closureStatus',
                    type: 'select',
                    label: 'Closure Status',
                    required: true,
                    options: [
                        { value: 'completed', label: 'Completed' },
                        { value: 'customer_postponed', label: 'Customer Postponed' },
                        { value: 'no_access', label: 'No Access' },
                        { value: 'incomplete', label: 'Incomplete' },
                    ],
                },
                {
                    name: 'actualPartsCost',
                    type: 'number',
                    label: 'Actual Parts Cost ($)',
                    required: false,
                    validators: [validators.min(0)],
                },
                {
                    name: 'actualLaborCost',
                    type: 'number',
                    label: 'Actual Labor Cost ($)',
                    required: false,
                    validators: [validators.min(0)],
                },
                {
                    name: 'closureNotes',
                    type: 'textarea',
                    label: 'Closure Notes',
                    placeholder: 'Work completed, issues encountered, customer feedback, etc.',
                    required: false,
                },
            ],
        },
    ],
};

/**
 * Create New Quote Wizard Configuration
 * 
 * Step 1: Select Job - Choose which job to create a quote for
 * Step 2: Quote Details - Parts, labor, and notes
 * Step 3: Review + Send - Review quote and choose delivery method
 */
export const CREATE_QUOTE_WIZARD_CONFIG: WizardSchema = {
    id: 'create-quote-wizard',
    title: 'Create Quote',
    description: 'Generate an estimate for the customer',
    steps: [
        {
            id: 'select-job',
            title: 'Select Job',
            description: 'Choose which job to quote',
            fields: [
                {
                    name: 'jobId',
                    type: 'select',
                    label: 'Job',
                    placeholder: 'Select a job from the queue',
                    required: true,
                },
            ],
        },
        {
            id: 'quote-details',
            title: 'Quote Details',
            description: 'Enter parts, labor, and scope',
            fields: [
                {
                    name: 'partEstimate',
                    type: 'number',
                    label: 'Parts Estimate ($)',
                    required: true,
                    validators: [validators.min(0)],
                },
                {
                    name: 'laborEstimate',
                    type: 'number',
                    label: 'Labor Estimate (hours)',
                    required: true,
                    validators: [validators.min(0)],
                },
                {
                    name: 'scope',
                    type: 'textarea',
                    label: 'Scope of Work',
                    placeholder: 'Describe what will be done and what is excluded',
                    required: true,
                },
            ],
        },
        {
            id: 'review-send',
            title: 'Review + Send',
            description: 'Send quote to customer',
            fields: [
                {
                    name: 'sendMethod',
                    type: 'select',
                    label: 'Send Via',
                    required: true,
                    options: [
                        { value: 'email', label: 'Email' },
                        { value: 'sms', label: 'SMS' },
                        { value: 'both', label: 'Both Email & SMS' },
                    ],
                },
            ],
        },
    ],
};

/**
 * Create Replenishment Request Wizard Configuration
 * 
 * For ordering low-stock parts from suppliers
 */
export const CREATE_REPLENISHMENT_WIZARD_CONFIG: WizardSchema = {
    id: 'create-replenishment-wizard',
    title: 'Create Replenishment Request',
    description: 'Order parts from suppliers',
    steps: [
        {
            id: 'select-parts',
            title: 'Select Parts',
            description: 'Choose which parts to order',
            fields: [
                {
                    name: 'selectedParts',
                    type: 'checkbox',
                    label: 'Parts to Order',
                    description: 'Select the parts you need to replenish',
                    required: true,
                    validators: [validators.minItems(1)],
                },
            ],
        },
        {
            id: 'quantities',
            title: 'Quantities',
            description: 'Enter order quantities',
            fields: [
                {
                    name: 'quantities',
                    type: 'text',
                    label: 'Order Details',
                    required: true,
                },
            ],
        },
        {
            id: 'review-send',
            title: 'Review + Submit',
            description: 'Review and send purchase order',
            fields: [
                {
                    name: 'notes',
                    type: 'textarea',
                    label: 'Additional Notes',
                    required: false,
                },
            ],
        },
    ],
};
