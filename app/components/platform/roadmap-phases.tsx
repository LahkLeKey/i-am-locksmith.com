import { ROADMAP_PHASES } from '@/lib/platform/scaffold';

export function RoadmapPhases() {
    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#0f172a]">Execution roadmap</h2>
            <div className="grid gap-4 lg:grid-cols-3">
                {ROADMAP_PHASES.map((phase) => (
                    <article
                        key={phase.id}
                        className="rounded-2xl border border-[#dbe5ef] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                            {phase.title}
                        </p>
                        <p className="mt-2 text-sm text-[#334155]">Duration: {phase.duration}</p>
                        <p className="text-sm text-[#334155]">Team: {phase.team}</p>
                        <ul className="mt-3 space-y-2 text-sm text-[#475569]">
                            {phase.highlights.map((highlight) => (
                                <li key={highlight} className="rounded bg-[#f8fafc] px-3 py-2">
                                    {highlight}
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}
