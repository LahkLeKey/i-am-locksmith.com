import { PLATFORM_PILLARS } from '@/lib/platform/scaffold';

export function PlatformPillars() {
    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#0f172a]">Platform pillars</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {PLATFORM_PILLARS.map((pillar) => (
                    <article
                        key={pillar.id}
                        className="rounded-2xl border border-[#dbe5ef] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]"
                    >
                        <h3 className="text-base font-semibold text-[#0f172a]">{pillar.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#475569]">{pillar.summary}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
