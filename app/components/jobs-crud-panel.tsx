"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

const STATUSES: JobQueueStatus[] = ['queued', 'scheduled', 'in_progress', 'blocked'];
const PRIORITIES: JobQueuePriority[] = ['low', 'normal', 'high', 'urgent'];

export function JobsCrudPanel({ initialJobs }: { initialJobs: JobQueueItem[] }) {
    const router = useRouter();
    const [customerName, setCustomerName] = useState('');
    const [site, setSite] = useState('');
    const [priority, setPriority] = useState<JobQueuePriority>('normal');
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const jobs = useMemo(
        () => [...initialJobs].sort((left, right) => right.id.localeCompare(left.id)),
        [initialJobs]
    );

    async function runMutation(request: RequestInit) {
        setFeedback(null);
        setError(null);
        setIsPending(true);

        try {
            const response = await fetch('/api/jobs', request);
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error ?? 'Request failed.');
                return;
            }

            setFeedback(payload?.message ?? 'Saved.');
            router.refresh();
        } catch {
            setError('Request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <section className="space-y-4 rounded-md border border-[#e5e7eb] bg-white p-4">
            <div>
                <h2 className="text-sm font-semibold">Jobs CRUD</h2>
                <p className="mt-1 text-xs text-[#475569]">Create, update, and delete persisted jobs for the active org.</p>
            </div>

            <form
                className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]"
                onSubmit={async (event) => {
                    event.preventDefault();

                    await runMutation({
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            customerName,
                            site,
                            priority,
                        }),
                    });

                    setCustomerName('');
                    setSite('');
                    setPriority('normal');
                }}
            >
                <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Customer name"
                    className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    required
                />
                <input
                    value={site}
                    onChange={(event) => setSite(event.target.value)}
                    placeholder="Site"
                    className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    required
                />
                <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as JobQueuePriority)}
                    className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                >
                    {PRIORITIES.map((entry) => (
                        <option key={entry} value={entry}>
                            {entry}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                >
                    Add Job
                </button>
            </form>

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <ul className="space-y-2 text-xs text-[#334155]">
                {jobs.map((job) => (
                    <li key={job.id} className="rounded bg-[#f8fafc] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="font-semibold">{job.id}</p>
                                <p>
                                    {job.customerName} - {job.site}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    defaultValue={job.status}
                                    onChange={async (event) => {
                                        await runMutation({
                                            method: 'PATCH',
                                            headers: { 'content-type': 'application/json' },
                                            body: JSON.stringify({ id: job.id, status: event.target.value }),
                                        });
                                    }}
                                    className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                >
                                    {STATUSES.map((entry) => (
                                        <option key={entry} value={entry}>
                                            {entry}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await runMutation({
                                            method: 'DELETE',
                                            headers: { 'content-type': 'application/json' },
                                            body: JSON.stringify({ id: job.id }),
                                        });
                                    }}
                                    className="rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs text-[#991b1b]"
                                    disabled={isPending}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
