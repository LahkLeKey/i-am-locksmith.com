import {prisma} from '@/lib/db/prisma';

import type {CustomerRecord} from './types';

export type CustomerCreateInput = {
  displayName: string; email: string | null; phone: string | null;
  notes: string | null;
  site: {
    label: string; address: string; latitude: number | null;
    longitude: number | null;
  };
};

export type CustomerUpdateInput = {
  displayName: string; email: string | null; phone: string | null;
  notes: string | null;
};

export type ServiceSiteUpdateInput = CustomerCreateInput['site'] & {
  isPrimary: boolean;
};

type CustomerRow = {
  id: string; orgId: string; displayName: string; email: string | null;
  phone: string | null;
  notes: string | null;
  sites: Array<{
    id: string; label: string; address: string; latitude: unknown;
    longitude: unknown;
    isPrimary: boolean;
  }>;
};

function toRecord(row: CustomerRow): CustomerRecord {
  return {
    ...row,
    sites: row.sites.map(
        (site) => ({
          ...site,
          latitude: site.latitude === null ? null : Number(site.latitude),
          longitude: site.longitude === null ? null : Number(site.longitude),
        })),
  };
}

export async function listCustomers(orgId: string): Promise<CustomerRecord[]> {
  const rows = await prisma.customer.findMany({
    where: {orgId},
    include: {sites: {orderBy: [{isPrimary: 'desc'}, {label: 'asc'}]}},
    orderBy: {displayName: 'asc'},
  });
  return rows.map(toRecord);
}

export async function createCustomerWithSite(
    orgId: string, input: CustomerCreateInput): Promise<CustomerRecord> {
  const row = await prisma.customer.create({
    data: {
      orgId,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      sites: {
        create: {
          orgId,
          label: input.site.label,
          address: input.site.address,
          latitude: input.site.latitude,
          longitude: input.site.longitude,
          isPrimary: true,
        },
      },
    },
    include: {sites: true},
  });
  return toRecord(row);
}

export async function getCustomerSite(
    orgId: string, customerId: string, serviceSiteId: string):
    Promise<{customer: CustomerRecord; site: CustomerRecord['sites'][number]}|
            null> {
  const row = await prisma.customer.findFirst({
    where: {orgId, id: customerId},
    include: {sites: {where: {id: serviceSiteId}, take: 1}},
  });
  if (!row || row.sites.length === 0) return null;
  const customer = toRecord(row);
  return {customer, site: customer.sites[0]};
}

export async function createCustomerServiceSite(
    orgId: string, customerId: string, input: CustomerCreateInput['site']):
    Promise<CustomerRecord['sites'][number]|null> {
  const customer =
      await prisma.customer.findFirst({where: {orgId, id: customerId}});
  if (!customer) return null;
  const site = await prisma.serviceSite.create({
    data: {...input, orgId, customerId, isPrimary: false},
  });
  return {
    ...site,
    latitude: site.latitude === null ? null : Number(site.latitude),
    longitude: site.longitude === null ? null : Number(site.longitude),
  };
}

export async function updateCustomer(
    orgId: string, customerId: string,
    input: CustomerUpdateInput): Promise<CustomerRecord|null> {
  const existing = await prisma.customer.findFirst({
    where: {orgId, id: customerId}, select: {id: true},
  });
  if (!existing) return null;
  const row = await prisma.customer.update({
    where: {id: existing.id}, data: input,
    include: {sites: {orderBy: [{isPrimary: 'desc'}, {label: 'asc'}]}},
  });
  return toRecord(row);
}

export async function updateCustomerServiceSite(
    orgId: string, customerId: string, serviceSiteId: string,
    input: ServiceSiteUpdateInput):
    Promise<CustomerRecord['sites'][number]|null> {
  const existing = await prisma.serviceSite.findFirst({
    where: {id: serviceSiteId, customerId, orgId}, select: {id: true},
  });
  if (!existing) return null;
  const site = await prisma.$transaction(async (transaction) => {
    if (input.isPrimary) {
      await transaction.serviceSite.updateMany({
        where: {orgId, customerId, id: {not: serviceSiteId}},
        data: {isPrimary: false},
      });
    }
    return transaction.serviceSite.update({
      where: {id: serviceSiteId}, data: input,
    });
  });
  return {
    ...site,
    latitude: site.latitude === null ? null : Number(site.latitude),
    longitude: site.longitude === null ? null : Number(site.longitude),
  };
}