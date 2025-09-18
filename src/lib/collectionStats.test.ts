import { describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decompressJson } from './compression';
import { condenseCollectionStats, optimizeQuranProgress, updateCollectionStats } from './collectionStats';

const COLLECTION_CSV = [
    'id,timestamp,collection,covered,reviews,drafts,explained,total_entries,unlinked,verify',
    '1,2024-01-01T00:00:00Z,1,10,5,1,0,20,1,0',
    '2,2024-01-02T00:00:00Z,1,10,6,1,0,20,1,0',
    '3,2024-01-03T00:00:00Z,1,12,6,1,0,21,1,0',
    '4,2024-01-01T00:00:00Z,2,5,1,0,0,10,0,0',
    '5,2024-01-05T00:00:00Z,2,6,1,0,0,10,0,0',
].join('\n');

const QURAN_PROGRESS = [
    'id,timestamp,user_id,surah_id,verse_id',
    '1,1000,2,1,3',
    '2,1500,1,2,2',
    '3,2000,1,2,3',
    '4,1500,1,3,1',
    '5,1500,1,3,2',
].join('\n');

describe('collection stats', () => {
    it('condenses stats, updates existing data, and optimizes Quran progress', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-collections-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            await Bun.write('collections.csv', COLLECTION_CSV);

            const condensed = await condenseCollectionStats('collections.csv');
            expect(Object.keys(condensed.stats)).toHaveLength(2);
            const persisted = JSON.parse(await Bun.file('collection_stats.json').text());
            expect(persisted.stats['1'][1]).toHaveProperty('reviews', 6);

            const inMemoryOnly = await condenseCollectionStats('collections.csv', '');
            expect(inMemoryOnly.stats['1'].length).toBeGreaterThan(0);

            await mkdir(path.join('public', 'data'), { recursive: true });
            await Bun.write(
                path.join('public', 'data', 'collection_stats.json'),
                JSON.stringify({ stats: { 1: [{ t: 0, covered: 5 }] } }),
            );

            await updateCollectionStats('collections.csv');
            const compressed = await Bun.file('collection_stats.json.br').arrayBuffer();
            const merged = decompressJson<{ stats: Record<string, any[]> }>(Buffer.from(compressed));
            expect(merged.stats['1'].length).toBeGreaterThan(1);

            await Bun.write('quran_progress.csv', QURAN_PROGRESS);
            await optimizeQuranProgress('quran_progress.csv');
            const optimized = await Bun.file('quran_progress.csv').text();
            const lines = optimized.trim().split('\n');
            expect(lines[0]).toBe('user,timestamp,surah,verse');
            const rows = lines.slice(1).map((line) => line.split(','));
            expect(rows.map((r) => Number(r[0]))).toEqual([1,1,1,1,2]);
            expect(rows.some((r) => r[1] === '1' && r[2] === '2' && r[3] === '2')).toBeTrue();
            expect(rows.some((r) => r[2] === '3' && r[3] === '1')).toBeTrue();
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
