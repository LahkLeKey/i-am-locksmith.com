'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface TransferState {
  sourceLocation: string;
  targetLocation: string;
  selectedParts: Record<string, { quantity: number; available: number }>;
  isPending: boolean;
  feedback: string | null;
  error: string | null;
}

const LOCATIONS = ['shop', 'mobile_van_1', 'mobile_van_2', 'warehouse'];

export default function TransfersPage() {
  const [state, setState] = useState<TransferState>({
    sourceLocation: 'shop',
    targetLocation: 'mobile_van_1',
    selectedParts: {},
    isPending: false,
    feedback: null,
    error: null,
  });

  const [inventory, setInventory] = useState<Array<{
    id: string;
    sku: string;
    itemName: string;
    location: string;
    available: number;
    onHand: number;
  }>>([]);

  const [isLoaded, setIsLoaded] = useState(false);

  const sourceLocationParts = useMemo(() => {
    return inventory.filter((part) => part.location.toLowerCase() === state.sourceLocation.toLowerCase());
  }, [inventory, state.sourceLocation]);

  async function loadInventory() {
    try {
      const response = await fetch('/api/inventory-parts');
      const data = await response.json();
      
      if (data.parts) {
        setInventory(data.parts.map((part: any) => ({
          id: part.id,
          sku: part.sku,
          itemName: part.itemName,
          location: part.location,
          available: part.onHand,
          onHand: part.onHand,
        })));
      }
      setIsLoaded(true);
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to load inventory' }));
    }
  }

  async function executeTransfer() {
    const parts = Object.entries(state.selectedParts)
      .filter(([_, { quantity }]) => quantity > 0)
      .map(([id, { quantity }]) => ({ id, quantity }));

    if (parts.length === 0) {
      setState(prev => ({ ...prev, error: 'Select at least one part to transfer' }));
      return;
    }

    setState(prev => ({ ...prev, isPending: true, feedback: null, error: null }));

    try {
      const response = await fetch('/api/inventory-transfers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceLocation: state.sourceLocation,
          targetLocation: state.targetLocation,
          parts,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: result.error || 'Transfer failed' }));
        return;
      }

      setState(prev => ({
        ...prev,
        feedback: `Transferred ${parts.length} part(s) successfully`,
        selectedParts: {},
      }));

      await loadInventory();
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Transfer failed. Please try again.' }));
    } finally {
      setState(prev => ({ ...prev, isPending: false }));
    }
  }

  if (!isLoaded) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inventory Transfers</h1>
            <p className="mt-1 text-sm text-[#4b5563]">Move stock between locations.</p>
          </div>
          <Link
            href="/inventory"
            className="text-xs text-[#0f766e] hover:underline"
          >
            ← Back to Inventory
          </Link>
        </div>
        <button
          onClick={loadInventory}
          className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56]"
        >
          Load Inventory
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Transfers</h1>
          <p className="mt-1 text-sm text-[#4b5563]">Move stock between locations.</p>
        </div>
        <Link
          href="/inventory"
          className="text-xs text-[#0f766e] hover:underline"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <label className="block">
            <p className="text-xs font-semibold text-[#475569]">FROM LOCATION</p>
            <select
              value={state.sourceLocation}
              onChange={(e) => setState(prev => ({ ...prev, sourceLocation: e.target.value }))}
              className="mt-2 w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
            >
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
        </article>

        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <label className="block">
            <p className="text-xs font-semibold text-[#475569]">TO LOCATION</p>
            <select
              value={state.targetLocation}
              onChange={(e) => setState(prev => ({ ...prev, targetLocation: e.target.value }))}
              disabled={state.sourceLocation === state.targetLocation}
              className="mt-2 w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm disabled:opacity-50"
            >
              {LOCATIONS.filter(loc => loc !== state.sourceLocation).map(loc => (
                <option key={loc} value={loc}>{loc.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
        </article>
      </div>

      {state.error && (
        <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] p-4">
          <p className="text-sm font-semibold text-[#b91c1c]">{state.error}</p>
        </div>
      )}

      {state.feedback && (
        <div className="rounded-md border border-[#d1fae5] bg-[#ecfdf5] p-4">
          <p className="text-sm font-semibold text-[#065f46]">{state.feedback}</p>
        </div>
      )}

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h2 className="text-sm font-semibold">Available Parts</h2>
        {sourceLocationParts.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left">
                  <th className="px-3 py-2 font-semibold text-[#6b7280]">Part</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Available</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Transfer Qty</th>
                </tr>
              </thead>
              <tbody>
                {sourceLocationParts.map((part) => (
                  <tr key={part.id} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[#0f172a]">{part.itemName}</p>
                      <p className="text-[11px] text-[#64748b]">{part.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{part.available}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max={part.available}
                        value={state.selectedParts[part.id]?.quantity || 0}
                        onChange={(e) => {
                          const qty = Math.max(0, Math.min(part.available, parseInt(e.target.value) || 0));
                          setState(prev => ({
                            ...prev,
                            selectedParts: {
                              ...prev.selectedParts,
                              [part.id]: { quantity: qty, available: part.available },
                            },
                          }));
                        }}
                        className="w-20 rounded-md border border-[#d1d5db] px-2 py-1 text-right text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#6b7280]">
            No parts available in {state.sourceLocation.replace(/_/g, ' ')}.
          </p>
        )}
      </article>

      <button
        onClick={executeTransfer}
        disabled={
          state.isPending ||
          Object.values(state.selectedParts).every(({ quantity }) => quantity === 0)
        }
        className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56] disabled:opacity-50"
      >
        {state.isPending ? 'Transferring...' : 'Execute Transfer'}
      </button>
    </section>
  );
}
