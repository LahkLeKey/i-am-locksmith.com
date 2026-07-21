import type {WorkspaceMvpSnapshot} from '@/lib/workspaces/mvp';

function badgeForStatus(status: WorkspaceMvpSnapshot['queue'][number]['status']) {
  if (status === 'urgent') {
    return 'bg-[#fee2e2] text-[#991b1b]';
  }

  if (status === 'attention') {
    return 'bg-[#fef3c7] text-[#92400e]';
  }

  return 'bg-[#dcfce7] text-[#166534]';
}

export function WorkspaceMvpView({snapshot}: {snapshot: WorkspaceMvpSnapshot}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{snapshot.title}</h1>
        <p className="mt-1 text-sm text-[#4b5563]">{snapshot.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {snapshot.kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
            <p className="text-xs text-[#6b7280]">{kpi.label}</p>
            <p className="mt-2 text-xl font-semibold text-[#0f172a]">{kpi.value}</p>
            <p className="mt-1 text-xs text-[#475569]">{kpi.trend}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold">Priority Queue</h2>
          <ul className="mt-3 space-y-2 text-xs text-[#334155]">
            {snapshot.queue.map((item) => (
              <li key={item.title} className="rounded bg-[#f8fafc] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeForStatus(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-[#475569]">{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-md border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold">MVP Activation Checklist</h2>
          <ol className="mt-3 space-y-2 text-xs text-[#334155]">
            {snapshot.checklist.map((item, index) => (
              <li key={item} className="rounded bg-[#f8fafc] px-3 py-2">
                {index + 1}. {item}
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}
