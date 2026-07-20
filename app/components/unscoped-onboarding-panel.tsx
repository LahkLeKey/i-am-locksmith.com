import Link from 'next/link';

import type { AuthorizationContext } from '@/lib/rbac/server';

function formatRoleLabel(value: string | null): string {
    if (!value) {
        return 'Unscoped';
    }

    return value
        .split('_')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');
}

export function UnscopedOnboardingPanel({
    context,
}: {
    context: AuthorizationContext;
}) {
    const orgContext = context.orgId ? 'Organization selected' : 'No organization selected';

    return (
        <section className="space-y-6">
            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                    Welcome to Locksmith
                </p>
                <h1 className="text-2xl font-semibold text-[#0f172a]">
                    Your account is active. Let&apos;s finish access setup.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[#475569]">
                    You are signed in, but your role-to-workflow mapping has not been assigned yet.
                    As soon as an admin scopes your access, your dashboard modules will appear here.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-[#dbe5ef] bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Account status</p>
                    <p className="mt-2 text-sm font-semibold text-[#0f172a]">{formatRoleLabel(context.userRole)}</p>
                    <p className="mt-1 text-xs text-[#475569]">{orgContext}</p>
                </article>
                <article className="rounded-xl border border-[#dbe5ef] bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Next action</p>
                    <p className="mt-2 text-sm font-semibold text-[#0f172a]">Request role mapping</p>
                    <p className="mt-1 text-xs text-[#475569]">An org admin can map your account to dispatcher, inventory, technician, or finance workflows.</p>
                </article>
            </div>

            <ol className="space-y-2 rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#334155]">
                <li>1. Confirm you are in the correct organization.</li>
                <li>2. Ask an org admin to assign your workflow role.</li>
                <li>3. Sign out and sign back in to refresh permissions.</li>
            </ol>

            <div className="flex flex-wrap gap-3">
                <Link
                    href="/access"
                    className="inline-flex items-center justify-center rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                >
                    Open access guidance
                </Link>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#1e293b] transition hover:border-[#94a3b8]"
                >
                    Return to landing page
                </Link>
            </div>
        </section>
    );
}
