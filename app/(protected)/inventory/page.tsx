import { requireRouteContext } from '@/lib/rbac/guard';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventorySkuLocationBalances } from '@/lib/inventory/ledger-repository';
import { listIncomingQuantitiesBySkuLocation, listOpenReplenishmentRequests } from '@/lib/inventory/replenishment-repository';
import { buildInventoryReadModel, type InventoryPartSource } from '@/lib/inventory/read-model';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { InventoryLandingPanel } from '@/app/components/inventory/shared/inventory-landing-panel';

const INVENTORY_SERVICE_LINES = ['automotive', 'mobile', 'shop'] as const;

function requireOrgId(orgId: string | null): string {
  if (!orgId) throw new Error('Inventory requires an active organization');
  return orgId;
}

function toInventoryPartSource(part: Awaited<ReturnType<typeof listInventoryParts>>[number]): InventoryPartSource {
  return {
    ...part,
    serviceLines: part.serviceLines.filter(
      (s): s is typeof INVENTORY_SERVICE_LINES[number] =>
        INVENTORY_SERVICE_LINES.includes(s as typeof INVENTORY_SERVICE_LINES[number]),
    ),
    severity:
      part.severity === 'critical' || part.severity === 'high' || part.severity === 'medium' || part.severity === 'low'
        ? part.severity
        : 'medium',
  };
}

export default async function InventoryPage() {
  const context = await requireRouteContext('/inventory');
  const orgId = requireOrgId(context.orgId);

  const [dashboardData, inventoryParts, inventoryBalances, incomingBySkuLocation, openRequests] = await Promise.all([
    getDashboardData({ orgId }),
    listInventoryParts(orgId),
    listInventorySkuLocationBalances(orgId),
    listIncomingQuantitiesBySkuLocation(orgId),
    listOpenReplenishmentRequests(orgId),
  ]);

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
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Inventory</h1>
        <p className="mt-1 text-sm text-[#4b5563]">
          Parts catalog, stock levels, and warehousing across all locations.
        </p>
      </div>

      <InventoryLandingPanel
        catalogRows={inventory.catalogRows}
        lowStockCount={inventory.lowStockQueue.length}
        openPOCount={openRequests.length}
      />
    </section>
  );
}
