"use client";

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { formatLocationLabel } from '@/lib/inventory/locations';
import type { InventorySkuLocationBalance } from '@/lib/inventory/ledger-repository';
import type { ReplenishmentRequestRecord } from '@/lib/inventory/replenishment-repository';

type ActionMode = 'transfer' | 'restock' | null;

type InventoryPartActionsProps = {
    part: {
        id: string;
        sku: string;
        itemName: string;
        supplier: string;
        suggestedOrderQty: number;
        defaultLocation: string;
    };
    balances: InventorySkuLocationBalance[];
    trackedLocations: string[];
    openRequests: ReplenishmentRequestRecord[];
    canTransfer: boolean;
    canRestock: boolean;
    canReceive: boolean;
};

const NEW_LOCATION_VALUE = '__new_location__';

export function InventoryPartActions({
    part,
    balances,
    trackedLocations,
    openRequests,
    canTransfer,
    canRestock,
    canReceive,
}: InventoryPartActionsProps) {
    const router = useRouter();
    const transferableBalances = useMemo(
        () => balances.filter((balance) => balance.available > 0),
        [balances],
    );
    const initialSource = transferableBalances[0]?.location ?? '';
    const initialRestockLocation = part.defaultLocation || trackedLocations[0] || '';

    const [mode, setMode] = useState<ActionMode>(
        canTransfer ? 'transfer' : canRestock ? 'restock' : null,
    );
    const [sourceLocation, setSourceLocation] = useState(initialSource);
    const [targetLocation, setTargetLocation] = useState(
        trackedLocations.find((location) => location !== initialSource) ?? NEW_LOCATION_VALUE,
    );
    const [newTargetLocation, setNewTargetLocation] = useState('');
    const [transferQuantity, setTransferQuantity] = useState(1);
    const [restockLocation, setRestockLocation] = useState(initialRestockLocation);
    const [newRestockLocation, setNewRestockLocation] = useState('');
    const [restockQuantity, setRestockQuantity] = useState(Math.max(1, part.suggestedOrderQty));
    const [restockNotes, setRestockNotes] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sourceBalance = transferableBalances.find(
        (balance) => balance.location === sourceLocation,
    );
    const resolvedTargetLocation = targetLocation === NEW_LOCATION_VALUE
        ? newTargetLocation.trim()
        : targetLocation;
    const resolvedRestockLocation = restockLocation === NEW_LOCATION_VALUE
        ? newRestockLocation.trim()
        : restockLocation;

    function resetMessages() {
        setFeedback(null);
        setError(null);
    }

    async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        resetMessages();

        if (!sourceBalance) {
            setError('Choose a source location with available stock.');
            return;
        }

        if (!resolvedTargetLocation || resolvedTargetLocation.toLowerCase() === sourceLocation.toLowerCase()) {
            setError('Choose a different destination location.');
            return;
        }

        if (!Number.isInteger(transferQuantity) || transferQuantity <= 0 || transferQuantity > sourceBalance.available) {
            setError(`Quantity must be between 1 and ${sourceBalance.available}.`);
            return;
        }

        setIsPending(true);
        try {
            const response = await fetch('/api/inventory-transfers', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sourceLocation,
                    targetLocation: resolvedTargetLocation,
                    parts: [{ id: part.id, quantity: transferQuantity }],
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error ?? 'Transfer failed.');
                return;
            }

            setFeedback(
                `Moved ${transferQuantity} ${part.sku} from ${formatLocationLabel(sourceLocation)} to ${formatLocationLabel(resolvedTargetLocation)}.`,
            );
            router.refresh();
        } catch {
            setError('Transfer failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    async function submitRestock(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        resetMessages();

        if (!resolvedRestockLocation) {
            setError('Choose or enter a destination location.');
            return;
        }

        if (!Number.isInteger(restockQuantity) || restockQuantity <= 0) {
            setError('Restock quantity must be a positive whole number.');
            return;
        }

        setIsPending(true);
        try {
            const response = await fetch('/api/inventory-replenishment-requests', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sku: part.sku,
                    location: resolvedRestockLocation,
                    supplier: part.supplier,
                    requestedQuantity: restockQuantity,
                    orderingNotes: restockNotes.trim() || `Restock ${part.sku} from SKU detail`,
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error ?? 'Restock request failed.');
                return;
            }

            setFeedback(
                `Requested ${restockQuantity} ${part.sku} for ${formatLocationLabel(resolvedRestockLocation)}.`,
            );
            setRestockNotes('');
            router.refresh();
        } catch {
            setError('Restock request failed. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    async function receiveRequest(request: ReplenishmentRequestRecord) {
        resetMessages();
        setIsPending(true);

        try {
            const response = await fetch('/api/inventory-replenishment-requests', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    receivedQuantity: request.requestedQuantity,
                    receivingNotes: `Received ${part.sku} at ${request.location} from ${request.supplier}`,
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                setError(payload?.error ?? 'Unable to receive stock.');
                return;
            }

            setFeedback(
                `Received ${request.requestedQuantity} ${part.sku} at ${formatLocationLabel(request.location)}.`,
            );
            router.refresh();
        } catch {
            setError('Unable to receive stock. Please retry.');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <section id="actions" className="scroll-mt-6 rounded-md border border-[#d7e7e4] bg-[#f8fffe] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold text-[#0f172a]">Stock Actions</h2>
                    <p className="mt-1 text-xs text-[#64748b]">
                        Manage stock movement, replenishment, and receiving for this SKU.
                    </p>
                </div>
                <div className="flex rounded-md border border-[#cbd5e1] bg-white p-1" aria-label="Stock action">
                    {canTransfer ? (
                        <button
                            type="button"
                            onClick={() => { setMode('transfer'); resetMessages(); }}
                            aria-pressed={mode === 'transfer'}
                            className={`rounded px-3 py-1.5 text-xs font-semibold ${mode === 'transfer' ? 'bg-[#0f766e] text-white' : 'text-[#475569]'}`}
                        >
                            Transfer
                        </button>
                    ) : null}
                    {canRestock ? (
                        <button
                            type="button"
                            onClick={() => { setMode('restock'); resetMessages(); }}
                            aria-pressed={mode === 'restock'}
                            className={`rounded px-3 py-1.5 text-xs font-semibold ${mode === 'restock' ? 'bg-[#0f766e] text-white' : 'text-[#475569]'}`}
                        >
                            Restock
                        </button>
                    ) : null}
                </div>
            </div>

            {mode === 'transfer' ? (
                <form onSubmit={submitTransfer} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-[#475569]">Move from</span>
                        <select
                            value={sourceLocation}
                            onChange={(event) => {
                                setSourceLocation(event.target.value);
                                setTransferQuantity(1);
                            }}
                            disabled={transferableBalances.length === 0}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        >
                            {transferableBalances.map((balance) => (
                                <option key={balance.location} value={balance.location}>
                                    {formatLocationLabel(balance.location)} ({balance.available} available)
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-[#475569]">Move to</span>
                        <select
                            value={targetLocation}
                            onChange={(event) => setTargetLocation(event.target.value)}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        >
                            {trackedLocations
                                .filter((location) => location.toLowerCase() !== sourceLocation.toLowerCase())
                                .map((location) => (
                                    <option key={location} value={location}>{formatLocationLabel(location)}</option>
                                ))}
                            <option value={NEW_LOCATION_VALUE}>New location…</option>
                        </select>
                    </label>
                    {targetLocation === NEW_LOCATION_VALUE ? (
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-[#475569]">New location name</span>
                            <input
                                value={newTargetLocation}
                                onChange={(event) => setNewTargetLocation(event.target.value)}
                                placeholder="e.g. Van 2"
                                required
                                className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                            />
                        </label>
                    ) : null}
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-[#475569]">Quantity</span>
                        <input
                            type="number"
                            min={1}
                            max={sourceBalance?.available ?? 1}
                            value={transferQuantity}
                            onChange={(event) => setTransferQuantity(Number(event.target.value))}
                            required
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        />
                    </label>
                    <div className="flex items-end md:col-span-2 xl:col-span-1">
                        <button
                            type="submit"
                            disabled={isPending || transferableBalances.length === 0}
                            className="w-full rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isPending ? 'Moving…' : 'Move Stock'}
                        </button>
                    </div>
                    {transferableBalances.length === 0 ? (
                        <p className="text-xs text-[#92400e] md:col-span-2 xl:col-span-4">
                            No available units can be transferred. Restock this SKU first.
                        </p>
                    ) : null}
                </form>
            ) : mode === 'restock' ? (
                <form onSubmit={submitRestock} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-[#475569]">Deliver to</span>
                        <select
                            value={restockLocation}
                            onChange={(event) => setRestockLocation(event.target.value)}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        >
                            {trackedLocations.map((location) => (
                                <option key={location} value={location}>{formatLocationLabel(location)}</option>
                            ))}
                            <option value={NEW_LOCATION_VALUE}>New location…</option>
                        </select>
                    </label>
                    {restockLocation === NEW_LOCATION_VALUE ? (
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-[#475569]">New location name</span>
                            <input
                                value={newRestockLocation}
                                onChange={(event) => setNewRestockLocation(event.target.value)}
                                placeholder="e.g. Garage B"
                                required
                                className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                            />
                        </label>
                    ) : null}
                    <label className="space-y-1">
                        <span className="text-xs font-semibold text-[#475569]">Order quantity</span>
                        <input
                            type="number"
                            min={1}
                            value={restockQuantity}
                            onChange={(event) => setRestockQuantity(Number(event.target.value))}
                            required
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="space-y-1 md:col-span-2 xl:col-span-1">
                        <span className="text-xs font-semibold text-[#475569]">Order notes</span>
                        <input
                            value={restockNotes}
                            onChange={(event) => setRestockNotes(event.target.value)}
                            placeholder={`Supplier: ${part.supplier}`}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                        />
                    </label>
                    <div className="flex items-end md:col-span-2 xl:col-span-1">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isPending ? 'Requesting…' : 'Request Restock'}
                        </button>
                    </div>
                </form>
            ) : null}

            {openRequests.length > 0 ? (
                <div className="mt-4 border-t border-[#d7e7e4] pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Open restock requests</h3>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {openRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between gap-3 rounded-md border border-[#e5e7eb] bg-white px-3 py-2">
                                <div className="min-w-0 text-xs">
                                    <p className="font-semibold text-[#0f172a]">
                                        {request.requestedQuantity} units → {formatLocationLabel(request.location)}
                                    </p>
                                    <p className="truncate text-[#64748b]">{request.supplier} · {request.orderingNotes || 'No notes'}</p>
                                </div>
                                {canReceive ? (
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => receiveRequest(request)}
                                        className="shrink-0 rounded border border-[#0f766e] px-3 py-1.5 text-xs font-semibold text-[#0f766e] hover:bg-[#f0fdf4] disabled:opacity-50"
                                    >
                                        Receive
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {feedback ? <p role="status" className="mt-3 rounded bg-[#f0fdf4] p-2 text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p role="alert" className="mt-3 rounded bg-[#fef2f2] p-2 text-xs text-[#991b1b]">{error}</p> : null}
        </section>
    );
}
