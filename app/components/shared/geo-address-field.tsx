"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';

import type { GeocodeResult } from '@/lib/geo/types';

const GeoLocationMap = dynamic(
    () => import('./geo-location-map').then((module) => module.GeoLocationMap),
    {
        ssr: false,
        loading: () => <div className="h-64 animate-pulse rounded-md bg-[#e2e8f0] sm:h-72" aria-label="Loading service location map" />,
    },
);

type GeoAddressFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onResolved: (result: GeocodeResult | null) => void;
    placeholder?: string;
    required?: boolean;
};

export function GeoAddressField({
    label,
    value,
    onChange,
    onResolved,
    placeholder = 'Street address, city, state',
    required = false,
}: GeoAddressFieldProps) {
    const inputId = `geo-address-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const [results, setResults] = useState<GeocodeResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<GeocodeResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function searchAddress() {
        const query = value.trim();
        if (!query) return;
        setIsSearching(true);
        setMessage(null);
        setResults([]);
        try {
            const response = await fetch(
                `/api/entity/geo/geocode?q=${encodeURIComponent(query)}&limit=5`);
            const payload = await response.json() as {
                data?: GeocodeResult[];
                error?: { message?: string };
            };
            if (!response.ok) {
                setMessage(payload.error?.message ?? 'Address lookup failed.');
                return;
            }
            const nextResults = payload.data ?? [];
            setResults(nextResults);
            if (nextResults.length === 0) setMessage('No matching addresses found.');
        } catch {
            setMessage('Address lookup is unavailable. You can continue with the entered address.');
        } finally {
            setIsSearching(false);
        }
    }

    return (
        <div className="space-y-1">
            <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                {label}
            </label>
            <div className="flex gap-2">
                <input
                    id={inputId}
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value);
                        onResolved(null);
                        setSelectedResult(null);
                        setResults([]);
                        setMessage(null);
                    }}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-md border border-[#d1d5db] px-3 py-2 text-xs"
                    required={required}
                />
                <button
                    type="button"
                    onClick={searchAddress}
                    disabled={isSearching || value.trim().length === 0}
                    className="shrink-0 rounded-md border border-[#0f766e] px-3 py-2 text-xs font-semibold text-[#0f766e] disabled:opacity-50"
                >
                    {isSearching ? 'Finding...' : 'Find address'}
                </button>
            </div>
            {results.length > 0 ? (
                <div role="listbox" aria-label={`${label} results`} className="max-h-40 overflow-y-auto rounded-md border border-[#dbe3f0] bg-white">
                    {results.map((result) => (
                        <button
                            key={`${result.osmType}:${result.osmId}`}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                                onChange(result.displayName);
                                onResolved(result);
                                setSelectedResult(result);
                                setResults([]);
                                setMessage('Address verified with OpenStreetMap.');
                            }}
                            className="block w-full border-b border-[#e5e7eb] px-3 py-2 text-left text-xs text-[#334155] last:border-b-0 hover:bg-[#f0fdfa]"
                        >
                            {result.displayName}
                        </button>
                    ))}
                </div>
            ) : null}
            {message ? <p className="text-[11px] text-[#64748b]">{message}</p> : null}
            {selectedResult ? <GeoLocationMap location={selectedResult} /> : null}
            <p className="text-[10px] text-[#64748b]">Address and map data © OpenStreetMap contributors</p>
        </div>
    );
}