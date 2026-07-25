export type GeoCacheStatus = 'HIT' | 'MISS' | 'STALE' | 'BYPASS' | 'REFRESHED';

export type GeocodeResult = {
  displayName: string;
  latitude: number;
  longitude: number;
  osmType: string;
  osmId: number;
};

export type GeoServiceResult<T> = {
  data: T;
  cache: {
    status: GeoCacheStatus;
    createdAt: string;
    expiresAt: string;
    stale: boolean;
  };
};

export type GeocodeRequest = {
  query: string;
  limit: number;
  language: string;
};