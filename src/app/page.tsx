'use client';

import Image from 'next/image';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Charts } from '@/components/charts/Charts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { VirtualizedDataTable } from '@/components/virtualized-data-table';
import type { ColumnInfo, Row, StatsResponse } from '@/lib/types';

type ChartType = 'bar' | 'line';

interface ExtendedStatsResponse extends StatsResponse {
    statistics?: {
        numeric: Record<string, any>;
        string: Record<string, any>;
        date: Record<string, any>;
        overall: {
            totalRows: number;
            totalColumns: number;
            numericColumns: number;
            stringColumns: number;
            dateColumns: number;
        };
    };
    chartCache?: {
        byDate: any;
        numericSummaries: Record<string, any>;
        categoryDistributions: Record<string, [string, number][]>;
    };
}

export default function Page() {
    const [data, setData] = useState<ExtendedStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartState, setChartState] = useState<{
        type: ChartType;
        x?: string;
        y?: string;
    }>({ type: 'bar' });

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/stats');

                if (!response.ok) {
                    throw new Error(`Failed to fetch data: ${response.status}`);
                }

                const result: ExtendedStatsResponse = await response.json();

                if (!isMounted) return;

                setData(result);

                // Set intelligent defaults based on preprocessed data
                if (result.meta.columns.length > 0) {
                    const dateColumn = result.meta.columns.find((c) => c.type === 'date')?.key;
                    const numericColumn = result.meta.columns.find((c) => c.type === 'number')?.key;
                    const fallbackX = dateColumn || result.meta.columns[0]?.key;
                    const fallbackY = numericColumn || result.meta.columns[1]?.key || fallbackX;

                    setChartState((prev) => ({
                        ...prev,
                        x: fallbackX,
                        y: fallbackY,
                    }));
                }
            } catch (err) {
                if (!isMounted) return;
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Failed to fetch stats:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Defer heavy operations to keep UI responsive
    const deferredRows = useDeferredValue(data?.rows || []);
    const deferredChartState = useDeferredValue(chartState);

    // Performance stats for display
    const performanceStats = useMemo(() => {
        if (!data) return null;

        return {
            rowCount: data.rows.length,
            columnCount: data.meta.columns.length,
            numericColumns: data.meta.columns.filter((c) => c.type === 'number').length,
            dateColumns: data.meta.columns.filter((c) => c.type === 'date').length,
            hasCache: !!data.chartCache,
            hasStatistics: !!data.statistics,
        };
    }, [data]);

    if (loading) {
        return (
            <main className="container mx-auto flex min-h-screen max-w-none flex-col items-center justify-center px-4 py-20">
                <div className="space-y-6 text-center">
                    <div className="space-y-2">
                        <h2 className="font-semibold text-xl">Loading Analytics Data</h2>
                        <p className="text-gray-500">Processing CSV data and computing statistics...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="container mx-auto max-w-none px-4 py-20">
                <Card className="p-8 text-center">
                    <h2 className="mb-2 font-semibold text-red-600 text-xl">Error Loading Data</h2>
                    <p className="mb-4 text-gray-600">{error}</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </Card>
            </main>
        );
    }

    if (!data?.rows?.length) {
        return (
            <main className="container mx-auto max-w-none px-4 py-20">
                <Card className="p-8 text-center">
                    <h2 className="font-semibold text-gray-600 text-xl">No Data Available</h2>
                    <p className="mt-2 text-gray-500">Please check that your CSV file contains data.</p>
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
                        <h1 className="font-semibold text-2xl tracking-tight">IlmTest Stats</h1>
                        <p className="text-gray-500 text-sm">
                            Analytics dashboard with {performanceStats?.rowCount.toLocaleString()} records
                            {performanceStats?.hasCache && ' (optimized)'}
                            {performanceStats?.hasStatistics && ' • Statistics computed'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Statistics Overview */}
            {data.statistics && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card className="p-4">
                        <div className="font-bold text-2xl text-blue-600">
                            {data.statistics.overall.totalRows.toLocaleString()}
                        </div>
                        <div className="text-gray-500 text-sm">Total Rows</div>
                    </Card>
                    <Card className="p-4">
                        <div className="font-bold text-2xl text-green-600">
                            {data.statistics.overall.numericColumns}
                        </div>
                        <div className="text-gray-500 text-sm">Numeric Columns</div>
                    </Card>
                    <Card className="p-4">
                        <div className="font-bold text-2xl text-purple-600">
                            {data.statistics.overall.stringColumns}
                        </div>
                        <div className="text-gray-500 text-sm">Text Columns</div>
                    </Card>
                    <Card className="p-4">
                        <div className="font-bold text-2xl text-orange-600">{data.statistics.overall.dateColumns}</div>
                        <div className="text-gray-500 text-sm">Date Columns</div>
                    </Card>
                </div>
            )}

            {/* Main Content - Full Width */}
            <div className="space-y-8">
                {/* Chart Section */}
                <Card className="p-6">
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <h2 className="font-medium text-lg">Data Visualization</h2>
                        <ChartControls
                            columns={data.meta.columns}
                            state={deferredChartState}
                            onChange={setChartState}
                        />
                    </div>

                    <div className="w-full">
                        <Charts
                            type={deferredChartState.type}
                            rows={deferredRows as Row[]}
                            xKey={deferredChartState.x}
                            yKey={deferredChartState.y}
                            preprocessedData={data}
                        />
                    </div>

                    {/* Statistics for selected column */}
                    {data.statistics && deferredChartState.y && data.statistics.numeric[deferredChartState.y] && (
                        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-4 lg:grid-cols-6">
                            {Object.entries(data.statistics.numeric[deferredChartState.y])
                                .filter(([key]) => !['count', 'sum'].includes(key))
                                .map(([key, value]) => (
                                    <div key={key} className="text-center">
                                        <div className="font-semibold text-lg">
                                            {typeof value === 'number'
                                                ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                : String(value)}
                                        </div>
                                        <div className="text-gray-500 text-xs capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </Card>

                {/* Data Table Section */}
                <div className="w-full">
                    <VirtualizedDataTable rows={deferredRows as Row[]} columns={data.meta.columns} maxHeight={600} />
                </div>
            </div>
        </main>
    );
}

type ChartState = { type: ChartType; x?: string; y?: string; category?: string; value?: string };

function ChartControls({
    columns,
    state,
    onChange,
}: {
    columns: ColumnInfo[];
    state: ChartState;
    onChange: (s: ChartState) => void;
}) {
    const numeric = columns.filter((c) => c.type === 'number');
    const types: ChartType[] = ['bar', 'line'];

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-2 rounded-xl border bg-[rgb(var(--muted))] p-1">
                {types.map((t) => (
                    <Button
                        key={t}
                        size="sm"
                        variant={state.type === t ? 'default' : 'ghost'}
                        onClick={() => onChange({ ...state, type: t })}
                        className="capitalize"
                    >
                        {t}
                    </Button>
                ))}
            </div>

            <Select
                value={state.y || ''}
                onChange={(e) => onChange({ ...state, y: e.target.value })}
                className="min-w-32"
            >
                {numeric.map((o) => (
                    <option key={o.key} value={o.key}>
                        {o.key}
                    </option>
                ))}
            </Select>
        </div>
    );
}
