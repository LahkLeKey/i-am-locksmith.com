import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function CustomersPage() {
  await requireRoutePermission('/customers');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <p className="text-sm text-[#4b5563]">
        Customer workspace placeholder for MVP.
      </p>
    </section>
  );
}
