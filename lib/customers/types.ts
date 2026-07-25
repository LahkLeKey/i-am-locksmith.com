export type ServiceSiteRecord = {
  id: string; label: string; address: string; latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
};

export type CustomerRecord = {
  id: string; orgId: string; displayName: string; email: string | null;
  phone: string | null;
  notes: string | null;
  sites: ServiceSiteRecord[];
};