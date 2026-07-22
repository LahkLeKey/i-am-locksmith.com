"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { InventoryActionCard } from '@/app/components/inventory-shared';

import 'react-quill-new/dist/quill.snow.css';

import type { JobQueueItem, JobQueuePriority, JobQueueStatus } from '@/lib/dashboard/types';

const STATUSES: JobQueueStatus[] = ['queued', 'scheduled', 'in_progress', 'blocked'];
const PRIORITIES: JobQueuePriority[] = ['low', 'normal', 'high', 'urgent'];

type InventoryLookupPart = {
    id: string;
    sku: string;
    itemName: string;
    estimatedUnitCost: number;
    location: string;
    onHand: number;
};

type TechnicianOption = {
    id: string;
    fullName: string;
    hourlyRate: number;
    availabilityStatus: 'available' | 'busy' | 'off_shift';
    isActive: boolean;
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

type AddJobWizardStep = 1 | 2 | 3 | 4;
type ActiveJobWizardStep = 1 | 2 | 3 | 4 | 5;

type TimeClockDraft = {
    notes: string;
    actionNote: string;
};

type JobsMutationOptions = {
    optimisticJobs?: (current: JobQueueItem[]) => JobQueueItem[];
};

type RichTextMarkdownFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minRows?: number;
};

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const ACTIVE_WIZARD_STEPS: Array<{ step: ActiveJobWizardStep; label: string }> = [
    { step: 1, label: 'Core' },
    { step: 2, label: 'Quote' },
    { step: 3, label: 'Time Clock' },
    { step: 4, label: 'Inventory' },
    { step: 5, label: 'Closeout' },
];

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

function buildAutoCloseoutDraft(job: JobQueueItem): CloseoutDraft {
    const quote = job.quote;
    const trackedMinutes = job.timeClock?.elapsedMinutes ?? 0;
    const laborRate = job.assignedTechnician?.laborRate ?? 0;
    const actualMinutes = job.closeout?.actualMinutes ?? trackedMinutes;
    const actualPartCost = job.closeout?.actualPartCost ?? quote?.partEstimate ?? 0;
    const actualLaborCost = job.closeout?.actualLaborCost ?? Number(((actualMinutes / 60) * laborRate).toFixed(2));
    const finalTotal = job.closeout?.finalTotal ?? Number((actualPartCost + actualLaborCost).toFixed(2));

    return {
        actualPartCost: String(actualPartCost),
        actualLaborCost: String(actualLaborCost),
        actualMinutes: String(actualMinutes),
        finalTotal: String(finalTotal),
        resolutionNotes: job.closeout?.resolutionNotes ?? '',
    };
}

function closeoutAsDraft(job: JobQueueItem): CloseoutDraft {
    if (!job.closeout || (job.closeout.actualPartCost === null && job.closeout.actualLaborCost === null && job.closeout.actualMinutes === null && job.closeout.finalTotal === null)) {
        return buildAutoCloseoutDraft(job);
    }

    return {
        actualPartCost: job.closeout?.actualPartCost === null || job.closeout?.actualPartCost === undefined ? '' : String(job.closeout.actualPartCost),
        actualLaborCost: job.closeout?.actualLaborCost === null || job.closeout?.actualLaborCost === undefined ? '' : String(job.closeout.actualLaborCost),
        actualMinutes: job.closeout?.actualMinutes === null || job.closeout?.actualMinutes === undefined ? '' : String(job.closeout.actualMinutes),
        finalTotal: job.closeout?.finalTotal === null || job.closeout?.finalTotal === undefined ? '' : String(job.closeout.finalTotal),
        resolutionNotes: job.closeout?.resolutionNotes ?? '',
    };
}

function timeClockAsDraft(job: JobQueueItem): TimeClockDraft {
    return {
        notes: job.timeClock?.notes ?? '',
        actionNote: '',
    };
}

function upsertJob(current: JobQueueItem[], nextJob: JobQueueItem): JobQueueItem[] {
    const index = current.findIndex((entry) => entry.id === nextJob.id);
    if (index === -1) {
        return [nextJob, ...current];
    }

    const next = [...current];
    next[index] = nextJob;
    return next;
}

function computeElapsedMinutesFromLedger(
    ledger: Array<{ action: 'clock_in' | 'clock_out'; at: string }>,
    breakMinutes: number,
): number {
    let openClockInAt: number | null = null;
    let totalMs = 0;

    for (const entry of ledger) {
        const at = Date.parse(entry.at);
        if (!Number.isFinite(at)) {
            continue;
        }

        if (entry.action === 'clock_in') {
            openClockInAt = at;
            continue;
        }

        if (entry.action === 'clock_out' && openClockInAt !== null) {
            totalMs += Math.max(0, at - openClockInAt);
            openClockInAt = null;
        }
    }

    if (openClockInAt !== null) {
        totalMs += Math.max(0, Date.now() - openClockInAt);
    }

    const totalMinutes = Math.floor(totalMs / 60000);
    return Math.max(0, totalMinutes - breakMinutes);
}

function markdownToHtml(markdown: string): string {
    if (!markdown.trim()) {
        return '<p></p>';
    }

    return marked.parse(markdown) as string;
}

const QUILL_MODULES = {
    toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, false] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean'],
    ],
};

const QUILL_FORMATS = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'blockquote',
    'code-block',
    'link',
];

function RichTextMarkdownField({
    label,
    value,
    onChange,
    placeholder,
    minRows = 4,
}: RichTextMarkdownFieldProps) {
    const turndown = useMemo(() => {
        const service = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
        });
        service.use(gfm);
        return service;
    }, []);

    const [htmlValue, setHtmlValue] = useState(() => markdownToHtml(value));

    useEffect(() => {
        setHtmlValue(markdownToHtml(value));
    }, [value]);

    return (
        <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">{label}</span>
            <div className="rounded-md border border-[#d1d5db] bg-white">
                <ReactQuill
                    theme="snow"
                    value={htmlValue}
                    onChange={(html) => {
                        setHtmlValue(html);
                        const markdown = turndown.turndown(html || '<p></p>');
                        onChange(markdown);
                    }}
                    placeholder={placeholder}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    style={{ minHeight: `${Math.max(120, minRows * 22)}px` }}
                />
            </div>
            <p className="text-[11px] text-[#64748b]">Saved as markdown.</p>
        </label>
    );
}

export function JobsCrudPanel({
    initialJobs,
    inventoryLookupParts,
    technicians,
}: {
    initialJobs: JobQueueItem[];
    inventoryLookupParts: InventoryLookupPart[];
    technicians: TechnicianOption[];
}) {
    const router = useRouter();
    const [jobsState, setJobsState] = useState<JobQueueItem[]>(initialJobs);

    const [customerName, setCustomerName] = useState('');
    const [site, setSite] = useState('');
    const [priority, setPriority] = useState<JobQueuePriority>('normal');
    const [scheduledFor, setScheduledFor] = useState('');
    const [requiredSkus, setRequiredSkus] = useState<string[]>([]);
    const [partsLookupQuery, setPartsLookupQuery] = useState('');
    const [followUpNote, setFollowUpNote] = useState('');
    const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
    const [estimatedMinutes, setEstimatedMinutes] = useState('60');
    const [quoteNotes, setQuoteNotes] = useState('');

    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState<AddJobWizardStep>(1);
    const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
    const [isActiveWorkflowOpen, setIsActiveWorkflowOpen] = useState(false);

    const [reserveSku, setReserveSku] = useState<Record<string, string>>({});
    const [reserveQty, setReserveQty] = useState<Record<string, number>>({});
    const [createSku, setCreateSku] = useState<Record<string, string>>({});
    const [createItemName, setCreateItemName] = useState<Record<string, string>>({});
    const [createLocation, setCreateLocation] = useState<Record<string, string>>({});
    const [createSupplier, setCreateSupplier] = useState<Record<string, string>>({});
    const [createNote, setCreateNote] = useState<Record<string, string>>({});
    const [createServiceLines, setCreateServiceLines] = useState<Record<string, string[]>>({});
    const [createServiceLineInput, setCreateServiceLineInput] = useState<Record<string, string>>({});
    const [createOnHand, setCreateOnHand] = useState<Record<string, number>>({});
    const [createReorderPoint, setCreateReorderPoint] = useState<Record<string, number>>({});
    const [createSuggestedOrderQty, setCreateSuggestedOrderQty] = useState<Record<string, number>>({});
    const [createSeverity, setCreateSeverity] = useState<Record<string, string>>({});

    const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobs[0]?.id ?? null);
    const [lookupQuery, setLookupQuery] = useState<Record<string, string>>({});
    const [drafts, setDrafts] = useState<Record<string, JobDraft>>({});
    const [closeoutDrafts, setCloseoutDrafts] = useState<Record<string, CloseoutDraft>>({});
    const [timeClockDrafts, setTimeClockDrafts] = useState<Record<string, TimeClockDraft>>({});
    const [activeJobWizardStep, setActiveJobWizardStep] = useState<ActiveJobWizardStep>(1);

    useEffect(() => {
        setJobsState(initialJobs);
    }, [initialJobs]);

    const jobs = useMemo(() => [...jobsState].sort((left, right) => right.id.localeCompare(left.id)), [jobsState]);
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
    const selectableTechnicians = useMemo(
        () => technicians.filter((entry) => entry.isActive),
        [technicians],
    );
    const selectedTechnician = useMemo(
        () => selectableTechnicians.find((entry) => entry.id === assignedTechnicianId) ?? null,
        [assignedTechnicianId, selectableTechnicians],
    );
    const quoteLaborEstimate = useMemo(() => {
        const minutes = Number(estimatedMinutes);
        if (!selectedTechnician || !Number.isFinite(minutes) || minutes < 0) {
            return 0;
        }

        return Number(((minutes / 60) * selectedTechnician.hourlyRate).toFixed(2));
    }, [estimatedMinutes, selectedTechnician]);
    const quotePartEstimate = useMemo(
        () =>
            Number(
                requiredSkus
                    .reduce((total, sku) => {
                        const matched = sortedInventoryLookupParts.find((part) => part.sku === sku);
                        if (!matched) {
                            return total;
                        }

                        return total + Number(matched.estimatedUnitCost);
                    }, 0)
                    .toFixed(2),
            ),
        [requiredSkus, sortedInventoryLookupParts],
    );
    const quoteEstimatedTotal = useMemo(() => {
        return Number((quotePartEstimate + quoteLaborEstimate).toFixed(2));
    }, [quotePartEstimate, quoteLaborEstimate]);
    const filteredPartsForWizard = useMemo(() => {
        const query = partsLookupQuery.trim().toLowerCase();
        return sortedInventoryLookupParts.filter((part) => {
            if (!query) {
                return true;
            }

            return [part.sku, part.itemName, part.location].join(' ').toLowerCase().includes(query);
        });
    }, [partsLookupQuery, sortedInventoryLookupParts]);

    useEffect(() => {
        if (jobs.length === 0) {
            setSelectedJobId(null);
            return;
        }

        if (!selectedJobId || !jobs.some((job) => job.id === selectedJobId)) {
            setSelectedJobId(jobs[0].id);
        }
    }, [jobs, selectedJobId]);

    const selectedDesktopJob = useMemo(
        () => (selectedJobId ? jobs.find((job) => job.id === selectedJobId) ?? null : null),
        [jobs, selectedJobId],
    );

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

    function getTimeClockDraft(job: JobQueueItem): TimeClockDraft {
        return timeClockDrafts[job.id] ?? timeClockAsDraft(job);
    }

    function canCloseOut(draft: CloseoutDraft): boolean {
        return (
            draft.actualPartCost !== '' &&
            draft.actualLaborCost !== '' &&
            draft.actualMinutes !== '' &&
            draft.finalTotal !== ''
        );
    }

    async function runMutation(request: RequestInit, endpoint = '/api/jobs', options?: JobsMutationOptions) {
        setFeedback(null);
        setError(null);
        setIsPending(true);

        const previousJobs = jobsState;
        const rawBody = typeof request.body === 'string' ? request.body : null;
        const parsedBody = rawBody ? (() => {
            try {
                return JSON.parse(rawBody) as Record<string, unknown>;
            } catch {
                return null;
            }
        })() : null;

        if (options?.optimisticJobs) {
            setJobsState((current) => options.optimisticJobs!(current));
        }

        try {
            const response = await fetch(endpoint, request);
            const payload = await response.json();

            if (!response.ok) {
                if (options?.optimisticJobs) {
                    setJobsState(previousJobs);
                }
                setError(payload?.error ?? 'Request failed.');
                return false;
            }

            if (payload?.job) {
                setJobsState((current) => upsertJob(current, payload.job as JobQueueItem));
            } else if (request.method === 'DELETE' && parsedBody?.id && typeof parsedBody.id === 'string') {
                setJobsState((current) => current.filter((entry) => entry.id !== parsedBody.id));
            }

            setFeedback(payload?.message ?? 'Saved.');
            router.refresh();
            return true;
        } catch {
            if (options?.optimisticJobs) {
                setJobsState(previousJobs);
            }
            setError('Request failed. Please retry.');
            return false;
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
        setRequiredSkus([]);
        setPartsLookupQuery('');
        setFollowUpNote('');
        setAssignedTechnicianId('');
        setEstimatedMinutes('60');
        setQuoteNotes('');
        setIsAddWizardOpen(false);
    }

    function canAdvanceFromStep(step: AddJobWizardStep): boolean {
        if (step === 1) {
            return customerName.trim().length > 0 && site.trim().length > 0;
        }

        if (step === 2) {
            return true;
        }

        if (step === 3) {
            return assignedTechnicianId.trim().length > 0 && Number(estimatedMinutes) > 0;
        }

        return false;
    }

    return (
        <section className="space-y-6 overflow-x-hidden">
            <div>
                <h2 className="text-sm font-semibold text-[#0f172a]">Jobs Management</h2>
                <p className="mt-1 text-xs text-[#475569]">Capture quote intake at job creation, edit workflow fields inline, and close jobs with actual financial outcomes.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe3f0] bg-white px-4 py-4 shadow-sm">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">Add Job Wizard</p>
                    <p className="mt-1 text-sm text-[#475569]">Launch the full-screen intake flow for quote, scheduling, parts, and technician assignment.</p>
                </div>
                <button
                    type="button"
                    className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => setIsAddWizardOpen(true)}
                >
                    Open Intake Workflow
                </button>
            </div>

            {isAddWizardOpen ? (
                <div className="fixed inset-0 z-40 bg-[#f7f8fb]">
                    <form
                        className="flex min-h-screen flex-col overflow-y-auto px-4 py-6 sm:px-6"
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                            }
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-5">
                            <button
                                type="button"
                                aria-label="Close add job wizard"
                                className="absolute right-0 top-0 rounded-full border border-[#cbd5e1] bg-white px-3 py-1 text-sm font-semibold text-[#334155]"
                                onClick={resetWizard}
                            >
                                X
                            </button>
                            <div className="flex items-center justify-between gap-3 border-b border-[#dbe3f0] pb-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">Add Job Wizard</p>
                                    <p className="mt-1 text-[11px] text-[#64748b]">Step {wizardStep} of 4</p>
                                </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 1 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                                    1. Customer Details
                                </div>
                                <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 2 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                                    2. Schedule + Parts
                                </div>
                                <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 3 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                                    3. Technician + Labor
                                </div>
                                <div className={`rounded border px-2 py-1 text-[11px] ${wizardStep === 4 ? 'border-[#0f766e] bg-white text-[#0f766e]' : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'}`}>
                                    4. Review + Submit
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
                                <div className="space-y-3">
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
                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <RichTextMarkdownField
                                                label="Customer Note"
                                                value={followUpNote}
                                                onChange={setFollowUpNote}
                                                placeholder="Call-ahead instructions or customer context"
                                                minRows={5}
                                            />
                                        </div>
                                    </div>
                                    <div className="border-y border-[#dbe3f0] py-4">
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Parts Selector</span>
                                            <input
                                                value={partsLookupQuery}
                                                onChange={(event) => setPartsLookupQuery(event.target.value)}
                                                placeholder="Search SKU, part name, or location"
                                                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                            />
                                        </label>
                                        <div className="mt-2 max-h-44 overflow-auto rounded border border-[#e5e7eb]">
                                            {filteredPartsForWizard.length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-[#64748b]">No parts found for this search.</p>
                                            ) : (
                                                filteredPartsForWizard.slice(0, 30).map((part) => {
                                                    const isSelected = requiredSkus.includes(part.sku);
                                                    return (
                                                        <label key={part.id} className="flex cursor-pointer items-center justify-between border-b border-[#e5e7eb] px-3 py-2 text-xs last:border-b-0 hover:bg-[#f8fafc]">
                                                            <span className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(event) => {
                                                                        if (event.target.checked) {
                                                                            setRequiredSkus((current) => (current.includes(part.sku) ? current : [...current, part.sku]));
                                                                        } else {
                                                                            setRequiredSkus((current) => current.filter((sku) => sku !== part.sku));
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="font-semibold text-[#0f172a]">{part.sku}</span>
                                                                <span className="text-[#475569]">{part.itemName}</span>
                                                            </span>
                                                            <span className="text-[11px] text-[#64748b]">{part.location} · On hand {part.onHand}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <p className="mt-2 text-[11px] text-[#475569]">Selected parts: {requiredSkus.length > 0 ? requiredSkus.join(', ') : 'None selected'}</p>
                                    </div>
                                </div>
                            ) : null}

                            {wizardStep === 3 ? (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Technician</span>
                                        <select
                                            value={assignedTechnicianId}
                                            onChange={(event) => setAssignedTechnicianId(event.target.value)}
                                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                            required
                                        >
                                            <option value="">Select technician</option>
                                            {selectableTechnicians.map((entry) => (
                                                <option key={entry.id} value={entry.id}>
                                                    {entry.fullName} (${entry.hourlyRate}/hr) · {entry.availabilityStatus}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Estimated Minutes</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={estimatedMinutes}
                                            onChange={(event) => setEstimatedMinutes(event.target.value)}
                                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                            required
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Labor Estimate</span>
                                        <input
                                            value={`$${quoteLaborEstimate.toFixed(2)}`}
                                            className="w-full rounded-md border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-xs"
                                            readOnly
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Part Estimate (Auto)</span>
                                        <input
                                            value={`$${quotePartEstimate.toFixed(2)} from ${requiredSkus.length} selected part(s)`}
                                            className="w-full rounded-md border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-xs"
                                            readOnly
                                        />
                                    </label>
                                </div>
                            ) : null}

                            {wizardStep === 4 ? (
                                <div className="space-y-4 border-y border-[#dbe3f0] py-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">Job Cost Report</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <p className="text-xs text-[#475569]">Customer: <span className="font-semibold text-[#0f172a]">{customerName || '-'}</span></p>
                                        <p className="text-xs text-[#475569]">Site: <span className="font-semibold text-[#0f172a]">{site || '-'}</span></p>
                                        <p className="text-xs text-[#475569]">Technician: <span className="font-semibold text-[#0f172a]">{selectedTechnician?.fullName ?? 'Unassigned'}</span></p>
                                        <p className="text-xs text-[#475569]">Labor Rate: <span className="font-semibold text-[#0f172a]">{selectedTechnician ? `$${selectedTechnician.hourlyRate.toFixed(2)}/hr` : '-'}</span></p>
                                        <p className="text-xs text-[#475569]">Estimated Time: <span className="font-semibold text-[#0f172a]">{estimatedMinutes} minutes</span></p>
                                        <p className="text-xs text-[#475569]">Parts Needed: <span className="font-semibold text-[#0f172a]">{requiredSkus.length > 0 ? requiredSkus.join(', ') : 'None selected'}</span></p>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <div className="rounded border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs">
                                            <p className="text-[#475569]">Part Estimate</p>
                                            <p className="text-sm font-semibold text-[#0f172a]">${quotePartEstimate.toFixed(2)}</p>
                                        </div>
                                        <div className="rounded border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs">
                                            <p className="text-[#475569]">Labor Estimate</p>
                                            <p className="text-sm font-semibold text-[#0f172a]">${quoteLaborEstimate.toFixed(2)}</p>
                                        </div>
                                        <div className="rounded border border-[#d1fae5] bg-[#f0fdf4] p-2 text-xs">
                                            <p className="text-[#166534]">Total Estimate</p>
                                            <p className="text-sm font-semibold text-[#166534]">${quoteEstimatedTotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <RichTextMarkdownField
                                        label="Estimate Notes"
                                        value={quoteNotes}
                                        onChange={setQuoteNotes}
                                        placeholder="Scope, exclusions, or customer notes"
                                        minRows={5}
                                    />
                                </div>
                            ) : null}

                            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#dbe3f0] pt-4">
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
                                    {wizardStep < 4 ? (
                                        <button
                                            type="button"
                                            disabled={isPending || !canAdvanceFromStep(wizardStep)}
                                            className="rounded border border-[#0f766e] bg-[#ecfeff] px-3 py-2 text-xs font-semibold text-[#0f766e] disabled:opacity-70"
                                            onClick={() => setWizardStep((current) => (current < 4 ? ((current + 1) as AddJobWizardStep) : current))}
                                        >
                                            Next
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                                            onClick={async () => {
                                                const ok = await runMutation({
                                                    method: 'POST',
                                                    headers: { 'content-type': 'application/json' },
                                                    body: JSON.stringify({
                                                        customerName,
                                                        site,
                                                        priority,
                                                        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
                                                        requiredSkus,
                                                        followUpNote,
                                                        assignedTechnicianId: selectedTechnician?.id ?? null,
                                                        quote: {
                                                            partEstimate: quotePartEstimate,
                                                            laborEstimate: 0,
                                                            estimatedMinutes: toNumber(estimatedMinutes),
                                                            estimatedTotal: 0,
                                                            notes: quoteNotes,
                                                        },
                                                    }),
                                                });

                                                if (ok) {
                                                    resetWizard();
                                                }
                                            }}
                                        >
                                            Create Job
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            ) : null}

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <div className="space-y-3 xl:hidden">
                {jobs.map((job) => {
                    const isDirty = isDraftDirty(job);

                    return (
                        <article key={job.id} className="rounded-md border border-[#e5e7eb] bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-[#0f172a]">{job.id}</p>
                                <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3730a3]">{job.status}</span>
                            </div>
                            <p className="mt-3 text-sm text-[#475569]">{job.customerName} · {job.site}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-[#64748b]">{job.priority} priority · {job.requiredSkus.length} parts</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white"
                                    onClick={() => {
                                        setSelectedJobId(job.id);
                                        setActiveJobWizardStep(1);
                                        setIsActiveWorkflowOpen(true);
                                    }}
                                >
                                    Open Workflow
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    className="rounded border border-[#bae6fd] bg-[#eff6ff] px-3 py-2 text-xs text-[#1d4ed8]"
                                    onClick={() => {
                                        setSelectedJobId(job.id);
                                        setActiveJobWizardStep(4);
                                        setIsActiveWorkflowOpen(true);
                                    }}
                                >
                                    Inventory
                                </button>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${isDirty ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                                    {isDirty ? 'Unsaved changes' : 'Saved'}
                                </span>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="hidden xl:flex xl:flex-col xl:gap-5">
                <article className="overflow-hidden rounded-2xl border border-[#dbe3f0] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                    <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569]">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Job</th>
                                <th className="px-3 py-2 font-semibold">Customer / Site</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                                <th className="px-3 py-2 font-semibold">Priority</th>
                                <th className="px-3 py-2 font-semibold">Parts</th>
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
                                        onClick={() => {
                                            setSelectedJobId(job.id);
                                            setActiveJobWizardStep(1);
                                            setIsActiveWorkflowOpen(true);
                                        }}
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

                <article className="rounded-2xl border border-[#dbe3f0] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                    <p className="text-sm font-semibold text-[#0f172a]">Active Job Workflow</p>
                    <p className="mt-1 text-xs text-[#64748b]">
                        Select a job from the queue to open the full-screen active workflow.
                    </p>
                    {selectedDesktopJob ? (
                        <button
                            type="button"
                            className="mt-4 rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => setIsActiveWorkflowOpen(true)}
                        >
                            Open {selectedDesktopJob.id}
                        </button>
                    ) : null}
                </article>
            </div>

            {isActiveWorkflowOpen && selectedDesktopJob ? (
                <div className="fixed inset-0 z-40 bg-[#f7f8fb]">
                    <section className="flex min-h-screen flex-col overflow-y-auto px-4 py-6 sm:px-6">
                        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
                            {(() => {
                                const selectedJob = selectedDesktopJob;
                                const draft = getDraft(selectedJob);
                                const isDirty = isDraftDirty(selectedJob);
                                const closeoutDraft = getCloseoutDraft(selectedJob);
                                const timeClockDraft = getTimeClockDraft(selectedJob);

                                return (
                                    <div className="flex min-h-full flex-col gap-5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-sm font-semibold text-[#0f172a]">{selectedJob.id}</h3>
                                                <p className="text-xs text-[#475569]">Full job details, quote economics, and closeout controls.</p>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-[#dbe3f0] bg-white px-2 py-1">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isDirty ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                                                    {isDirty ? 'Unsaved changes' : 'Saved'}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label="Close active job workflow"
                                                    className="rounded-full border border-[#cbd5e1] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#334155]"
                                                    onClick={() => setIsActiveWorkflowOpen(false)}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                            {ACTIVE_WIZARD_STEPS.map((wizardStep) => {
                                                const isActive = wizardStep.step === activeJobWizardStep;
                                                return (
                                                    <button
                                                        key={wizardStep.step}
                                                        type="button"
                                                        aria-current={isActive ? 'step' : undefined}
                                                        className={`flex items-center gap-2 rounded border px-2 py-2 text-left ${isActive ? 'border-[#0f766e] bg-[#ecfeff]' : 'border-[#cbd5e1] bg-[#f8fafc]'}`}
                                                        onClick={() => setActiveJobWizardStep(wizardStep.step)}
                                                    >
                                                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${isActive ? 'bg-[#0f766e] text-white' : 'bg-white text-[#475569]'}`}>
                                                            {wizardStep.step}
                                                        </span>
                                                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? 'text-[#0f766e]' : 'text-[#475569]'}`}>
                                                            {wizardStep.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {activeJobWizardStep === 1 ? (
                                            <div className="grid gap-2 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
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
                                                <RichTextMarkdownField
                                                    label="Follow-up Note"
                                                    value={draft.followUpNote}
                                                    onChange={(next) =>
                                                        setDrafts((current) => ({
                                                            ...current,
                                                            [selectedJob.id]: {
                                                                ...draft,
                                                                followUpNote: next,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ) : null}

                                        {activeJobWizardStep === 2 ? (
                                            <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
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
                                                <RichTextMarkdownField
                                                    label="Quote Notes"
                                                    value={draft.quoteNotes}
                                                    onChange={(next) =>
                                                        setDrafts((current) => ({
                                                            ...current,
                                                            [selectedJob.id]: {
                                                                ...draft,
                                                                quoteNotes: next,
                                                            },
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ) : null}

                                        {activeJobWizardStep === 3 ? (
                                            <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <p className="text-xs text-[#475569]">Clock In: <span className="font-semibold text-[#0f172a]">{selectedJob.timeClock?.clockedInAt ? new Date(selectedJob.timeClock.clockedInAt).toLocaleString() : 'Not started'}</span></p>
                                                    <p className="text-xs text-[#475569]">Clock Out: <span className="font-semibold text-[#0f172a]">{selectedJob.timeClock?.clockedOutAt ? new Date(selectedJob.timeClock.clockedOutAt).toLocaleString() : 'In progress'}</span></p>
                                                    <p className="text-xs text-[#475569]">Tracked Minutes: <span className="font-semibold text-[#0f172a]">{selectedJob.timeClock?.elapsedMinutes ?? 0}</span></p>
                                                </div>
                                                <label className="space-y-1">
                                                    <span className="text-[11px] text-[#475569]">Clock Action Note</span>
                                                    <input
                                                        value={timeClockDraft.actionNote}
                                                        onChange={(event) =>
                                                            setTimeClockDrafts((current) => ({
                                                                ...current,
                                                                [selectedJob.id]: {
                                                                    ...timeClockDraft,
                                                                    actionNote: event.target.value,
                                                                },
                                                            }))
                                                        }
                                                        placeholder="Optional note for this clock action"
                                                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                                                    />
                                                </label>
                                                <RichTextMarkdownField
                                                    label="Time Clock Notes"
                                                    value={timeClockDraft.notes}
                                                    onChange={(next) =>
                                                        setTimeClockDrafts((current) => ({
                                                            ...current,
                                                            [selectedJob.id]: {
                                                                ...timeClockDraft,
                                                                notes: next,
                                                            },
                                                        }))
                                                    }
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        className="rounded border border-[#86efac] bg-[#f0fdf4] px-2 py-1 text-xs font-semibold text-[#166534] disabled:opacity-50"
                                                        onClick={async () => {
                                                            const actionAt = new Date().toISOString();
                                                            await runMutation({
                                                                method: 'PATCH',
                                                                headers: { 'content-type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    id: selectedJob.id,
                                                                    timeClockAction: 'clock_in',
                                                                    timeClockActionNote: timeClockDraft.actionNote,
                                                                }),
                                                            }, '/api/jobs', {
                                                                optimisticJobs: (current) =>
                                                                    current.map((entry) => {
                                                                        if (entry.id !== selectedJob.id) {
                                                                            return entry;
                                                                        }

                                                                        const existingTimeClock = entry.timeClock ?? {
                                                                            clockedInAt: null,
                                                                            clockedOutAt: null,
                                                                            breakMinutes: 0,
                                                                            elapsedMinutes: 0,
                                                                            notes: null,
                                                                            ledger: [],
                                                                        };
                                                                        const ledger = [
                                                                            ...(existingTimeClock.ledger ?? []),
                                                                            {
                                                                                id: `optimistic-clock-in-${Date.now()}`,
                                                                                action: 'clock_in' as const,
                                                                                at: actionAt,
                                                                                note: timeClockDraft.actionNote.trim() || null,
                                                                            },
                                                                        ];

                                                                        return {
                                                                            ...entry,
                                                                            status: entry.status === 'queued' ? 'in_progress' : entry.status,
                                                                            timeClock: {
                                                                                ...existingTimeClock,
                                                                                clockedInAt: actionAt,
                                                                                ledger,
                                                                                elapsedMinutes: computeElapsedMinutesFromLedger(ledger, existingTimeClock.breakMinutes),
                                                                            },
                                                                        };
                                                                    }),
                                                            });
                                                        }}
                                                    >
                                                        Clock In
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs disabled:opacity-50"
                                                        onClick={async () => {
                                                            const actionAt = new Date().toISOString();
                                                            await runMutation({
                                                                method: 'PATCH',
                                                                headers: { 'content-type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    id: selectedJob.id,
                                                                    timeClockAction: 'clock_out',
                                                                    timeClockActionNote: timeClockDraft.actionNote,
                                                                }),
                                                            }, '/api/jobs', {
                                                                optimisticJobs: (current) =>
                                                                    current.map((entry) => {
                                                                        if (entry.id !== selectedJob.id) {
                                                                            return entry;
                                                                        }

                                                                        const existingTimeClock = entry.timeClock ?? {
                                                                            clockedInAt: null,
                                                                            clockedOutAt: null,
                                                                            breakMinutes: 0,
                                                                            elapsedMinutes: 0,
                                                                            notes: null,
                                                                            ledger: [],
                                                                        };
                                                                        const ledger = [
                                                                            ...(existingTimeClock.ledger ?? []),
                                                                            {
                                                                                id: `optimistic-clock-out-${Date.now()}`,
                                                                                action: 'clock_out' as const,
                                                                                at: actionAt,
                                                                                note: timeClockDraft.actionNote.trim() || null,
                                                                            },
                                                                        ];

                                                                        return {
                                                                            ...entry,
                                                                            timeClock: {
                                                                                ...existingTimeClock,
                                                                                clockedOutAt: actionAt,
                                                                                ledger,
                                                                                elapsedMinutes: computeElapsedMinutesFromLedger(ledger, existingTimeClock.breakMinutes),
                                                                            },
                                                                        };
                                                                    }),
                                                            });
                                                        }}
                                                    >
                                                        Clock Out
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs disabled:opacity-50"
                                                        onClick={async () => {
                                                            await runMutation({
                                                                method: 'PATCH',
                                                                headers: { 'content-type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    id: selectedJob.id,
                                                                    timeClockAction: 'set_notes',
                                                                    timeClockNotes: timeClockDraft.notes,
                                                                }),
                                                            }, '/api/jobs', {
                                                                optimisticJobs: (current) =>
                                                                    current.map((entry) =>
                                                                        entry.id === selectedJob.id ? {
                                                                            ...entry,
                                                                            timeClock: {
                                                                                ...(entry.timeClock ?? {
                                                                                    clockedInAt: null,
                                                                                    clockedOutAt: null,
                                                                                    breakMinutes: 0,
                                                                                    elapsedMinutes: 0,
                                                                                    notes: null,
                                                                                    ledger: [],
                                                                                }),
                                                                                notes: timeClockDraft.notes,
                                                                            },
                                                                        } : entry,
                                                                    ),
                                                            });
                                                        }}
                                                    >
                                                        Save Notes
                                                    </button>
                                                </div>
                                                <div className="rounded border border-[#dbe3f0] bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Time Clock Ledger</p>
                                                    <div className="mt-2 max-h-44 space-y-1 overflow-auto">
                                                        {(selectedJob.timeClock?.ledger ?? []).length === 0 ? (
                                                            <p className="text-xs text-[#64748b]">No ledger events yet.</p>
                                                        ) : (
                                                            [...(selectedJob.timeClock?.ledger ?? [])]
                                                                .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
                                                                .map((entry) => (
                                                                    <div key={entry.id} className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs text-[#334155]">
                                                                        <span className="font-semibold uppercase text-[#0f172a]">{entry.action.replace('_', ' ')}</span>
                                                                        <span className="ml-2">{new Date(entry.at).toLocaleString()}</span>
                                                                        {entry.note ? <p className="mt-1 whitespace-pre-wrap text-[#475569]">{entry.note}</p> : null}
                                                                    </div>
                                                                ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        {activeJobWizardStep === 4 ? (
                                            <div className="space-y-3 border-y border-[#dbe3f0] py-5">
                                                <div className="rounded border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
                                                    Required Parts: {selectedJob.requiredSkus.length > 0 ? selectedJob.requiredSkus.join(', ') : 'None selected yet'}
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <InventoryActionCard
                                                        title="Reserve Existing Inventory"
                                                        description="Search warehouse parts and reserve quantities directly for this job."
                                                    >
                                                        <label className="space-y-1.5">
                                                            <span className="text-[11px] text-[#475569]">Lookup Warehoused Parts</span>
                                                            <input
                                                                value={lookupQuery[selectedJob.id] ?? ''}
                                                                onChange={(event) => setLookupQuery((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                placeholder="Search SKU, item, or location"
                                                                className="w-full rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                            />
                                                        </label>
                                                        <div className="max-h-36 overflow-auto rounded border border-[#e5e7eb] bg-[#f8fafc]">
                                                            {(() => {
                                                                const query = (lookupQuery[selectedJob.id] ?? '').trim().toLowerCase();
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
                                                                        key={`${selectedJob.id}-${part.id}`}
                                                                        type="button"
                                                                        className="flex w-full items-center justify-between gap-2 border-b border-[#e5e7eb] px-3 py-2 text-left text-xs last:border-b-0 hover:bg-white"
                                                                        onClick={() => {
                                                                            setReserveSku((current) => ({ ...current, [selectedJob.id]: part.sku }));
                                                                            setLookupQuery((current) => ({ ...current, [selectedJob.id]: part.sku }));
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
                                                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                                                            <label className="space-y-1.5">
                                                                <span className="text-[11px] text-[#475569]">SKU to Reserve</span>
                                                                <input
                                                                    value={reserveSku[selectedJob.id] ?? ''}
                                                                    onChange={(event) => setReserveSku((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                    placeholder="SKU to reserve"
                                                                    className="w-full rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                />
                                                            </label>
                                                            <label className="space-y-1.5">
                                                                <span className="text-[11px] text-[#475569]">Reserve Quantity</span>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={reserveQty[selectedJob.id] ?? 1}
                                                                    onChange={(event) => setReserveQty((current) => ({ ...current, [selectedJob.id]: Number(event.target.value) }))}
                                                                    className="w-full rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                disabled={isPending}
                                                                className="rounded border border-[#86efac] bg-[#f0fdf4] px-3 py-2 text-xs font-semibold text-[#166534]"
                                                                onClick={async () => {
                                                                    await runMutation({
                                                                        method: 'PATCH',
                                                                        headers: { 'content-type': 'application/json' },
                                                                        body: JSON.stringify({
                                                                            id: selectedJob.id,
                                                                            inventoryAction: 'reserve',
                                                                            inventorySku: reserveSku[selectedJob.id] ?? '',
                                                                            reserveQuantity: reserveQty[selectedJob.id] ?? 1,
                                                                        }),
                                                                    }, '/api/jobs', {
                                                                        optimisticJobs: (current) =>
                                                                            current.map((entry) => {
                                                                                if (entry.id !== selectedJob.id) {
                                                                                    return entry;
                                                                                }

                                                                                const sku = (reserveSku[selectedJob.id] ?? '').trim();
                                                                                if (!sku || entry.requiredSkus.includes(sku)) {
                                                                                    return entry;
                                                                                }

                                                                                return {
                                                                                    ...entry,
                                                                                    requiredSkus: [...entry.requiredSkus, sku],
                                                                                };
                                                                            }),
                                                                    });
                                                                }}
                                                            >
                                                                Reserve
                                                            </button>
                                                        </div>
                                                    </InventoryActionCard>

                                                    <InventoryActionCard
                                                        title="Create Inventory Part"
                                                        description="Add a missing catalog item and attach it to this job in one step."
                                                    >
                                                        {(() => {
                                                            const currentServiceLines =
                                                                createServiceLines[selectedJob.id] ?? ['mobile', 'shop'];

                                                            const addServiceLineTag = () => {
                                                                const nextTag = (createServiceLineInput[selectedJob.id] ?? '').trim().toLowerCase();
                                                                if (!nextTag || currentServiceLines.includes(nextTag)) {
                                                                    return;
                                                                }

                                                                setCreateServiceLines((current) => ({
                                                                    ...current,
                                                                    [selectedJob.id]: [...currentServiceLines, nextTag],
                                                                }));
                                                                setCreateServiceLineInput((current) => ({
                                                                    ...current,
                                                                    [selectedJob.id]: '',
                                                                }));
                                                            };

                                                            const removeServiceLineTag = (tag: string) => {
                                                                setCreateServiceLines((current) => {
                                                                    const next = (current[selectedJob.id] ?? ['mobile', 'shop'])
                                                                        .filter((entry) => entry !== tag);
                                                                    return {
                                                                        ...current,
                                                                        [selectedJob.id]: next,
                                                                    };
                                                                });
                                                            };

                                                            return (
                                                                <div className="grid gap-2.5 sm:grid-cols-2">
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">SKU</span>
                                                                        <input
                                                                            value={createSku[selectedJob.id] ?? ''}
                                                                            onChange={(event) => setCreateSku((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                            placeholder="New SKU"
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Item Name</span>
                                                                        <input
                                                                            value={createItemName[selectedJob.id] ?? ''}
                                                                            onChange={(event) => setCreateItemName((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                            placeholder="Item name"
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Location</span>
                                                                        <input
                                                                            value={createLocation[selectedJob.id] ?? ''}
                                                                            onChange={(event) => setCreateLocation((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                            placeholder="Location"
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Supplier</span>
                                                                        <input
                                                                            value={createSupplier[selectedJob.id] ?? ''}
                                                                            onChange={(event) => setCreateSupplier((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                            placeholder="Supplier"
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">On Hand</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={createOnHand[selectedJob.id] ?? 0}
                                                                            onChange={(event) => setCreateOnHand((current) => ({ ...current, [selectedJob.id]: Number(event.target.value) }))}
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Reorder Point</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={createReorderPoint[selectedJob.id] ?? 1}
                                                                            onChange={(event) => setCreateReorderPoint((current) => ({ ...current, [selectedJob.id]: Number(event.target.value) }))}
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Suggested Qty</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={createSuggestedOrderQty[selectedJob.id] ?? 5}
                                                                            onChange={(event) =>
                                                                                setCreateSuggestedOrderQty((current) => ({ ...current, [selectedJob.id]: Number(event.target.value) }))
                                                                            }
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        />
                                                                    </label>
                                                                    <label className="flex flex-col gap-1.5">
                                                                        <span className="block text-[11px] text-[#475569]">Severity</span>
                                                                        <select
                                                                            value={createSeverity[selectedJob.id] ?? 'medium'}
                                                                            onChange={(event) => setCreateSeverity((current) => ({ ...current, [selectedJob.id]: event.target.value }))}
                                                                            className="rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                        >
                                                                            <option value="low">low</option>
                                                                            <option value="medium">medium</option>
                                                                            <option value="high">high</option>
                                                                            <option value="critical">critical</option>
                                                                        </select>
                                                                    </label>
                                                                    <label className="space-y-1.5 sm:col-span-2">
                                                                        <span className="text-[11px] text-[#475569]">Service Lines</span>
                                                                        <div className="space-y-2 rounded border border-[#d1d5db] bg-white p-2">
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {currentServiceLines.length === 0 ? (
                                                                                    <span className="text-xs text-[#64748b]">No service lines selected.</span>
                                                                                ) : (
                                                                                    currentServiceLines.map((line) => (
                                                                                        <span key={`${selectedJob.id}-${line}`} className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#334155]">
                                                                                            {line}
                                                                                            <button
                                                                                                type="button"
                                                                                                aria-label={`Remove ${line}`}
                                                                                                className="rounded-full border border-[#cbd5e1] px-1 text-[9px] leading-none text-[#475569]"
                                                                                                onClick={() => removeServiceLineTag(line)}
                                                                                            >
                                                                                                X
                                                                                            </button>
                                                                                        </span>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                                                                <input
                                                                                    value={createServiceLineInput[selectedJob.id] ?? ''}
                                                                                    onChange={(event) =>
                                                                                        setCreateServiceLineInput((current) => ({
                                                                                            ...current,
                                                                                            [selectedJob.id]: event.target.value,
                                                                                        }))
                                                                                    }
                                                                                    placeholder="Add service line tag"
                                                                                    className="w-full rounded border border-[#d1d5db] px-3 py-2 text-xs"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#334155]"
                                                                                    onClick={addServiceLineTag}
                                                                                >
                                                                                    Add Tag
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                    <div className="sm:col-span-2">
                                                                        <RichTextMarkdownField
                                                                            label="Compatibility Note"
                                                                            value={createNote[selectedJob.id] ?? ''}
                                                                            onChange={(value) =>
                                                                                setCreateNote((current) => ({
                                                                                    ...current,
                                                                                    [selectedJob.id]: value,
                                                                                }))
                                                                            }
                                                                            placeholder="Compatibility details, fitment caveats, and technician guidance"
                                                                            minRows={3}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                disabled={isPending}
                                                                className="ml-auto rounded border border-[#bae6fd] bg-[#eff6ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8]"
                                                                onClick={async () => {
                                                                    await runMutation({
                                                                        method: 'PATCH',
                                                                        headers: { 'content-type': 'application/json' },
                                                                        body: JSON.stringify({
                                                                            id: selectedJob.id,
                                                                            inventoryAction: 'create_inventory',
                                                                            inventorySku: createSku[selectedJob.id] ?? '',
                                                                            createInventory: {
                                                                                itemName: createItemName[selectedJob.id] ?? '',
                                                                                serviceLines:
                                                                                    createServiceLines[selectedJob.id] && createServiceLines[selectedJob.id].length > 0 ?
                                                                                        createServiceLines[selectedJob.id] :
                                                                                        ['mobile', 'shop'],
                                                                                location: createLocation[selectedJob.id] ?? '',
                                                                                onHand: createOnHand[selectedJob.id] ?? 0,
                                                                                reorderPoint: createReorderPoint[selectedJob.id] ?? 1,
                                                                                suggestedOrderQty: createSuggestedOrderQty[selectedJob.id] ?? 5,
                                                                                supplier: createSupplier[selectedJob.id] ?? '',
                                                                                severity: createSeverity[selectedJob.id] ?? 'medium',
                                                                                compatibilityNote: createNote[selectedJob.id] ?? '',
                                                                            },
                                                                        }),
                                                                    }, '/api/jobs', {
                                                                        optimisticJobs: (current) =>
                                                                            current.map((entry) => {
                                                                                if (entry.id !== selectedJob.id) {
                                                                                    return entry;
                                                                                }

                                                                                const sku = (createSku[selectedJob.id] ?? '').trim();
                                                                                if (!sku || entry.requiredSkus.includes(sku)) {
                                                                                    return entry;
                                                                                }

                                                                                return {
                                                                                    ...entry,
                                                                                    requiredSkus: [...entry.requiredSkus, sku],
                                                                                };
                                                                            }),
                                                                    });
                                                                }}
                                                            >
                                                                Create Part
                                                            </button>
                                                        </div>
                                                    </InventoryActionCard>
                                                </div>
                                            </div>
                                        ) : null}

                                        {activeJobWizardStep === 1 || activeJobWizardStep === 2 ? (
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
                                                        }, '/api/jobs', {
                                                            optimisticJobs: (current) =>
                                                                current.map((entry) =>
                                                                    entry.id === selectedJob.id ? {
                                                                        ...entry,
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
                                                                    } : entry,
                                                                ),
                                                        });
                                                    }}
                                                >
                                                    Save
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
                                        ) : null}

                                        {activeJobWizardStep === 5 ? (
                                            <div className="border-y border-[#dbe3f0] py-5">
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
                                                    <div className="sm:col-span-2">
                                                        <RichTextMarkdownField
                                                            label="Resolution Notes"
                                                            value={closeoutDraft.resolutionNotes}
                                                            onChange={(next) =>
                                                                setCloseoutDrafts((current) => ({
                                                                    ...current,
                                                                    [selectedJob.id]: { ...closeoutDraft, resolutionNotes: next },
                                                                }))
                                                            }
                                                        />
                                                    </div>
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
                                                                {
                                                                    optimisticJobs: (current) =>
                                                                        current.map((entry) =>
                                                                            entry.id === selectedJob.id ? {
                                                                                ...entry,
                                                                                status: 'completed',
                                                                                closeout: {
                                                                                    actualPartCost: Number(closeoutDraft.actualPartCost),
                                                                                    actualLaborCost: Number(closeoutDraft.actualLaborCost),
                                                                                    actualMinutes: Number(closeoutDraft.actualMinutes),
                                                                                    finalTotal: Number(closeoutDraft.finalTotal),
                                                                                    closedOutAt: new Date().toISOString(),
                                                                                    resolutionNotes: closeoutDraft.resolutionNotes,
                                                                                },
                                                                            } : entry,
                                                                        ),
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        Close Out Job
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#dbe3f0] pt-4">
                                            <button
                                                type="button"
                                                className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs disabled:opacity-50"
                                                disabled={activeJobWizardStep === 1}
                                                onClick={() => setActiveJobWizardStep((step) => (step > 1 ? ((step - 1) as ActiveJobWizardStep) : step))}
                                            >
                                                Back
                                            </button>
                                            <p className="text-[11px] text-[#64748b]">Step {activeJobWizardStep} of 5</p>
                                            <button
                                                type="button"
                                                className="rounded border border-[#0f766e] bg-[#ecfeff] px-2 py-1 text-xs font-semibold text-[#0f766e] disabled:opacity-50"
                                                disabled={activeJobWizardStep === 5}
                                                onClick={() => setActiveJobWizardStep((step) => (step < 5 ? ((step + 1) as ActiveJobWizardStep) : step))}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </section>
                </div>
            ) : null}
            {pendingDeleteJobId ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
                    <article className="relative w-full max-w-md rounded-md bg-white p-4">
                        <button
                            type="button"
                            aria-label="Close delete confirmation"
                            className="absolute right-3 top-3 rounded-full border border-[#d1d5db] px-2 py-0.5 text-xs font-semibold text-[#475569]"
                            onClick={() => setPendingDeleteJobId(null)}
                        >
                            X
                        </button>
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
                                    }, '/api/jobs', {
                                        optimisticJobs: (current) =>
                                            current.filter((entry) => entry.id !== pendingDeleteJobId),
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
