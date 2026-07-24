import { requireRouteContext } from '@/lib/rbac/guard';
import { hasPermission } from '@/lib/rbac/policy';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventorySkuLocationBalances } from '@/lib/inventory/ledger-repository';
import { listInventoryExceptions } from '@/lib/inventory/exceptions-repository';
import {
  listIncomingQuantitiesBySkuLocation,
  listOpenReplenishmentRequests,
} from '@/lib/inventory/replenishment-repository';
import { buildInventoryReadModel, type InventoryPartSource } from '@/lib/inventory/read-model';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { listJobRecords } from '@/lib/jobs/repository';
import { listTechnicians } from '@/lib/technicians/repository';

import { InventoryExceptionPanel } from '@/app/components/inventory-exception-panel';
import { InventoryReplenishmentPanel } from '@/app/components/inventory-replenishment-panel';
import { JobsCrudPanel } from '@/app/components/jobs-crud-panel';

const INVENTORY_SERVICE_LINES = ['automotive', 'mobile', 'shop'] as const;

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

export default async function JobsPage() {
  const context = await requireRouteContext('/jobs');
  if (!context.orgId) {
    throw new Error('Jobs requires an active organization');
  }

  const canReadInventory = hasPermission(
    context.effectivePermissions,
    'inventory.read',
  );

  const jobs = await listJobRecords(context.orgId);
  const technicians = await listTechnicians(context.orgId);
  const dashboardData = canReadInventory ?
    await getDashboardData({ orgId: context.orgId }) :
    null;
  const inventoryParts = canReadInventory ?
    await listInventoryParts(context.orgId) :
    [];
  const inventoryBalances = canReadInventory ?
    await listInventorySkuLocationBalances(context.orgId) :
    [];
  const inventoryExceptions = canReadInventory ?
    await listInventoryExceptions(context.orgId) :
    [];
  const openRequests = canReadInventory ?
    await listOpenReplenishmentRequests(context.orgId) :
    [];
  const incomingBySkuLocation = canReadInventory ?
    await listIncomingQuantitiesBySkuLocation(context.orgId) :
    [];
  const inventoryBalanceLookup = new Map(
    inventoryBalances.map((entry) => [`${entry.sku.toLowerCase()}::${entry.location.toLowerCase()}`, entry]),
  );
  const inventory = canReadInventory && dashboardData ?
    buildInventoryReadModel(
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
    ) :
    null;
  const inventoryLookupParts = inventoryParts.map((part) => ({
    id: part.id,
    sku: part.sku,
    itemName: part.itemName,
    estimatedUnitCost: part.estimatedUnitCost,
    location: part.location,
    onHand: inventoryBalanceLookup.get(
      `${part.sku.toLowerCase()}::${part.location.toLowerCase()}`,
    )?.onHand ?? part.onHand,
    available: inventoryBalanceLookup.get(
      `${part.sku.toLowerCase()}::${part.location.toLowerCase()}`,
    )?.available ?? part.onHand,
  }));

  return (
    <section className="space-y-4">
      <article className="px-1 py-1">
        <h1 className="text-2xl font-semibold text-[#0f172a]">Jobs Operations</h1>
        <p className="mt-1 text-sm text-[#4b5563]">
          Manage quote intake, dispatch, closeout financials, and inventory actions in one operational queue.
        </p>
      </article>
      <JobsCrudPanel
        initialJobs={jobs}
        inventoryLookupParts={inventoryLookupParts}
        technicians={technicians.map((item) => ({
          id: item.id,
          fullName: item.fullName,
          hourlyRate: item.hourlyRate,
          availabilityStatus: item.availabilityStatus,
          isActive: item.isActive,
        }))}
      />
      {canReadInventory && inventory ? (
        <>
          <InventoryReplenishmentPanel
            queue={inventory.lowStockQueue}
            openRequests={openRequests}
          />
          <InventoryExceptionPanel exceptions={inventoryExceptions} />
        </>
      ) : null}
    </section>
  );
}
