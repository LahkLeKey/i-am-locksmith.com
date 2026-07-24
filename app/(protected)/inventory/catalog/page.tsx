import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventorySkuLocationBalances } from '@/lib/inventory/ledger-repository';
import { listIncomingQuantitiesBySkuLocation } from '@/lib/inventory/replenishment-repository';
import { buildInventoryReadModel, type InventoryPartSource } from '@/lib/inventory/read-model';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { InventoryCatalogPanel } from '@/app/components/inventory-catalog-panel';

const INVENTORY_SERVICE_LINES = ['automotive', 'mobile', 'shop'] as const;

function requireOrgId(orgId: string | null): string {
    if (!orgId) {
        throw new Error('Inventory requires an active organization');
    }

    return orgId;
}

function toInventoryPartSource(part: Awaited<ReturnType<typeof listInventoryParts>>[number]): InventoryPartSource {
    return {
        ...part,
        serviceLines: part.serviceLines.filter(
            (serviceLine): serviceLine is typeof INVENTORY_SERVICE_LINES[number] =>
                INVENTORY_SERVICE_LINES.includes(serviceLine as typeof INVENTORY_SERVICE_LINES[number]),
        ),
        severity: part.severity === 'critical' || part.severity === 'high' || part.severity === 'medium' || part.severity === 'low' ?
            part.severity : 'medium',
    };
}

export default async function InventoryCatalogPage() {
    const context = await requireRouteContext('/inventory');
    const orgId = requireOrgId(context.orgId);

    const dashboardData = await getDashboardData({ orgId });
    const inventoryParts = await listInventoryParts(orgId);
    const inventoryBalances = await listInventorySkuLocationBalances(orgId);
    const incomingBySkuLocation = await listIncomingQuantitiesBySkuLocation(orgId);
    const inventoryBalanceLookup = new Map(
        inventoryBalances.map((entry) => [`${entry.sku.toLowerCase()}::${entry.location.toLowerCase()}`, entry]),
    );
    const inventory = buildInventoryReadModel(
        dashboardData,
        inventoryParts.map((part) => {
            const balance = inventoryBalanceLookup.get(
                `${part.sku.toLowerCase()}::${part.location.toLowerCase()}`,
            );

            return {
                ...toInventoryPartSource(part),
                onHand: balance?.onHand ?? part.onHand,
                reserved: balance?.reserved ?? 0,
                available: balance?.available ?? part.onHand,
            };
        }),
        { incomingBySkuLocation },
    );

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Parts Catalog</h1>
                    <p className="mt-1 text-sm text-[#4b5563]">
                        Search, filter, and manage inventory parts.
                    </p>
                </div>
                <div className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white">
                    + Add Part
                </div>
            </div>

            <InventoryCatalogPanel initialParts={inventory.catalogRows} />
        </section>
    );
}
