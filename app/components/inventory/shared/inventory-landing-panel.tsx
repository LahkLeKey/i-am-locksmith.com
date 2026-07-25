"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { InventoryCatalogRow } from '@/lib/inventory/read-model';
import { categorizeLocation, formatLocationLabel, LOCATION_TYPE_LABELS, type LocationType } from '@/lib/inventory/locations';
import { TransferWizard } from './transfer-wizard';
import { PurchaseOrderWizard } from './purchase-order-wizard';
import { InventorySkuCard } from './inventory-sku-card';
import { AddPartDrawer } from './add-part-drawer';

type ActiveWizard = 'transfer' | 'purchase-order' | null;
type CatalogView = 'table' | 'cards';

type InventoryLandingPanelProps = {
    catalogRows: InventoryCatalogRow[];
    lowStockCount: number;
    openPOCount: number;
    canAdjust: boolean;
    canTransfer: boolean;
};

export function InventoryLandingPanel({ catalogRows, lowStockCount, openPOCount, canAdjust, canTransfer }: InventoryLandingPanelProps) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');
    const [activeWizard, setActiveWizard] = useState<ActiveWizard>(null);
    const [catalogView, setCatalogView] = useState<CatalogView>('table');

    const locations = useMemo(
        () => Array.from(new Set(catalogRows.map((r) => r.location))).sort(),
        [catalogRows],
    );

    const locationCounts = useMemo((): Record<LocationType, number> => {
        const counts = { garage: 0, van: 0, shop: 0 };
        for (const row of catalogRows) {
            counts[categorizeLocation(row.location)]++;
        }
        return counts;
    }, [catalogRows]);

    const filteredRows = useMemo(() => {
        let rows = catalogRows;

        if (locationFilter !== 'all') {
            rows = rows.filter((r) => categorizeLocation(r.location) === locationFilter);
        }

        const query = search.trim().toLowerCase();
        if (query) {
            rows = rows.filter((r) =>
                [r.sku, r.itemName, r.location, r.supplier, r.compatibilityNote]
                    .join(' ')
                    .toLowerCase()
                    .includes(query),
            );
        }

        return rows;
    }, [catalogRows, locationFilter, search]);

    const totalSkus = new Set(catalogRows.map((row) => row.sku.toLowerCase())).size;
    const totalLocations = locations.length;

    return (
        <>
            {/* KPI Row */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <p className="text-xs text-[#6b7280]">Total SKUs</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f172a]">{totalSkus}</p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">Parts in catalog</p>
                </article>
                <article className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <p className="text-xs text-[#6b7280]">Locations</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f172a]">{totalLocations}</p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                        {locationCounts.garage}g · {locationCounts.van}v · {locationCounts.shop}s tracked
                    </p>
                </article>
                <article className={`rounded-md border p-4 ${lowStockCount > 0 ? 'border-[#fca5a5] bg-[#fff7f7]' : 'border-[#e5e7eb] bg-[#f9fafb]'}`}>
                    <p className="text-xs text-[#6b7280]">Low Stock</p>
                    <p className={`mt-1 text-xl font-semibold ${lowStockCount > 0 ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                        {lowStockCount}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">Items below reorder point</p>
                </article>
                <article className={`rounded-md border p-4 ${openPOCount > 0 ? 'border-[#fde68a] bg-[#fffbeb]' : 'border-[#e5e7eb] bg-[#f9fafb]'}`}>
                    <p className="text-xs text-[#6b7280]">Open Orders</p>
                    <p className={`mt-1 text-xl font-semibold ${openPOCount > 0 ? 'text-[#92400e]' : 'text-[#0f172a]'}`}>
                        {openPOCount}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">Purchase orders in flight</p>
                </article>
            </div>

            {/* Catalog Table */}
            <section className="rounded-md border border-[#e5e7eb] bg-white">
                {/* Toolbar */}
                <div className="flex flex-wrap items-end gap-3 border-b border-[#e5e7eb] px-4 py-3">
                    <label className="flex w-full flex-1 flex-col gap-1 sm:min-w-52">
                        <span className="text-[11px] font-semibold text-[#475569]">Search inventory</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Part, SKU, supplier, or location"
                            className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                        />
                    </label>
                    <div className="grid w-full grid-cols-1 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
                        {canAdjust ? <AddPartDrawer onPartAdded={() => router.refresh()} trigger="+ Add SKU" /> : null}
                        {canTransfer ? (
                            <button
                                type="button"
                                onClick={() => setActiveWizard('transfer')}
                                disabled={locations.length === 0}
                                className="rounded-md border border-[#0f766e] px-3 py-1.5 text-xs font-semibold text-[#0f766e] hover:bg-[#f0fdf4] disabled:opacity-40"
                                title={locations.length === 0 ? 'Add stock before creating a transfer' : undefined}
                            >
                                Transfer Stock
                            </button>
                        ) : null}
                        {canAdjust ? (
                            <button
                                type="button"
                                onClick={() => setActiveWizard('purchase-order')}
                                className="rounded-md bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d5f56]"
                            >
                                + New Purchase Order
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Location Filter Tabs */}
                <div className="flex gap-0 overflow-x-auto border-b border-[#e5e7eb] text-xs">
                    {([['all', 'All'] as const, ...Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => [k as LocationType, v] as const)]).map(([type, label]) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setLocationFilter(type)}
                            className={`whitespace-nowrap px-4 py-2.5 font-medium transition-colors ${locationFilter === type
                                ? 'border-b-2 border-[#0f766e] text-[#0f766e]'
                                : 'text-[#64748b] hover:text-[#334155]'
                                }`}
                        >
                            {label}
                            {type !== 'all' && (
                                <span className="ml-1.5 rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[10px]">
                                    {locationCounts[type]}
                                </span>
                            )}
                            {type === 'all' && (
                                <span className="ml-1.5 rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[10px]">
                                    {totalSkus}
                                </span>
                            )}
                        </button>
                    ))}
                    <div className="ml-auto hidden items-center gap-1 px-3 md:flex" aria-label="Catalog view">
                        <button
                            type="button"
                            onClick={() => setCatalogView('table')}
                            aria-pressed={catalogView === 'table'}
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${catalogView === 'table' ? 'bg-[#e2e8f0] text-[#0f172a]' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}
                        >
                            Table
                        </button>
                        <button
                            type="button"
                            onClick={() => setCatalogView('cards')}
                            aria-pressed={catalogView === 'cards'}
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${catalogView === 'cards' ? 'bg-[#e2e8f0] text-[#0f172a]' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}
                        >
                            Cards
                        </button>
                    </div>
                </div>

                <div className={`grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3 ${catalogView === 'table' ? 'md:hidden' : ''}`}>
                    {filteredRows.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#64748b]">
                            {search ? `No results for "${search}"` : 'No parts in this location.'}
                        </p>
                    ) : (
                        filteredRows.map((part) => <InventorySkuCard key={`${part.id}:${part.location}`} part={part} />)
                    )}
                </div>

                {/* Desktop table */}
                <div className={`hidden overflow-x-auto ${catalogView === 'table' ? 'md:block' : ''}`}>
                    <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569]">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold">Part / SKU</th>
                                <th className="px-4 py-2.5 font-semibold">Location</th>
                                <th className="px-4 py-2.5 font-semibold">Stock</th>
                                <th className="px-4 py-2.5 font-semibold">Status</th>
                                <th className="px-4 py-2.5 font-semibold">Supplier</th>
                                <th className="px-4 py-2.5 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] bg-white">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-[#64748b]">
                                        {search ? `No results for "${search}"` : 'No parts in this location.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((part) => {
                                    const isLowStock = part.available <= part.reorderPoint;
                                    return (
                                        <tr key={`${part.id}:${part.location}`} className="align-middle hover:bg-[#f9fafb]">
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/inventory/parts/${part.id}`}
                                                    aria-label={`Open ${part.itemName}, SKU ${part.sku}`}
                                                    className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                                                >
                                                    <p className="font-semibold text-[#0f172a] group-hover:text-[#0f766e] group-hover:underline">
                                                        {part.itemName}
                                                    </p>
                                                    <p className="font-mono text-[11px] font-semibold text-[#64748b]">SKU {part.sku}</p>
                                                    <p className="mt-1 max-w-64 truncate text-[10px] text-[#94a3b8]">
                                                        {part.compatibilityNote || part.serviceLines.join(' · ')}
                                                    </p>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${categorizeLocation(part.location) === 'van'
                                                    ? 'bg-[#dbeafe] text-[#1e40af]'
                                                    : categorizeLocation(part.location) === 'shop'
                                                        ? 'bg-[#d1fae5] text-[#065f46]'
                                                        : 'bg-[#f1f5f9] text-[#475569]'
                                                    }`}>
                                                    {formatLocationLabel(part.location)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-[#0f172a]">
                                                    {part.available} <span className="font-normal text-[#64748b]">avail</span>
                                                </p>
                                                <p className="text-[11px] text-[#64748b]">{part.onHand} on hand · {part.reserved} reserved</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isLowStock ? (
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${part.severity === 'critical'
                                                        ? 'bg-[#fee2e2] text-[#991b1b]'
                                                        : 'bg-[#fff7ed] text-[#92400e]'
                                                        }`}>
                                                        {part.severity}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                                                        OK
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[#334155]">{part.supplier}</td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/inventory/parts/${part.id}`}
                                                    aria-label={`View details for ${part.itemName}`}
                                                    className="whitespace-nowrap text-[11px] font-semibold text-[#0f766e] hover:underline"
                                                >
                                                    Open details →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredRows.length > 0 && (
                    <div className="border-t border-[#e5e7eb] px-4 py-2 text-[11px] text-[#64748b]">
                        {filteredRows.length} of {totalSkus} parts shown
                    </div>
                )}
            </section>

            {/* Wizards */}
            {activeWizard === 'transfer' && (
                <TransferWizard
                    catalogRows={catalogRows}
                    locations={locations}
                    onClose={() => {
                        setActiveWizard(null);
                        router.refresh();
                    }}
                />
            )}
            {activeWizard === 'purchase-order' && (
                <PurchaseOrderWizard
                    catalogRows={catalogRows}
                    locations={locations}
                    onClose={() => {
                        setActiveWizard(null);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
