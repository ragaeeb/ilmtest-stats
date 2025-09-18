import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readCsvToJson } from './csv';

describe('CSV reader', () => {
    it('parses CSV data into normalized rows', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-csv-'));
        const file = path.join(dir, 'sample.csv');
        const csv = ['id,name,score,date', '1,Alice,42,2020-01-01', '2,Bob,,2020-02-01'].join('\n');
        await Bun.write(file, csv);

        const result = await readCsvToJson(file);
        expect(result.rows).toEqual([
            { id: 1, name: 'Alice', score: 42, date: new Date('2020-01-01T00:00:00.000Z') },
            { id: 2, name: 'Bob', score: null, date: new Date('2020-02-01T00:00:00.000Z') },
        ]);
        expect(result.meta.columns.map((c) => c.type)).toEqual(['number', 'string', 'number', 'date']);

        await rm(dir, { recursive: true, force: true });
    });
});
