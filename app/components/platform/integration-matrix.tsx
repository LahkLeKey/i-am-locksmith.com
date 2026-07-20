import { INTEGRATION_CATEGORIES } from '@/lib/platform/scaffold';

export function IntegrationMatrix() {
    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#0f172a]">Integration matrix</h2>
            <div className="grid gap-4 md:grid-cols-2">
                {INTEGRATION_CATEGORIES.map((entry) => (
                    <article
                        key={entry.category}
                        className="rounded-2xl border border-[#dbe5ef] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]"
                    >
                        <h3 className="text-base font-semibold text-[#0f172a]">{entry.category}</h3>
                        <p className="mt-2 text-sm text-[#475569]">{entry.rationale}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                            Providers
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {entry.providers.map((provider) => (
                                <li
                                    key={provider}
                                    className="rounded-full border border-[#cbd5e1] bg-[#f8fafc] px-3 py-1 text-xs text-[#334155]"
                                >
                                    {provider}
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}
