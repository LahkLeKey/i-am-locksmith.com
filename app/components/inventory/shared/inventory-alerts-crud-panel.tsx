"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { ReplenishmentAlert } from '@/lib/dashboard/types';

export function InventoryAlertsCrudPanel({
    initialAlerts,
}: {
    initialAlerts: ReplenishmentAlert[];
}) {
    const router = useRouter();
    const [sku, setSku] = useState('');
    const [itemName, setItemName] = useState('');
    const [location, setLocation] = useState('');
    const [supplier, setSupplier] = useState('');
    const [onHand, setOnHand] = useState('0');
    const [reorderPoint, setReorderPoint] = useState('0');
    const [suggestedOrderQty, setSuggestedOrderQty] = useState('0');
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runMutation(request: RequestInit) {
        setFeedback(null);
        setError(null);
        setIsPending(true);

        try {
            const response = await fetch('/api/inventory-alerts', request);
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
                <h2 className="text-sm font-semibold">Inventory Alerts CRUD</h2>
                <p className="mt-1 text-xs text-[#475569]">Persist low-stock alerts for the active org.</p>
            </div>

            <form
                className="grid gap-2 md:grid-cols-4"
                onSubmit={async (event) => {
                    event.preventDefault();

                    await runMutation({
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            sku,
                            itemName,
                            location,
                            supplier,
                            onHand: Number(onHand),
                            reorderPoint: Number(reorderPoint),
                            suggestedOrderQty: Number(suggestedOrderQty),
                        }),
                    });

                    setSku('');
                    setItemName('');
                    setLocation('');
                    setSupplier('');
                    setOnHand('0');
                    setReorderPoint('0');
                    setSuggestedOrderQty('0');
                }}
            >
                <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="SKU" required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Item name" required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier" required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={onHand} onChange={(event) => setOnHand(event.target.value)} placeholder="On hand" type="number" min={0} required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={reorderPoint} onChange={(event) => setReorderPoint(event.target.value)} placeholder="Reorder point" type="number" min={0} required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <input value={suggestedOrderQty} onChange={(event) => setSuggestedOrderQty(event.target.value)} placeholder="Suggested order" type="number" min={0} required className="rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                >
                    Add Alert
                </button>
            </form>

            {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
            {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}

            <ul className="space-y-2 text-xs text-[#334155]">
                {initialAlerts.map((alert) => (
                    <li key={alert.id} className="rounded bg-[#f8fafc] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="font-semibold">{alert.sku} ({alert.severity})</p>
                                <p>
                                    {alert.itemName} - {alert.location}
                                </p>
                                <p>
                                    On hand {alert.onHand} / Min {alert.reorderPoint}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                                    disabled={isPending}
                                    onClick={async () => {
                                        await runMutation({
                                            method: 'PATCH',
                                            headers: { 'content-type': 'application/json' },
                                            body: JSON.stringify({
                                                id: alert.id,
                                                onHand: Math.max(0, alert.onHand - 1),
                                            }),
                                        });
                                    }}
                                >
                                    Consume 1
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await runMutation({
                                            method: 'DELETE',
                                            headers: { 'content-type': 'application/json' },
                                            body: JSON.stringify({ id: alert.id }),
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
