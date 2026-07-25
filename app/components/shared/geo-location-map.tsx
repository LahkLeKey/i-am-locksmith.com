"use client";

import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from 'react-leaflet';

import type { GeocodeResult } from '@/lib/geo/types';

const locationMarker = divIcon({
    className: '',
    html: '<span class="geo-map-marker" aria-hidden="true"><span></span></span>',
    iconAnchor: [18, 36],
    iconSize: [36, 36],
    popupAnchor: [0, -32],
});

export function GeoLocationMap({ location }: { location: GeocodeResult }) {
    const position: [number, number] = [location.latitude, location.longitude];

    return (
        <section className="overflow-hidden rounded-md border border-[#cbd5e1] bg-white" aria-label="Resolved service location map">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0f766e]">Verified service location</p>
                    <p className="truncate text-xs text-[#334155]">{location.displayName}</p>
                </div>
                <p className="shrink-0 font-mono text-[10px] text-[#64748b]">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
            </div>
            <MapContainer
                center={position}
                zoom={16}
                zoomControl={false}
                scrollWheelZoom={false}
                className="h-64 w-full sm:h-72"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ZoomControl position="bottomright" />
                <Marker position={position} icon={locationMarker}>
                    <Popup>{location.displayName}</Popup>
                </Marker>
            </MapContainer>
        </section>
    );
}