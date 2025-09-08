import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { ColumnInfo, Row } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const ITEM_HEIGHT = 45; // Slightly increased height for better readability
const HEADER_HEIGHT = 50; // Increased header height
const BUFFER_SIZE = 5; // Extra items to render outside viewport

interface VirtualizedDataTableProps {
    rows: Row[];
    columns: ColumnInfo[];
    maxHeight?: number;
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

const VirtualizedDataTableInner = memo(function VirtualizedDataTable({
    rows,
    columns,
    maxHeight = 600,
}: VirtualizedDataTableProps) {
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(maxHeight);

    // Calculate visible range
    const visibleRange = useMemo(() => {
        const visibleItemCount = Math.ceil(containerHeight / ITEM_HEIGHT);
        const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
        const endIndex = Math.min(rows.length - 1, startIndex + visibleItemCount + BUFFER_SIZE * 2);

        return { startIndex, endIndex, visibleItemCount };
    }, [scrollTop, containerHeight, rows.length]);

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Update container height on resize
    useEffect(() => {
        const element = scrollElementRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerHeight(Math.min(entry.contentRect.height, maxHeight));
            }
        });

        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
    }, [maxHeight]);

    // Calculate column widths with improved algorithm
    const columnWidths = useMemo(() => {
        const minColumnWidth = 120;
        const maxColumnWidth = 300;

        return columns.map((col) => {
            // Calculate width based on content type and header length
            let width = Math.max(minColumnWidth, col.key.length * 10);

            if (col.type === 'date') width = Math.max(140, width);
            else if (col.type === 'number') width = Math.max(100, width);
            else if (col.type === 'string') width = Math.max(150, width);

            // Don't exceed max width
            width = Math.min(maxColumnWidth, width);

            return width;
        });
    }, [columns]);

    // Ensure table takes full width by distributing remaining space
    const distributedWidths = useMemo(() => {
        const containerWidth =
            scrollElementRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth - 100 : 1200);
        const totalCalculatedWidth = columnWidths.reduce((sum, width) => sum + width, 0);

        if (totalCalculatedWidth < containerWidth) {
            // Distribute extra space proportionally
            const extraSpace = containerWidth - totalCalculatedWidth;
            const extraPerColumn = extraSpace / columns.length;

            return columnWidths.map((width) => Math.floor(width + extraPerColumn));
        }

        return columnWidths;
    }, [columnWidths, columns.length]);

    const totalWidth = distributedWidths.reduce((sum, width) => sum + width, 0);

    // Visible items
    const visibleItems = useMemo(() => {
        return rows.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    }, [rows, visibleRange.startIndex, visibleRange.endIndex]);

    const totalHeight = rows.length * ITEM_HEIGHT;

    return (
        <Card className="w-full overflow-hidden">
            <details open>
                <summary className="cursor-pointer border-b bg-gray-50/50 px-6 py-4 font-medium text-base transition-colors hover:bg-gray-100/50">
                    <span className="flex items-center justify-between">
                        <span>
                            Data Table ({rows.length.toLocaleString()} rows × {columns.length} columns)
                        </span>
                    </span>
                </summary>

                <div
                    ref={scrollElementRef}
                    className="w-full overflow-auto"
                    style={{ height: Math.min(maxHeight, totalHeight + HEADER_HEIGHT) }}
                    onScroll={handleScroll}
                >
                    {/* Header */}
                    <div
                        className="sticky top-0 z-20 flex border-b bg-white shadow-sm"
                        style={{
                            height: HEADER_HEIGHT,
                            minWidth: totalWidth,
                            width: '100%',
                        }}
                    >
                        {columns.map((col, i) => (
                            <div
                                key={col.key}
                                className="flex items-center border-r bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 text-sm last:border-r-0"
                                style={{ width: distributedWidths[i] }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="truncate">{col.key}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Virtual scrolling container */}
                    <div style={{ height: totalHeight, position: 'relative' }}>
                        {/* Visible rows */}
                        <div
                            style={{
                                transform: `translateY(${visibleRange.startIndex * ITEM_HEIGHT}px)`,
                                minWidth: totalWidth,
                                width: '100%',
                            }}
                        >
                            {visibleItems.map((row, index) => {
                                const actualIndex = visibleRange.startIndex + index;

                                return (
                                    <div
                                        key={actualIndex}
                                        className={`flex border-b transition-colors hover:bg-blue-50/50`}
                                        style={{ height: ITEM_HEIGHT }}
                                    >
                                        {columns.map((col, colIndex) => {
                                            const cellValue = row[col.key];
                                            const formattedValue = renderCell(cellValue);

                                            return (
                                                <div
                                                    key={col.key}
                                                    className="flex items-center border-r px-4 py-3 text-sm last:border-r-0"
                                                    style={{ width: distributedWidths[colIndex] }}
                                                >
                                                    <div className="w-full truncate" title={String(formattedValue)}>
                                                        <span className={'block text-right font-mono'}>
                                                            {formattedValue}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer with pagination info */}
                    <div className="sticky bottom-0 flex items-center justify-between border-t bg-white px-6 py-3 text-gray-500 text-sm">
                        <span>
                            Showing rows {visibleRange.startIndex + 1} -{' '}
                            {Math.min(visibleRange.endIndex + 1, rows.length)} of {rows.length.toLocaleString()}
                        </span>
                        <span className="text-xs">
                            Scroll position: {Math.round((scrollTop / (totalHeight - containerHeight)) * 100) || 0}%
                        </span>
                    </div>
                </div>
            </details>
        </Card>
    );
});

export const VirtualizedDataTable = VirtualizedDataTableInner;
