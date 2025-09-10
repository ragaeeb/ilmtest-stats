'use client';

import { useEffect, useState } from 'react';
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

type BB10Stats = {
    totalDownloads: number;
    uniqueDevices: number;
    dateRange: {
        start: string;
        end: string;
    };
    downloadsByCountry: Array<{
        country: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByVersion: Array<{
        version: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByDevice: Array<{
        device: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByCarrier: Array<{
        carrier: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByOS: Array<{
        osVersion: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByLocale: Array<{
        locale: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsOverTime: Array<{
        date: string;
        downloads: number;
    }>;
    topCountries: string[];
    topDevices: string[];
    topVersions: string[];
};

type BB10Response = {
    appName: string;
    stats: BB10Stats;
    records: any[];
};

const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#a4de6c',
    '#d084d0',
];

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
};

const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-md">
        <h3 className="mb-2 font-semibold text-[rgb(var(--card-foreground))] text-lg">{title}</h3>
        <div className="font-bold text-3xl text-[rgb(var(--primary))]">{value}</div>
        {subtitle && <div className="mt-1 text-[rgb(var(--muted-foreground))] text-sm">{subtitle}</div>}
    </div>
);

const ChartContainer = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-md">
        <h3 className="mb-4 font-semibold text-[rgb(var(--card-foreground))] text-xl">{title}</h3>
        {children}
    </div>
);

export default function BB10AnalyticsPage({ params }: { params: Promise<{ appName: string }> }) {
    const [data, setData] = useState<BB10Response | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appName, setAppName] = useState<string>('');

    useEffect(() => {
        const resolveParams = async () => {
            try {
                const resolvedParams = await params;
                setAppName(resolvedParams.appName);
            } catch (err) {
                setError('Failed to resolve route parameters');
                setLoading(false);
            }
        };

        resolveParams();
    }, [params]);

    useEffect(() => {
        if (!appName) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/bb10/${appName}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch data');
                }

                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [appName]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))]">
                <div className="text-center">
                    <div className="mx-auto h-32 w-32 animate-spin rounded-full border-[rgb(var(--primary))] border-b-2"></div>
                    <p className="mt-4 text-[rgb(var(--foreground))]">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))]">
                <div className="text-center">
                    <div className="mb-4 text-6xl text-red-500">⚠️</div>
                    <h2 className="mb-2 font-bold text-2xl text-[rgb(var(--foreground))]">Error Loading Data</h2>
                    <p className="text-[rgb(var(--muted-foreground))]">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { stats } = data;
    const topCountries = stats.downloadsByCountry.slice(0, 10);
    const topDevices = stats.downloadsByDevice.slice(0, 8);
    const versionData = stats.downloadsByVersion;
    const timelineData = stats.downloadsOverTime;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <h1 className="mb-2 font-bold text-4xl text-[rgb(var(--foreground))]">
                        {data.appName.toUpperCase()} Analytics Dashboard
                    </h1>
                    <p className="text-[rgb(var(--muted-foreground))]">
                        BlackBerry 10 download statistics and insights
                    </p>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Downloads" value={stats.totalDownloads.toLocaleString()} />
                    <StatCard title="Unique Devices" value={stats.uniqueDevices.toLocaleString()} />
                    <StatCard
                        title="Date Range"
                        value={formatDate(stats.dateRange.start)}
                        subtitle={`to ${formatDate(stats.dateRange.end)}`}
                    />
                    <StatCard
                        title="Top Country"
                        value={stats.topCountries[0] || 'N/A'}
                        subtitle={topCountries[0] ? `${topCountries[0].downloads} downloads` : ''}
                    />
                </div>

                <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <ChartContainer title="Downloads Over Time">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        color: '#F9FAFB',
                                        borderRadius: '6px',
                                    }}
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                    labelStyle={{ color: '#F9FAFB' }}
                                    itemStyle={{ color: '#F9FAFB' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="downloads"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <ChartContainer title="Top Countries">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topCountries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="country"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        color: '#F9FAFB',
                                        borderRadius: '6px',
                                    }}
                                    labelStyle={{ color: '#F9FAFB' }}
                                    itemStyle={{ color: '#F9FAFB' }}
                                />
                                <Bar dataKey="downloads" fill="#00C49F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <ChartContainer title="Version Distribution">
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={versionData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ version, percentage }: any) =>
                                        percentage > 3 ? `${version} (${percentage}%)` : ''
                                    }
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="downloads"
                                    nameKey="version"
                                >
                                    {versionData.map((_, index) => (
                                        <Cell key={`cell-${index.toString()}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        color: '#F9FAFB',
                                        borderRadius: '6px',
                                    }}
                                    labelStyle={{ color: '#F9FAFB' }}
                                    itemStyle={{ color: '#F9FAFB' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <ChartContainer title="Top Devices">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topDevices} margin={{ top: 5, right: 30, left: 5, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="device"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fill: '#9CA3AF', fontSize: 9 }}
                                    interval={0}
                                />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: '1px solid #374151',
                                        color: '#F9FAFB',
                                        borderRadius: '6px',
                                    }}
                                    labelStyle={{ color: '#F9FAFB' }}
                                    itemStyle={{ color: '#F9FAFB' }}
                                />
                                <Bar dataKey="downloads" fill="#FFBB28" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <ChartContainer title="OS Versions">
                        <div className="space-y-2">
                            {stats.downloadsByOS.slice(0, 10).map((item, index) => (
                                <div
                                    key={index.toString()}
                                    className="flex items-center justify-between border-[rgb(var(--border))] border-b py-2"
                                >
                                    <span className="font-medium text-[rgb(var(--card-foreground))] text-sm">
                                        {item.osVersion}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[rgb(var(--muted-foreground))] text-sm">
                                            {item.downloads}
                                        </span>
                                        <span className="text-[rgb(var(--primary))] text-xs">({item.percentage}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartContainer>

                    <ChartContainer title="Top Carriers">
                        <div className="space-y-2">
                            {stats.downloadsByCarrier.slice(0, 10).map((item, index) => (
                                <div
                                    key={index.toString()}
                                    className="flex items-center justify-between border-[rgb(var(--border))] border-b py-2"
                                >
                                    <span className="font-medium text-[rgb(var(--card-foreground))] text-sm">
                                        {item.carrier}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[rgb(var(--muted-foreground))] text-sm">
                                            {item.downloads}
                                        </span>
                                        <span className="text-[rgb(var(--primary))] text-xs">({item.percentage}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartContainer>

                    <ChartContainer title="Top Locales">
                        <div className="space-y-2">
                            {stats.downloadsByLocale.slice(0, 10).map((item, index) => (
                                <div
                                    key={index.toString()}
                                    className="flex items-center justify-between border-[rgb(var(--border))] border-b py-2"
                                >
                                    <span className="font-medium text-[rgb(var(--card-foreground))] text-sm">
                                        {item.locale}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[rgb(var(--muted-foreground))] text-sm">
                                            {item.downloads}
                                        </span>
                                        <span className="text-[rgb(var(--primary))] text-xs">({item.percentage}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
}
