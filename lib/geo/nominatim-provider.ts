import type {GeocodeRequest, GeocodeResult} from './types';

type NominatimResult = {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
  osm_type?: unknown;
  osm_id?: unknown;
};

export async function fetchNominatimGeocode(request: GeocodeRequest):
    Promise<GeocodeResult[]> {
  const baseUrl =
      process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
  const userAgent = process.env.GEO_USER_AGENT;
  if (!userAgent)
    throw new Error('GEO_USER_AGENT is required for Nominatim requests.');

  const url = new URL('/search', baseUrl);
  url.searchParams.set('q', request.query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(request.limit));
  url.searchParams.set('accept-language', request.language);
  const response = await fetch(url, {
    headers: {'user-agent': userAgent, accept: 'application/json'},
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  const payload = await response.json() as NominatimResult[];
  return payload.flatMap((entry) => {
    const latitude = Number(entry.lat);
    const longitude = Number(entry.lon);
    const osmId = Number(entry.osm_id);
    if (typeof entry.display_name !== 'string' ||
        typeof entry.osm_type !== 'string' || !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) || !Number.isFinite(osmId))
      return [];
    return [{
      displayName: entry.display_name,
      latitude,
      longitude,
      osmType: entry.osm_type,
      osmId
    }];
  });
}