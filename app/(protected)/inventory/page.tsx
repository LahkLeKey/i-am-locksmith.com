import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function InventoryPage() {
  await requireRoutePermission('/inventory');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="text-sm text-[#4b5563]">
        Inventory workspace placeholder for MVP.
      </p>
    </section>
  );
}
