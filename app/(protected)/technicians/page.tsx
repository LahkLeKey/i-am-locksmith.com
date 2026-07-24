import { TechniciansAdminPanel } from '@/app/components/jobs/shared/technicians-admin-panel';
import { requireRouteContext } from '@/lib/rbac/guard';
import { listTechnicians } from '@/lib/technicians/repository';

export default async function TechniciansPage() {
    const context = await requireRouteContext('/technicians');

    if (!context.orgId) {
        throw new Error('Technicians requires an active organization');
    }

    const technicians = await listTechnicians(context.orgId);

    return (
        <section className="space-y-6">
            <article className="rounded-md border border-[#e5e7eb] bg-white p-4">
                <h1 className="text-2xl font-semibold">Technicians</h1>
                <p className="mt-1 text-sm text-[#4b5563]">
                    Manage technician rates and availability used by job assignment and estimate calculations.
                </p>
            </article>
            <TechniciansAdminPanel
                initialTechnicians={technicians.map((item) => ({
                    id: item.id,
                    fullName: item.fullName,
                    hourlyRate: item.hourlyRate,
                    lockpickingSkills: item.lockpickingSkills,
                    availabilityStatus: item.availabilityStatus,
                    availabilityNote: item.availabilityNote,
                    isActive: item.isActive,
                }))}
            />
        </section>
    );
}
