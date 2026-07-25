"use client";

import { useState } from 'react';
import { GeoAddressField } from '@/app/components/shared/geo-address-field';
import { formatLocationLabel, LOCATION_TYPE_LABELS, LOCATION_TYPES, type LocationType } from '@/lib/inventory/locations';
import type { InventoryCatalogRow } from '@/lib/inventory/read-model';
import type { GeocodeResult } from '@/lib/geo/types';

type TransferLine = { partId: string; sku: string; itemName: string; quantity: number; available: number };

type TransferDraft = {
    sourceLocation: string;
    targetLocation: string;
    targetLocationType: LocationType | null;
    targetLocationAddress: string;
    targetLocationGeo: GeocodeResult | null;
    lines: TransferLine[];
};

type WizardStep = 'source' | 'parts' | 'destination' | 'review';

const STEP_LABELS: Record<WizardStep, string> = {
    source: 'Source',
    parts: 'Parts',
    destination: 'Destination',
    review: 'Review',
};

const STEPS: WizardStep[] = ['source', 'parts', 'destination', 'review'];

function stepNumber(step: WizardStep): number {
    return STEPS.indexOf(step) + 1;
}

export function TransferWizard({
    onClose,
    catalogRows,
    locations,
}: {
    onClose: () => void;
    catalogRows: InventoryCatalogRow[];
    locations: string[];
}) {
    const [step, setStep] = useState<WizardStep>('source');
    const [draft, setDraft] = useState<TransferDraft>({
        sourceLocation: locations[0] ?? '',
        targetLocation: '',
        targetLocationType: null,
        targetLocationAddress: '',
        targetLocationGeo: null,
        lines: [],
    });
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sourceItems = catalogRows.filter(
        (row) => row.location.toLowerCase() === draft.sourceLocation.toLowerCase(),
    );

    const destinationLocations = locations.filter(
        (loc) => loc.toLowerCase() !== draft.sourceLocation.toLowerCase(),
    );
    const isExistingDestination = destinationLocations.some(
        (location) => location.toLowerCase() === draft.targetLocation.trim().toLowerCase(),
    );

    const selectedLines = draft.lines.filter((l) => l.quantity > 0);

    function setLineQty(partId: string, sku: string, itemName: string, available: number, qty: number) {
        setDraft((prev) => {
            const existing = prev.lines.find((l) => l.partId === partId);
            if (existing) {
                return { ...prev, lines: prev.lines.map((l) => l.partId === partId ? { ...l, quantity: qty } : l) };
            }
            return { ...prev, lines: [...prev.lines, { partId, sku, itemName, quantity: qty, available }] };
        });
    }

    function getLineQty(partId: string): number {
        return draft.lines.find((l) => l.partId === partId)?.quantity ?? 0;
    }

    const canAdvanceSource = draft.sourceLocation.length > 0;
    const canAdvanceParts = selectedLines.length > 0;
    const canAdvanceDestination = draft.targetLocation.trim().length > 0 &&
        draft.targetLocation.trim().toLowerCase() !== draft.sourceLocation.toLowerCase() &&
        (isExistingDestination || draft.targetLocationType !== null);

    async function submitTransfer() {
        setIsPending(true);
        setError(null);

        try {
            const res = await fetch('/api/inventory-transfers', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sourceLocation: draft.sourceLocation,
                    targetLocation: draft.targetLocation.trim(),
                    targetLocationType: isExistingDestination ? undefined : draft.targetLocationType,
                    targetLocationAddress: draft.targetLocationAddress || undefined,
                    targetLocationLatitude: draft.targetLocationGeo?.latitude,
                    targetLocationLongitude: draft.targetLocationGeo?.longitude,
                    parts: selectedLines.map((l) => ({ id: l.partId, quantity: l.quantity })),
                }),
            });

            const payload = await res.json();

            if (!res.ok) {
                setError(payload?.error ?? 'Transfer failed.');
                return;
            }

            setFeedback(`Transferred ${selectedLines.length} part(s) from ${formatLocationLabel(draft.sourceLocation)} to ${formatLocationLabel(draft.targetLocation)}.`);
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
            aria-label="Transfer inventory"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#0f172a]">Transfer Stock</h2>
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
                            {step === 'source' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-[#475569]">Where are you moving stock from?</p>
                                    <div className="space-y-2">
                                        {locations.map((loc) => (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => setDraft((d) => ({ ...d, sourceLocation: loc, lines: [] }))}
                                                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors ${draft.sourceLocation === loc ? 'border-[#0f766e] bg-[#f0fdf4] font-semibold text-[#0f766e]' : 'border-[#e5e7eb] bg-white text-[#334155] hover:bg-[#f9fafb]'}`}
                                            >
                                                <span>{formatLocationLabel(loc)}</span>
                                                <span className="text-xs text-[#64748b]">
                                                    {catalogRows.filter((r) => r.location.toLowerCase() === loc.toLowerCase()).length} SKUs
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 'parts' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-[#475569]">
                                        Select parts to transfer from {formatLocationLabel(draft.sourceLocation)}
                                    </p>
                                    {sourceItems.length === 0 ? (
                                        <p className="text-xs text-[#64748b]">No parts found at this location.</p>
                                    ) : (
                                        <div className="max-h-72 space-y-2 overflow-y-auto">
                                            {sourceItems.map((item) => (
                                                <div key={item.id} className="flex items-center gap-3 rounded-md border border-[#e5e7eb] px-3 py-2">
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-[#0f172a]">{item.itemName}</p>
                                                        <p className="text-[11px] text-[#64748b]">{item.sku} · Available {item.available}</p>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        aria-label={`Quantity for ${item.itemName}`}
                                                        min={0}
                                                        max={item.available}
                                                        value={getLineQty(item.id)}
                                                        onChange={(e) => setLineQty(item.id, item.sku, item.itemName, item.available, Math.min(item.available, Math.max(0, Number(e.target.value))))}
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
                                    <p className="text-xs font-semibold text-[#475569]">Where are you moving stock to?</p>
                                    <div className="space-y-2">
                                        {destinationLocations.map((loc) => (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => setDraft((d) => ({ ...d, targetLocation: loc, targetLocationType: null }))}
                                                className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors ${draft.targetLocation === loc ? 'border-[#0f766e] bg-[#f0fdf4] font-semibold text-[#0f766e]' : 'border-[#e5e7eb] bg-white text-[#334155] hover:bg-[#f9fafb]'}`}
                                            >
                                                {formatLocationLabel(loc)}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="block space-y-1">
                                        <span className="text-xs font-semibold text-[#475569]">Or add a new location</span>
                                        <input
                                            type="text"
                                            value={destinationLocations.includes(draft.targetLocation) ? '' : draft.targetLocation}
                                            onChange={(event) => setDraft((current) => ({
                                                ...current,
                                                targetLocation: event.target.value,
                                                targetLocationType: current.targetLocationType,
                                            }))}
                                            placeholder="e.g. North lot or Service bay"
                                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                                        />
                                    </label>
                                    {!isExistingDestination && draft.targetLocation.trim() ? (
                                        <fieldset className="space-y-2">
                                            <legend className="text-xs font-semibold text-[#475569]">Location type</legend>
                                            <div className="grid grid-cols-3 gap-2">
                                                {LOCATION_TYPES.map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        aria-pressed={draft.targetLocationType === type}
                                                        onClick={() => setDraft((current) => ({ ...current, targetLocationType: type }))}
                                                        className={`rounded-md border px-2 py-2 text-xs font-semibold ${draft.targetLocationType === type ? 'border-[#0f766e] bg-[#f0fdf4] text-[#0f766e]' : 'border-[#d1d5db] text-[#475569] hover:bg-[#f8fafc]'}`}
                                                    >
                                                        {LOCATION_TYPE_LABELS[type]}
                                                    </button>
                                                ))}
                                            </div>
                                        </fieldset>
                                    ) : null}
                                    {!isExistingDestination && draft.targetLocation.trim() ? (
                                        <GeoAddressField
                                            label="Warehouse address"
                                            value={draft.targetLocationAddress}
                                            onChange={(value) => setDraft((current) => ({ ...current, targetLocationAddress: value, targetLocationGeo: null }))}
                                            onResolved={(result) => setDraft((current) => ({ ...current, targetLocationGeo: result }))}
                                            placeholder="Physical address for routing"
                                        />
                                    ) : null}
                                </div>
                            )}

                            {step === 'review' && (
                                <div className="space-y-3">
                                    <div className="rounded-md bg-[#f8fafc] p-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#475569]">From</span>
                                            <span className="text-[#0f172a]">{formatLocationLabel(draft.sourceLocation)}</span>
                                        </div>
                                        <div className="mt-1 flex justify-between">
                                            <span className="font-semibold text-[#475569]">To</span>
                                            <span className="text-[#0f172a]">{formatLocationLabel(draft.targetLocation)}</span>
                                        </div>
                                        {!isExistingDestination && draft.targetLocationType ? (
                                            <div className="mt-1 flex justify-between">
                                                <span className="font-semibold text-[#475569]">Location type</span>
                                                <span className="text-[#0f172a]">{LOCATION_TYPE_LABELS[draft.targetLocationType]}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="space-y-1">
                                        {selectedLines.map((line) => (
                                            <div key={line.partId} className="flex items-center justify-between text-xs">
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
                            {step === 'source' ? 'Cancel' : 'Back'}
                        </button>

                        {step === 'review' ? (
                            <button
                                type="button"
                                onClick={submitTransfer}
                                disabled={isPending}
                                className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d5f56] disabled:opacity-50"
                            >
                                {isPending ? 'Transferring…' : 'Confirm Transfer'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const idx = STEPS.indexOf(step);
                                    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
                                }}
                                disabled={
                                    (step === 'source' && !canAdvanceSource) ||
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
