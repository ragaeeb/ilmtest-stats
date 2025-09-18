import { describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decompressString } from './compression';
import {
    calculateStats,
    denormalizeRecords,
    isValidAppName,
    loadCompressedCsv,
    loadReferenceData,
    normalizeDownloads,
} from './blackberry';

const RAW_DOWNLOADS = [
    'ProductName,FileBundleName,Version,DateTime,DeviceModel,OSVersion,Carrier,Locale,Country',
    'quran10,quran10,1.0,2024-01-01T00:00:00Z,DeviceA,OS1,CarrierA,en-US,CA',
    'quran10,quran10,1.0,2024-01-02T00:00:00Z,DeviceB,OS1,CarrierA,en-US,CA',
    'quran10,quran10,2.0,2024-01-03T00:00:00Z,DeviceA,OS2,CarrierB,fr-FR,FR',
    'sunnah10,sunnah10,1.1,2024-01-04T00:00:00Z,DeviceC,OS2,CarrierC,en-US,US',
    'invalid,,1.0,2024-01-05T00:00:00Z,DeviceD,OS3,CarrierD,,',
].join('\n');

describe('blackberry downloads', () => {
    it('normalizes downloads and computes statistics', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-blackberry-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            await Bun.write('downloads.csv', RAW_DOWNLOADS);

            const result = await normalizeDownloads(['downloads.csv']);
            expect(Object.keys(result.normalizedRecords)).toContain('quran10');
            const quranCsv = await Bun.file('quran10.csv.br').arrayBuffer();
            const csvContents = decompressString(Buffer.from(quranCsv));
            expect(csvContents.split('\n')).toHaveLength(4);

            expect(isValidAppName('quran10')).toBeTrue();
            expect(isValidAppName('unknown')).toBeFalse();

            await mkdir(path.join('public', 'data', 'bb10'), { recursive: true });
            for (const file of ['countries.json', 'devices.json', 'locales.json', 'osVersions.json', 'versions.json', 'carriers.json']) {
                await Bun.write(path.join('public', 'data', 'bb10', file), await Bun.file(file).text());
            }
            await Bun.write(path.join('public', 'data', 'bb10', 'quran10.csv.br'), quranCsv);

            const reference = await loadReferenceData();
            const records = await loadCompressedCsv('quran10');
            expect(records[0]).toHaveProperty('VersionId');

            const denormalized = denormalizeRecords(records, reference, 'quran10');
            expect(denormalized[0].ProductName).toBe('quran10');

            const emptyStats = calculateStats([], reference);
            expect(emptyStats.totalDownloads).toBe(0);

            const stats = calculateStats(records, reference);
            expect(stats.totalDownloads).toBe(records.length);
            expect(stats.downloadsByCountry[0].downloads).toBeGreaterThan(0);
            expect(stats.topCountries.length).toBeGreaterThan(0);
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
