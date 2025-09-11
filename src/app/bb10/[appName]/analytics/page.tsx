'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Pie,
    PieChart,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';

type EventAnalytic = {
    id: string;
    totalCount: number;
    uniqueUsers: number;
    avgCountPerUser: number;
    contexts: Array<{ context: string; count: number }>;
};

type UserAnalytic = {
    userId: number;
    totalEvents: number;
    uniqueEventTypes: number;
    avgEventsPerType: number;
};

type AnalyticsData = {
    summary: {
        totalEvents: number;
        totalUsers: number;
        totalEventTypes: number;
        avgEventsPerUser: number;
        avgSessionDuration: number;
    };
    eventAnalytics: EventAnalytic[];
    userAnalytics: UserAnalytic[];
    topEvents: EventAnalytic[];
    rawData: Array<{
        id: string;
        context?: number | string;
        count: number;
        user: number;
    }>;
};

const COLORS = ['#20A9E3', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const formatDuration = (seconds: number): string => {
    // Handle negative or invalid values
    if (seconds < 0 || !Number.isFinite(seconds)) {
        return 'N/A';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
};

const StatsCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-2 font-medium text-muted-foreground text-sm">{title}</h3>
        <div className="font-bold text-2xl text-foreground">{value}</div>
        {subtitle && <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>}
    </div>
);

const EventSelector = ({
    events,
    selectedEvent,
    onEventChange,
}: {
    events: EventAnalytic[];
    selectedEvent: string | null;
    onEventChange: (eventId: string | null) => void;
}) => (
    <div className="mb-6">
        <span className="mb-2 block font-medium text-foreground text-sm">Focus on Event</span>
        <select
            value={selectedEvent || ''}
            onChange={(e) => onEventChange(e.target.value || null)}
            className="w-full rounded-md border border-border bg-card p-2 text-foreground"
        >
            <option value="">All Events</option>
            {events.map((event) => (
                <option key={event.id} value={event.id}>
                    {event.id} ({event.totalCount} total)
                </option>
            ))}
        </select>
    </div>
);

const ContextBreakdown = ({ contexts }: { contexts: Array<{ context: string; count: number }> }) => {
    if (contexts.length === 0) return null;

    const chartData = contexts.slice(0, 10).map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
    }));

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold text-foreground text-lg">Context Breakdown</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            dataKey="count"
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ context, count }: any) => `${context}: ${count}`}
                        />
                        <Tooltip formatter={(value) => [value, 'Count']} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default function BB10AnalyticsPage({ params }: { params: Promise<{ appName: string }> }) {
    const [appName, setAppName] = useState<string>('');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        user: '',
        eventId: '',
        limit: '10000',
    });

    useEffect(() => {
        const resolveParams = async () => {
            const resolvedParams = await params;
            setAppName(resolvedParams.appName);
        };
        resolveParams();
    }, [params]);

    const fetchData = useCallback(async () => {
        if (!appName) return;

        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (filters.user) queryParams.set('user', filters.user);
            if (filters.eventId) queryParams.set('eventId', filters.eventId);
            if (filters.limit) queryParams.set('limit', filters.limit);

            const response = await fetch(`/api/bb10/${appName}/analytics?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch analytics');

            const analyticsData = await response.json();
            setData(analyticsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [appName, filters]);

    useEffect(() => {
        if (appName) {
            fetchData();
        }
    }, [appName, fetchData]);

    const topEventsChartData = useMemo(() => {
        if (!data) return [];
        return data.topEvents.slice(0, 15).map((event) => ({
            name: event.id,
            count: event.totalCount,
            users: event.uniqueUsers,
            avgPerUser: event.avgCountPerUser,
        }));
    }, [data]);

    const userDistributionData = useMemo(() => {
        if (!data) return [];
        const buckets = new Map<string, number>();

        for (let i = 0; i < data.userAnalytics.length; i++) {
            const user = data.userAnalytics[i];
            let bucket: string;
            if (user.totalEvents <= 10) bucket = '1-10';
            else if (user.totalEvents <= 50) bucket = '11-50';
            else if (user.totalEvents <= 100) bucket = '51-100';
            else if (user.totalEvents <= 500) bucket = '101-500';
            else bucket = '500+';

            buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
        }

        const result = [];
        for (const [range, count] of buckets) {
            result.push({ range, count });
        }

        return result.sort((a, b) => {
            const order = ['1-10', '11-50', '51-100', '101-500', '500+'];
            return order.indexOf(a.range) - order.indexOf(b.range);
        });
    }, [data]);

    const selectedEventData = useMemo(() => {
        if (!selectedEvent || !data) return null;
        return data.eventAnalytics.find((event) => event.id === selectedEvent);
    }, [selectedEvent, data]);

    if (loading) {
        return (
            <div className="container-app py-8">
                <div className="flex h-64 items-center justify-center">
                    <div className="text-foreground text-lg">Loading analytics...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-app py-8">
                <div className="text-center">
                    <div className="mb-4 text-lg text-red-500">Error loading analytics</div>
                    <div className="text-muted-foreground text-sm">{error}</div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container-app space-y-8 py-8">
            <div className="flex items-center justify-between">
                <h1 className="font-bold text-3xl text-foreground">{appName} Analytics</h1>
                <Button
                    onClick={fetchData}
                    className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                >
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Events" value={data.summary.totalEvents.toLocaleString()} />
                <StatsCard title="Total Users" value={data.summary.totalUsers.toLocaleString()} />
                <StatsCard title="Event Types" value={data.summary.totalEventTypes} />
                <StatsCard
                    title="Avg Session Duration"
                    value={formatDuration(data.summary.avgSessionDuration)}
                    subtitle={`${(data.summary.avgEventsPerUser || 0).toFixed(1)} events/user`}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div>
                    <label htmlFor="user_id_filter" className="mb-1 block font-medium text-foreground text-sm">
                        User ID
                    </label>
                    <input
                        type="text"
                        id="user_id_filter"
                        defaultValue={filters.user}
                        onBlur={(e) => setFilters({ ...filters, user: e.target.value })}
                        placeholder="Filter by user ID"
                        className="w-full rounded-md border border-border bg-card p-2 text-foreground"
                    />
                </div>
                <div>
                    <label htmlFor="event_id_filter" className="mb-1 block font-medium text-foreground text-sm">
                        Event ID
                    </label>
                    <input
                        id="event_id_filter"
                        type="text"
                        defaultValue={filters.eventId}
                        onBlur={(e) => setFilters({ ...filters, eventId: e.target.value })}
                        placeholder="Filter by event ID"
                        className="w-full rounded-md border border-border bg-card p-2 text-foreground"
                    />
                </div>
                <div>
                    <label htmlFor="limit" className="mb-1 block font-medium text-foreground text-sm">
                        Limit
                    </label>
                    <input
                        id="limit"
                        type="number"
                        defaultValue={filters.limit}
                        onBlur={(e) => setFilters({ ...filters, limit: e.target.value })}
                        placeholder="Limit results"
                        className="w-full rounded-md border border-border bg-card p-2 text-foreground"
                    />
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={fetchData}
                        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                    >
                        Apply Filters
                    </Button>
                </div>
            </div>

            <EventSelector
                events={data.eventAnalytics}
                selectedEvent={selectedEvent}
                onEventChange={setSelectedEvent}
            />

            {selectedEventData && <ContextBreakdown contexts={selectedEventData.contexts} />}

            <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-4 font-semibold text-foreground text-lg">Top Events by Count</h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEventsChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                            <XAxis
                                dataKey="name"
                                stroke="rgb(var(--foreground))"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis stroke="rgb(var(--foreground))" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgb(var(--card))',
                                    border: '1px solid rgb(var(--border))',
                                    color: 'rgb(var(--foreground))',
                                }}
                            />
                            <Bar dataKey="count" fill="#20A9E3" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 font-semibold text-foreground text-lg">User Event Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                                <XAxis dataKey="range" stroke="rgb(var(--foreground))" />
                                <YAxis stroke="rgb(var(--foreground))" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgb(var(--card))',
                                        border: '1px solid rgb(var(--border))',
                                        color: 'rgb(var(--foreground))',
                                    }}
                                />
                                <Bar dataKey="count" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 font-semibold text-foreground text-lg">Events vs Users Correlation</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart data={topEventsChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                                <XAxis dataKey="users" stroke="rgb(var(--foreground))" name="Unique Users" />
                                <YAxis dataKey="count" stroke="rgb(var(--foreground))" name="Total Count" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgb(var(--card))',
                                        border: '1px solid rgb(var(--border))',
                                        color: 'rgb(var(--foreground))',
                                    }}
                                    formatter={(value, name) => [
                                        value,
                                        name === 'count' ? 'Total Count' : 'Unique Users',
                                    ]}
                                />
                                <Scatter dataKey="count" fill="#F59E0B" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-4 font-semibold text-foreground text-lg">Top Active Users</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-border border-b">
                                <th className="p-2 text-left text-foreground">User ID</th>
                                <th className="p-2 text-left text-foreground">Total Events</th>
                                <th className="p-2 text-left text-foreground">Event Types</th>
                                <th className="p-2 text-left text-foreground">Avg per Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.userAnalytics.slice(0, 20).map((user) => (
                                <tr key={user.userId} className="border-border border-b">
                                    <td className="p-2 text-foreground">{user.userId}</td>
                                    <td className="p-2 text-foreground">{user.totalEvents}</td>
                                    <td className="p-2 text-foreground">{user.uniqueEventTypes}</td>
                                    <td className="p-2 text-foreground">{user.avgEventsPerType.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
