import { requireRouteContext } from '@/lib/rbac/guard';
import Link from 'next/link';

export default async function SettingsPage() {
  const context = await requireRouteContext('/settings');
  const permissions = [...context.effectivePermissions].sort();
  const role = context.userRole ?? context.orgRole;

  return <section className="space-y-5">
    <header><h1 className="text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-[#4b5563]">Organization access and the operational defaults managed by each workspace.</p></header>
    <section className="border-y border-[#e5e7eb] py-4"><p className="text-xs font-semibold uppercase text-[#64748b]">Active organization</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-[#0f172a]">{context.orgId ?? 'No organization selected'}</p><p className="text-xs capitalize text-[#64748b]">{role?.replace('_', ' ') ?? 'Unscoped role'} · {permissions.length} effective permissions</p></div><Link href="/access" className="text-xs font-semibold text-[#0f766e] hover:underline">Review access guidance →</Link></div></section>
    <div className="grid gap-3 sm:grid-cols-3">
      <Link href="/technicians" className="border-b border-[#e5e7eb] p-4 hover:bg-[#f8fafc]"><p className="text-sm font-semibold">Team & rates</p><p className="mt-1 text-xs text-[#64748b]">Manage availability, skills, and labor rates.</p><p className="mt-3 text-xs font-semibold text-[#0f766e]">Open technicians →</p></Link>
      <Link href="/inventory" className="border-b border-[#e5e7eb] p-4 hover:bg-[#f8fafc]"><p className="text-sm font-semibold">Inventory policies</p><p className="mt-1 text-xs text-[#64748b]">Manage reorder points, suppliers, and locations.</p><p className="mt-3 text-xs font-semibold text-[#0f766e]">Open inventory →</p></Link>
      <Link href="/jobs" className="border-b border-[#e5e7eb] p-4 hover:bg-[#f8fafc]"><p className="text-sm font-semibold">Job workflow</p><p className="mt-1 text-xs text-[#64748b]">Manage intake, assignment, and closeout defaults in context.</p><p className="mt-3 text-xs font-semibold text-[#0f766e]">Open jobs →</p></Link>
    </div>
    <details className="border-y border-[#e5e7eb] py-3"><summary className="cursor-pointer text-sm font-semibold">Effective permissions ({permissions.length})</summary><div className="mt-3 flex flex-wrap gap-2">{permissions.map((permission) => <span key={permission} className="rounded-full bg-[#f1f5f9] px-2 py-1 text-[10px] font-semibold text-[#475569]">{permission}</span>)}</div></details>
  </section>;
}
