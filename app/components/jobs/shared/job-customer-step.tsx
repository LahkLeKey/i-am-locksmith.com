"use client";

import { useMemo, useState } from 'react';

import { GeoAddressField } from '@/app/components/shared/geo-address-field';
import type { CustomerRecord, ServiceSiteRecord } from '@/lib/customers/types';
import type { GeocodeResult } from '@/lib/geo/types';

type JobCustomerStepProps = {
    customers: CustomerRecord[];
    customerId: string;
    serviceSiteId: string;
    customerName: string;
    site: string;
    siteCoordinates: GeocodeResult | null;
    onCustomerIdChange: (value: string) => void;
    onServiceSiteIdChange: (value: string) => void;
    onCustomerNameChange: (value: string) => void;
    onSiteChange: (value: string) => void;
    onSiteResolved: (value: GeocodeResult | null) => void;
    onCustomerCreated: (customer: CustomerRecord) => void;
    onCustomerUpdated: (customer: CustomerRecord) => void;
};

function siteAsGeocodeResult(site: ServiceSiteRecord): GeocodeResult | null {
    if (site.latitude === null || site.longitude === null) return null;
    return {
        displayName: site.address,
        latitude: site.latitude,
        longitude: site.longitude,
        osmType: 'crm-site',
        osmId: 0,
    };
}

export function JobCustomerStep({
    customers,
    customerId,
    serviceSiteId,
    customerName,
    site,
    siteCoordinates,
    onCustomerIdChange,
    onServiceSiteIdChange,
    onCustomerNameChange,
    onSiteChange,
    onSiteResolved,
    onCustomerCreated,
    onCustomerUpdated,
}: JobCustomerStepProps) {
    const [mode, setMode] = useState<'existing' | 'new'>(customers.length > 0 ? 'existing' : 'new');
    const [search, setSearch] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [siteLabel, setSiteLabel] = useState('Primary site');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddingSite, setIsAddingSite] = useState(false);

    const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
    const filteredCustomers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return customers;
        return customers.filter((customer) =>
            [customer.displayName, customer.email, customer.phone]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query));
    }, [customers, search]);

    function chooseSite(customer: CustomerRecord, selectedSite: ServiceSiteRecord) {
        onCustomerIdChange(customer.id);
        onServiceSiteIdChange(selectedSite.id);
        onCustomerNameChange(customer.displayName);
        onSiteChange(selectedSite.address);
        onSiteResolved(siteAsGeocodeResult(selectedSite));
    }

    async function createCustomer() {
        setError(null);
        if (!customerName.trim() || !siteLabel.trim() || !site.trim()) {
            setError('Customer name, site label, and service address are required.');
            return;
        }
        setIsCreating(true);
        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    displayName: customerName,
                    email,
                    phone,
                    site: {
                        label: siteLabel,
                        address: site,
                        latitude: siteCoordinates?.latitude ?? null,
                        longitude: siteCoordinates?.longitude ?? null,
                    },
                }),
            });
            const payload = await response.json() as { customer?: CustomerRecord; error?: string };
            if (!response.ok || !payload.customer) {
                setError(payload.error ?? 'Unable to create customer.');
                return;
            }
            onCustomerCreated(payload.customer);
            const primarySite = payload.customer.sites[0];
            if (primarySite) chooseSite(payload.customer, primarySite);
            setMode('existing');
        } catch {
            setError('Unable to create customer. Please retry.');
        } finally {
            setIsCreating(false);
        }
    }

    async function createSite() {
        if (!selectedCustomer || !siteLabel.trim() || !site.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            const response = await fetch(`/api/customers/${selectedCustomer.id}/sites`, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ label: siteLabel, address: site, latitude: siteCoordinates?.latitude ?? null, longitude: siteCoordinates?.longitude ?? null }),
            });
            const payload = await response.json() as { site?: ServiceSiteRecord; error?: string };
            if (!response.ok || !payload.site) return setError(payload.error ?? 'Unable to add service site.');
            const updated = { ...selectedCustomer, sites: [...selectedCustomer.sites, payload.site] };
            onCustomerUpdated(updated);
            chooseSite(updated, payload.site);
            setIsAddingSite(false);
        } catch { setError('Unable to add service site. Please retry.'); } finally { setIsCreating(false); }
    }

    return (
        <section className="space-y-4" aria-labelledby="customer-site-heading">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dbe3f0] pb-3">
                <div>
                    <h2 id="customer-site-heading" className="text-sm font-semibold text-[#0f172a]">Customer & service site</h2>
                    <p className="mt-1 text-xs text-[#64748b]">Reuse CRM details or add a customer without leaving job intake.</p>
                </div>
                <div className="inline-flex rounded-md border border-[#cbd5e1] bg-white p-0.5" aria-label="Customer entry mode">
                    <button type="button" aria-pressed={mode === 'existing'} onClick={() => setMode('existing')} disabled={customers.length === 0} className={`px-3 py-1.5 text-xs font-semibold ${mode === 'existing' ? 'bg-[#0f766e] text-white' : 'text-[#475569]'} disabled:opacity-40`}>Existing customer</button>
                    <button type="button" aria-pressed={mode === 'new'} onClick={() => {
                        setMode('new');
                        onCustomerIdChange('');
                        onServiceSiteIdChange('');
                        onCustomerNameChange('');
                        onSiteChange('');
                        onSiteResolved(null);
                    }} className={`px-3 py-1.5 text-xs font-semibold ${mode === 'new' ? 'bg-[#0f766e] text-white' : 'text-[#475569]'}`}>New customer</button>
                </div>
            </div>

            {mode === 'existing' ? (
                <div className="grid min-h-80 gap-5 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
                    <div className="space-y-3 border-b border-[#e2e8f0] pb-4 lg:border-r lg:border-b-0 lg:pr-5">
                        <label className="block space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Find customer</span>
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, or email" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" />
                        </label>
                        <div className="max-h-64 overflow-y-auto border-y border-[#e2e8f0]">
                            {filteredCustomers.map((customer) => (
                                <button key={customer.id} type="button" onClick={() => {
                                    onCustomerIdChange(customer.id);
                                    onCustomerNameChange(customer.displayName);
                                    const primarySite = customer.sites.find((candidate) => candidate.isPrimary) ?? customer.sites[0];
                                    if (primarySite) chooseSite(customer, primarySite);
                                }} className={`block w-full border-b border-[#e2e8f0] px-3 py-3 text-left last:border-b-0 ${customer.id === customerId ? 'bg-[#ecfdf5]' : 'hover:bg-[#f8fafc]'}`}>
                                    <span className="block text-sm font-semibold text-[#0f172a]">{customer.displayName}</span>
                                    <span className="mt-1 block text-[11px] text-[#64748b]">{customer.phone || customer.email || 'No contact details'} · {customer.sites.length} site{customer.sites.length === 1 ? '' : 's'}</span>
                                </button>
                            ))}
                            {filteredCustomers.length === 0 ? <p className="px-3 py-5 text-center text-xs text-[#64748b]">No matching customers.</p> : null}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {selectedCustomer ? (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-[#0f172a]">{selectedCustomer.displayName}</p>
                                        <p className="text-xs text-[#64748b]">{[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                                    </div>
                                    <button type="button" onClick={() => { setIsAddingSite(true); onSiteChange(''); onSiteResolved(null); setSiteLabel('Service site'); }} className="text-xs font-semibold text-[#0f766e]">+ Add service site</button>
                                </div>
                                {isAddingSite ? <div className="space-y-3 border-y border-[#dbe3f0] py-3">
                                    <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Site label</span><input value={siteLabel} onChange={(event) => setSiteLabel(event.target.value)} className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" /></label>
                                    <GeoAddressField label="New service address" value={site} onChange={onSiteChange} onResolved={onSiteResolved} resolvedLocation={siteCoordinates} required />
                                    {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
                                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddingSite(false)} className="px-3 py-2 text-xs font-semibold text-[#475569]">Cancel</button><button type="button" onClick={createSite} disabled={isCreating || !site.trim()} className="rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save site</button></div>
                                </div> : <><div className="grid gap-2 sm:grid-cols-2">
                                    {selectedCustomer.sites.map((candidate) => (
                                        <button key={candidate.id} type="button" aria-pressed={candidate.id === serviceSiteId} onClick={() => chooseSite(selectedCustomer, candidate)} className={`border px-3 py-3 text-left ${candidate.id === serviceSiteId ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#dbe3f0] bg-white hover:bg-[#f8fafc]'}`}>
                                            <span className="block text-xs font-semibold text-[#0f172a]">{candidate.label}</span>
                                            <span className="mt-1 block text-[11px] text-[#64748b]">{candidate.address}</span>
                                        </button>
                                    ))}
                                </div>
                                    {siteCoordinates ? <GeoAddressField label="Selected service address" value={site} onChange={onSiteChange} onResolved={onSiteResolved} resolvedLocation={siteCoordinates} readOnly /> : <p className="border-l-2 border-[#f59e0b] pl-3 text-xs text-[#92400e]">This saved site has no verified coordinates. Add a new verified site when location accuracy is required.</p>}</>}
                            </>
                        ) : <div className="grid min-h-64 place-items-center border-y border-[#e2e8f0] text-xs text-[#64748b]">Select a customer to view service sites.</div>}
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)]">
                    <div className="space-y-3 border-b border-[#e2e8f0] pb-4 lg:border-r lg:border-b-0 lg:pr-5">
                        <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Customer name</span><input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Person or business name" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" required /></label>
                        <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Primary callback number" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" /></label>
                        <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" /></label>
                    </div>
                    <div className="space-y-3">
                        <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Site label</span><input value={siteLabel} onChange={(event) => setSiteLabel(event.target.value)} placeholder="Home, storefront, north entrance" className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-xs" required /></label>
                        <GeoAddressField label="Service address" value={site} onChange={onSiteChange} onResolved={onSiteResolved} resolvedLocation={siteCoordinates} required />
                        {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
                        <div className="flex justify-end"><button type="button" onClick={createCustomer} disabled={isCreating || !customerName.trim() || !site.trim()} className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isCreating ? 'Saving customer...' : 'Save customer & site'}</button></div>
                    </div>
                </div>
            )}
        </section>
    );
}