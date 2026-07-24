"use client";

import {useState} from 'react';
import {useRouter} from 'next/navigation';

import type {
  InventoryExceptionEntry,
  InventoryExceptionReconcileAction,
} from '@/lib/inventory/exceptions-repository';

const ACTION_OPTIONS: Array<{
  value: InventoryExceptionReconcileAction;
  label: string;
}> = [
  {value: 'adjustment', label: 'Adjust +'},
  {value: 'receipt', label: 'Receive +'},
  {value: 'reservation_correction', label: 'Release Reservation'},
];

export function InventoryExceptionPanel(
    {exceptions}: {exceptions: InventoryExceptionEntry[]}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reconcile(entry: InventoryExceptionEntry,
                           actionType: InventoryExceptionReconcileAction,
                           quantity: number,
                           reasonCode: string) {
    setFeedback(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch('/api/inventory-exceptions', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          sku: entry.sku,
          location: entry.location,
          actionType,
          quantity,
          reasonCode,
          correlationId: entry.id,
          note: `Reconciled by operator from exception queue (${entry.cause})`,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? 'Reconciliation failed.');
        return;
      }

      setFeedback(
          `Reconciled ${entry.sku} at ${entry.location} via ${actionType}.`);
      router.refresh();
    } catch {
      setError('Reconciliation failed. Please retry.');
    } finally {
      setIsPending(false);
    }
  }

  return (
      <section className="space-y-4 rounded-md border border-[#e5e7eb] bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold">Inventory Exception Queue</h2>
          <p className="mt-1 text-xs text-[#475569]">
            Controlled negative inventory states that require operator reconciliation.
          </p>
        </div>

        <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
          <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#475569]">
              <tr>
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 font-semibold">Attribution</th>
                <th className="px-3 py-2 font-semibold">Reconcile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] bg-white">
              {exceptions.map((entry) => {
                const suggestedQty =
                    entry.available < 0 ? Math.abs(entry.available) :
                                          Math.abs(entry.onHand);
                const reasonCode =
                    entry.reasonCode === 'over_reserved' ?
                    'reservation_reversal' :
                    'cycle_count_correction';

                return (
                  <tr key={entry.id} className="align-top text-[#334155]">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[#0f172a]">{entry.sku}</p>
                      <p className="text-[11px] text-[#64748b]">{entry.location}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>Cause {entry.cause}</p>
                      <p className="text-[11px] text-[#64748b]">
                        On hand {entry.onHand} / Reserved {entry.reserved} / Available {entry.available}
                      </p>
                      <p className="text-[11px] text-[#64748b]">Reason {entry.reasonCode}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>Actor {entry.actor}</p>
                      <p className="text-[11px] text-[#64748b]">Source {entry.sourceKind}</p>
                      <p className="text-[11px] text-[#64748b]">
                        Ref {entry.sourceReferenceType ?? 'none'}:{' '}
                        {entry.sourceReferenceId ?? 'none'}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {ACTION_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={isPending}
                            className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs"
                            onClick={() =>
                              reconcile(entry, option.value, suggestedQty,
                                        reasonCode)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {exceptions.length === 0 ?
          <p className="text-xs text-[#64748b]">
            No controlled negative inventory exceptions.
          </p> :
          null}

        {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
        {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
      </section>
  );
}
