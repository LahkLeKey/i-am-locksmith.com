import {requireRoutePermission} from '@/lib/rbac/guard';

export default async function SettingsPage() {
  await requireRoutePermission('/settings');

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-[#4b5563]">Settings workspace placeholder for MVP.</p>
    </section>
  );
}
