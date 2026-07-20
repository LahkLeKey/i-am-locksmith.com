import Link from 'next/link';

export function LandingHero({
    primaryAction,
    isAuthenticated,
}: {
    primaryAction: { label: string; href: string };
    isAuthenticated: boolean;
}) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-[#dbe5ef] bg-[linear-gradient(135deg,#fff5e5_0%,#f0fdfa_48%,#eef6ff_100%)] p-8 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.42)] sm:p-12">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#fb923c]/20 blur-3xl" />
            <div className="absolute -bottom-14 left-10 h-52 w-52 rounded-full bg-[#14b8a6]/20 blur-3xl" />

            <div className="relative max-w-3xl space-y-6">
                <p className="inline-flex rounded-full border border-[#2f6f6f]/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#115e59]">
                    Inventory-First Operations Platform
                </p>

                <h1 className="text-4xl font-semibold leading-tight text-[#0f172a] sm:text-5xl">
                    Move from stock risk to field execution without losing audit truth.
                </h1>

                <p className="max-w-2xl text-base leading-7 text-[#334155] sm:text-lg">
                    i-am-locksmith centers every workflow around durable inventory events,
                    Clerk-authenticated actions, and role-aware operations surfaces.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={primaryAction.href}
                        className="inline-flex items-center rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(15,118,110,0.9)] transition hover:bg-[#115e59]"
                    >
                        {primaryAction.label}
                    </Link>
                    {isAuthenticated ? (
                        <Link
                            href="/access"
                            className="inline-flex items-center rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#1e293b] transition hover:border-[#94a3b8]"
                        >
                            Review access guidance
                        </Link>
                    ) : (
                        <Link
                            href="/sign-up"
                            className="inline-flex items-center rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#1e293b] transition hover:border-[#94a3b8]"
                        >
                            Create account
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
