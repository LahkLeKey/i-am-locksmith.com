import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function JobsPage() {
  await requireRoutePermission('/jobs');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      <p className="text-sm text-[#4b5563]">Jobs workspace placeholder for MVP.</p>
    </section>
  );
}
