import { REPORT_TEMPLATES } from '@/lib/platform/scaffold';

export function ReportTemplatesPanel() {
    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#0f172a]">Reporting templates scaffold</h2>
            <div className="grid gap-4 lg:grid-cols-2">
                {REPORT_TEMPLATES.map((template) => (
                    <article
                        key={template.id}
                        className="rounded-2xl border border-[#dbe5ef] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]"
                    >
                        <h3 className="text-base font-semibold text-[#0f172a]">{template.name}</h3>
                        <p className="mt-2 text-sm text-[#475569]">{template.purpose}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                            Core columns
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-[#334155]">
                            {template.coreColumns.map((column) => (
                                <li key={column}>• {column}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}
