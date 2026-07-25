import Link from 'next/link';

import { categorizeLocation, formatLocationLabel } from '@/lib/inventory/locations';
import type { InventoryCatalogRow } from '@/lib/inventory/read-model';

const LOCATION_STYLES = {
    garage: 'bg-[#f1f5f9] text-[#475569]',
    van: 'bg-[#dbeafe] text-[#1e40af]',
    shop: 'bg-[#d1fae5] text-[#065f46]',
};

export function InventorySkuCard({ part }: { part: InventoryCatalogRow }) {
    const locationType = categorizeLocation(part.location);
    const isLowStock = part.available <= part.reorderPoint;

    return (
        <Link
            href={`/inventory/parts/${part.id}`}
            aria-label={`Open ${part.itemName}, SKU ${part.sku}`}
            className="group block rounded-md border border-[#e2e8f0] bg-white p-4 transition-colors hover:border-[#0f766e] hover:bg-[#f8fffe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0f172a] group-hover:text-[#0f766e]">
                        {part.itemName}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#64748b]">SKU {part.sku}</p>
                </div>
                <span className={`max-w-32 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${LOCATION_STYLES[locationType]}`} title={formatLocationLabel(part.location)}>
                    {formatLocationLabel(part.location)}
                </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#f1f5f9] py-3 text-center">
                <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{part.available}</p>
                    <p className="text-[10px] text-[#64748b]">Available</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{part.reserved}</p>
                    <p className="text-[10px] text-[#64748b]">Reserved</p>
                </div>
                <div>
                    <p className={`text-sm font-semibold ${isLowStock ? 'text-[#dc2626]' : 'text-[#166534]'}`}>
                        {isLowStock ? part.severity : 'OK'}
                    </p>
                    <p className="text-[10px] text-[#64748b]">Stock status</p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-[#64748b]">{part.supplier}</span>
                <span className="shrink-0 font-semibold text-[#0f766e]">View SKU details →</span>
            </div>
        </Link>
    );
}