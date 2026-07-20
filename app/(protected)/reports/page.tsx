import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function ReportsPage() {
  await requireRoutePermission('/reports');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-[#4b5563]">Reports workspace placeholder for MVP.</p>
    </section>
  );
}
