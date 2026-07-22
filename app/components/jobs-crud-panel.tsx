"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

const STATUSES: JobQueueStatus[] = ['queued', 'scheduled', 'in_progress', 'blocked', 'completed'];
const PRIORITIES: JobQueuePriority[] = ['low', 'normal', 'high', 'urgent'];
const SERVICE_LINE_OPTIONS = ['automotive', 'mobile', 'shop'] as const;

type InventoryLookupPart = {
    id: string;
    sku: string;
    itemName: string;
    location: string;
    onHand: number;
};

type JobDraft = {
    customerName: string;
    site: string;
    priority: JobQueuePriority;
    status: JobQueueStatus;
    scheduledFor: string;
    etaMinutes: string;
    followUpNote: string;
    quotePartEstimate: string;
    quoteLaborEstimate: string;
    quoteEstimatedMinutes: string;
    quoteEstimatedTotal: string;
    quoteNotes: string;
};

type CloseoutDraft = {
    actualPartCost: string;
    actualLaborCost: string;
    actualMinutes: string;
    finalTotal: string;
    resolutionNotes: string;
};

type AddJobWizardStep = 1 | 2 | 3;

function toNumber(value: string): number {
    return Number(value);
}

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

function quoteAsStrings(job: JobQueueItem) {
    return {
        quotePartEstimate: String(job.quote?.partEstimate ?? 0),
        quoteLaborEstimate: String(job.quote?.laborEstimate ?? 0),
        quoteEstimatedMinutes: String(job.quote?.estimatedMinutes ?? 0),
        quoteEstimatedTotal: String(job.quote?.estimatedTotal ?? 0),
        quoteNotes: job.quote?.notes ?? '',
    };
}

function closeoutAsDraft(job: JobQueueItem): CloseoutDraft {
    return {
        actualPartCost: job.closeout?.actualPartCost === null || job.closeout?.actualPartCost === undefined ? '' : String(job.closeout.actualPartCost),
        actualLaborCost: job.closeout?.actualLaborCost === null || job.closeout?.actualLaborCost === undefined ? '' : String(job.closeout.actualLaborCost),
        actualMinutes: job.closeout?.actualMinutes === null || job.closeout?.actualMinutes === undefined ? '' : String(job.closeout.actualMinutes),
        finalTotal: job.closeout?.finalTotal === null || job.closeout?.finalTotal === undefined ? '' : String(job.closeout.finalTotal),
        resolutionNotes: job.closeout?.resolutionNotes ?? '',
    };
}

export function JobsCrudPanel({ initialJobs, inventoryLookupParts }: { initialJobs: JobQueueItem[]; inventoryLookupParts: InventoryLookupPart[] }) {
    const router = useRouter();

    const [customerName, setCustomerName] = useState('');
    const [site, setSite] = useState('');
    const [priority, setPriority] = useState<JobQueuePriority>('normal');
    const [scheduledFor, setScheduledFor] = useState('');
    const [requiredSkus, setRequiredSkus] = useState('');
    const [followUpNote, setFollowUpNote] = useState('');
    const [quotePartEstimate, setQuotePartEstimate] = useState('0');
    const [quoteLaborEstimate, setQuoteLaborEstimate] = useState('0');
    const [quoteEstimatedMinutes, setQuoteEstimatedMinutes] = useState('0');
    const [quoteEstimatedTotal, setQuoteEstimatedTotal] = useState('0');
    const [quoteNotes, setQuoteNotes] = useState('');

    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState<AddJobWizardStep>(1);

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
    const [drafts, setDrafts] = useState<Record<string, JobDraft>>({});
    const [closeoutDrafts, setCloseoutDrafts] = useState<Record<string, CloseoutDraft>>({});

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

    function getDraft(job: JobQueueItem): JobDraft {
        return (
            drafts[job.id] ?? {
                customerName: job.customerName,
                site: job.site,
                priority: job.priority,
                status: job.status,
                scheduledFor: toLocalDateTime(job.scheduledFor),
                etaMinutes: job.etaMinutes === null ? '' : String(job.etaMinutes),
                followUpNote: job.followUpNote ?? '',
                ...quoteAsStrings(job),
            }
        );
    }

    function isDraftDirty(job: JobQueueItem): boolean {
        const draft = getDraft(job);

        return (
            draft.customerName !== job.customerName ||
            draft.site !== job.site ||
            draft.priority !== job.priority ||
            draft.status !== job.status ||
            draft.scheduledFor !== toLocalDateTime(job.scheduledFor) ||
            draft.etaMinutes !== (job.etaMinutes === null ? '' : String(job.etaMinutes)) ||
            draft.followUpNote !== (job.followUpNote ?? '') ||
            draft.quotePartEstimate !== String(job.quote?.partEstimate ?? 0) ||
            draft.quoteLaborEstimate !== String(job.quote?.laborEstimate ?? 0) ||
            draft.quoteEstimatedMinutes !== String(job.quote?.estimatedMinutes ?? 0) ||
            draft.quoteEstimatedTotal !== String(job.quote?.estimatedTotal ?? 0) ||
            draft.quoteNotes !== (job.quote?.notes ?? '')
        );
    }

    function getCloseoutDraft(job: JobQueueItem): CloseoutDraft {
        return closeoutDrafts[job.id] ?? closeoutAsDraft(job);
    }

    function canCloseOut(draft: CloseoutDraft): boolean {
        return (
            draft.actualPartCost !== '' &&
            draft.actualLaborCost !== '' &&
            draft.actualMinutes !== '' &&
            draft.finalTotal !== ''
        );
    }

    async function runMutation(request: RequestInit, endpoint = '/api/jobs') {
        setFeedback(null);
        setError(null);
        setIsPending(true);

        try {
            const response = await fetch(endpoint, request);
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

    function resetWizard() {
        setWizardStep(1);
        setCustomerName('');
        setSite('');
        setPriority('normal');
        setScheduledFor('');
        setRequiredSkus('');
        setFollowUpNote('');
        setQuotePartEstimate('0');
        setQuoteLaborEstimate('0');
        setQuoteEstimatedMinutes('0');
        setQuoteEstimatedTotal('0');
        setQuoteNotes('');
    }

    function canAdvanceFromStep(step: AddJobWizardStep): boolean {
        if (step === 1) {
            return customerName.trim().length > 0 && site.trim().length > 0;
        }

        if (step === 2) {
            return true;
        }

        return false;
    }

    return (
        <section className="space-y-4 rounded-md border border-[#e5e7eb] bg-white p-4">
            <div>
                <h2 className="text-sm font-semibold">Jobs Management</h2>
                <p className="mt-1 text-xs text-[#475569]">Capture quote intake at job creation, edit workflow fields inline, and close jobs with actual financial outcomes.</p>
            </div>

            <form
                className="space-y-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3"
                onSubmit={async (event) => {
                    event.preventDefault();

                    await runMutation({
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            customerName,
                            site,
                            priority,
                            scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
                            requiredSkus: requiredSkus
                                .split(',')
                                .map((entry) => entry.trim())
                                .filter(Boolean),
                            followUpNote,
                            quote: {
                                partEstimate: toNumber(quotePartEstimate),
                                laborEstimate: toNumber(quoteLaborEstimate),
                                estimatedMinutes: toNumber(quoteEstimatedMinutes),
                                estimatedTotal: toNumber(quoteEstimatedTotal),
                                notes: quoteNotes,
                            },
                        }),
                    });

                    resetWizard();
                }}
            >
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">Add Job Wizard</p>
                    <p className="text-[11px] text-[#64748b]">Step {wizardStep} of 3</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                    <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 1 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                        1. Customer + Site
                    </div>
                    <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 2 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                        2. Schedule + Parts
                    </div>
                    <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 3 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                        3. Quote + Submit
                    </div>
                </div>

                {wizardStep === 1 ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Customer</span>
                            <input
                                value={customerName}
                                onChange={(event) => setCustomerName(event.target.value)}
                                placeholder="Customer name"
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Site</span>
                            <input
                                value={site}
                                onChange={(event) => setSite(event.target.value)}
                                placeholder="Service address"
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Priority</span>
                            <select
                                value={priority}
                                onChange={(event) => setPriority(event.target.value as JobQueuePriority)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                            >
                                {PRIORITIES.map((entry) => (
                                    <option key={entry} value={entry}>
                                        {entry}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                ) : null}

                {wizardStep === 2 ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Scheduled For</span>
                            <input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={(event) => setScheduledFor(event.target.value)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                            />
                        </label>
                        <label className="space-y-1 sm:col-span-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Required SKUs</span>
                            <input
                                value={requiredSkus}
                                onChange={(event) => setRequiredSkus(event.target.value)}
                                placeholder="Comma separated (e.g. SKU-100, SKU-200)"
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                            />
                        </label>
                        <label className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Follow-up Note</span>
                            <input
                                value={followUpNote}
                                onChange={(event) => setFollowUpNote(event.target.value)}
                                placeholder="Call-ahead instructions or customer context"
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                            />
                        </label>
                    </div>
                ) : null}

                {wizardStep === 3 ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Part Estimate</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={quotePartEstimate}
                                onChange={(event) => setQuotePartEstimate(event.target.value)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Labor Estimate</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={quoteLaborEstimate}
                                onChange={(event) => setQuoteLaborEstimate(event.target.value)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Minutes</span>
                            <input
                                type="number"
                                min={0}
                                value={quoteEstimatedMinutes}
                                onChange={(event) => setQuoteEstimatedMinutes(event.target.value)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Total</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={quoteEstimatedTotal}
                                onChange={(event) => setQuoteEstimatedTotal(event.target.value)}
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                required
                            />
                        </label>
                        <label className="space-y-1 sm:col-span-2 lg:col-span-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Quote Notes</span>
                            <input
                                value={quoteNotes}
                                onChange={(event) => setQuoteNotes(event.target.value)}
                                placeholder="Scope, exclusions, or customer notes"
                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                            />
                        </label>
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        className="rounded border border-[#cbd5e1] bg-white px-3 py-2 text-xs"
                        disabled={wizardStep === 1 || isPending}
                        onClick={() => setWizardStep((current) => (current > 1 ? ((current - 1) as AddJobWizardStep) : current))}
                    >
                        Back
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="rounded border border-[#cbd5e1] bg-white px-3 py-2 text-xs"
                            disabled={isPending}
                            onClick={resetWizard}
                        >
                            Reset
                        </button>
                        {wizardStep < 3 ? (
                            <button
                                type="button"
                                disabled={isPending || !canAdvanceFromStep(wizardStep)}
                                className="rounded border border-[#0f766e] bg-[#ecfeff] px-3 py-2 text-xs font-semibold text-[#0f766e] disabled:opacity-70"
                                onClick={() => setWizardStep((current) => (current < 3 ? ((current + 1) as AddJobWizardStep) : current))}
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isPending}
                                className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                            >
                                Create Job
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <div className="space-y-3 xl:hidden">
                {jobs.map((job) => {
                    const draft = getDraft(job);
                    const isDirty = isDraftDirty(job);
                    const closeoutDraft = getCloseoutDraft(job);

                    return (
                        <article key={job.id} className="rounded-md border border-[#e5e7eb] bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-[#0f172a]">{job.id}</p>
                                <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3730a3]">{job.status}</span>
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
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Part Estimate</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={draft.quotePartEstimate}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    quotePartEstimate: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Labor Estimate</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={draft.quoteLaborEstimate}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    quoteLaborEstimate: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Minutes</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={draft.quoteEstimatedMinutes}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    quoteEstimatedMinutes: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Total</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={draft.quoteEstimatedTotal}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    quoteEstimatedTotal: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1 sm:col-span-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Quote Notes</span>
                                    <input
                                        value={draft.quoteNotes}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    quoteNotes: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                                <label className="space-y-1 sm:col-span-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Follow-up Note</span>
                                    <input
                                        value={draft.followUpNote}
                                        onChange={(event) =>
                                            setDrafts((current) => ({
                                                ...current,
                                                [job.id]: {
                                                    ...draft,
                                                    followUpNote: event.target.value,
                                                },
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                </label>
                            </div>

                            <p className="mt-3 text-[11px] text-[#475569]">Required SKUs: {job.requiredSkus.length > 0 ? job.requiredSkus.join(', ') : 'None'}</p>

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
                                                followUpNote: draft.followUpNote,
                                                quote: {
                                                    partEstimate: Number(draft.quotePartEstimate),
                                                    laborEstimate: Number(draft.quoteLaborEstimate),
                                                    estimatedMinutes: Number(draft.quoteEstimatedMinutes),
                                                    estimatedTotal: Number(draft.quoteEstimatedTotal),
                                                    notes: draft.quoteNotes,
                                                },
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

                            <div className="mt-4 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#334155]">Job Closeout</h4>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Actual Part Cost</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={closeoutDraft.actualPartCost}
                                            onChange={(event) =>
                                                setCloseoutDrafts((current) => ({
                                                    ...current,
                                                    [job.id]: { ...closeoutDraft, actualPartCost: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Actual Labor Cost</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={closeoutDraft.actualLaborCost}
                                            onChange={(event) =>
                                                setCloseoutDrafts((current) => ({
                                                    ...current,
                                                    [job.id]: { ...closeoutDraft, actualLaborCost: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Actual Minutes</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={closeoutDraft.actualMinutes}
                                            onChange={(event) =>
                                                setCloseoutDrafts((current) => ({
                                                    ...current,
                                                    [job.id]: { ...closeoutDraft, actualMinutes: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Final Total</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={closeoutDraft.finalTotal}
                                            onChange={(event) =>
                                                setCloseoutDrafts((current) => ({
                                                    ...current,
                                                    [job.id]: { ...closeoutDraft, finalTotal: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1 sm:col-span-2">
                                        <span className="text-[11px] text-[#475569]">Resolution Notes</span>
                                        <input
                                            value={closeoutDraft.resolutionNotes}
                                            onChange={(event) =>
                                                setCloseoutDrafts((current) => ({
                                                    ...current,
                                                    [job.id]: { ...closeoutDraft, resolutionNotes: event.target.value },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-[11px] text-[#475569]">
                                        {job.closeout?.closedOutAt ? `Closed out at ${new Date(job.closeout.closedOutAt).toLocaleString()}` : 'Not closed out yet'}
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isPending || !canCloseOut(closeoutDraft)}
                                        className="rounded border border-[#86efac] bg-[#f0fdf4] px-2 py-1 text-xs font-semibold text-[#166534] disabled:opacity-50"
                                        onClick={async () => {
                                            await runMutation(
                                                {
                                                    method: 'POST',
                                                    headers: { 'content-type': 'application/json' },
                                                    body: JSON.stringify({
                                                        id: job.id,
                                                        actualPartCost: Number(closeoutDraft.actualPartCost),
                                                        actualLaborCost: Number(closeoutDraft.actualLaborCost),
                                                        actualMinutes: Number(closeoutDraft.actualMinutes),
                                                        finalTotal: Number(closeoutDraft.finalTotal),
                                                        resolutionNotes: closeoutDraft.resolutionNotes,
                                                    }),
                                                },
                                                '/api/jobs/closeout',
                                            );
                                        }}
                                    >
                                        Close Out Job
                                    </button>
                                </div>
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
                        const closeoutDraft = getCloseoutDraft(selectedJob);

                        return (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#0f172a]">{selectedJob.id}</h3>
                                        <p className="text-xs text-[#475569]">Full job details, quote economics, and closeout controls.</p>
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
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Part Estimate</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={draft.quotePartEstimate}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            quotePartEstimate: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Labor Estimate</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={draft.quoteLaborEstimate}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            quoteLaborEstimate: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Minutes</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={draft.quoteEstimatedMinutes}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            quoteEstimatedMinutes: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Total</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={draft.quoteEstimatedTotal}
                                                onChange={(event) =>
                                                    setDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: {
                                                            ...draft,
                                                            quoteEstimatedTotal: event.target.value,
                                                        },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Quote Notes</span>
                                        <input
                                            value={draft.quoteNotes}
                                            onChange={(event) =>
                                                setDrafts((current) => ({
                                                    ...current,
                                                    [selectedJob.id]: {
                                                        ...draft,
                                                        quoteNotes: event.target.value,
                                                    },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Follow-up Note</span>
                                        <input
                                            value={draft.followUpNote}
                                            onChange={(event) =>
                                                setDrafts((current) => ({
                                                    ...current,
                                                    [selectedJob.id]: {
                                                        ...draft,
                                                        followUpNote: event.target.value,
                                                    },
                                                }))
                                            }
                                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                </div>

                                <p className="text-[11px] text-[#475569]">Required SKUs: {selectedJob.requiredSkus.length > 0 ? selectedJob.requiredSkus.join(', ') : 'None'}</p>

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
                                                    followUpNote: draft.followUpNote,
                                                    quote: {
                                                        partEstimate: Number(draft.quotePartEstimate),
                                                        laborEstimate: Number(draft.quoteLaborEstimate),
                                                        estimatedMinutes: Number(draft.quoteEstimatedMinutes),
                                                        estimatedTotal: Number(draft.quoteEstimatedTotal),
                                                        notes: draft.quoteNotes,
                                                    },
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

                                <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#334155]">Job Closeout</h4>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <label className="space-y-1">
                                            <span className="text-[11px] text-[#475569]">Actual Part Cost</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={closeoutDraft.actualPartCost}
                                                onChange={(event) =>
                                                    setCloseoutDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: { ...closeoutDraft, actualPartCost: event.target.value },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] text-[#475569]">Actual Labor Cost</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={closeoutDraft.actualLaborCost}
                                                onChange={(event) =>
                                                    setCloseoutDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: { ...closeoutDraft, actualLaborCost: event.target.value },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] text-[#475569]">Actual Minutes</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={closeoutDraft.actualMinutes}
                                                onChange={(event) =>
                                                    setCloseoutDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: { ...closeoutDraft, actualMinutes: event.target.value },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] text-[#475569]">Final Total</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={closeoutDraft.finalTotal}
                                                onChange={(event) =>
                                                    setCloseoutDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: { ...closeoutDraft, finalTotal: event.target.value },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                        <label className="space-y-1 sm:col-span-2">
                                            <span className="text-[11px] text-[#475569]">Resolution Notes</span>
                                            <input
                                                value={closeoutDraft.resolutionNotes}
                                                onChange={(event) =>
                                                    setCloseoutDrafts((current) => ({
                                                        ...current,
                                                        [selectedJob.id]: { ...closeoutDraft, resolutionNotes: event.target.value },
                                                    }))
                                                }
                                                className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                            />
                                        </label>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <p className="text-[11px] text-[#475569]">
                                            {selectedJob.closeout?.closedOutAt ? `Closed out at ${new Date(selectedJob.closeout.closedOutAt).toLocaleString()}` : 'Not closed out yet'}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isPending || !canCloseOut(closeoutDraft)}
                                            className="rounded border border-[#86efac] bg-[#f0fdf4] px-2 py-1 text-xs font-semibold text-[#166534] disabled:opacity-50"
                                            onClick={async () => {
                                                await runMutation(
                                                    {
                                                        method: 'POST',
                                                        headers: { 'content-type': 'application/json' },
                                                        body: JSON.stringify({
                                                            id: selectedJob.id,
                                                            actualPartCost: Number(closeoutDraft.actualPartCost),
                                                            actualLaborCost: Number(closeoutDraft.actualLaborCost),
                                                            actualMinutes: Number(closeoutDraft.actualMinutes),
                                                            finalTotal: Number(closeoutDraft.finalTotal),
                                                            resolutionNotes: closeoutDraft.resolutionNotes,
                                                        }),
                                                    },
                                                    '/api/jobs/closeout',
                                                );
                                            }}
                                        >
                                            Close Out Job
                                        </button>
                                    </div>
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
                                        onChange={(event) => setLookupQuery((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
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
                                        onChange={(event) => setReserveSku((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
                                        placeholder="SKU to reserve"
                                        className="min-w-40 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Reserve Quantity</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={reserveQty[activeDialogJobId] ?? 1}
                                            onChange={(event) => setReserveQty((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))}
                                            className="w-24 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
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
                                            onChange={(event) => setCreateSku((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
                                            placeholder="New SKU"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Item Name</span>
                                        <input
                                            value={createItemName[activeDialogJobId] ?? ''}
                                            onChange={(event) => setCreateItemName((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
                                            placeholder="Item name"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Location</span>
                                        <input
                                            value={createLocation[activeDialogJobId] ?? ''}
                                            onChange={(event) => setCreateLocation((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
                                            placeholder="Location"
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Supplier</span>
                                        <input
                                            value={createSupplier[activeDialogJobId] ?? ''}
                                            onChange={(event) => setCreateSupplier((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
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
                                            onChange={(event) => setCreateOnHand((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))}
                                            className="rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] text-[#475569]">Reorder Point</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={createReorderPoint[activeDialogJobId] ?? 1}
                                            onChange={(event) => setCreateReorderPoint((current) => ({ ...current, [activeDialogJobId]: Number(event.target.value) }))}
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
                                            onChange={(event) => setCreateSeverity((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
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
                                        onChange={(event) => setCreateServiceLines((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
                                        placeholder="Service lines"
                                        className="sm:col-span-2 rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                    />
                                    <input
                                        value={createNote[activeDialogJobId] ?? ''}
                                        onChange={(event) => setCreateNote((current) => ({ ...current, [activeDialogJobId]: event.target.value }))}
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
                        <p className="mt-2 text-xs text-[#475569]">This will remove {pendingDeleteJobId} from the job queue. This action cannot be undone.</p>
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
