import { NextResponse } from 'next/server';
import { readCsvToJson } from '@/lib/csv';

export const dynamic = 'force-static';

export async function GET() {
    try {
        const json = await readCsvToJson();

        // Compute comprehensive statistics for all numeric columns
        const numericStats = computeNumericStatistics(json.rows, json.meta.columns);
        const stringStats = computeStringStatistics(json.rows, json.meta.columns);
        const dateStats = computeDateStatistics(json.rows, json.meta.columns);

        // Preprocess chart data for faster frontend rendering
        const preprocessedData = {
            ...json,
            statistics: {
                numeric: numericStats,
                string: stringStats,
                date: dateStats,
                overall: {
                    totalRows: json.rows.length,
                    totalColumns: json.meta.columns.length,
                    numericColumns: json.meta.columns.filter((c) => c.type === 'number').length,
                    stringColumns: json.meta.columns.filter((c) => c.type === 'string').length,
                    dateColumns: json.meta.columns.filter((c) => c.type === 'date').length,
                },
            },
            chartCache: {
                // Pre-aggregate common chart combinations
                byDate: preprocessDateData(json.rows),
                categoryDistributions: preprocessCategoryData(json.rows, json.meta.columns),
                numericSummaries: numericStats,
            },
        };

        return NextResponse.json(preprocessedData, { status: 200 });
    } catch (e) {
        console.error('CSV processing error:', e);
        return NextResponse.json({ error: 'Failed to read CSV' }, { status: 500 });
    }
}

function computeNumericStatistics(rows: any[], columns: any[]) {
    const numericColumns = columns.filter((col) => col.type === 'number');

    return numericColumns.reduce(
        (stats, col) => {
            const values = rows.map((row) => row[col.key]).filter((val) => typeof val === 'number' && isFinite(val));

            if (values.length === 0) {
                stats[col.key] = {
                    count: 0,
                    sum: 0,
                    average: 0,
                    min: null,
                    max: null,
                    median: null,
                    standardDeviation: 0,
                    variance: 0,
                    percentile25: null,
                    percentile75: null,
                };
                return stats;
            }

            const sorted = [...values].sort((a, b) => a - b);
            const sum = values.reduce((acc, val) => acc + val, 0);
            const average = sum / values.length;

            // Calculate variance and standard deviation
            const variance = values.reduce((acc, val) => acc + (val - average) ** 2, 0) / values.length;
            const standardDeviation = Math.sqrt(variance);

            // Calculate percentiles
            const getPercentile = (arr: number[], percentile: number) => {
                const index = (percentile / 100) * (arr.length - 1);
                if (Math.floor(index) === index) {
                    return arr[index];
                }
                const lower = arr[Math.floor(index)];
                const upper = arr[Math.ceil(index)];
                return lower + (upper - lower) * (index - Math.floor(index));
            };

            stats[col.key] = {
                count: values.length,
                sum,
                average,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                median: getPercentile(sorted, 50),
                standardDeviation,
                variance,
                percentile25: getPercentile(sorted, 25),
                percentile75: getPercentile(sorted, 75),
            };

            return stats;
        },
        {} as Record<string, any>,
    );
}

function computeStringStatistics(rows: any[], columns: any[]) {
    const stringColumns = columns.filter((col) => col.type === 'string');

    return stringColumns.reduce(
        (stats, col) => {
            const values = rows
                .map((row) => row[col.key])
                .filter((val) => val != null)
                .map((val) => String(val));

            // Count unique values and their frequencies
            const valueFrequencies = values.reduce(
                (freq, val) => {
                    freq[val] = (freq[val] || 0) + 1;
                    return freq;
                },
                {} as Record<string, number>,
            );

            const uniqueValues = Object.keys(valueFrequencies);
            const sortedByFrequency = Object.entries(valueFrequencies).sort(([, a], [, b]) => b - a);

            // Calculate string length statistics
            const lengths = values.map((val) => val.length).filter((len) => len > 0);
            const sortedLengths = lengths.sort((a, b) => a - b);
            const avgLength = lengths.length > 0 ? lengths.reduce((sum, len) => sum + len, 0) / lengths.length : 0;

            stats[col.key] = {
                totalCount: values.length,
                uniqueCount: uniqueValues.length,
                mostFrequent: sortedByFrequency[0]?.[0] || null,
                mostFrequentCount: sortedByFrequency[0]?.[1] || 0,
                leastFrequent: sortedByFrequency[sortedByFrequency.length - 1]?.[0] || null,
                leastFrequentCount: sortedByFrequency[sortedByFrequency.length - 1]?.[1] || 0,
                averageLength: Math.round(avgLength * 100) / 100,
                minLength: sortedLengths[0] || 0,
                maxLength: sortedLengths[sortedLengths.length - 1] || 0,
                topValues: sortedByFrequency.slice(0, 10), // Top 10 most frequent values
            };

            return stats;
        },
        {} as Record<string, any>,
    );
}

function computeDateStatistics(rows: any[], columns: any[]) {
    const dateColumns = columns.filter((col) => col.type === 'date');

    return dateColumns.reduce(
        (stats, col) => {
            const dates = rows
                .map((row) => row[col.key])
                .filter((val) => val != null)
                .map((val) => (val instanceof Date ? val : new Date(val)))
                .filter((date) => !Number.isNaN(date.getTime()));

            if (dates.length === 0) {
                stats[col.key] = {
                    count: 0,
                    earliest: null,
                    latest: null,
                    range: null,
                    averageGap: null,
                };
                return stats;
            }

            const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
            const earliest = sortedDates[0];
            const latest = sortedDates[sortedDates.length - 1];
            const range = latest.getTime() - earliest.getTime();

            // Calculate average gap between consecutive dates
            let totalGap = 0;
            let gapCount = 0;
            for (let i = 1; i < sortedDates.length; i++) {
                const gap = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
                if (gap > 0) {
                    totalGap += gap;
                    gapCount++;
                }
            }
            const averageGap = gapCount > 0 ? totalGap / gapCount : null;

            // Group by common time periods
            const byYear = dates.reduce(
                (acc, date) => {
                    const year = date.getFullYear();
                    acc[year] = (acc[year] || 0) + 1;
                    return acc;
                },
                {} as Record<number, number>,
            );

            const byMonth = dates.reduce(
                (acc, date) => {
                    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    acc[month] = (acc[month] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>,
            );

            stats[col.key] = {
                count: dates.length,
                earliest: earliest.toISOString(),
                latest: latest.toISOString(),
                range: Math.round(range / (1000 * 60 * 60 * 24)), // Range in days
                averageGap: averageGap ? Math.round(averageGap / (1000 * 60 * 60 * 24)) : null, // Average gap in days
                byYear: Object.entries(byYear).sort(([a], [b]) => parseInt(a) - parseInt(b)),
                byMonth: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)),
            };

            return stats;
        },
        {} as Record<string, any>,
    );
}

function preprocessDateData(rows: any[]) {
    // Find date columns
    const dateColumns =
        rows.length > 0
            ? Object.keys(rows[0]).filter((key) => {
                  const sample = rows.find((row) => row[key] != null)?.[key];
                  return sample instanceof Date || (typeof sample === 'string' && !Number.isNaN(Date.parse(sample)));
              })
            : [];

    if (dateColumns.length === 0) return {};

    const primaryDateCol = dateColumns[0];

    // Group data by date for time series
    const grouped = rows.reduce(
        (acc, row) => {
            const dateKey = row[primaryDateCol];
            if (!dateKey) return acc;

            const dateStr = dateKey instanceof Date ? dateKey.toISOString().split('T')[0] : String(dateKey);
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(row);
            return acc;
        },
        {} as Record<string, any[]>,
    );

    return {
        primaryDateColumn: primaryDateCol,
        groupedByDate: grouped,
        dateRange: {
            min: Math.min(...Object.keys(grouped).map((d) => new Date(d).getTime())),
            max: Math.max(...Object.keys(grouped).map((d) => new Date(d).getTime())),
        },
    };
}

function preprocessCategoryData(rows: any[], columns: any[]) {
    const stringColumns = columns.filter((col) => col.type === 'string');

    return stringColumns.reduce(
        (acc, col) => {
            const distribution: Record<string, number> = rows.reduce((dist, row) => {
                const val = String(row[col.key] || 'Unknown');
                dist[val] = (dist[val] || 0) + 1;
                return dist;
            }, {});

            acc[col.key] = Object.entries(distribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20); // Top 20 categories

            return acc;
        },
        {} as Record<string, [string, number][]>,
    );
}
