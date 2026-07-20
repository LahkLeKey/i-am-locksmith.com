import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function QuotesPage() {
  await requireRoutePermission('/quotes');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Quotes</h1>
      <p className="text-sm text-[#4b5563]">Quotes workspace placeholder for MVP.</p>
    </section>
  );
}
