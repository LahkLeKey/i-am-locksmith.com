import Link from 'next/link';

export default function AccessGuidancePage() {
    return (
        <main className="min-h-screen bg-[#f8fafc]">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
                <section className="rounded-3xl border border-[#dbe5ef] bg-white p-8 shadow-[0_18px_44px_-26px_rgba(15,23,42,0.45)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                        Access guidance
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold text-[#0f172a]">
                        This workflow is not yet enabled for your current access scope.
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-[#475569]">
                        Inventory, dispatch, and finance modules are permission-scoped. Ask an
                        organization admin to grant the required role mapping, or switch
                        organizations/accounts if you expected existing access.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/sign-in"
                            className="inline-flex items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-semibold text-[#1e293b] transition hover:border-[#94a3b8]"
                        >
                            Switch account
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                        >
                            Return to workflows
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
