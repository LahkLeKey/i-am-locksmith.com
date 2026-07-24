import { requireRouteContext } from '@/lib/rbac/guard';
import { formatSchedule } from '@/lib/dashboard/format';
import { getInventoryPartById } from '@/lib/inventory/parts-repository';
import { listInventorySkuLocationBalances, listInventoryLedgerEntries } from '@/lib/inventory/ledger-repository';
import Link from 'next/link';

function formatScheduleSafe(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  return formatSchedule(isoDate);
}

function requireOrgId(orgId: string | null): string {
  if (!orgId) {
    throw new Error('Inventory requires an active organization');
  }

  return orgId;
}

type PartDetailPageParams = Promise<{ partId: string }>;

export default async function PartDetailPage(props: { params: PartDetailPageParams }) {
  const params = await props.params;
  const { partId } = params;
  
  const context = await requireRouteContext('/inventory');
  const orgId = requireOrgId(context.orgId);

  const part = await getInventoryPartById(partId);

  if (!part) {
    return (
      <section className="space-y-4">
        <Link
          href="/inventory/catalog"
          className="text-xs text-[#0f766e] hover:underline"
        >
          ← Back to Catalog
        </Link>
        <div className="rounded-md border border-[#e5e7eb] bg-[#fff7ed] p-4">
          <p className="text-sm font-semibold text-[#92400e]">Part not found</p>
          <p className="mt-1 text-xs text-[#78350f]">
            The part you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </section>
    );
  }

  const balancesByLocation = await listInventorySkuLocationBalances(orgId);
  const partBalances = balancesByLocation.filter((b) => b.sku.toLowerCase() === part.sku.toLowerCase());
  const recentEntries = await listInventoryLedgerEntries(orgId, { sku: part.sku });
  const partTimeline = recentEntries.slice(0, 10);

  const totalOnHand = partBalances.reduce((sum, b) => sum + b.onHand, 0);
  const totalReserved = partBalances.reduce((sum, b) => sum + b.reserved, 0);
  const totalAvailable = partBalances.reduce((sum, b) => sum + b.available, 0);
  const totalShortage = Math.max(0, part.reorderPoint - totalAvailable);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/inventory/catalog"
            className="text-xs text-[#0f766e] hover:underline"
          >
            ← Back to Catalog
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{part.itemName}</h1>
          <p className="mt-1 text-sm text-[#4b5563]">SKU: {part.sku}</p>
        </div>
        <div className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2">
          <p className="text-xs text-[#6b7280]">Unit Cost</p>
          <p className="mt-1 text-lg font-semibold">${part.estimatedUnitCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <p className="text-xs text-[#6b7280]">Supplier</p>
          <p className="mt-1 text-sm font-semibold">{part.supplier}</p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <p className="text-xs text-[#6b7280]">Service Lines</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {part.serviceLines.length > 0 ? (
              part.serviceLines.map((line) => (
                <span
                  key={line}
                  className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-semibold text-[#0c4a6e]"
                >
                  {line}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#6b7280]">None assigned</span>
            )}
          </div>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <p className="text-xs text-[#6b7280]">Compatibility Notes</p>
          <p className="mt-1 text-sm">{part.compatibilityNote || '—'}</p>
        </article>
        <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
          <p className="text-xs text-[#6b7280]">Reorder Policy</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>Point: {part.reorderPoint}</p>
            <p>Qty: {part.suggestedOrderQty}</p>
          </div>
        </article>
      </div>

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h2 className="font-semibold">Stock Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-[#f9fafb] p-3">
            <p className="text-xs text-[#6b7280]">On Hand</p>
            <p className="mt-1 text-xl font-semibold text-[#1f2937]">{totalOnHand}</p>
          </div>
          <div className="rounded-md bg-[#f9fafb] p-3">
            <p className="text-xs text-[#6b7280]">Reserved</p>
            <p className="mt-1 text-xl font-semibold text-[#1f2937]">{totalReserved}</p>
          </div>
          <div className="rounded-md bg-[#f9fafb] p-3">
            <p className="text-xs text-[#6b7280]">Available</p>
            <p className="mt-1 text-xl font-semibold text-[#1f2937]">{totalAvailable}</p>
          </div>
          <div className={`rounded-md p-3 ${totalShortage > 0 ? 'bg-[#fee2e2]' : 'bg-[#f9fafb]'}`}>
            <p className={`text-xs ${totalShortage > 0 ? 'text-[#991b1b]' : 'text-[#6b7280]'}`}>
              {totalShortage > 0 ? 'Shortage' : 'Status'}
            </p>
            <p className={`mt-1 text-xl font-semibold ${totalShortage > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
              {totalShortage > 0 ? totalShortage : 'OK'}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h2 className="font-semibold">Stock by Location</h2>
        {partBalances.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left">
                  <th className="px-3 py-2 font-semibold text-[#6b7280]">Location</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">On Hand</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Reserved</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Available</th>
                </tr>
              </thead>
              <tbody>
                {partBalances.map((balance) => (
                  <tr key={balance.location} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2">{balance.location}</td>
                    <td className="px-3 py-2 text-right">{balance.onHand}</td>
                    <td className="px-3 py-2 text-right">{balance.reserved}</td>
                    <td className="px-3 py-2 text-right">{balance.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#6b7280]">No stock recorded in any location.</p>
        )}
      </article>

      <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
        <h2 className="font-semibold">Recent Transactions</h2>
        {partTimeline.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left">
                  <th className="px-3 py-2 font-semibold text-[#6b7280]">Type</th>
                  <th className="px-3 py-2 text-right font-semibold text-[#6b7280]">Delta</th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280]">Note</th>
                  <th className="px-3 py-2 font-semibold text-[#6b7280]">Date</th>
                </tr>
              </thead>
              <tbody>
                {partTimeline.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#e5e7eb]">
                    <td className="px-3 py-2">{entry.kind}</td>
                    <td className={`px-3 py-2 text-right ${entry.delta > 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                      {entry.delta > 0 ? '+' : ''}{entry.delta}
                    </td>
                    <td className="px-3 py-2 text-[#6b7280]">{entry.note || '—'}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{formatScheduleSafe(entry.createdAt.toString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#6b7280]">No recent transactions.</p>
        )}
      </article>
    </section>
  );
}
