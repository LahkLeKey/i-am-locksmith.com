import Link from 'next/link';

export function AuthFlowRail({
    isAuthenticated,
    hasInventoryAccess,
    primaryActionHref,
}: {
    isAuthenticated: boolean;
    hasInventoryAccess: boolean;
    primaryActionHref: string;
}) {
    return (
        <section className="grid gap-4 rounded-3xl border border-[#dbe5ef] bg-white p-6 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)] lg:grid-cols-3">
            <div className="lg:col-span-1">
                <h2 className="text-xl font-semibold text-[#0f172a]">
                    Authentication orchestration
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#475569]">
                    Route users to the right workflow path based on Clerk session and
                    role-derived permissions.
                </p>
            </div>

            <div className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
                {isAuthenticated ? (
                    <>
                        <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#15803d]">
                                Session active
                            </p>
                            <p className="mt-2 text-sm text-[#14532d]">
                                Continue from your protected workspace with role-scoped routing.
                            </p>
                            <Link
                                href={hasInventoryAccess ? '/inventory' : primaryActionHref}
                                className="mt-3 inline-flex text-sm font-semibold text-[#166534] underline-offset-2 hover:underline"
                            >
                                Continue now
                            </Link>
                        </div>
                        <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#334155]">
                                Role controls
                            </p>
                            <p className="mt-2 text-sm text-[#334155]">
                                Update organization context and verify workflow access boundaries.
                            </p>
                            <Link
                                href="/access"
                                className="mt-3 inline-flex text-sm font-semibold text-[#0f172a] underline-offset-2 hover:underline"
                            >
                                Review access guidance
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c2410c]">
                                Existing operator
                            </p>
                            <p className="mt-2 text-sm text-[#7c2d12]">
                                Sign in to restore your workflow state and permission-scoped views.
                            </p>
                            <Link
                                href="/sign-in"
                                className="mt-3 inline-flex text-sm font-semibold text-[#9a3412] underline-offset-2 hover:underline"
                            >
                                Go to sign in
                            </Link>
                        </div>
                        <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
                                New workspace
                            </p>
                            <p className="mt-2 text-sm text-[#1e3a8a]">
                                Create an account and organization to start inventory-first operations.
                            </p>
                            <Link
                                href="/sign-up"
                                className="mt-3 inline-flex text-sm font-semibold text-[#1d4ed8] underline-offset-2 hover:underline"
                            >
                                Go to sign up
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
