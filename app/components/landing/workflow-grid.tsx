import Link from 'next/link';

import { type LandingWorkflow } from '@/lib/landing/workflow-orchestration';

const STATE_TONE: Record<LandingWorkflow['state'], string> = {
    ready: 'border-[#86efac] bg-[#f0fdf4] text-[#166534]',
    signin_required: 'border-[#fdba74] bg-[#fff7ed] text-[#9a3412]',
    permission_required: 'border-[#cbd5e1] bg-[#f8fafc] text-[#334155]',
};

const STATE_LABEL: Record<LandingWorkflow['state'], string> = {
    ready: 'Ready now',
    signin_required: 'Sign-in required',
    permission_required: 'Permission needed',
};

export function WorkflowGrid({ workflows }: { workflows: LandingWorkflow[] }) {
    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-[#0f172a]">
                        Workflow Orchestration
                    </h2>
                    <p className="mt-1 text-sm text-[#475569]">
                        Inventory-led operations with role-aware entry points and explicit
                        auth flow states.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {workflows.map((workflow) => (
                    <article
                        key={workflow.id}
                        className="flex h-full flex-col justify-between rounded-2xl border border-[#dbe5ef] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)]"
                    >
                        <div>
                            <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${STATE_TONE[workflow.state]}`}
                            >
                                {STATE_LABEL[workflow.state]}
                            </span>
                            <h3 className="mt-3 text-lg font-semibold text-[#0f172a]">
                                {workflow.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#475569]">
                                {workflow.description}
                            </p>
                        </div>
                        <Link
                            href={workflow.ctaHref}
                            className="mt-5 inline-flex items-center text-sm font-semibold text-[#0f766e] underline-offset-2 hover:underline"
                        >
                            {workflow.ctaLabel}
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}
