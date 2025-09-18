import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { ColumnInfo, Row, StatsResponse } from './types';
import { inferType, tryParseDate, tryParseNumber } from './utils';

const CSV_RELATIVE_PATH = path.join(process.cwd(), 'public', 'data', 'stats.csv');

/**
 * Reads a CSV file and returns normalized rows alongside metadata describing inferred column
 * types and counts.
 *
 * @param filePath - Optional override of the CSV path (defaults to the public data CSV).
 * @returns The normalized dataset with metadata.
 */
export async function readCsvToJson(filePath: string = CSV_RELATIVE_PATH): Promise<StatsResponse> {
    const buf = await fs.readFile(filePath);
    const content = buf.toString('utf-8');

    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as Row[];

    const keys = Object.keys(records[0] ?? {});
    const columns: ColumnInfo[] = keys.map((key) => {
        const values = records.map((r) => r[key]);
        const t = inferType(values);
        return {
            key,
            type: t,
            uniqueCount: new Set(values.map((v) => String(v ?? ''))).size,
        };
    });

    const normalizedRows: Row[] = records.map((row) => {
        const out: Row = {};
        for (const col of columns) {
            const v = row[col.key];
            if (col.type === 'number') out[col.key] = tryParseNumber(v);
            else if (col.type === 'date') out[col.key] = typeof v === 'string' ? tryParseDate(v) : null;
            else out[col.key] = v ?? null;
        }
        return out;
    });

    return {
        rows: normalizedRows,
        meta: {
            columns,
            rowCount: normalizedRows.length,
        },
    };
}
