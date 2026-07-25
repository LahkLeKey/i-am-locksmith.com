"use client";

import { useState } from 'react';
import { formatLocationLabel } from '@/lib/inventory/locations';
import type { InventoryCatalogRow } from '@/lib/inventory/read-model';

type POLine = { sku: string; itemName: string; quantity: number; supplier: string };

type PODraft = {
    supplier: string;
    destinationLocation: string;
    lines: POLine[];
    notes: string;
};

type WizardStep = 'supplier' | 'parts' | 'destination' | 'review';

const STEP_LABELS: Record<WizardStep, string> = {
    supplier: 'Supplier',
    parts: 'Parts',
    destination: 'Destination',
    review: 'Review',
};

const STEPS: WizardStep[] = ['supplier', 'parts', 'destination', 'review'];

function stepNumber(step: WizardStep): number {
    return STEPS.indexOf(step) + 1;
}

export function PurchaseOrderWizard({
    onClose,
    catalogRows,
    locations,
}: {
    onClose: () => void;
    catalogRows: InventoryCatalogRow[];
    locations: string[];
}) {
    const [step, setStep] = useState<WizardStep>('supplier');
    const [supplierInput, setSupplierInput] = useState('');
    const [draft, setDraft] = useState<PODraft>({
        supplier: '',
        destinationLocation: locations[0] ?? '',
        lines: [],
        notes: '',
    });
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const knownSuppliers = Array.from(new Set(catalogRows.map((r) => r.supplier).filter(Boolean)));
    const lowStockItems = catalogRows.filter((r) => r.available <= r.reorderPoint);

    const supplierParts = draft.supplier
        ? catalogRows.filter((r) => r.supplier.toLowerCase() === draft.supplier.toLowerCase())
        : catalogRows;

    const selectedLines = draft.lines.filter((l) => l.quantity > 0);

    function getLineQty(sku: string): number {
        return draft.lines.find((l) => l.sku === sku)?.quantity ?? 0;
    }

    function setLineQty(sku: string, itemName: string, supplier: string, qty: number) {
        setDraft((prev) => {
            const existing = prev.lines.find((l) => l.sku === sku);
            if (existing) {
                return { ...prev, lines: prev.lines.map((l) => l.sku === sku ? { ...l, quantity: qty } : l) };
            }
            return { ...prev, lines: [...prev.lines, { sku, itemName, quantity: qty, supplier }] };
        });
    }

    function applyLowStockSuggestions() {
        const suggestions = lowStockItems
            .filter((item) => !draft.supplier || item.supplier.toLowerCase() === draft.supplier.toLowerCase())
            .map((item) => ({
                sku: item.sku,
                itemName: item.itemName,
                supplier: item.supplier,
                quantity: item.suggestedOrderQty,
            }));

        setDraft((prev) => ({
            ...prev,
            lines: suggestions,
        }));
    }

    const canAdvanceSupplier = draft.supplier.length > 0;
    const canAdvanceParts = selectedLines.length > 0;
    const canAdvanceDestination = draft.destinationLocation.length > 0;

    async function submitPO() {
        setIsPending(true);
        setError(null);

        try {
            const results = await Promise.all(
                selectedLines.map((line) =>
                    fetch('/api/inventory-replenishment-requests', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            sku: line.sku,
                            location: draft.destinationLocation,
                            supplier: line.supplier || draft.supplier,
                            requestedQuantity: line.quantity,
                            orderingNotes: draft.notes || null,
                        }),
                    }),
                ),
            );

            const anyFailed = results.some((r) => !r.ok);
            if (anyFailed) {
                setError('One or more requests failed. Please retry.');
                return;
            }

            setFeedback(`Created purchase order with ${selectedLines.length} line(s) from ${draft.supplier}.`);
            setTimeout(() => onClose(), 1800);
        } catch {
            setError('Request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="New purchase order"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#0f172a]">New Purchase Order</h2>
                        <p className="text-xs text-[#64748b]">Step {stepNumber(step)} of {STEPS.length} — {STEP_LABELS[step]}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-[#64748b] hover:text-[#0f172a]">
                        ✕
                    </button>
                </div>

                {/* Progress */}
                <div className="flex gap-1 px-5 pt-3">
                    {STEPS.map((s) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full ${stepNumber(s) <= stepNumber(step) ? 'bg-[#0f766e]' : 'bg-[#e5e7eb]'}`}
                        />
                    ))}
                </div>

                {/* Body */}
                <div className="min-h-60 px-5 py-4">
                    {feedback ? (
                        <div className="rounded bg-[#f0fdf4] p-4 text-sm text-[#166534]">{feedback}</div>
                    ) : (
                        <>
                            {step === 'supplier' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-[#475569]">Which supplier are you ordering from?</p>

                                    {lowStockItems.length > 0 && (
                                        <div className="rounded-md bg-[#fff7ed] px-3 py-2 text-xs text-[#92400e]">
                                            <span className="font-semibold">{lowStockItems.length} item(s)</span> are below reorder point.
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    applyLowStockSuggestions();
                                                    setStep('destination');
                                                }}
                                                className="ml-2 underline hover:no-underline"
                                            >
                                                Auto-fill from low-stock queue
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {knownSuppliers.map((supplier) => (
                                            <button
                                                key={supplier}
                                                type="button"
                                                onClick={() => setDraft((d) => ({ ...d, supplier }))}
                                                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors ${draft.supplier === supplier ? 'border-[#0f766e] bg-[#f0fdf4] font-semibold text-[#0f766e]' : 'border-[#e5e7eb] bg-white text-[#334155] hover:bg-[#f9fafb]'}`}
                                            >
                                                <span>{supplier}</span>
                                                <span className="text-xs text-[#64748b]">
                                                    {catalogRows.filter((r) => r.supplier === supplier).length} parts
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[#475569] mb-1">Or enter supplier name</label>
                                        <input
                                            type="text"
                                            value={supplierInput}
                                            onChange={(e) => {
                                                setSupplierInput(e.target.value);
                                                setDraft((d) => ({ ...d, supplier: e.target.value }));
                                            }}
                                            placeholder="Supplier name"
                                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 'parts' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-[#475569]">
                                            Select parts from {draft.supplier}
                                        </p>
                                        {lowStockItems.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={applyLowStockSuggestions}
                                                className="text-[11px] text-[#0f766e] underline hover:no-underline"
                                            >
                                                Suggest low-stock
                                            </button>
                                        )}
                                    </div>
                                    {supplierParts.length === 0 ? (
                                        <p className="text-xs text-[#64748b]">No parts found for this supplier.</p>
                                    ) : (
                                        <div className="max-h-72 space-y-2 overflow-y-auto">
                                            {supplierParts.map((item) => (
                                                <div key={item.id} className={`flex items-center gap-3 rounded-md border px-3 py-2 ${item.available <= item.reorderPoint ? 'border-[#fca5a5] bg-[#fff7f7]' : 'border-[#e5e7eb]'}`}>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-[#0f172a]">{item.itemName}</p>
                                                        <p className="text-[11px] text-[#64748b]">{item.sku} · {formatLocationLabel(item.location)} · On hand {item.available}</p>
                                                        {item.available <= item.reorderPoint && (
                                                            <p className="text-[11px] font-semibold text-[#dc2626]">Below reorder point ({item.reorderPoint})</p>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="number"
                                                        aria-label={`Order quantity for ${item.itemName}`}
                                                        min={0}
                                                        value={getLineQty(item.sku)}
                                                        onChange={(e) => setLineQty(item.sku, item.itemName, item.supplier, Math.max(0, Number(e.target.value)))}
                                                        className="w-16 rounded border border-[#d1d5db] px-2 py-1 text-center text-xs"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 'destination' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-[#475569]">Where should stock be delivered?</p>
                                    <div className="space-y-2">
                                        {locations.map((loc) => (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => setDraft((d) => ({ ...d, destinationLocation: loc }))}
                                                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors ${draft.destinationLocation === loc ? 'border-[#0f766e] bg-[#f0fdf4] font-semibold text-[#0f766e]' : 'border-[#e5e7eb] bg-white text-[#334155] hover:bg-[#f9fafb]'}`}
                                            >
                                                {formatLocationLabel(loc)}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="block space-y-1">
                                        <span className="text-xs font-semibold text-[#475569]">Order notes (optional)</span>
                                        <textarea
                                            value={draft.notes}
                                            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                                            rows={2}
                                            placeholder="e.g. Urgent — restock before weekend"
                                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                        />
                                    </label>
                                </div>
                            )}

                            {step === 'review' && (
                                <div className="space-y-3">
                                    <div className="rounded-md bg-[#f8fafc] p-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#475569]">Supplier</span>
                                            <span className="text-[#0f172a]">{draft.supplier}</span>
                                        </div>
                                        <div className="mt-1 flex justify-between">
                                            <span className="font-semibold text-[#475569]">Deliver to</span>
                                            <span className="text-[#0f172a]">{formatLocationLabel(draft.destinationLocation)}</span>
                                        </div>
                                        {draft.notes && (
                                            <div className="mt-1 flex justify-between gap-4">
                                                <span className="font-semibold text-[#475569]">Notes</span>
                                                <span className="text-right text-[#64748b]">{draft.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {selectedLines.map((line) => (
                                            <div key={line.sku} className="flex items-center justify-between text-xs">
                                                <span className="text-[#334155]">{line.itemName} ({line.sku})</span>
                                                <span className="font-semibold text-[#0f172a]">× {line.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {error && <p className="rounded bg-[#fef2f2] p-2 text-xs text-[#991b1b]">{error}</p>}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!feedback && (
                    <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-3">
                        <button
                            type="button"
                            onClick={() => {
                                const idx = STEPS.indexOf(step);
                                if (idx > 0) setStep(STEPS[idx - 1]);
                                else onClose();
                            }}
                            className="rounded-md border border-[#e5e7eb] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f9fafb]"
                        >
                            {step === 'supplier' ? 'Cancel' : 'Back'}
                        </button>

                        {step === 'review' ? (
                            <button
                                type="button"
                                onClick={submitPO}
                                disabled={isPending}
                                className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d5f56] disabled:opacity-50"
                            >
                                {isPending ? 'Submitting…' : 'Place Order'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const idx = STEPS.indexOf(step);
                                    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
                                }}
                                disabled={
                                    (step === 'supplier' && !canAdvanceSupplier) ||
                                    (step === 'parts' && !canAdvanceParts) ||
                                    (step === 'destination' && !canAdvanceDestination)
                                }
                                className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d5f56] disabled:opacity-50"
                            >
                                Next
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
