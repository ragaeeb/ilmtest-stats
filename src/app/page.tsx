'use client';

import { memo, useDeferredValue, useEffect, useState } from 'react';
import { Charts } from '@/components/charts/Charts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { ColumnInfo, Row, StatsResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type ChartType = 'bar' | 'line';

export default function Page() {
    const [data, setData] = useState<StatsResponse | null>(null);
    const [chartState, setChartState] = useState<{
        type: ChartType;
        x?: string;
        y?: string;
        category?: string;
        value?: string;
    }>({ type: 'bar' });

    useEffect(() => {
        fetch('/api/stats')
            .then((r) => r.json())
            .then((d: StatsResponse) => {
                setData(d);
                const firstCol = d.meta.columns[0]?.key;
                const firstNumeric = d.meta.columns.find((c) => c.type === 'number')?.key ?? firstCol;
                setChartState((s) => ({
                    ...s,
                    x: firstCol,
                    y: firstNumeric,
                    category: firstCol,
                    value: firstNumeric,
                }));
            });
    }, []);

    // Defer heavy row updates so controls/charts feel instant
    const deferredRows = useDeferredValue(data?.rows || []);

    if (!data?.rows?.length) {
        return <main className="container-app py-10">Loading…</main>;
    }

    return (
        <main className="container-app space-y-8 py-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo_flat.png" alt="IlmTest" className="h-10 w-10" />
                    <div>
                        <h1 className="font-semibold text-2xl tracking-tight">IlmTest Stats</h1>
                        <p className="text-gray-500 text-sm">IlmTest Project analytics.</p>
                    </div>
                </div>
            </div>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
                <div className="space-y-6">
                    <Card className="p-4">
                        <ChartControls
                            columns={data.meta.columns}
                            state={chartState}
                            onChange={(s) => {
                                setChartState(s as any);
                            }}
                        />
                        <div className="mt-6">
                            {deferredRows.length && (
                                <Charts
                                    type={chartState.type}
                                    rows={deferredRows as Row[]}
                                    xKey={chartState.x}
                                    yKey={chartState.y}
                                    categoryKey={chartState.category}
                                    valueKey={chartState.value}
                                />
                            )}
                        </div>
                    </Card>

                    <DataTable rows={deferredRows as Row[]} columns={data.meta.columns} />
                </div>
            </section>
        </main>
    );
}

function renderCell(v: unknown) {
    if (v instanceof Date) return formatDate(v);
    if (typeof v === 'string') {
        const pretty = formatDate(v);
        if (pretty !== v) return pretty;
    }
    if (typeof v === 'number') return Intl.NumberFormat().format(v);
    return String(v ?? '');
}

const DataTable = memo(function DataTable({ rows, columns }: { rows: Row[]; columns: ColumnInfo[] }) {
    return (
        <Card className="overflow-hidden">
            <details open>
                <summary className="cursor-pointer px-4 py-3 font-medium text-sm">
                    Data table ({rows.length.toLocaleString()} rows)
                </summary>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-[rgb(var(--card))]">
                            <tr>
                                {columns.map((c) => (
                                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500">
                                        {c.key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i.toString()} className="border-t">
                                    {columns.map((c) => (
                                        <td key={c.key} className="whitespace-nowrap px-4 py-2">
                                            {renderCell(row[c.key])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </Card>
    );
});

function ChartControls({
    columns,
    state,
    onChange,
}: {
    columns: ColumnInfo[];
    state: { type: ChartType; x?: string; y?: string; category?: string; value?: string };
    onChange: (s: unknown) => void;
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
                    >
                        {t}
                    </Button>
                ))}
            </div>
            <Select value={state.y} onChange={(e) => onChange({ ...state, y: e.target.value })}>
                {numeric.map((o) => (
                    <option key={o.key} value={o.key}>
                        {o.key}
                    </option>
                ))}
            </Select>
        </div>
    );
}
