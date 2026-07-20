import Link from 'next/link';
import {UserButton} from '@clerk/nextjs';

import type {AuthorizationContext} from '@/lib/rbac/server';
import {buildVisibleNavigation} from '@/lib/rbac/navigation';

function formatRoleLabel(value: string | null): string {
  if (!value) {
    return 'Unscoped';
  }

  return value.split('_')
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
}

function buildRoleSummary(context: AuthorizationContext): string {
  if (!context.orgId) {
    return 'No organization selected';
  }

  if (context.orgRole && context.userRole) {
    return `${formatRoleLabel(context.userRole)} capped by ${formatRoleLabel(context.orgRole)}`;
  }

  if (context.orgRole && !context.userRole) {
    return `${formatRoleLabel(context.orgRole)} (org-derived)`;
  }

  if (context.clerkOrgRole && !context.orgRole) {
    return `Unknown org role: ${context.clerkOrgRole}`;
  }

  return 'Unscoped';
}

export function ProtectedShell({
  context,
  children,
}: {
  context: AuthorizationContext;
  children: React.ReactNode;
}) {
  const navItems = buildVisibleNavigation(context.effectivePermissions);
  const homeHref = navItems[0]?.href ?? '/';
  const roleSummary = buildRoleSummary(context);

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <header className="border-b border-[#e6e8ef] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="text-sm font-semibold tracking-wide">
            Locksmith Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#334155]"
              title={roleSummary}
            >
              {formatRoleLabel(context.userRole ?? context.orgRole)}
            </span>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'size-8',
                },
              }}
            />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-[#e6e8ef] bg-white p-3">
          {navItems.length > 0 ? (
            <nav aria-label="Primary navigation" className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-[#1f2937] hover:bg-[#f3f4f6]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="space-y-1 px-2 py-2 text-xs text-[#4b5563]">
              <p className="font-semibold">No modules available</p>
              <p>Verify your organization and role mapping.</p>
            </div>
          )}
        </aside>
        <main className="rounded-lg border border-[#e6e8ef] bg-white p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
