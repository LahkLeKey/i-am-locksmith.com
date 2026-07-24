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

// Generic/Workspace Panels (onboarding, workspace views, settings)
export {UnscopedOnboardingPanel} from './unscoped-onboarding-panel';
export {WorkspaceActionPanel} from './workspace-action-panel';
export {WorkspaceMvpView} from './workspace-mvp-view';
export {OrganizationMembershipsPanel} from './organization-memberships-panel';

// Theme (centralized for consistent styling)
export {default as theme} from './theme';
