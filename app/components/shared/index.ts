/**
 * Shared components organized by type
 * 
 * Re-exports all shared UI components for convenient importing
 */

// UI Components (forms, inputs, controls)
export * from './ui/index';

// Layout Components (shells, structural components)
export * from './layouts/index';

// User Components
export * from './user/index';

// Theme (centralized for consistent styling)
export { default as theme } from './theme';
