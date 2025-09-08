'use client';

import { memo, useCallback, useMemo } from 'react';
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { Row } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const COLORS = ['#20A9E3', '#f97316', '#22c55e', '#eab308', '#64748b', '#8b5cf6', '#ef4444'];

type Props = {
    type: 'bar' | 'line' | 'pie';
    rows: Row[];
    xKey?: string;
    yKey?: string;
    categoryKey?: string;
    valueKey?: string;
};

function ChartsInner({ type, rows, xKey, yKey, categoryKey, valueKey }: Props) {
    if (!rows.length) return <div className="text-gray-500 text-sm">No data after filters.</div>;

    // Compute only what each chart needs (no cloning of entire rows)
    const chartData = useMemo(() => {
        if (type === 'pie' && categoryKey && valueKey) {
            const grouped = rows.reduce<Record<string, number>>((acc, r) => {
                const k = String(r[categoryKey] ?? '');
                const n =
                    typeof r[valueKey] === 'number' ? (r[valueKey] as number) : Number((r[valueKey] as unknown) ?? 0);
                acc[k] = (acc[k] ?? 0) + (Number.isFinite(n) ? n : 0);
                return acc;
            }, {});
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        }

        if (xKey && yKey) {
            return rows.map((r) => ({
                x: r[xKey] instanceof Date ? (r[xKey] as Date).toISOString() : r[xKey],
                y: typeof r[yKey] === 'number' ? (r[yKey] as number) : Number((r[yKey] as unknown) ?? 0),
            }));
        }

        return [];
    }, [rows, type, xKey, yKey, categoryKey, valueKey]);

    // Stable formatters (avoid re-renders)
    const labelFmt = useCallback((v: unknown) => formatDate(v), []);

    // Only remount when chart type changes
    const chartKey = type;

    if (type === 'bar' && xKey && yKey) {
        return (
            <div key={chartKey} className="h-96 w-full">
                <ResponsiveContainer>
                    <BarChart data={chartData}>
                        <XAxis dataKey="x" tickFormatter={labelFmt} interval="preserveStartEnd" minTickGap={10} />
                        <YAxis />
                        <Tooltip labelFormatter={labelFmt} />
                        <Legend />
                        <Bar dataKey="y" fill="#20A9E3" radius={6} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'line' && xKey && yKey) {
        return (
            <div key={chartKey} className="h-96 w-full">
                <ResponsiveContainer>
                    <LineChart data={chartData}>
                        <XAxis dataKey="x" tickFormatter={labelFmt} interval="preserveStartEnd" minTickGap={10} />
                        <YAxis />
                        <Tooltip labelFormatter={labelFmt} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="y"
                            stroke="#20A9E3"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'pie' && categoryKey && valueKey) {
        return (
            <div key={chartKey} className="h-96 w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                            data={chartData as Array<{ name: string; value: number }>}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={120}
                            innerRadius={60}
                        >
                            {(chartData as Array<{ name: string; value: number }>).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return null;
}

export const Charts = memo(ChartsInner);
