'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ColumnInfo } from '@/lib/types';

type FilterConfig =
    | { op: 'between'; value: [number | null, number | null] }
    | { op: 'date-between'; value: [string, string] };

export function FilterPanel({
    columns,
    onChange,
}: {
    columns: ColumnInfo[];
    onChange: (filters: Record<string, FilterConfig | null>) => void;
}) {
    const numericCols = useMemo(() => columns.filter((c) => c.type === 'number'), [columns]);
    const dateCols = useMemo(() => columns.filter((c) => c.type === 'date'), [columns]);

    const [metric, setMetric] = useState<string | undefined>(numericCols[0]?.key);
    const [min, setMin] = useState<string>('');
    const [max, setMax] = useState<string>('');

    const [dateCol, setDateCol] = useState<string | undefined>(dateCols[0]?.key);
    const [start, setStart] = useState<string>('');
    const [end, setEnd] = useState<string>('');

    // Emit normalized filters for the page to consume
    useEffect(() => {
        const f: Record<string, FilterConfig | null> = {};

        if (metric && (min !== '' || max !== '')) {
            f[metric] = {
                op: 'between',
                value: [min === '' ? null : Number(min), max === '' ? null : Number(max)],
            };
        }

        if (dateCol && (start || end)) {
            f[dateCol] = { op: 'date-between', value: [start, end] };
        }

        onChange(f);
    }, [metric, min, max, dateCol, start, end, onChange]);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="mb-1 font-medium text-sm">Filters</h3>
                <p className="text-gray-500 text-xs">
                    Pick a <strong>Metric</strong> to filter numerically and (optionally) a <strong>Date range</strong>.
                    Numeric columns are detected automatically.
                </p>
            </div>

            {/* Metric selector */}
            <div className="space-y-2 rounded-xl border bg-[rgb(var(--card))] p-3">
                <label className="text-gray-500 text-xs">Metric</label>
                <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
                    {numericCols.map((c) => (
                        <option key={c.key} value={c.key}>
                            {c.key}
                        </option>
                    ))}
                </Select>
                <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} />
                    <span className="text-gray-400 text-xs">to</span>
                    <Input type="number" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} />
                </div>
            </div>

            {/* Date range */}
            {dateCols.length > 0 && (
                <div className="space-y-2 rounded-xl border bg-[rgb(var(--card))] p-3">
                    <label className="text-gray-500 text-xs">Date column</label>
                    <Select value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
                        {dateCols.map((c) => (
                            <option key={c.key} value={c.key}>
                                {c.key}
                            </option>
                        ))}
                    </Select>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                        <span className="text-gray-400 text-xs">to</span>
                        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                </div>
            )}

            <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                    setMin('');
                    setMax('');
                    setStart('');
                    setEnd('');
                }}
            >
                Clear filters
            </Button>
        </div>
    );
}
