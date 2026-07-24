"use client";

import { useState } from 'react';
import { INVENTORY_SERVICE_LINE_OPTIONS, ServiceLineBadgeRow } from '@/app/components/inventory-shared';

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

function splitServiceLines(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function AddPartDrawer({
  onPartAdded,
  trigger,
}: {
  onPartAdded?: (part: any) => void;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setError(null);
    setIsPending(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const response = await fetch('/api/inventory-parts', {
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

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? 'Failed to create part.');
        return;
      }

      setFeedback(payload?.message ?? 'Part created successfully.');
      form.reset();
      onPartAdded?.(payload.part);
      
      setTimeout(() => {
        setIsOpen(false);
      }, 1000);
    } catch {
      setError('Failed to create part. Please retry.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56]"
      >
        {trigger || '+ Add Part'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center">
          <div className="w-full max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-4">
              <h2 className="text-lg font-semibold">Add New Part</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#6b7280] hover:text-[#111827]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Basic Information</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">SKU</span>
                    <input
                      name="sku"
                      placeholder="SKU"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Item Name</span>
                    <input
                      name="itemName"
                      placeholder="Item name"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Inventory</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Location</span>
                    <input
                      name="location"
                      placeholder="Location"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">On Hand</span>
                    <input
                      name="onHand"
                      type="number"
                      min={0}
                      defaultValue={0}
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Reorder Point</span>
                    <input
                      name="reorderPoint"
                      type="number"
                      min={0}
                      defaultValue={0}
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Suggested Order Qty</span>
                    <input
                      name="suggestedOrderQty"
                      type="number"
                      min={0}
                      defaultValue={0}
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Supplier</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Supplier</span>
                    <input
                      name="supplier"
                      placeholder="Supplier"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Est Unit Cost</span>
                    <input
                      name="estimatedUnitCost"
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={0}
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Details</h3>
                <div className="mt-3 space-y-3">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Service Lines</span>
                    <input
                      name="serviceLines"
                      placeholder="Service lines (comma-separated)"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Compatibility Note</span>
                    <input
                      name="compatibilityNote"
                      placeholder="Compatibility note"
                      required
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-[#475569]">Severity</span>
                    <select
                      name="severity"
                      defaultValue="medium"
                      className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    >
                      {SEVERITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {feedback && <p className="text-xs text-[#166534]">{feedback}</p>}
              {error && <p className="text-xs text-[#b91c1c]">{error}</p>}

              <div className="flex gap-3 border-t border-[#e5e7eb] pt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5f56] disabled:opacity-70"
                >
                  {isPending ? 'Creating...' : 'Create Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
