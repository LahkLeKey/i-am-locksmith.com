import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function DashboardPage() {
  await requireRoutePermission('/dashboard');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
      <p className="text-sm text-[#4b5563]">
        This authenticated shell route is guarded by action-based RBAC.
      </p>
    </section>
  );
}
