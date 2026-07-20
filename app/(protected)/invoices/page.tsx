import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function InvoicesPage() {
  await requireRoutePermission('/invoices');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <p className="text-sm text-[#4b5563]">
        Invoices workspace placeholder for MVP.
      </p>
    </section>
  );
}
