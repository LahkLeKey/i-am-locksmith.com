"use client";

import { useMemo, useState } from 'react';

import type { InventoryCatalogRow } from '@/lib/inventory/read-model';
import { INVENTORY_SERVICE_LINE_OPTIONS, ServiceLineBadgeRow } from '@/app/components/inventory-shared';

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

function splitServiceLines(value: string): string[] {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function InventoryPartsPanel({ initialParts }: { initialParts: InventoryCatalogRow[] }) {
    const [parts, setParts] = useState(initialParts);
    const [search, setSearch] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredParts = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return parts;
        return parts.filter((part) =>
            [part.sku, part.itemName, part.location, part.supplier, part.compatibilityNote, part.serviceLines.join(' ')]
                .join(' ')
                .toLowerCase()
                .includes(query));
    }, [parts, search]);

    async function runMutation(request: RequestInit) {
        setFeedback(null);
        setError(null);
        setIsPending(true);

        try {
            const response = await fetch('/api/inventory-parts', request);
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error ?? 'Request failed.');
                return;
            }

            if (payload?.parts) {
                setParts(payload.parts);
            } else if (payload?.part) {
                setParts((current) => {
                    const existingIndex = current.findIndex((part) => part.id === payload.part.id);
                    if (existingIndex >= 0) {
                        const next = [...current];
                        next[existingIndex] = payload.part;
                        return next;
                    }

                    return [payload.part, ...current];
                });
            }

            setFeedback(payload?.message ?? 'Saved.');
        } catch {
            setError('Request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <section className="space-y-4 rounded-md border border-[#e5e7eb] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold">Parts Catalog</h2>
                    <p className="mt-1 text-xs text-[#475569]">Search, add, and maintain locksmith parts for automotive, mobile, and shop workflows.</p>
                </div>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search part, SKU, supplier, or location"
                    className="min-w-70 rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                />
            </div>

            <form
                className="grid gap-2 md:grid-cols-3 xl:grid-cols-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const formData = new FormData(form);

                    await runMutation({
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            sku: String(formData.get('sku') ?? ''),
                            itemName: String(formData.get('itemName') ?? ''),
                            estimatedUnitCost: Number(formData.get('estimatedUnitCost') ?? 0),
                            location: String(formData.get('location') ?? ''),
                            supplier: String(formData.get('supplier') ?? ''),
                            compatibilityNote: String(formData.get('compatibilityNote') ?? ''),
                            serviceLines: splitServiceLines(String(formData.get('serviceLines') ?? '')),
                            onHand: Number(formData.get('onHand') ?? 0),
                            reorderPoint: Number(formData.get('reorderPoint') ?? 0),
                            suggestedOrderQty: Number(formData.get('suggestedOrderQty') ?? 0),
                            severity: String(formData.get('severity') ?? 'medium'),
                        }),
                    });

                    form.reset();
                }}
            >
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">SKU</span>
                    <input name="sku" placeholder="SKU" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Item Name</span>
                    <input name="itemName" placeholder="Item name" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Location</span>
                    <input name="location" placeholder="Location" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Supplier</span>
                    <input name="supplier" placeholder="Supplier" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1 xl:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Service Lines</span>
                    <input name="serviceLines" placeholder="Service lines (comma-separated)" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1 xl:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Compatibility Note</span>
                    <input name="compatibilityNote" placeholder="Compatibility note" required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Est Unit Cost</span>
                    <input name="estimatedUnitCost" type="number" step="0.01" min={0} defaultValue={35} required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">On Hand</span>
                    <input name="onHand" type="number" min={0} defaultValue={0} required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Reorder Point</span>
                    <input name="reorderPoint" type="number" min={0} defaultValue={0} required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Suggested Order Qty</span>
                    <input name="suggestedOrderQty" type="number" min={0} defaultValue={0} required className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Severity</span>
                    <select name="severity" defaultValue="medium" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs">
                        {SEVERITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>
                <div className="flex gap-2 xl:col-span-4">
                    <div className="flex flex-wrap gap-2">
                        <ServiceLineBadgeRow lines={INVENTORY_SERVICE_LINE_OPTIONS} />
                    </div>
                    <button type="submit" disabled={isPending} className="ml-auto rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70">
                        Add Part
                    </button>
                </div>
            </form>

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
                <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[#475569]">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Part</th>
                            <th className="px-3 py-2 font-semibold">Coverage</th>
                            <th className="px-3 py-2 font-semibold">Stock</th>
                            <th className="px-3 py-2 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb] bg-white">
                        {filteredParts.map((part) => (
                            <tr key={part.id} className="align-top text-[#334155]">
                                <td className="px-3 py-3">
                                    <p className="font-semibold text-[#0f172a]">{part.itemName}</p>
                                    <p className="text-[11px] text-[#64748b]">{part.sku} · {part.location}</p>
                                    <p className="mt-1 text-[11px] text-[#64748b]">{part.supplier}</p>
                                    <p className="mt-1 text-[11px] text-[#64748b]">Est unit ${Number(part.estimatedUnitCost).toFixed(2)}</p>
                                </td>
                                <td className="px-3 py-3">
                                    <ServiceLineBadgeRow lines={part.serviceLines} className="flex flex-wrap gap-2" />
                                    <p className="mt-2 text-[11px] text-[#475569]">{part.compatibilityNote}</p>
                                </td>
                                <td className="px-3 py-3">
                                    <p className="font-semibold text-[#0f172a]">{part.onHand} / {part.reorderPoint}</p>
                                    <p className="text-[11px] text-[#64748b]">Order {part.suggestedOrderQty} · {part.severity}</p>
                                </td>
                                <td className="px-3 py-3">
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                                        onClick={async () => {
                                            await runMutation({
                                                method: 'PATCH',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({
                                                    id: part.id,
                                                    onHand: Math.max(0, part.onHand - 1),
                                                }),
                                            });
                                        }}
                                    >
                                        Consume 1
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        className="ml-2 rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs text-[#991b1b]"
                                        onClick={async () => {
                                            await runMutation({
                                                method: 'DELETE',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({ id: part.id }),
                                            });
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}