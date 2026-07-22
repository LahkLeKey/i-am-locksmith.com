"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

const STATUSES: JobQueueStatus[] = ['queued', 'scheduled', 'in_progress', 'blocked'];
const PRIORITIES: JobQueuePriority[] = ['low', 'normal', 'high', 'urgent'];
const SERVICE_LINE_OPTIONS = ['automotive', 'mobile', 'shop'] as const;

type InventoryLookupPart = {
    id: string;
    sku: string;
    itemName: string;
    location: string;
    onHand: number;
};

export function JobsCrudPanel({ initialJobs, inventoryLookupParts }: { initialJobs: JobQueueItem[]; inventoryLookupParts: InventoryLookupPart[] }) {
    const router = useRouter();
    const [customerName, setCustomerName] = useState('');
    const [site, setSite] = useState('');
    const [priority, setPriority] = useState<JobQueuePriority>('normal');
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reserveSku, setReserveSku] = useState<Record<string, string>>({});
    const [reserveQty, setReserveQty] = useState<Record<string, number>>({});
    const [createSku, setCreateSku] = useState<Record<string, string>>({});
    const [createItemName, setCreateItemName] = useState<Record<string, string>>({});
    const [createLocation, setCreateLocation] = useState<Record<string, string>>({});
    const [createSupplier, setCreateSupplier] = useState<Record<string, string>>({});
    const [createNote, setCreateNote] = useState<Record<string, string>>({});
    const [createServiceLines, setCreateServiceLines] = useState<Record<string, string>>({});
    const [createOnHand, setCreateOnHand] = useState<Record<string, number>>({});
    const [createReorderPoint, setCreateReorderPoint] = useState<Record<string, number>>({});
    const [createSuggestedOrderQty, setCreateSuggestedOrderQty] = useState<Record<string, number>>({});
    const [createSeverity, setCreateSeverity] = useState<Record<string, string>>({});
    const [activeDialogJobId, setActiveDialogJobId] = useState<string | null>(null);
    const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobs[0]?.id ?? null);
    const [lookupQuery, setLookupQuery] = useState<Record<string, string>>({});
    const [drafts, setDrafts] = useState<Record<string, { customerName: string; site: string; priority: JobQueuePriority; status: JobQueueStatus; scheduledFor: string; etaMinutes: string }>>({});

    const jobs = useMemo(() => [...initialJobs].sort((left, right) => right.id.localeCompare(left.id)), [initialJobs]);
    const sortedInventoryLookupParts = useMemo(
        () =>
            [...inventoryLookupParts].sort((left, right) => {
                if (right.onHand !== left.onHand) {
                    return right.onHand - left.onHand;
                }

                return left.sku.localeCompare(right.sku);
            }),
        [inventoryLookupParts],
    );

    useEffect(() => {
        if (jobs.length === 0) {
            setSelectedJobId(null);
            return;
        }

        if (!selectedJobId || !jobs.some((job) => job.id === selectedJobId)) {
            setSelectedJobId(jobs[0].id);
        }
    }, [jobs, selectedJobId]);

    function toLocalDateTime(value: string | null): string {
        if (!value) {
            return '';
        }

        const parsed = Date.parse(value);
        if (!Number.isFinite(parsed)) {
            return '';
        }

        return new Date(parsed).toISOString().slice(0, 16);
    }

    function getDraft(job: JobQueueItem) {
        return drafts[job.id] ?? {
            customerName: job.customerName,
            site: job.site,
            priority: job.priority,
            status: job.status,
            scheduledFor: toLocalDateTime(job.scheduledFor),
            etaMinutes: job.etaMinutes === null ? '' : String(job.etaMinutes),
        };
    }

    function isDraftDirty(job: JobQueueItem): boolean {
        const draft = getDraft(job);

        return (
            draft.customerName !== job.customerName ||
            draft.site !== job.site ||
            draft.priority !== job.priority ||
            draft.status !== job.status ||
            draft.scheduledFor !== toLocalDateTime(job.scheduledFor) ||
            draft.etaMinutes !== (job.etaMinutes === null ? '' : String(job.etaMinutes))
        );
    }

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
                <h2 className="text-sm font-semibold">Jobs Management</h2>
                <p className="mt-1 text-xs text-[#475569]">Manage persisted jobs with inline table edits and inventory actions for reporting.</p>
            </div>

            <form
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
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
                    className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70 sm:col-span-2 lg:col-span-1"
                >
                    Add Job
                </button>
            </form>

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <div className="space-y-3 xl:hidden">
                {jobs.map((job) => {
                    const draft = getDraft(job);
                    const isDirty = isDraftDirty(job);

                    return (
                        <article key={job.id} className="rounded-md border border-[#e5e7eb] bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-[#0f172a]">{job.id}</p>
                                {isDirty ? (
                                    <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b45309]">Unsaved</span>
                                ) : (
                                    <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#166534]">Saved</span>
                                )}
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Customer</span>
                                    <input
                                        value={draft.customerName}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: { ...draft, customerName: event.target.value },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Site</span>
                                    <input
                                        value={draft.site}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: { ...draft, site: event.target.value },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Priority</span>
                                    <select
                                        value={draft.priority}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    priority: event.target.value as JobQueuePriority,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    >
                                        {PRIORITIES.map((entry) => (
                                            <option key={entry} value={entry}>
                                                {entry}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Status</span>
                                    <select
                                        value={draft.status}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    status: event.target.value as JobQueueStatus,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    >
                                        {STATUSES.map((entry) => (
                                            <option key={entry} value={entry}>
                                                {entry}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Schedule</span>
                                    <input
                                        type="datetime-local"
                                        value={draft.scheduledFor}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    scheduledFor: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">ETA Minutes</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={draft.etaMinutes}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    etaMinutes: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                            </div>

                            <p className="mt-3 text-[11px] text-[#475569]">
                                Required SKUs: {job.requiredSkus.length > 0 ? job.requiredSkus.join(', ') : 'None'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={isPending || !isDirty}
                                    className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs disabled:opacity-50"
                                    onClick={async () => {
                                        await runMutation({
                                            method: 'PATCH',
                                            headers: { 'content-type': 'application/json' },
                                            body: JSON.stringify({
                                                id: job.id,
                                                customerName: draft.customerName,
                                                site: draft.site,
                                                priority: draft.priority,
                                                status: draft.status,
                                                scheduledFor: draft.scheduledFor ? new Date(draft.scheduledFor).toISOString() : null,
                                                etaMinutes: draft.etaMinutes === '' ? null : Number(draft.etaMinutes),
                                            }),
                                        });
                                    }}
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    className="rounded border border-[#bae6fd] bg-[#eff6ff] px-2 py-1 text-xs text-[#1d4ed8]"
                                    onClick={() => setActiveDialogJobId(job.id)}
                                >
                                    Inventory
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPendingDeleteJobId(job.id)}
                                    className="rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs text-[#991b1b]"
                                    disabled={isPending}
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="hidden gap-4 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <article className="overflow-hidden rounded-md border border-[#e5e7eb]">
                    <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569]">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Job</th>
                                <th className="px-3 py-2 font-semibold">Customer / Site</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                                <th className="px-3 py-2 font-semibold">Priority</th>
                                <th className="px-3 py-2 font-semibold">SKUs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] bg-white text-[#334155]">
                            {jobs.map((job) => {
                                const isSelected = job.id === selectedJobId;
                                const isDirty = isDraftDirty(job);

                                return (
                                    <tr
                                        key={job.id}
                                        className={`cursor-pointer ${isSelected ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'}`}
                                        onClick={() => setSelectedJobId(job.id)}
                                    >
                                        <td className="px-3 py-3">
                                            <p className="font-semibold text-[#0f172a]">{job.id}</p>
                                            <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${isDirty ? 'text-[#b45309]' : 'text-[#166534]'}`}>
                                                {isDirty ? 'Unsaved' : 'Saved'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium text-[#0f172a]">{job.customerName}</p>
                                            <p className="truncate text-[11px] text-[#475569]">{job.site}</p>
                                        </td>
                                        <td className="px-3 py-3 uppercase text-[11px]">{job.status}</td>
                                        <td className="px-3 py-3 uppercase text-[11px]">{job.priority}</td>
                                        <td className="px-3 py-3 text-[11px] text-[#475569]">{job.requiredSkus.length}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </article>

                <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
                    {(() => {
                        const selectedJob = selectedJobId ? jobs.find((job) => job.id === selectedJobId) ?? null : null;

                        if (!selectedJob) {
                            return <p className="text-xs text-[#64748b]">Select a job to view and edit details.</p>;
                        }

                        const draft = getDraft(selectedJob);
                        const isDirty = isDraftDirty(selectedJob);

                        return (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#0f172a]">{selectedJob.id}</h3>
                                        <p className="text-xs text-[#475569]">Detailed editing and inventory actions for this job.</p>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isDirty ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                                        {isDirty ? 'Unsaved changes' : 'Saved'}
                                    </span>
                                </div>

                                <div className="grid gap-2">
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Customer</span>
                                        <input
                                            value={draft.customerName}
                                            onChange={(event) =>
                                                setDrafts((current) => ({
                                                    ...current,
                                                    [selectedJob.id]: { ...draft, customerName: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Site</span>
                                        <input
                                            value={draft.site}
                                            onChange={(event) =>
                                                setDrafts((current) => ({
                                                    ...current,
                                                    [selectedJob.id]: { ...draft, site: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Priority</span>
                                            <select
                                                value={draft.priority}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            priority: event.target.value as JobQueuePriority,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            >
                                                {PRIORITIES.map((entry) => (
                                                    <option key={entry} value={entry}>
                                                        {entry}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Status</span>
                                            <select
                                                value={draft.status}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            status: event.target.value as JobQueueStatus,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            >
                                                {STATUSES.map((entry) => (
                                                    <option key={entry} value={entry}>
                                                        {entry}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Schedule</span>
                                            <input
                                                type="datetime-local"
                                                value={draft.scheduledFor}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            scheduledFor: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">ETA Minutes</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={draft.etaMinutes}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            etaMinutes: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <p className="text-[11px] text-[#475569]">
                                    Required SKUs: {selectedJob.requiredSkus.length > 0 ? selectedJob.requiredSkus.join(', ') : 'None'}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={isPending || !isDirty}
                                        className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs disabled:opacity-50"
                                        onClick={async () => {
                                            await runMutation({
                                                method: 'PATCH',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({
                                                    id: selectedJob.id,
                                                    customerName: draft.customerName,
                                                    site: draft.site,
                                                    priority: draft.priority,
                                                    status: draft.status,
                                                    scheduledFor: draft.scheduledFor ? new Date(draft.scheduledFor).toISOString() : null,
                                                    etaMinutes: draft.etaMinutes === '' ? null : Number(draft.etaMinutes),
                                                }),
                                            });
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        className="rounded border border-[#bae6fd] bg-[#eff6ff] px-2 py-1 text-xs text-[#1d4ed8]"
                                        onClick={() => setActiveDialogJobId(selectedJob.id)}
                                    >
                                        Inventory
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPendingDeleteJobId(selectedJob.id)}
                                        className="rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs text-[#991b1b]"
                                        disabled={isPending}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </article>
            </div>

            {activeDialogJobId ? (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
                    <article className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-md bg-white p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Inventory Actions for {activeDialogJobId}</h3>
                            <button
                                type="button"
                                className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                onClick={() => setActiveDialogJobId(null)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 grid gap-2 rounded border border-[#e2e8f0] bg-white p-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Reserve Existing Inventory</p>
                                <label className="space-y-1">
                                    <span className="text-[11px] text-[#475569]">Lookup Warehoused Parts</span>
                                    <input
                                        value={lookupQuery[activeDialogJobId] ?? ''}
                                        onChange={(event) =>
                                            setLookupQuery((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                        }
                                        placeholder="Search SKU, item, or location"
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <div className="max-h-36 overflow-auto rounded border border-[#e5e7eb] bg-[#f8fafc]">
                                    {(() => {
                                        const query = (lookupQuery[activeDialogJobId] ?? '').trim().toLowerCase();
                                        const matches = sortedInventoryLookupParts
                                            .filter((part) => {
                                                if (!query) {
                                                    return true;
                                                }

                                                return [part.sku, part.itemName, part.location].join(' ').toLowerCase().includes(query);
                                            })
                                            .slice(0, 8);

                                        if (matches.length === 0) {
                                            return <p className="px-2 py-2 text-xs text-[#64748b]">No warehoused parts found for this search.</p>;
                                        }

                                        return matches.map((part) => (
                                            <button
                                                key={`${activeDialogJobId}-${part.id}`}
                                                type="button"
                                                className="flex w-full items-center justify-between border-b border-[#e5e7eb] px-2 py-1 text-left text-xs last:border-b-0 hover:bg-white"
                                                onClick={() => {
                                                    setReserveSku((current) => ({ ...current, [activeDialogJobId]: part.sku }));
                                                    setLookupQuery((current) => ({ ...current, [activeDialogJobId]: part.sku }));
                                                }}
                                            >
                                                <span>
                                                    <span className="font-semibold text-[#0f172a]">{part.sku}</span>
                                                    <span className="ml-2 text-[#475569]">{part.itemName}</span>
                                                </span>
                                                <span className="text-[11px] text-[#64748b]">{part.location} · On hand {part.onHand}</span>
                                            </button>
                                        ));
                                    })()}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        value={reserveSku[activeDialogJobId] ?? ''}
                                        onChange={(event) =>
                                            setReserveSku((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                        }
                                        placeholder="SKU to reserve"
                                        className="min-w-40 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={reserveQty[activeDialogJobId] ?? 1}
                                        onChange={(event) =>
                                            setReserveQty((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))
                                        }
                                        className="w-24 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        className="rounded border border-[#86efac] bg-[#f0fdf4] px-2 py-1 text-xs text-[#166534]"
                                        onClick={async () => {
                                            await runMutation({
                                                method: 'PATCH',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({
                                                    id: activeDialogJobId,
                                                    inventoryAction: 'reserve',
                                                    inventorySku: reserveSku[activeDialogJobId] ?? '',
                                                    reserveQuantity: reserveQty[activeDialogJobId] ?? 1,
                                                }),
                                            });
                                        }}
                                    >
                                        Reserve
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Create Inventory Part</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">SKU</span>
                                        <input
                                            value={createSku[activeDialogJobId] ?? ''}
                                            onChange={(event) =>
                                                setCreateSku((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                            }
                                            placeholder="New SKU"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Item Name</span>
                                        <input
                                            value={createItemName[activeDialogJobId] ?? ''}
                                            onChange={(event) =>
                                                setCreateItemName((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                            }
                                            placeholder="Item name"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Location</span>
                                        <input
                                            value={createLocation[activeDialogJobId] ?? ''}
                                            onChange={(event) =>
                                                setCreateLocation((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                            }
                                            placeholder="Location"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Supplier</span>
                                        <input
                                            value={createSupplier[activeDialogJobId] ?? ''}
                                            onChange={(event) =>
                                                setCreateSupplier((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                            }
                                            placeholder="Supplier"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">On Hand</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={createOnHand[activeDialogJobId] ?? 0}
                                            onChange={(event) =>
                                                setCreateOnHand((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Reorder Point</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={createReorderPoint[activeDialogJobId] ?? 1}
                                            onChange={(event) =>
                                                setCreateReorderPoint((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Suggested Qty</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={createSuggestedOrderQty[activeDialogJobId] ?? 5}
                                            onChange={(event) =>
                                                setCreateSuggestedOrderQty((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Severity</span>
                                        <select
                                            value={createSeverity[activeDialogJobId] ?? 'medium'}
                                            onChange={(event) =>
                                                setCreateSeverity((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        >
                                            <option value="low">low</option>
                                            <option value="medium">medium</option>
                                            <option value="high">high</option>
                                            <option value="critical">critical</option>
                                        </select>
                                    </label>
                                    <input
                                        value={createServiceLines[activeDialogJobId] ?? 'mobile,shop'}
                                        onChange={(event) =>
                                            setCreateServiceLines((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                        }
                                        placeholder="Service lines"
                                        className="sm:col-span-2 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                    <input
                                        value={createNote[activeDialogJobId] ?? ''}
                                        onChange={(event) =>
                                            setCreateNote((current) => ({ ...current, [activeDialogJobId]: event.target.value }))
                                        }
                                        placeholder="Compatibility note"
                                        className="sm:col-span-2 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {SERVICE_LINE_OPTIONS.map((line) => (
                                        <span key={`${activeDialogJobId}-${line}`} className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#475569]">
                                            {line}
                                        </span>
                                    ))}
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        className="ml-auto rounded border border-[#bae6fd] bg-[#eff6ff] px-2 py-1 text-xs text-[#1d4ed8]"
                                        onClick={async () => {
                                            await runMutation({
                                                method: 'PATCH',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({
                                                    id: activeDialogJobId,
                                                    inventoryAction: 'create_inventory',
                                                    inventorySku: createSku[activeDialogJobId] ?? '',
                                                    createInventory: {
                                                        itemName: createItemName[activeDialogJobId] ?? '',
                                                        serviceLines: (createServiceLines[activeDialogJobId] ?? 'mobile,shop')
                                                            .split(',')
                                                            .map((entry) => entry.trim())
                                                            .filter(Boolean),
                                                        location: createLocation[activeDialogJobId] ?? '',
                                                        onHand: createOnHand[activeDialogJobId] ?? 0,
                                                        reorderPoint: createReorderPoint[activeDialogJobId] ?? 1,
                                                        suggestedOrderQty: createSuggestedOrderQty[activeDialogJobId] ?? 5,
                                                        supplier: createSupplier[activeDialogJobId] ?? '',
                                                        severity: createSeverity[activeDialogJobId] ?? 'medium',
                                                        compatibilityNote: createNote[activeDialogJobId] ?? '',
                                                    },
                                                }),
                                            });
                                        }}
                                    >
                                        Create Part
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            ) : null}

            {pendingDeleteJobId ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
                    <article className="w-full max-w-md rounded-md bg-white p-4">
                        <h3 className="text-sm font-semibold text-[#0f172a]">Delete Job?</h3>
                        <p className="mt-2 text-xs text-[#475569]">
                            This will remove {pendingDeleteJobId} from the job queue. This action cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                onClick={() => setPendingDeleteJobId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs font-semibold text-[#991b1b]"
                                disabled={isPending}
                                onClick={async () => {
                                    await runMutation({
                                        method: 'DELETE',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({ id: pendingDeleteJobId }),
                                    });
                                    setPendingDeleteJobId(null);
                                }}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </article>
                </div>
            ) : null}
        </section>
    );
}
