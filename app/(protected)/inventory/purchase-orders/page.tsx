'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface ReplenishmentRequest {
    id: string;
    sku: string;
    location: string;
    supplier: string;
    requestedQuantity: number;
    orderingNotes: string | null;
    status: 'open' | 'received';
    createdAt: string;
    receivedAt: string | null;
}

interface POGrouping {
    supplier: string;
    requests: ReplenishmentRequest[];
    totalAmount: number;
}

interface ReceiveState {
    requestId: string;
    quantity: number;
    notes: string;
}

export default function PurchaseOrdersPage() {
    const [requests, setRequests] = useState<ReplenishmentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [receiveState, setReceiveState] = useState<ReceiveState>({
        requestId: '',
        quantity: 0,
        notes: '',
    });
    const [showReceiveForm, setShowReceiveForm] = useState(false);

    useEffect(() => {
        loadRequests();
    }, []);

    async function loadRequests() {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/inventory-replenishment-requests');
            const data = await response.json();

            if (data.requests) {
                setRequests(data.requests);
            }
        } catch (err) {
            setError('Failed to load purchase orders');
        } finally {
            setIsLoading(false);
        }
    }

    const groupedBySupplier = useMemo(() => {
        const groups: Record<string, POGrouping> = {};

        requests.forEach(req => {
            if (!groups[req.supplier]) {
                groups[req.supplier] = {
                    supplier: req.supplier,
                    requests: [],
                    totalAmount: 0,
                };
            }
            groups[req.supplier].requests.push(req);
            groups[req.supplier].totalAmount += req.requestedQuantity;
        });

        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [requests]);

    async function handleReceive() {
        if (!receiveState.requestId || receiveState.quantity <= 0) {
            setError('Please select a request and enter a quantity');
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/inventory-replenishment-requests', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    requestId: receiveState.requestId,
                    receivedQuantity: receiveState.quantity,
                    receivingNotes: receiveState.notes || null,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Failed to receive purchase order');
                return;
            }

            setFeedback(`Received ${receiveState.quantity} units successfully`);
            setReceiveState({ requestId: '', quantity: 0, notes: '' });
            setShowReceiveForm(false);
            await loadRequests();
        } catch (err) {
            setError('Failed to process receipt');
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Purchase Orders</h1>
                    <p className="mt-1 text-sm text-[#4b5563]">
                        Track open purchase orders and receive inventory from suppliers.
                    </p>
                </div>
                <Link
                    href="/inventory"
                    className="text-[#0f766e] hover:underline"
                >
                    ← Back to Inventory
                </Link>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                    {error}
                </div>
            )}

            {feedback && (
                <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                    {feedback}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8">
                    <p className="text-[#4b5563]">Loading purchase orders...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-8 text-center">
                    <p className="text-[#4b5563]">No open purchase orders at this time.</p>
                    <p className="mt-2 text-sm text-[#6b7280]">
                        New replenishment requests will appear here automatically when inventory falls below reorder points.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {showReceiveForm && (
                        <div className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-6">
                            <h2 className="mb-4 font-semibold">Receive Purchase Order</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                        Select Request
                                    </label>
                                    <select
                                        value={receiveState.requestId}
                                        onChange={(e) =>
                                            setReceiveState(prev => ({ ...prev, requestId: e.target.value }))
                                        }
                                        className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[#0f172a]"
                                    >
                                        <option value="">-- Choose a purchase order --</option>
                                        {requests.map(req => (
                                            <option key={req.id} value={req.id}>
                                                {req.supplier} - {req.sku} (Ordered: {req.requestedQuantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                        Quantity Received
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={receiveState.requestId ? requests.find(r => r.id === receiveState.requestId)?.requestedQuantity : 0}
                                        value={receiveState.quantity}
                                        onChange={(e) =>
                                            setReceiveState(prev => ({
                                                ...prev,
                                                quantity: Math.max(0, parseInt(e.target.value) || 0),
                                            }))
                                        }
                                        className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[#0f172a]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#0f172a] mb-2">
                                        Receiving Notes (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={receiveState.notes}
                                        onChange={(e) =>
                                            setReceiveState(prev => ({ ...prev, notes: e.target.value }))
                                        }
                                        placeholder="e.g., Received on 07/24, condition: good"
                                        className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[#0f172a]"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleReceive}
                                        className="flex-1 rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56]"
                                    >
                                        Confirm Receipt
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowReceiveForm(false);
                                            setReceiveState({ requestId: '', quantity: 0, notes: '' });
                                        }}
                                        className="flex-1 rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] hover:bg-[#f9fafb]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {groupedBySupplier.map(group => (
                        <div key={group.supplier} className="rounded-md border border-[#e5e7eb] bg-white">
                            <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-6 py-4">
                                <h2 className="font-semibold text-[#0f172a]">{group.supplier}</h2>
                                <p className="text-sm text-[#6b7280] mt-1">
                                    {group.requests.length} item{group.requests.length !== 1 ? 's' : ''} • {group.totalAmount} total units
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#4b5563]">SKU</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#4b5563]">Location</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-[#4b5563]">Qty Ordered</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#4b5563]">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#4b5563]">Ordered</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#4b5563]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.requests.map(req => (
                                            <tr key={req.id} className="border-b border-[#e5e7eb] hover:bg-[#f9fafb]">
                                                <td className="px-6 py-3 text-sm font-medium text-[#0f766e]">{req.sku}</td>
                                                <td className="px-6 py-3 text-sm text-[#4b5563]">
                                                    {req.location.replace(/_/g, ' ')}
                                                </td>
                                                <td className="px-6 py-3 text-right text-sm font-semibold text-[#0f172a]">
                                                    {req.requestedQuantity}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${req.status === 'open'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {req.status === 'open' ? 'Pending' : 'Received'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-[#6b7280]">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {req.status === 'open' && (
                                                        <button
                                                            onClick={() => {
                                                                setReceiveState({
                                                                    requestId: req.id,
                                                                    quantity: req.requestedQuantity,
                                                                    notes: '',
                                                                });
                                                                setShowReceiveForm(true);
                                                                setFeedback(null);
                                                            }}
                                                            className="text-sm text-[#0f766e] hover:underline font-medium"
                                                        >
                                                            Receive
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
