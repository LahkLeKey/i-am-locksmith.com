"use client";

import { useState } from 'react';

type TechnicianItem = {
    id: string;
    fullName: string;
    hourlyRate: number;
    lockpickingSkills: string[];
    availabilityStatus: 'available' | 'busy' | 'off_shift';
    availabilityNote: string | null;
    isActive: boolean;
};

type FormState = {
    id: string | null;
    fullName: string;
    hourlyRate: string;
    lockpickingSkills: string;
    availabilityStatus: 'available' | 'busy' | 'off_shift';
    availabilityNote: string;
    isActive: boolean;
};

function toForm(item?: TechnicianItem): FormState {
    return {
        id: item?.id ?? null,
        fullName: item?.fullName ?? '',
        hourlyRate: String(item?.hourlyRate ?? 85),
        lockpickingSkills: item?.lockpickingSkills?.join(', ') ?? 'residential',
        availabilityStatus: item?.availabilityStatus ?? 'available',
        availabilityNote: item?.availabilityNote ?? '',
        isActive: item?.isActive ?? true,
    };
}

export function TechniciansAdminPanel({ initialTechnicians }: { initialTechnicians: TechnicianItem[] }) {
    const [technicians, setTechnicians] = useState<TechnicianItem[]>(initialTechnicians);
    const [form, setForm] = useState<FormState>(toForm());
    const [mode, setMode] = useState<'roster' | 'add' | 'edit'>('roster');
    const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy' | 'off_shift'>('all');
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const availableCount = technicians.filter((item) => item.isActive && item.availabilityStatus === 'available').length;
    const busyCount = technicians.filter((item) => item.isActive && item.availabilityStatus === 'busy').length;
    const offShiftCount = technicians.filter((item) => !item.isActive || item.availabilityStatus === 'off_shift').length;
    const visibleTechnicians = technicians.filter((item) => {
        if (availabilityFilter === 'available') return item.isActive && item.availabilityStatus === 'available';
        if (availabilityFilter === 'busy') return item.isActive && item.availabilityStatus === 'busy';
        if (availabilityFilter === 'off_shift') return !item.isActive || item.availabilityStatus === 'off_shift';
        return true;
    });

    async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setFeedback(null);
        setIsPending(true);

        try {
            const response = await fetch('/api/technicians', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.fullName,
                    hourlyRate: Number(form.hourlyRate),
                    lockpickingSkills: form.lockpickingSkills
                        .split(',')
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    availabilityStatus: form.availabilityStatus,
                    availabilityNote: form.availabilityNote,
                    isActive: form.isActive,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error ?? 'Failed to create technician.');
                return;
            }

            const created = payload.technician as TechnicianItem;
            setTechnicians((current) => [created, ...current]);
            setForm(toForm());
            setMode('roster');
            setFeedback(payload?.message ?? 'Technician created.');
        } catch {
            setError('Request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    async function saveRow(item: TechnicianItem) {
        setError(null);
        setFeedback(null);
        setIsPending(true);

        try {
            const response = await fetch('/api/technicians', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(item),
            });

            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error ?? 'Failed to update technician.');
                return;
            }

            const next = payload.technician as TechnicianItem;
            setTechnicians((current) => current.map((entry) => (entry.id === next.id ? next : entry)));
            setFeedback(payload?.message ?? 'Technician updated.');
        } catch {
            setError('Request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <section className="space-y-4">
            <div className="grid overflow-hidden rounded-md border border-[#dbe3e8] bg-white sm:grid-cols-3">
                <button type="button" aria-pressed={availabilityFilter === 'available'} onClick={() => { setMode('roster'); setAvailabilityFilter('available'); }} className={`p-4 text-left hover:bg-[#f8fffe] ${availabilityFilter === 'available' ? 'bg-[#f0fdfa]' : ''}`}>
                    <span className="text-xs font-semibold text-[#0f766e]">Available now</span>
                    <span className="mt-1 block text-xl font-semibold text-[#0f172a]">{availableCount}</span>
                    <span className="text-[11px] text-[#64748b]">View dispatch-ready technicians →</span>
                </button>
                <button type="button" aria-pressed={availabilityFilter === 'busy'} onClick={() => { setMode('roster'); setAvailabilityFilter('busy'); }} className={`border-y border-[#e5e7eb] p-4 text-left hover:bg-[#f8fafc] sm:border-x sm:border-y-0 ${availabilityFilter === 'busy' ? 'bg-[#fffbeb]' : ''}`}>
                    <span className="text-xs font-semibold text-[#475569]">Currently busy</span>
                    <span className="mt-1 block text-xl font-semibold text-[#0f172a]">{busyCount}</span>
                    <span className="text-[11px] text-[#64748b]">Review active workload notes →</span>
                </button>
                <button type="button" aria-pressed={availabilityFilter === 'off_shift'} onClick={() => { setMode('roster'); setAvailabilityFilter('off_shift'); }} className={`p-4 text-left hover:bg-[#f8fafc] ${availabilityFilter === 'off_shift' ? 'bg-[#f8fafc]' : ''}`}>
                    <span className="text-xs font-semibold text-[#475569]">Off shift / inactive</span>
                    <span className="mt-1 block text-xl font-semibold text-[#0f172a]">{offShiftCount}</span>
                    <span className="text-[11px] text-[#64748b]">Review roster coverage →</span>
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb]">
                <nav aria-label="Technician views" className="flex gap-1">
                    {(['roster', 'edit'] as const).map((view) => (
                        <button key={view} type="button" aria-pressed={mode === view} onClick={() => { setMode(view); if (view === 'roster') setAvailabilityFilter('all'); }} className={`border-b-2 px-3 py-2 text-xs font-semibold capitalize ${mode === view ? 'border-[#0f766e] text-[#0f766e]' : 'border-transparent text-[#64748b]'}`}>
                            {view === 'edit' ? 'Edit roster' : 'Roster'}
                        </button>
                    ))}
                </nav>
                <button type="button" onClick={() => setMode('add')} className="mb-2 rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white">+ Add technician</button>
            </div>

            {mode === 'add' ? (
                <form className="grid gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={submitCreate}>
                    <label className="space-y-1 lg:col-span-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Technician Name</span>
                        <input
                            value={form.fullName}
                            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                            required
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Hourly Rate</span>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.hourlyRate}
                            onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                            required
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Availability</span>
                        <select
                            value={form.availabilityStatus}
                            onChange={(event) => setForm((current) => ({ ...current, availabilityStatus: event.target.value as FormState['availabilityStatus'] }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                        >
                            <option value="available">available</option>
                            <option value="busy">busy</option>
                            <option value="off_shift">off shift</option>
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Active</span>
                        <select
                            value={form.isActive ? 'yes' : 'no'}
                            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'yes' }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                        >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                        </select>
                    </label>
                    <label className="space-y-1 sm:col-span-2 lg:col-span-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Lockpicking Skills</span>
                        <input
                            value={form.lockpickingSkills}
                            onChange={(event) => setForm((current) => ({ ...current, lockpickingSkills: event.target.value }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                        />
                    </label>
                    <label className="space-y-1 sm:col-span-2 lg:col-span-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Availability Note</span>
                        <input
                            value={form.availabilityNote}
                            onChange={(event) => setForm((current) => ({ ...current, availabilityNote: event.target.value }))}
                            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="rounded border border-[#0f766e] bg-[#ecfeff] px-3 py-2 text-xs font-semibold text-[#0f766e] disabled:opacity-70"
                    >
                        Add Technician
                    </button>
                </form>
            ) : null}

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            {mode === 'roster' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    {visibleTechnicians.map((item) => (
                        <button key={item.id} type="button" onClick={() => setMode('edit')} className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] p-3 text-left hover:bg-[#f8fafc]">
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-[#0f172a]">{item.fullName}</span>
                                <span className="mt-1 block truncate text-xs text-[#64748b]">{item.lockpickingSkills.join(' · ') || 'No skills recorded'}</span>
                                <span className="mt-1 block text-[11px] text-[#475569]">{item.availabilityNote || `$${item.hourlyRate.toFixed(2)}/hr`}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${item.isActive && item.availabilityStatus === 'available' ? 'bg-[#dcfce7] text-[#166534]' : item.isActive && item.availabilityStatus === 'busy' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                                {item.isActive ? item.availabilityStatus.replace('_', ' ') : 'inactive'}
                            </span>
                        </button>
                    ))}
                    {visibleTechnicians.length === 0 ? <p className="py-8 text-center text-sm text-[#64748b] sm:col-span-2">No technicians match this availability view.</p> : null}
                </div>
            ) : mode === 'edit' ? (
                <div className="overflow-auto rounded-md border border-[#e5e7eb]">
                    <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569]">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Technician</th>
                                <th className="px-3 py-2 font-semibold">Rate</th>
                                <th className="px-3 py-2 font-semibold">Skills</th>
                                <th className="px-3 py-2 font-semibold">Availability</th>
                                <th className="px-3 py-2 font-semibold">Active</th>
                                <th className="px-3 py-2 font-semibold">Note</th>
                                <th className="px-3 py-2 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] bg-white">
                            {technicians.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-3 py-2">
                                        <input
                                            value={item.fullName}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id ? { ...entry, fullName: event.target.value } : entry,
                                                    ),
                                                )
                                            }
                                            className="w-48 rounded border border-[#d1d5db] px-2 py-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.hourlyRate}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id ? { ...entry, hourlyRate: Number(event.target.value) } : entry,
                                                    ),
                                                )
                                            }
                                            className="w-24 rounded border border-[#d1d5db] px-2 py-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            value={item.lockpickingSkills.join(', ')}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id ? {
                                                            ...entry,
                                                            lockpickingSkills: event.target.value
                                                                .split(',')
                                                                .map((skill) => skill.trim())
                                                                .filter(Boolean),
                                                        } :
                                                            entry,
                                                    ),
                                                )
                                            }
                                            className="w-48 rounded border border-[#d1d5db] px-2 py-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            value={item.availabilityStatus}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id
                                                            ? { ...entry, availabilityStatus: event.target.value as TechnicianItem['availabilityStatus'] }
                                                            : entry,
                                                    ),
                                                )
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1"
                                        >
                                            <option value="available">available</option>
                                            <option value="busy">busy</option>
                                            <option value="off_shift">off shift</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            value={item.isActive ? 'yes' : 'no'}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id ? { ...entry, isActive: event.target.value === 'yes' } : entry,
                                                    ),
                                                )
                                            }
                                            className="rounded border border-[#d1d5db] px-2 py-1"
                                        >
                                            <option value="yes">yes</option>
                                            <option value="no">no</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            value={item.availabilityNote ?? ''}
                                            onChange={(event) =>
                                                setTechnicians((current) =>
                                                    current.map((entry) =>
                                                        entry.id === item.id ? { ...entry, availabilityNote: event.target.value } : entry,
                                                    ),
                                                )
                                            }
                                            className="w-56 rounded border border-[#d1d5db] px-2 py-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            className="rounded border border-[#cbd5e1] bg-white px-2 py-1 disabled:opacity-50"
                                            onClick={async () => {
                                                await saveRow(item);
                                            }}
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {technicians.length === 0 ? (
                                <tr>
                                    <td className="px-3 py-4 text-[#64748b]" colSpan={7}>
                                        No technicians yet. Add your first technician to enable assignment in Jobs.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </section>
    );
}
