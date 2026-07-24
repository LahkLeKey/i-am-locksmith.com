"use client";

import {useState} from 'react';

import type {InventoryQueueEntry} from '@/lib/inventory/read-model';

export function InventoryReplenishmentPanel({queue}: {queue: InventoryQueueEntry[]}) {
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createRequest(entry: InventoryQueueEntry) {
    setFeedback(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch('/api/inventory-replenishment-requests', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          sku: entry.sku,
          location: entry.location,
          supplier: entry.supplier,
          requestedQuantity: entry.suggestedOrderQty,
          orderingNotes: `Queue shortage ${entry.shortage} at ${entry.location}`,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? 'Request failed.');
        return;
      }

      setFeedback(
          `Created replenishment request for ${entry.sku} at ${entry.location}.`);
    } catch {
      setError('Request failed. Please retry.');
    } finally {
      setIsPending(false);
    }
  }

  return (
      <section className="space-y-4 rounded-md border border-[#e5e7eb] bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold">Create Replenishment Request</h2>
          <p className="mt-1 text-xs text-[#475569]">
            Create an open replenishment request directly from a low-stock queue item.
          </p>
        </div>

        <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
          <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#475569]">
              <tr>
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Need</th>
                <th className="px-3 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] bg-white">
              {queue.map((entry) => (
                <tr key={`${entry.id}-replenish`} className="align-top text-[#334155]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">{entry.sku}</p>
                    <p className="text-[11px] text-[#64748b]">{entry.itemName} · {entry.location}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>Shortage {entry.shortage}</p>
                    <p className="text-[11px] text-[#64748b]">Suggested {entry.suggestedOrderQty}</p>
                  </td>
                  <td className="px-3 py-3">{entry.supplier}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                      disabled={isPending}
                      onClick={() => createRequest(entry)}
                    >
                      Create Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
        {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
      </section>
  );
}
