'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
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
import { Select } from '@/components/ui/select';

interface Collection {
    id: number;
    title: string;
    pages: number;
}

interface StatsEntry {
    covered: number;
    reviews: number;
    drafts: number;
    explained: number;
    unlinked: number;
    verify: number;
    entries: number;
    t: number;
    date: string;
}

interface CollectionStatsResponse {
    collectionId: string;
    timeSeries: StatsEntry[];
    latestMetrics: StatsEntry & {
        coveragePercentage: number;
        reviewsPercentage: number;
        draftsPercentage: number;
        explainedPercentage: number;
        unlinkedPercentage: number;
        verifyPercentage: number;
    };
    totalEntries: number;
}

type MetricKey = 'covered' | 'reviews' | 'drafts' | 'explained' | 'unlinked' | 'verify' | 'entries';

const METRIC_COLORS = {
    covered: '#3b82f6',
    reviews: '#10b981',
    drafts: '#f59e0b',
    explained: '#8b5cf6',
    unlinked: '#ef4444',
    verify: '#06b6d4',
    entries: '#6b7280',
};

const METRIC_LABELS = {
    covered: 'Pages Translated',
    reviews: 'In Review',
    drafts: 'Drafts',
    explained: 'With Commentary',
    unlinked: 'Without Page Reference',
    verify: 'Pending Verification',
    entries: 'Total Translations',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

export default function CollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [statsData, setStatsData] = useState<CollectionStatsResponse | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('covered');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch collections on mount
    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const response = await fetch('/api/collections');
                if (!response.ok) throw new Error('Failed to fetch collections');
                const data = await response.json();
                setCollections(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load collections');
            }
        };
        fetchCollections();
    }, []);

    // Fetch stats when collection is selected
    useEffect(() => {
        if (!selectedCollectionId) {
            setStatsData(null);
            setSelectedCollection(null);
            return;
        }

        const collection = collections.find((c) => c.id.toString() === selectedCollectionId);
        setSelectedCollection(collection || null);

        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/collections/${selectedCollectionId}`);
                if (!response.ok) throw new Error('Failed to fetch collection stats');
                const data = await response.json();
                setStatsData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load collection stats');
                setStatsData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [selectedCollectionId, collections]);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!statsData) return [];

        return statsData.timeSeries.map((entry) => ({
            ...entry,
            date: new Date(entry.date).toLocaleDateString(),
            coveragePercentage: selectedCollection?.pages ? (entry.covered / selectedCollection.pages) * 100 : 0,
        }));
    }, [statsData, selectedCollection]);

    // Prepare pie chart data for translation status
    const pieData = useMemo(() => {
        if (!statsData) return [];

        const latest = statsData.latestMetrics;
        const totalEntries = latest.entries;

        // Calculate the remaining entries that don't fall into any of these categories
        const categorizedEntries = latest.reviews + latest.drafts + latest.verify + latest.unlinked;
        const remainingEntries = Math.max(0, totalEntries - categorizedEntries);

        const data = [
            { name: 'In Review', value: latest.reviews, color: METRIC_COLORS.reviews },
            { name: 'Drafts', value: latest.drafts, color: METRIC_COLORS.drafts },
            { name: 'Pending Verification', value: latest.verify, color: METRIC_COLORS.verify },
            { name: 'Without Page Reference', value: latest.unlinked, color: METRIC_COLORS.unlinked },
        ];

        // Add remaining entries if there are any
        if (remainingEntries > 0) {
            data.push({ name: 'Completed', value: remainingEntries, color: '#22c55e' });
        }

        // Filter out any entries with 0 values
        return data.filter((item) => item.value > 0);
    }, [statsData]);

    // Coverage pie chart data
    const coveragePieData = useMemo(() => {
        if (!statsData || !selectedCollection) return [];

        const covered = statsData.latestMetrics.covered;
        const remaining = selectedCollection.pages - covered;

        return [
            { name: 'Translated', value: covered, color: METRIC_COLORS.covered },
            { name: 'Remaining', value: Math.max(0, remaining), color: '#e5e7eb' },
        ];
    }, [statsData, selectedCollection]);

    if (error) {
        return (
            <main className="container mx-auto max-w-none px-4 py-20">
                <Card className="p-8 text-center">
                    <h2 className="mb-2 font-semibold text-red-600 text-xl">Error</h2>
                    <p className="mb-4 text-gray-600">{error}</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-none space-y-8 px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Image
                        src="/assets/logo_flat.png"
                        alt="IlmTest"
                        width={40}
                        height={40}
                        className="h-10 w-10"
                        priority
                    />
                    <div>
                        <h1 className="font-semibold text-2xl tracking-tight">Collections Analytics</h1>
                        <p className="text-gray-500 text-sm">Translation progress and statistics by collection</p>
                    </div>
                </div>
            </div>

            {/* Collection Selector */}
            <Card className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-medium text-lg">Select Collection</h2>
                    <div className="flex items-center gap-4">
                        <Select
                            value={selectedCollectionId}
                            onChange={(e) => setSelectedCollectionId(e.target.value)}
                            className="min-w-80"
                        >
                            <option value="">Choose a collection...</option>
                            {collections.map((collection) => (
                                <option key={collection.id} value={collection.id.toString()}>
                                    {collection.id}. {collection.title} ({collection.pages} pages)
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Stats Content */}
            {selectedCollection && (
                <>
                    {loading && (
                        <Card className="p-8 text-center">
                            <p className="text-gray-500">Loading collection statistics...</p>
                        </Card>
                    )}

                    {statsData && (
                        <>
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <Card className="p-4">
                                    <div className="font-bold text-2xl text-blue-600">
                                        {statsData.latestMetrics.covered.toLocaleString()} /{' '}
                                        {selectedCollection.pages.toLocaleString()}
                                    </div>
                                    <div className="text-gray-500 text-sm">Pages Translated</div>
                                    <div className="mt-1 text-gray-400 text-xs">
                                        {((statsData.latestMetrics.covered / selectedCollection.pages) * 100).toFixed(
                                            1,
                                        )}
                                        % complete
                                    </div>
                                </Card>
                                <Card className="p-4">
                                    <div className="font-bold text-2xl text-green-600">
                                        {statsData.latestMetrics.entries.toLocaleString()}
                                    </div>
                                    <div className="text-gray-500 text-sm">Total Translations</div>
                                </Card>
                                <Card className="p-4">
                                    <div className="font-bold text-2xl text-purple-600">
                                        {statsData.latestMetrics.explained.toLocaleString()}
                                    </div>
                                    <div className="text-gray-500 text-sm">With Commentary</div>
                                    <div className="mt-1 text-gray-400 text-xs">
                                        {(
                                            (statsData.latestMetrics.explained / statsData.latestMetrics.entries) *
                                            100
                                        ).toFixed(1)}
                                        %
                                    </div>
                                </Card>
                                <Card className="p-4">
                                    <div className="font-bold text-2xl text-orange-600">
                                        {statsData.latestMetrics.reviews.toLocaleString()}
                                    </div>
                                    <div className="text-gray-500 text-sm">In Review</div>
                                    <div className="mt-1 text-gray-400 text-xs">
                                        {(
                                            (statsData.latestMetrics.reviews / statsData.latestMetrics.entries) *
                                            100
                                        ).toFixed(1)}
                                        %
                                    </div>
                                </Card>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                {/* Time Series Chart */}
                                <Card className="p-6">
                                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <h3 className="font-medium text-lg">Progress Over Time</h3>
                                        <Select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
                                            className="min-w-48"
                                        >
                                            {Object.entries(METRIC_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value: number) => [
                                                        value.toLocaleString(),
                                                        METRIC_LABELS[selectedMetric],
                                                    ]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey={
                                                        selectedMetric === 'covered' && selectedCollection
                                                            ? 'coveragePercentage'
                                                            : selectedMetric
                                                    }
                                                    stroke={METRIC_COLORS[selectedMetric]}
                                                    strokeWidth={2}
                                                    dot={{ fill: METRIC_COLORS[selectedMetric] }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Translation Status Pie Chart */}
                                <Card className="p-6">
                                    <h3 className="mb-6 font-medium text-lg">Translation Status Distribution</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    dataKey="value"
                                                    label={false}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index.toString()}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
                                        {pieData.map((entry, index) => {
                                            const total = pieData.reduce((sum, item) => sum + item.value, 0);
                                            const percentage = ((entry.value / total) * 100).toFixed(1);
                                            return (
                                                <div key={index.toString()} className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 flex-shrink-0 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-gray-600">
                                                        {entry.name}: {entry.value.toLocaleString()} ({percentage}%)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>

                            {/* Coverage Pie Chart */}
                            {coveragePieData.length > 0 && (
                                <Card className="p-6">
                                    <h3 className="mb-6 font-medium text-lg">Book Coverage Progress</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={coveragePieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={90}
                                                    innerRadius={30}
                                                    dataKey="value"
                                                    label={false}
                                                    labelLine={false}
                                                >
                                                    {coveragePieData.map((entry, index) => (
                                                        <Cell key={`cell-${index.toString()}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: number, name: string) => [
                                                        `${value.toLocaleString()} pages`,
                                                        name,
                                                    ]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Custom Legend */}
                                    <div className="mt-4 flex justify-center gap-8 text-sm">
                                        {coveragePieData.map((entry, index) => {
                                            const total = coveragePieData.reduce((sum, item) => sum + item.value, 0);
                                            const percentage = ((entry.value / total) * 100).toFixed(1);
                                            return (
                                                <div key={index.toString()} className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 flex-shrink-0 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-gray-300">
                                                        {entry.name}: {entry.value.toLocaleString()} pages ({percentage}
                                                        %)
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </>
            )}

            {/* No selection state */}
            {!selectedCollectionId && !loading && (
                <Card className="p-8 text-center">
                    <h2 className="font-semibold text-gray-600 text-xl">Select a Collection</h2>
                    <p className="mt-2 text-gray-500">
                        Choose a collection from the dropdown above to view its translation progress and statistics.
                    </p>
                </Card>
            )}
        </main>
    );
}
