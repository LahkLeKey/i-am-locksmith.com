'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatSchedule } from '@/lib/dashboard/format';

interface TimelineEvent {
    id: string;
    sku: string;
    severity: string;
    summary: string;
    location: string;
    at: string;
}

interface ActivityClientProps {
    initialTimeline: TimelineEvent[];
}

function formatScheduleSafe(isoDate: string): string {
    const timestamp = Date.parse(isoDate);
    if (!Number.isFinite(timestamp)) {
        return 'Unknown';
    }
    return formatSchedule(isoDate);
}

export default function ActivityClient({ initialTimeline }: ActivityClientProps) {
    const [filters, setFilters] = useState({
        sku: '',
        location: 'all',
        severity: 'all',
        dateRange: 'all',
    });

    const locations = useMemo(() => {
        const locs = new Set(initialTimeline.map(e => e.location));
        return Array.from(locs).sort();
    }, [initialTimeline]);

    const severities = useMemo(() => {
        const sevs = new Set(initialTimeline.map(e => e.severity));
        return Array.from(sevs).sort();
    }, [initialTimeline]);

    const filteredTimeline = useMemo(() => {
        let results = [...initialTimeline];

        if (filters.sku) {
            const searchTerm = filters.sku.toLowerCase();
            results = results.filter(e =>
                e.sku.toLowerCase().includes(searchTerm)
            );
        }

        if (filters.location !== 'all') {
            results = results.filter(e => e.location === filters.location);
        }

        if (filters.severity !== 'all') {
            results = results.filter(e => e.severity === filters.severity);
        }

        if (filters.dateRange !== 'all') {
            const now = new Date();
            let cutoffDate = new Date();

            if (filters.dateRange === 'today') {
                cutoffDate.setHours(0, 0, 0, 0);
            } else if (filters.dateRange === 'week') {
                cutoffDate.setDate(now.getDate() - 7);
            } else if (filters.dateRange === 'month') {
                cutoffDate.setDate(now.getDate() - 30);
            }

            results = results.filter(e => {
                const eventDate = new Date(e.at);
                return eventDate >= cutoffDate;
            });
        }

        return results.sort((a, b) =>
            new Date(b.at).getTime() - new Date(a.at).getTime()
        );
    }, [initialTimeline, filters]);

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Inventory Activity</h1>
                    <p className="mt-1 text-sm text-[#4b5563]">
                        Recent inventory transactions and events with advanced filtering.
                    </p>
                </div>
                <Link
                    href="/inventory"
                    className="text-[#0f766e] hover:underline"
                >
                    ← Back to Inventory
                </Link>
            </div>

            <div className="rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <h2 className="mb-4 text-sm font-semibold text-[#0f172a]">Filters</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="block text-xs font-medium text-[#4b5563] mb-1">
                            SKU Search
                        </label>
                        <input
                            type="text"
                            value={filters.sku}
                            onChange={e => setFilters(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="Filter by SKU..."
                            className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#0f172a]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#4b5563] mb-1">
                            Location
                        </label>
                        <select
                            value={filters.location}
                            onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#0f172a]"
                        >
                            <option value="all">All Locations</option>
                            {locations.map(loc => (
                                <option key={loc} value={loc}>
                                    {loc.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#4b5563] mb-1">
                            Severity
                        </label>
                        <select
                            value={filters.severity}
                            onChange={e => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                            className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#0f172a]"
                        >
                            <option value="all">All Events</option>
                            {severities.map(sev => (
                                <option key={sev} value={sev}>
                                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#4b5563] mb-1">
                            Date Range
                        </label>
                        <select
                            value={filters.dateRange}
                            onChange={e => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                            className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#0f172a]"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                {(filters.sku || filters.location !== 'all' || filters.severity !== 'all' || filters.dateRange !== 'all') && (
                    <button
                        onClick={() => setFilters({ sku: '', location: 'all', severity: 'all', dateRange: 'all' })}
                        className="mt-3 text-sm text-[#0f766e] hover:underline font-medium"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <article className="rounded-md border border-[#e5e7eb] bg-white">
                <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-6 py-3">
                    <h2 className="text-sm font-semibold text-[#0f172a]">
                        Inventory Timeline ({filteredTimeline.length} events)
                    </h2>
                </div>

                {filteredTimeline.length > 0 ? (
                    <ul className="divide-y divide-[#e5e7eb]">
                        {filteredTimeline.map((event) => (
                            <li key={event.id} className="px-6 py-4 hover:bg-[#f9fafb]">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-[#0f766e]">{event.sku}</span>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                    event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                }`}>
                                                {event.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#4b5563]">{event.summary}</p>
                                        <div className="mt-2 flex gap-4 text-xs text-[#6b7280]">
                                            <span>📍 {event.location.replace(/_/g, ' ')}</span>
                                            <span>🕐 {formatScheduleSafe(event.at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="px-6 py-8 text-center">
                        <p className="text-sm text-[#4b5563]">
                            {initialTimeline.length === 0
                                ? 'No inventory activity yet.'
                                : 'No events match your filters.'}
                        </p>
                    </div>
                )}
            </article>
        </section>
    );
}
