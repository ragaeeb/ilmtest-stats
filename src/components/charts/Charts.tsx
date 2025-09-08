'use client';

import { memo, useCallback, useMemo } from 'react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Row } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type Props = {
    type: 'bar' | 'line';
    rows: Row[];
    xKey?: string;
    yKey?: string;
    preprocessedData?: any; // From server preprocessing
};

function ChartsInner({ type, rows, xKey, yKey, preprocessedData }: Props) {
    // Use preprocessed data when available for better performance
    const chartData = useMemo(() => {
        if (!xKey || !yKey) return [];

        // Try to use preprocessed data first
        if (preprocessedData?.chartCache) {
            const { byDate, numericSummaries } = preprocessedData.chartCache;

            // If requesting date-based chart and we have preprocessed date data
            if (byDate.primaryDateColumn === xKey && numericSummaries[yKey]) {
                return Object.entries(byDate.groupedByDate)
                    .map(([date, rowsForDate]) => {
                        const yValues = (rowsForDate as Row[])
                            .map((r) => r[yKey])
                            .filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[];

                        if (yValues.length === 0) return null;

                        // Aggregate strategy: use sum for cumulative metrics, average for rates
                        const yValue = yValues.length === 1 ? yValues[0] : yValues.reduce((sum, v) => sum + v, 0); // Default to sum

                        return {
                            x: date,
                            y: yValue,
                            date: new Date(date),
                            count: yValues.length,
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a!.date.getTime() - b!.date.getTime());
            }
        }

        // Fallback to client-side processing with optimizations
        const uniqueData = new Map();

        for (const row of rows) {
            const xVal = row[xKey];
            const yVal = row[yKey];

            if (xVal == null || yVal == null) continue;

            const xFormatted = xVal instanceof Date ? xVal.toISOString().split('T')[0] : String(xVal);
            const yNumeric = typeof yVal === 'number' ? yVal : Number(yVal);

            if (!Number.isFinite(yNumeric)) continue;

            if (uniqueData.has(xFormatted)) {
                // Aggregate duplicate x values
                const existing = uniqueData.get(xFormatted);
                existing.y += yNumeric;
                existing.count += 1;
            } else {
                uniqueData.set(xFormatted, {
                    x: xFormatted,
                    y: yNumeric,
                    count: 1,
                    date: xVal instanceof Date ? xVal : new Date(xFormatted),
                });
            }
        }

        return Array.from(uniqueData.values()).sort((a, b) => {
            // Sort by date if possible, otherwise alphabetically
            if (a.date && b.date) return a.date.getTime() - b.date.getTime();
            return a.x.localeCompare(b.x);
        });
    }, [rows, xKey, yKey, preprocessedData]);

    // Memoized formatters
    const labelFormatter = useCallback((value: any) => {
        if (!value) return '';
        // Try to format as date first
        const formatted = formatDate(value);
        return formatted !== String(value) ? formatted : String(value);
    }, []);

    const tooltipFormatter = useCallback((value: any, name: string) => {
        if (typeof value === 'number') {
            return [Intl.NumberFormat().format(value), name];
        }
        return [String(value), name];
    }, []);

    // Custom tick formatter for X-axis to handle long labels
    const xAxisTickFormatter = useCallback((value: any, index: number) => {
        if (!value) return '';

        // For dates, show shorter format
        const formatted = formatDate(value);
        if (formatted !== String(value)) {
            // If it's a date, show just month/year for better spacing
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
        }

        // For non-dates, truncate if too long
        const str = String(value);
        return str.length > 10 ? str.substring(0, 8) + '...' : str;
    }, []);

    // Determine if we should show animation based on data size
    const shouldAnimate = chartData.length <= 50;

    // Calculate interval for X-axis based on data size
    const xAxisInterval = useMemo(() => {
        if (chartData.length <= 10) return 0;
        if (chartData.length <= 20) return 1;
        if (chartData.length <= 50) return Math.floor(chartData.length / 10);
        return Math.floor(chartData.length / 15);
    }, [chartData.length]);

    if (!chartData.length) {
        return (
            <div className="flex h-96 w-full items-center justify-center text-gray-500">
                No data available for selected fields
            </div>
        );
    }

    const commonProps = {
        data: chartData,
        margin: { top: 20, right: 30, left: 20, bottom: 80 }, // Increased bottom margin for rotated labels
    };

    if (type === 'bar') {
        return (
            <div className="h-[500px] w-full">
                {' '}
                {/* Increased height to accommodate labels */}
                <ResponsiveContainer>
                    <BarChart {...commonProps}>
                        <XAxis
                            dataKey="x"
                            tickFormatter={xAxisTickFormatter}
                            interval={xAxisInterval}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            fontSize={11} // Smaller font size
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis
                            tickFormatter={(val) => Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
                            fontSize={12}
                        />
                        <Tooltip
                            labelFormatter={labelFormatter}
                            formatter={tooltipFormatter}
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar
                            dataKey="y"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={shouldAnimate}
                            name={yKey || 'Value'}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'line') {
        return (
            <div className="h-[500px] w-full">
                {' '}
                {/* Increased height to accommodate labels */}
                <ResponsiveContainer>
                    <LineChart {...commonProps}>
                        <XAxis
                            dataKey="x"
                            tickFormatter={xAxisTickFormatter}
                            interval={xAxisInterval}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            fontSize={11} // Smaller font size
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis
                            tickFormatter={(val) => Intl.NumberFormat('en', { notation: 'compact' }).format(val)}
                            fontSize={12}
                        />
                        <Tooltip
                            labelFormatter={labelFormatter}
                            formatter={tooltipFormatter}
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Line
                            type="monotone"
                            dataKey="y"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                            isAnimationActive={shouldAnimate}
                            name={yKey || 'Value'}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return null;
}

export const Charts = memo(ChartsInner);
