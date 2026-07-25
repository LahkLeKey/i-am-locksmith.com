"use client";

import Link from 'next/link';
import {useMemo, useState} from 'react';

import {GeoAddressField} from '@/app/components/shared/geo-address-field';
import type {CustomerRecord, ServiceSiteRecord} from '@/lib/customers/types';
import type {GeocodeResult} from '@/lib/geo/types';

type CustomerDraft = Pick<CustomerRecord, 'displayName' | 'email' | 'phone' | 'notes'>;
type SiteDraft = Pick<ServiceSiteRecord, 'id' | 'label' | 'address' | 'isPrimary'> & {
  coordinates: GeocodeResult | null;
};

function customerDraft(customer?: CustomerRecord): CustomerDraft {
  return {
    displayName: customer?.displayName ?? '', email: customer?.email ?? '',
    phone: customer?.phone ?? '', notes: customer?.notes ?? '',
  };
}

function siteDraft(site?: ServiceSiteRecord): SiteDraft {
  return {
    id: site?.id ?? '', label: site?.label ?? 'Primary site',
    address: site?.address ?? '', isPrimary: site?.isPrimary ?? false,
    coordinates: site?.latitude != null && site.longitude != null ? {
      displayName: site.address, latitude: site.latitude,
      longitude: site.longitude, osmType: 'crm-site', osmId: 0,
    } : null,
  };
}

export function CustomersAdminPanel({
  initialCustomers, canManage,
}: {initialCustomers: CustomerRecord[]; canManage: boolean}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedId, setSelectedId] = useState(initialCustomers[0]?.id ?? '');
  const [selectedSiteId, setSelectedSiteId] = useState(initialCustomers[0]?.sites[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'view' | 'new-customer' | 'new-site'>('view');
  const [profile, setProfile] = useState(customerDraft(initialCustomers[0]));
  const [site, setSite] = useState(siteDraft(initialCustomers[0]?.sites[0]));
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = customers.find((customer) => customer.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((customer) =>
      [customer.displayName, customer.phone, customer.email,
       ...customer.sites.map((entry) => `${entry.label} ${entry.address}`)]
          .filter(Boolean).join(' ').toLowerCase().includes(normalized));
  }, [customers, query]);
  const geocodedSites = customers.reduce(
      (count, customer) => count + customer.sites.filter(
          (entry) => entry.latitude !== null && entry.longitude !== null).length,
      0);

  function selectCustomer(customer: CustomerRecord) {
    const primary = customer.sites.find((entry) => entry.isPrimary) ?? customer.sites[0];
    setSelectedId(customer.id);
    setSelectedSiteId(primary?.id ?? '');
    setProfile(customerDraft(customer));
    setSite(siteDraft(primary));
    setMode('view');
    setFeedback(null);
    setError(null);
  }

  function selectSite(nextSite: ServiceSiteRecord) {
    setSelectedSiteId(nextSite.id);
    setSite(siteDraft(nextSite));
    setMode('view');
  }

  function updateCustomerState(next: CustomerRecord) {
    setCustomers((current) => current.map(
        (customer) => customer.id === next.id ? next : customer)
        .sort((left, right) => left.displayName.localeCompare(right.displayName)));
    setSelectedId(next.id);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setIsPending(true); setError(null); setFeedback(null);
    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH', headers: {'content-type': 'application/json'},
        body: JSON.stringify({id: selected.id, ...profile}),
      });
      const payload = await response.json() as {customer?: CustomerRecord; error?: string; message?: string};
      if (!response.ok || !payload.customer) return setError(payload.error ?? 'Unable to update customer.');
      updateCustomerState(payload.customer);
      setFeedback(payload.message ?? 'Customer updated.');
    } catch { setError('Request failed. Please retry.'); } finally { setIsPending(false); }
  }

  async function saveSite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setIsPending(true); setError(null); setFeedback(null);
    const isNew = mode === 'new-site';
    try {
      const response = await fetch(`/api/customers/${selected.id}/sites`, {
        method: isNew ? 'POST' : 'PATCH', headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          ...site, latitude: site.coordinates?.latitude ?? null,
          longitude: site.coordinates?.longitude ?? null,
        }),
      });
      const payload = await response.json() as {site?: ServiceSiteRecord; error?: string};
      if (!response.ok || !payload.site) return setError(payload.error ?? 'Unable to save service site.');
      const nextSites = isNew ? [...selected.sites, payload.site] :
        selected.sites.map((entry) => entry.id === payload.site!.id ? payload.site! :
          payload.site!.isPrimary ? {...entry, isPrimary: false} : entry);
      const next = {...selected, sites: nextSites};
      updateCustomerState(next);
      setSelectedSiteId(payload.site.id);
      setSite(siteDraft(payload.site));
      setMode('view');
      setFeedback(isNew ? 'Service site added.' : 'Service site updated.');
    } catch { setError('Request failed. Please retry.'); } finally { setIsPending(false); }
  }

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true); setError(null); setFeedback(null);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          ...profile,
          site: {
            label: site.label, address: site.address,
            latitude: site.coordinates?.latitude ?? null,
            longitude: site.coordinates?.longitude ?? null,
          },
        }),
      });
      const payload = await response.json() as {customer?: CustomerRecord; error?: string};
      if (!response.ok || !payload.customer) return setError(payload.error ?? 'Unable to create customer.');
      setCustomers((current) => [...current, payload.customer!]
          .sort((left, right) => left.displayName.localeCompare(right.displayName)));
      selectCustomer(payload.customer);
      setFeedback('Customer and primary site created.');
    } catch { setError('Request failed. Please retry.'); } finally { setIsPending(false); }
  }

  function beginCustomer() {
    setProfile(customerDraft());
    setSite(siteDraft());
    setSelectedSiteId('');
    setMode('new-customer');
    setError(null); setFeedback(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid overflow-hidden border-y border-[#dbe3e8] bg-white sm:grid-cols-3">
        <div className="p-4"><span className="text-xs font-semibold text-[#475569]">Customer records</span><strong className="mt-1 block text-2xl text-[#0f172a]">{customers.length}</strong></div>
        <div className="border-y border-[#e5e7eb] p-4 sm:border-x sm:border-y-0"><span className="text-xs font-semibold text-[#475569]">Service sites</span><strong className="mt-1 block text-2xl text-[#0f172a]">{customers.reduce((sum, customer) => sum + customer.sites.length, 0)}</strong></div>
        <div className="p-4"><span className="text-xs font-semibold text-[#475569]">Mapped locations</span><strong className="mt-1 block text-2xl text-[#0f766e]">{geocodedSites}</strong></div>
      </div>

      <div className="grid min-h-155 border-y border-[#dbe3e8] bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[#dbe3e8] lg:border-r lg:border-b-0">
          <div className="space-y-3 border-b border-[#e5e7eb] p-4">
            <label className="block space-y-1"><span className="text-[11px] font-semibold uppercase text-[#475569]">Find customer</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, contact, or address" className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm" /></label>
            {canManage ? <button type="button" onClick={beginCustomer} className="w-full rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white">+ New customer</button> : null}
          </div>
          <div className="max-h-115 overflow-y-auto lg:max-h-140">
            {filtered.map((customer) => (
              <button key={customer.id} type="button" onClick={() => selectCustomer(customer)} className={`block w-full border-b border-[#e5e7eb] px-4 py-3 text-left ${selectedId === customer.id && mode !== 'new-customer' ? 'bg-[#ecfdf5]' : 'hover:bg-[#f8fafc]'}`}>
                <span className="block text-sm font-semibold text-[#0f172a]">{customer.displayName}</span>
                <span className="mt-1 block truncate text-xs text-[#64748b]">{customer.phone || customer.email || 'No contact details'}</span>
                <span className="mt-1 block text-[11px] text-[#475569]">{customer.sites.length} service site{customer.sites.length === 1 ? '' : 's'}</span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="p-6 text-center text-sm text-[#64748b]">No matching customers.</p> : null}
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6">
          {mode === 'new-customer' ? (
            <form onSubmit={createCustomer} className="space-y-6">
              <div><h2 className="text-lg font-semibold text-[#0f172a]">New customer</h2><p className="mt-1 text-xs text-[#64748b]">Create the customer relationship and its first service location together.</p></div>
              <CustomerFields profile={profile} setProfile={setProfile} />
              <div className="border-t border-[#dbe3e8] pt-5"><h3 className="text-sm font-semibold text-[#0f172a]">Primary service site</h3><SiteFields site={site} setSite={setSite} /></div>
              <FormMessages error={error} feedback={feedback} />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => selected ? selectCustomer(selected) : setMode('view')} className="px-3 py-2 text-xs font-semibold text-[#475569]">Cancel</button><button disabled={isPending} className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Creating...' : 'Create customer'}</button></div>
            </form>
          ) : selected ? (
            <div className="space-y-6">
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#0f172a]">{selected.displayName}</h2><p className="mt-1 text-xs text-[#64748b]">Customer profile and dispatch context</p></div>{canManage ? <button disabled={isPending} className="rounded-md border border-[#0f766e] px-3 py-2 text-xs font-semibold text-[#0f766e] disabled:opacity-50">Save profile</button> : null}</div>
                <CustomerFields profile={profile} setProfile={setProfile} disabled={!canManage} />
              </form>
              <section className="border-t border-[#dbe3e8] pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#0f172a]">Service sites</h3><p className="mt-1 text-xs text-[#64748b]">Addresses used for routing and job intake</p></div>{canManage ? <button type="button" onClick={() => { setMode('new-site'); setSite({...siteDraft(), label: `Site ${selected.sites.length + 1}`}); setSelectedSiteId(''); }} className="text-xs font-semibold text-[#0f766e]">+ Add service site</button> : null}</div>
                <div className="mt-4 flex gap-2 overflow-x-auto border-b border-[#e5e7eb] pb-2">
                  {selected.sites.map((entry) => <button key={entry.id} type="button" aria-pressed={entry.id === selectedSiteId} onClick={() => selectSite(entry)} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-semibold ${entry.id === selectedSiteId ? 'border-[#0f766e] text-[#0f766e]' : 'border-transparent text-[#64748b]'}`}>{entry.label}{entry.isPrimary ? ' · Primary' : ''}</button>)}
                </div>
                {(selectedSiteId || mode === 'new-site') ? <form onSubmit={saveSite} className="mt-4 space-y-4"><SiteFields site={site} setSite={setSite} disabled={!canManage} /><div className="flex flex-wrap justify-end gap-2">{mode === 'new-site' ? <button type="button" onClick={() => selectSite(selected.sites[0])} className="px-3 py-2 text-xs font-semibold text-[#475569]">Cancel</button> : <Link href={`/jobs?new=1&customer=${selected.id}&site=${selectedSiteId}`} className="rounded-md border border-[#0f766e] px-3 py-2 text-xs font-semibold text-[#0f766e]">Create job at this site</Link>}{canManage ? <button disabled={isPending} className="rounded-md bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Saving...' : mode === 'new-site' ? 'Add site' : 'Save site'}</button> : null}</div></form> : null}
              </section>
              <FormMessages error={error} feedback={feedback} />
            </div>
          ) : <div className="grid min-h-96 place-items-center text-sm text-[#64748b]">Select a customer or create the first record.</div>}
        </main>
      </div>
    </div>
  );
}

function CustomerFields({profile, setProfile, disabled = false}: {profile: CustomerDraft; setProfile: React.Dispatch<React.SetStateAction<CustomerDraft>>; disabled?: boolean}) {
  return <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-[11px] font-semibold uppercase text-[#475569]">Customer name</span><input required disabled={disabled} value={profile.displayName} onChange={(event) => setProfile((current) => ({...current, displayName: event.target.value}))} className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm disabled:bg-[#f8fafc]" /></label><label className="space-y-1"><span className="text-[11px] font-semibold uppercase text-[#475569]">Phone</span><input type="tel" disabled={disabled} value={profile.phone ?? ''} onChange={(event) => setProfile((current) => ({...current, phone: event.target.value}))} className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm disabled:bg-[#f8fafc]" /></label><label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-semibold uppercase text-[#475569]">Email</span><input type="email" disabled={disabled} value={profile.email ?? ''} onChange={(event) => setProfile((current) => ({...current, email: event.target.value}))} className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm disabled:bg-[#f8fafc]" /></label><label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-semibold uppercase text-[#475569]">Customer notes</span><textarea disabled={disabled} rows={3} value={profile.notes ?? ''} onChange={(event) => setProfile((current) => ({...current, notes: event.target.value}))} placeholder="Access preferences, billing context, or relationship notes" className="w-full resize-y rounded-md border border-[#cbd5e1] px-3 py-2 text-sm disabled:bg-[#f8fafc]" /></label></div>;
}

function SiteFields({site, setSite, disabled = false}: {site: SiteDraft; setSite: React.Dispatch<React.SetStateAction<SiteDraft>>; disabled?: boolean}) {
  return <div className="mt-3 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"><div className="space-y-3"><label className="block space-y-1"><span className="text-[11px] font-semibold uppercase text-[#475569]">Site label</span><input required disabled={disabled} value={site.label} onChange={(event) => setSite((current) => ({...current, label: event.target.value}))} className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm disabled:bg-[#f8fafc]" /></label><label className="flex items-center gap-2 text-xs font-semibold text-[#475569]"><input type="checkbox" disabled={disabled} checked={site.isPrimary} onChange={(event) => setSite((current) => ({...current, isPrimary: event.target.checked}))} />Primary service site</label><p className="text-xs text-[#64748b]">Primary sites are selected first during job intake.</p></div><GeoAddressField label="Service address" value={site.address} onChange={(address) => setSite((current) => ({...current, address}))} onResolved={(coordinates) => setSite((current) => ({...current, coordinates}))} resolvedLocation={site.coordinates} readOnly={disabled} required /></div>;
}

function FormMessages({error, feedback}: {error: string | null; feedback: string | null}) {
  return <>{error ? <p role="alert" className="text-xs text-[#b91c1c]">{error}</p> : null}{feedback ? <p role="status" className="text-xs text-[#166534]">{feedback}</p> : null}</>;
}