import { hasPermission, type Permission } from '@/lib/rbac/policy';
import { getAuthorizationContext } from '@/lib/rbac/server';
import { buildLandingWorkflows, buildPrimaryAction } from '@/lib/landing/workflow-orchestration';

import { LandingHero } from './components/landing/landing-hero';
import { AuthFlowRail } from './components/landing/auth-flow-rail';
import { WorkflowGrid } from './components/landing/workflow-grid';
import { IntegrationMatrix } from './components/platform/integration-matrix';
import { PlatformPillars } from './components/platform/platform-pillars';
import { ReportTemplatesPanel } from './components/platform/report-templates-panel';
import { RoadmapPhases } from './components/platform/roadmap-phases';

export default async function Home() {
  const context = await getAuthorizationContext();
  const isAuthenticated = Boolean(context);
  const permissions = context?.effectivePermissions ?? new Set<Permission>();
  const hasInventoryAccess = hasPermission(permissions, 'inventory.read');

  const workflows = buildLandingWorkflows({
    isAuthenticated,
    permissions,
  });

  const primaryAction = buildPrimaryAction({
    isAuthenticated,
    permissions,
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_-10%,#fef3c7_0,#fff7ed_20%,transparent_45%),radial-gradient(circle_at_85%_10%,#ccfbf1_0,#ecfeff_22%,transparent_45%),linear-gradient(180deg,#f8fafc_0,#f8fafc_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:py-14">
        <LandingHero
          isAuthenticated={isAuthenticated}
          primaryAction={primaryAction}
        />
        <AuthFlowRail
          isAuthenticated={isAuthenticated}
          hasInventoryAccess={hasInventoryAccess}
          primaryActionHref={primaryAction.href}
        />
        <WorkflowGrid workflows={workflows} />
        <PlatformPillars />
        <RoadmapPhases />
        <IntegrationMatrix />
        <ReportTemplatesPanel />
      </div>
    </main>
  );
}
