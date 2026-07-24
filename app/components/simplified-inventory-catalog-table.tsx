"use client";

import { useMemo, useState } from 'react';
import type { InventoryCatalogRow } from '@/lib/inventory/read-model';

type StockStatus = 'critical' | 'low' | 'healthy';

function getStockStatus(available: number, reorderPoint: number, severity: string): StockStatus {
  if (severity === 'critical' || available <= 0) return 'critical';
  if (available <= reorderPoint) return 'low';
  return 'healthy';
}

function StockStatusBadge({ status }: { status: StockStatus }) {
  const styles = {
    critical: 'bg-[#fef2f2] text-[#991b1b]',
    low: 'bg-[#fff7ed] text-[#92400e]',
    healthy: 'bg-[#f0fdf4] text-[#166534]',
  };

  const labels = {
    critical: 'Critical',
    low: 'Low',
    healthy: 'Healthy',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function SimplifiedInventoryCatalogTable({ initialParts }: { initialParts: InventoryCatalogRow[] }) {
  const [parts, setParts] = useState(initialParts);
  const [search, setSearch] = useState('');
  const [isPending, setIsPending] = useState(false);

  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parts;
    return parts.filter((part) =>
      [part.sku, part.itemName, part.location].join(' ').toLowerCase().includes(query),
    );
  }, [parts, search]);

  async function handleConsume(part: InventoryCatalogRow) {
    setIsPending(true);
    try {
      const response = await fetch('/api/inventory-parts', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: part.id,
          onHand: Math.max(0, part.onHand - 1),
        }),
      });

      const payload = await response.json();
      if (response.ok && payload.part) {
        setParts((current) => {
          const next = [...current];
          const idx = next.findIndex((p) => p.id === part.id);
          if (idx >= 0) {
            next[idx] = payload.part;
          }
          return next;
        });
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search SKU, part name, or location..."
          className="flex-1 rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[#e5e7eb]">
        <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
          <thead className="bg-[#f8fafc] text-[#475569]">
            <tr>
              <th className="px-3 py-2 font-semibold">Part</th>
              <th className="px-3 py-2 font-semibold">Location</th>
              <th className="px-3 py-2 font-semibold">Available</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] bg-white">
            {filteredParts.map((part) => {
              const status = getStockStatus(part.available, part.reorderPoint, part.severity);
              return (
                <tr key={part.id} className="align-middle text-[#334155]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">{part.itemName}</p>
                    <p className="text-[11px] text-[#64748b]">{part.sku}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm">{part.location}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#0f172a]">{part.available}</p>
                    <p className="text-[11px] text-[#64748b]">Min: {part.reorderPoint}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StockStatusBadge status={status} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={isPending}
                      className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-xs hover:bg-[#f8fafc] disabled:opacity-70"
                      onClick={() => handleConsume(part)}
                    >
                      Consume
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredParts.length === 0 && (
        <p className="text-center text-xs text-[#64748b]">No parts found.</p>
      )}
    </section>
  );
}
