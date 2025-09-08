'use client';

import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Charts } from '@/components/charts/Charts';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ColumnInfo, Row, StatsResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type ChartType = 'bar' | 'line' | 'pie';

export default function Page() {
    const [data, setData] = useState<StatsResponse | null>(null);
    const [query, setQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, unknown>>({});
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

    const filteredRows = useMemo(() => {
        if (!data) return [];
        const rows = data.rows;
        return rows.filter((row) => {
            // global text query
            if (query.trim()) {
                const q = query.toLowerCase();
                const hit = Object.values(row).some((v) =>
                    String(v ?? '')
                        .toLowerCase()
                        .includes(q),
                );
                if (!hit) return false;
            }
            // filters
            for (const [key, cfg] of Object.entries(filters)) {
                const v = (row as Record<string, unknown>)[key];
                if (!cfg) continue;
                const f = cfg as any;

                if (f.op === 'between' && Array.isArray(f.value) && f.value.length === 2) {
                    const [a, b] = f.value as [number | null, number | null];
                    const n = Number(v);
                    const min = a ?? Number.NEGATIVE_INFINITY;
                    const max = b ?? Number.POSITIVE_INFINITY;
                    if (!(n >= min && n <= max)) return false;
                }
                if (f.op === 'date-between' && Array.isArray(f.value) && f.value.length === 2) {
                    const [start, end] = f.value.map((d: string) => (d ? new Date(d) : null));
                    const dv = v ? new Date(String(v)) : null;
                    if (dv && start && dv < start) return false;
                    if (dv && end && dv > end) return false;
                }
            }
            return true;
        });
    }, [data, query, filters]);

    // Defer heavy row updates so controls/charts feel instant
    const deferredRows = useDeferredValue(filteredRows);

    if (!data) return <main className="container-app py-10">Loading…</main>;

    return (
        <main className="container-app space-y-8 py-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo_flat.png" alt="IlmTest" className="h-10 w-10" />
                    <div>
                        <h1 className="font-semibold text-2xl tracking-tight">IlmTest Stats</h1>
                        <p className="text-gray-500 text-sm">
                            Explore analytics for your Islamic platform &amp; projects.
                        </p>
                    </div>
                </div>
                <div className="w-64">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Quick search…" />
                </div>
            </div>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
                <Card className="self-start p-4 lg:sticky lg:top-24">
                    <FilterPanel columns={data.meta.columns} onChange={setFilters} />
                </Card>

                <div className="space-y-6">
                    <Card className="p-4">
                        <ChartControls
                            columns={data.meta.columns}
                            state={chartState}
                            onChange={(s) => {
                                setChartState(s as any);
                            }}
                        />
                        <p className="mt-2 text-gray-500 text-xs">
                            Tip: For bar/line, choose <em>X</em> (label) and <em>Y</em> (numeric). For pie, choose{' '}
                            <em>Category</em> + <em>Value</em>.
                        </p>
                        <div className="mt-6">
                            <Charts
                                type={chartState.type}
                                rows={deferredRows as Row[]}
                                xKey={chartState.x}
                                yKey={chartState.y}
                                categoryKey={chartState.category}
                                valueKey={chartState.value}
                            />
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
    const types: ChartType[] = ['bar', 'line', 'pie'];
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-2 rounded-xl border bg-[rgb(var(--muted))] p-1">
                {types.map((t) => (
                    <Button
                        key={t}
                        variant={state.type === t ? 'default' : 'ghost'}
                        onClick={() => onChange({ ...state, type: t })}
                    >
                        {t}
                    </Button>
                ))}
            </div>
            {(state.type === 'bar' || state.type === 'line') && (
                <>
                    <LabeledSelect
                        label="X"
                        value={state.x}
                        onChange={(v) => onChange({ ...state, x: v })}
                        options={columns.map((c) => ({ value: c.key, label: c.key }))}
                    />
                    <LabeledSelect
                        label="Y"
                        value={state.y}
                        onChange={(v) => onChange({ ...state, y: v })}
                        options={numeric.map((c) => ({ value: c.key, label: c.key }))}
                    />
                </>
            )}
            {state.type === 'pie' && (
                <>
                    <LabeledSelect
                        label="Category"
                        value={state.category}
                        onChange={(v) => onChange({ ...state, category: v })}
                        options={columns.map((c) => ({ value: c.key, label: c.key }))}
                    />
                    <LabeledSelect
                        label="Value"
                        value={state.value}
                        onChange={(v) => onChange({ ...state, value: v })}
                        options={numeric.map((c) => ({ value: c.key, label: c.key }))}
                    />
                </>
            )}
        </div>
    );
}

function LabeledSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        // biome-ignore lint/a11y/noLabelWithoutControl: <explanation>
        <label className="text-sm">
            <span className="mb-1 block text-gray-500 text-xs">{label}</span>
            <Select value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </Select>
        </label>
    );
}
