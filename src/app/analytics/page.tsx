'use client';

import { memo, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ProcessedAnalytics } from '@/lib/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function processEventsByDay(eventsByDay: Record<string, number>) {
    const result = [];
    for (const [date, count] of Object.entries(eventsByDay)) {
        result.push({ date, count });
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
}

function processSessionsOverTime(sessions: Array<{ startTime: number; duration: number; user: number }>) {
    const sessionsMap: Record<string, number> = {};
    for (let i = 0; i < sessions.length; i++) {
        const date = new Date(sessions[i].startTime * 1000).toISOString().split('T')[0];
        sessionsMap[date] = (sessionsMap[date] || 0) + 1;
    }

    const result = [];
    for (const [date, sessionCount] of Object.entries(sessionsMap)) {
        result.push({ date, sessions: sessionCount });
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
}

function processDurationData(sessions: Array<{ startTime: number; duration: number; user: number }>) {
    const result = [];
    let index = 0;
    for (let i = 0; i < sessions.length; i++) {
        if (sessions[i].duration > 0) {
            result.push({
                session: index + 1,
                duration: Math.round(sessions[i].duration / 60),
                userId: sessions[i].user,
            });
            index++;
        }
    }
    return result;
}

function processTopEvents(eventCounts: Record<string, number>) {
    const excludedEvents = new Set(['StartSession', 'EndSession', 'Visible', 'Hidden']);
    const events = [];

    for (const [event, count] of Object.entries(eventCounts)) {
        if (!excludedEvents.has(event)) {
            events.push({ event, count });
        }
    }

    events.sort((a, b) => b.count - a.count);
    return events.slice(0, 10);
}

function processPlatformData(platforms: Record<string, number>) {
    const result = [];
    for (const [platform, count] of Object.entries(platforms)) {
        result.push({ name: platform, value: count });
    }
    return result;
}

function processBrowserData(browsers: Record<string, number>) {
    const result = [];
    for (const [browser, count] of Object.entries(browsers)) {
        result.push({ name: browser, value: count });
    }
    return result;
}

function filterEventsByDateRange(data: ProcessedAnalytics, dateFrom: string, dateTo: string) {
    if (!dateFrom && !dateTo) return data;

    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const filteredSessions = [];
    for (let i = 0; i < data.sessions.length; i++) {
        const sessionDate = new Date(data.sessions[i].startTime * 1000);
        if (fromDate && sessionDate < fromDate) continue;
        if (toDate && sessionDate > toDate) continue;
        filteredSessions.push(data.sessions[i]);
    }

    return {
        ...data,
        sessions: filteredSessions,
    };
}

const StatsOverview = memo(({ stats }: { stats: ProcessedAnalytics['stats'] }) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
            <div className="font-bold text-2xl text-blue-600">{stats.totalSessions}</div>
            <div className="text-gray-500 text-sm">Total Sessions</div>
        </Card>
        <Card className="p-4">
            <div className="font-bold text-2xl text-green-600">{stats.uniqueUsers}</div>
            <div className="text-gray-500 text-sm">Unique Users</div>
        </Card>
        <Card className="p-4">
            <div className="font-bold text-2xl text-purple-600">{Math.round(stats.averageSessionDuration / 60)}m</div>
            <div className="text-gray-500 text-sm">Avg Session Duration</div>
        </Card>
        <Card className="p-4">
            <div className="font-bold text-2xl text-orange-600">{stats.totalEvents}</div>
            <div className="text-gray-500 text-sm">Total Events</div>
        </Card>
    </div>
));

const SessionDetails = memo(({ stats }: { stats: ProcessedAnalytics['stats'] }) => (
    <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
            <div>
                <div className="font-semibold text-xl">{Math.round(stats.longestSession / 60)}m</div>
                <div className="text-gray-500 text-sm">Longest Session</div>
            </div>
            <div>
                <div className="font-semibold text-xl">{Math.round(stats.shortestSession / 60)}m</div>
                <div className="text-gray-500 text-sm">Shortest Session</div>
            </div>
            <div>
                <div className="font-semibold text-xl">{stats.totalVisibilityChanges}</div>
                <div className="text-gray-500 text-sm">Tab Switches</div>
            </div>
        </div>
    </Card>
));

const EventsOverTimeChart = memo(({ data }: { data: Array<{ date: string; count: number }> }) => (
    <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Events Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    </Card>
));

const SessionsOverTimeChart = memo(({ data }: { data: Array<{ date: string; sessions: number }> }) => (
    <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Sessions Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#82ca9d" />
            </LineChart>
        </ResponsiveContainer>
    </Card>
));

const TopEventsChart = memo(({ data }: { data: Array<{ event: string; count: number }> }) => (
    <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Top Events</h3>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FFBB28" />
            </BarChart>
        </ResponsiveContainer>
    </Card>
));

const SessionDurationsChart = memo(
    ({ data }: { data: Array<{ session: number; duration: number; userId: number }> }) => (
        <Card className="p-6">
            <h3 className="mb-4 font-semibold text-lg">Session Durations (minutes)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="session" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="duration" stroke="#FF8042" />
                </LineChart>
            </ResponsiveContainer>
        </Card>
    ),
);

const PlatformDistributionChart = memo(({ data }: { data: Array<{ name: string; value: number }> }) => (
    <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Platform Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    </Card>
));

const BrowserDistributionChart = memo(({ data }: { data: Array<{ name: string; value: number }> }) => (
    <Card className="p-6">
        <h3 className="mb-4 font-semibold text-lg">Browser Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    </Card>
));

const EventDetailsSection = memo(
    ({
        eventDetails,
        selectedEvent,
    }: {
        eventDetails: Record<string, { count: number; contexts: Record<string, number> }>;
        selectedEvent: string;
    }) => {
        if (!selectedEvent || !eventDetails[selectedEvent]) return null;

        const details = eventDetails[selectedEvent];
        const contexts = Object.entries(details.contexts).sort((a, b) => b[1] - a[1]);

        return (
            <Card className="p-6">
                <h3 className="mb-4 font-semibold text-lg">Event Details</h3>
                <div className="space-y-4">
                    <div className="rounded border border-slate-700 bg-slate-800 p-4">
                        <div className="font-medium text-lg text-slate-100">{selectedEvent}</div>
                        <div className="text-slate-400 text-sm">Total Count: {details.count}</div>
                    </div>

                    {contexts.length > 0 && (
                        <div className="rounded border border-slate-700 bg-slate-800">
                            <div className="border-slate-700 border-b bg-slate-700 p-3">
                                <h4 className="font-medium text-slate-100">Contexts</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-slate-700 border-b bg-slate-700">
                                            <th className="p-3 text-left font-medium text-slate-100 text-sm">
                                                Context
                                            </th>
                                            <th className="p-3 text-right font-medium text-slate-100 text-sm">Count</th>
                                            <th className="p-3 text-right font-medium text-slate-100 text-sm">
                                                Percentage
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contexts.map(([context, count], index) => (
                                            <tr
                                                key={context}
                                                className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/50'}
                                            >
                                                <td className="p-3 font-mono text-slate-200 text-sm">{context}</td>
                                                <td className="p-3 text-right text-slate-200 text-sm">{count}</td>
                                                <td className="p-3 text-right text-slate-200 text-sm">
                                                    {((count / details.count) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        );
    },
);

const FiltersSection = memo(
    ({
        filters,
        eventOptions,
        onFilterChange,
        onClearFilters,
    }: {
        filters: { event: string; dateFrom: string; dateTo: string };
        eventOptions: string[];
        onFilterChange: (key: string, value: string) => void;
        onClearFilters: () => void;
    }) => (
        <Card className="p-6">
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <span className="mb-2 block font-medium text-sm">Event</span>
                    <select
                        value={filters.event}
                        onChange={(e) => onFilterChange('event', e.target.value)}
                        className="min-w-32 rounded border px-3 py-2"
                    >
                        <option value="">All Events</option>
                        {eventOptions.map((event) => (
                            <option key={event} value={event}>
                                {event}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="date_field_from" className="mb-2 block font-medium text-sm">
                        From Date
                    </label>
                    <input
                        id="date_field_from"
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                        className="rounded border px-3 py-2"
                    />
                </div>

                <div>
                    <label htmlFor="date_field_to" className="mb-2 block font-medium text-sm">
                        To Date
                    </label>
                    <input
                        id="date_field_to"
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => onFilterChange('dateTo', e.target.value)}
                        className="rounded border px-3 py-2"
                    />
                </div>

                <div>
                    <Button variant="outline" onClick={onClearFilters}>
                        Clear Filters
                    </Button>
                </div>
            </div>
        </Card>
    ),
);

export default function AnalyticsPage() {
    const [rawData, setRawData] = useState<ProcessedAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        event: '',
        dateFrom: '',
        dateTo: '',
    });

    useState(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/analytics');
                if (!response.ok) throw new Error('Failed to fetch analytics');
                const result = await response.json();
                setRawData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return null;
    });

    const filteredData = useMemo(() => {
        if (!rawData) return null;
        return filterEventsByDateRange(rawData, filters.dateFrom, filters.dateTo);
    }, [rawData, filters.dateFrom, filters.dateTo]);

    const chartData = useMemo(() => {
        if (!filteredData) {
            return {
                eventsByDay: [],
                sessions: [],
                durations: [],
                topEvents: [],
                platforms: [],
                browsers: [],
            };
        }

        return {
            eventsByDay: processEventsByDay(filteredData.stats.eventsByDay),
            sessions: processSessionsOverTime(filteredData.sessions),
            durations: processDurationData(filteredData.sessions),
            topEvents: processTopEvents(filteredData.stats.eventCounts),
            platforms: processPlatformData(filteredData.stats.platforms),
            browsers: processBrowserData(filteredData.stats.browsers),
        };
    }, [filteredData]);

    const eventOptions = useMemo(() => {
        if (!rawData) return [];
        const options = [];
        for (const event of Object.keys(rawData.stats.eventCounts)) {
            options.push(event);
        }
        return options;
    }, [rawData]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ event: '', dateFrom: '', dateTo: '' });
    };

    const retryFetch = () => {
        setError(null);
        setLoading(true);

        const fetchData = async () => {
            try {
                const response = await fetch('/api/analytics');
                if (!response.ok) throw new Error('Failed to fetch analytics');
                const result = await response.json();
                setRawData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    };

    if (loading || !filteredData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="font-semibold text-xl">Loading Analytics</div>
                    <div className="text-gray-500">Processing analytics data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="p-8 text-center">
                    <div className="mb-4 font-semibold text-red-600 text-xl">Error Loading Analytics</div>
                    <div className="mb-4 text-gray-600">{error}</div>
                    <Button onClick={retryFetch}>Retry</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-3xl">Analytics Dashboard</h1>
                    <p className="text-gray-600">App usage analytics and insights</p>
                </div>
            </div>

            <FiltersSection
                filters={filters}
                eventOptions={eventOptions}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />

            <StatsOverview stats={filteredData.stats} />

            <SessionDetails stats={filteredData.stats} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <EventsOverTimeChart data={chartData.eventsByDay} />
                <SessionsOverTimeChart data={chartData.sessions} />
                <TopEventsChart data={chartData.topEvents} />
                <SessionDurationsChart data={chartData.durations} />
                <PlatformDistributionChart data={chartData.platforms} />
                <BrowserDistributionChart data={chartData.browsers} />
            </div>

            {filteredData.eventDetails && (
                <EventDetailsSection eventDetails={filteredData.eventDetails} selectedEvent={filters.event} />
            )}
        </div>
    );
}
