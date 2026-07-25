# Geo Services

This increment establishes the first part of GitHub Issue 33:

- PostgreSQL-backed geo cache, refresh leases, and provider quota state
- authenticated `GET /api/entity/geo/geocode`
- Nominatim response normalization and OpenStreetMap attribution
- optional verified coordinates for job service sites and inventory locations

Reverse geocoding, Overpass POI search, OSRM routing, cleanup cron, and the remaining Issue 33 operations endpoints are not included yet.

## Configuration

Set these variables in every deployed environment that uses address lookup:

```env
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
GEO_USER_AGENT=IAmLocksmith/1.0 support@i-am-locksmith.com
GEO_NOMINATIM_INTERVAL_MS=1100
GEO_MAX_CACHE_RESPONSE_BYTES=1000000
GEO_LOG_RAW_ADDRESSES=false
GEO_LOG_PRECISE_COORDINATES=false
```

`GEO_USER_AGENT` must contain a monitored contact address. The application does not persist raw address queries in cache request metadata; only the request hash and normalized provider response are stored.

## Rollout

1. Apply `20260725210000_add_geo_cache` and `20260725211500_add_location_coordinates`.
2. Configure the environment variables above.
3. Verify an authenticated geocode request returns attribution and `MISS`, then repeat it and confirm `HIT`.

Rollback is application-first: revert the application release while retaining the additive tables and nullable columns. The migrations do not alter existing job, inventory ledger, or location values.