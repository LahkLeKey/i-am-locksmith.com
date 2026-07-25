import { requireRouteContext } from '@/lib/rbac/guard';
import { hasPermission } from '@/lib/rbac/policy';
import { getDashboardData } from '@/lib/dashboard/repository';
import { listInventorySkuLocationBalances } from '@/lib/inventory/ledger-repository';
import { listInventoryExceptions } from '@/lib/inventory/exceptions-repository';
import {
  listIncomingQuantitiesBySkuLocation,
  listOpenReplenishmentRequests,
} from '@/lib/inventory/replenishment-repository';
import { buildInventoryReadModel, projectInventoryPartsByLocation, type InventoryPartSource } from '@/lib/inventory/read-model';
import { listInventoryParts } from '@/lib/inventory/parts-repository';
import { listInventoryLocations } from '@/lib/inventory/location-repository';
import { listInvoices } from '@/lib/invoices/repository';
import { listJobRecords } from '@/lib/jobs/repository';
import { listTechnicians } from '@/lib/technicians/repository';

import { InventoryExceptionPanel } from '@/app/components/inventory/shared/inventory-exception-panel';
import { InventoryReplenishmentPanel } from '@/app/components/inventory/shared/inventory-replenishment-panel';
import { JobsCrudPanel } from '@/app/components/jobs/shared/jobs-crud-panel';

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

  const [jobs, invoices] = await Promise.all([
    listJobRecords(context.orgId),
    listInvoices(context.orgId),
  ]);
  const technicians = await listTechnicians(context.orgId);
  const dashboardData = canReadInventory ?
    await getDashboardData({ orgId: context.orgId }) :
    null;
  const inventoryParts = canReadInventory ?
    await listInventoryParts(context.orgId) :
    [];
  const inventoryLocations = canReadInventory ?
    await listInventoryLocations(context.orgId) :
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
  const inventoryLookupParts = projectInventoryPartsByLocation(
    inventoryParts.map(toInventoryPartSource),
    inventoryBalances,
  ).map((part) => ({
    id: part.id,
    sku: part.sku,
    itemName: part.itemName,
    estimatedUnitCost: part.estimatedUnitCost,
    location: part.location,
    locationType: inventoryLocations.find(
      (location) => location.name.toLowerCase() === part.location.toLowerCase(),
    )?.type,
    onHand: part.onHand,
    available: part.available ?? part.onHand,
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
        canRecordPayments={hasPermission(
          context.effectivePermissions,
          'invoices.mark_paid',
        )}
        initialInvoices={invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          jobNumber: invoice.jobNumber,
          status: invoice.status,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          balanceDue: invoice.balanceDue,
          finalizedAt: invoice.finalizedAt?.toISOString() ?? null,
          notes: invoice.notes,
          payments: invoice.payments.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            receivedAt: payment.receivedAt.toISOString(),
          })),
        }))}
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
          {inventory.lowStockQueue.length > 0 || openRequests.length > 0 ? (
            <InventoryReplenishmentPanel
              queue={inventory.lowStockQueue}
              openRequests={openRequests}
            />
          ) : null}
          {inventoryExceptions.length > 0 ? (
            <InventoryExceptionPanel exceptions={inventoryExceptions} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
