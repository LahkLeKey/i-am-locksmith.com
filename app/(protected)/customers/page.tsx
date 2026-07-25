import {CustomersAdminPanel} from '@/app/components/customers/customers-admin-panel';
import {listCustomers} from '@/lib/customers/repository';
import {requireRouteContext} from '@/lib/rbac/guard';
import {hasPermission} from '@/lib/rbac/policy';

export default async function CustomersPage() {
  const context = await requireRouteContext('/customers');
  if (!context.orgId) throw new Error('Customers requires an active organization');
  const customers = await listCustomers(context.orgId);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Customers</h1>
        <p className="mt-1 text-sm text-[#4b5563]">
          Manage customer contact records and verified service locations used by job intake.
        </p>
      </header>
      <CustomersAdminPanel
        initialCustomers={customers}
        canManage={hasPermission(context.effectivePermissions, 'customers.manage')}
      />
    </section>
  );
}