import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { compressJson } from './compression';

type Stats = {
    id: number;
    timestamp: Date;
    collection: number;
    covered: number;
    reviews: number;
    drafts: number;
    explained: number;
    total_entries: number;
    unlinked: number;
    verify: number;
};

const COMPARISON_KEYS: (keyof Stats)[] = [
    'collection',
    'covered',
    'reviews',
    'drafts',
    'explained',
    'total_entries',
    'unlinked',
    'verify',
] as const;

type CompactStats = Partial<Pick<Stats, 'covered' | 'reviews' | 'drafts' | 'explained' | 'unlinked' | 'verify'>> & {
    t: number;
    entries?: number;
};

export type OptimizedStats = {
    stats: Record<string, CompactStats[]>;
};

const loadStatsFromRecords = async (filePath: string) => {
    const buf = await fs.readFile(filePath);

    const records = parse<Stats>(buf.toString('utf-8'), {
        columns: true,
        cast: true,
        castDate: true,
        skip_empty_lines: true,
        trim: true,
    });

    const collectionToStats: Map<number, Partial<Stats>[]> = new Map();
    const collectionCurrentState: Map<number, Stats> = new Map();

    for (const record of records) {
        let stats = collectionToStats.get(record.collection);
        const currentState = collectionCurrentState.get(record.collection);

        if (!stats || !currentState) {
            // First record for this collection
            stats = [record];
            collectionToStats.set(record.collection, stats);
            collectionCurrentState.set(record.collection, { ...record });
            continue;
        }

        // Compare against the current state
        const diff: Partial<Stats> = { timestamp: record.timestamp };
        let isChanged = false;

        for (const key of COMPARISON_KEYS) {
            if (currentState[key] !== record[key]) {
                (diff as any)[key] = record[key];
                // Update current state
                (currentState as any)[key] = record[key];
                isChanged = true;
            }
        }

        // Update timestamp in current state regardless
        currentState.timestamp = record.timestamp;

        if (isChanged) {
            stats.push(diff);
        }
    }

    return collectionToStats;
};

/**
 * Collapses verbose collection progress exports into compact change logs and optionally writes
 * the result to disk.
 *
 * @param filePath - Path to the raw collection statistics CSV export.
 * @param outputPath - Destination path for the JSON artifact (omit to skip writing).
 * @returns The optimized stats structure keyed by collection id.
 */
export const condenseCollectionStats = async (filePath: string, outputPath = 'collection_stats.json') => {
    const collectionToStats = await loadStatsFromRecords(filePath);
    const optimizedStats: Record<string, CompactStats[]> = {};

    for (const key of [...collectionToStats.keys()].sort()) {
        optimizedStats[key] = collectionToStats
            .get(key)!
            .map(({ timestamp, total_entries, collection, id, ...stat }) => {
                return {
                    ...stat,
                    ...(total_entries && { entries: total_entries }),
                    t: Math.floor(timestamp!.getTime() / 1000),
                };
            });
    }

    const result = { stats: optimizedStats } satisfies OptimizedStats;

    if (outputPath) {
        await fs.writeFile('collection_stats.json', JSON.stringify(result));
    }

    return result;
};

/**
 * Merges a fresh collection stats export into the existing dataset and writes a compressed
 * Brotli artifact for the application to consume.
 *
 * @param filePath - Path to the latest collection stats CSV export.
 */
export const updateCollectionStats = async (filePath: string) => {
    const newStats: OptimizedStats = await condenseCollectionStats(filePath, '');
    const prevStats: OptimizedStats = await Bun.file(path.join('public', 'data', 'collection_stats.json')).json();

    Object.entries(newStats.stats).forEach(([collectionId, stats]) => {
        if (prevStats.stats[collectionId]) {
            prevStats.stats[collectionId] = prevStats.stats[collectionId].concat(stats).sort((a, b) => a.t - b.t);
        } else {
            console.warn(`${collectionId} not found...`);
        }
    });

    await Bun.file('collection_stats.json.br').write(compressJson(prevStats));
};

type QuranProgress = {
    id: number;
    timestamp: number;
    user_id: number;
    surah_id: number;
    verse_id: number;
};

/**
 * Normalizes Quran progress data into a sorted CSV with simplified column names.
 *
 * @param filePath - Path to the raw Quran progress CSV export.
 */
export const optimizeQuranProgress = async (filePath: string) => {
    const buf = await fs.readFile(filePath);

    const records = parse<QuranProgress>(buf.toString('utf-8'), {
        columns: true,
        cast: true,
        skip_empty_lines: true,
        trim: true,
    })
        .map((r) => {
            return { timestamp: Math.floor(r.timestamp / 1000), user: r.user_id, surah: r.surah_id, verse: r.verse_id };
        })
        .sort((a, b) => {
            if (a.user !== b.user) {
                return a.user - b.user;
            }

            if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            }

            // If user_id is the same, sort by surah_id
            if (a.surah !== b.surah) {
                return a.surah - b.surah;
            }

            // If both user_id and surah_id are the same, sort by verse_id
            return a.verse - b.verse;
        });

    const csvRows = ['user,timestamp,surah,verse'];

    for (const record of records) {
        csvRows.push([record.user, record.timestamp, record.surah, record.verse].join(','));
    }

    await Bun.write(`quran_progress.csv`, csvRows.join('\n'));
};
