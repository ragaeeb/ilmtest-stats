import { describe, it } from 'bun:test';
import path from 'node:path';
import { condenseCollectionStats, optimizeQuranProgress, updateCollectionStats } from './collectionStats';

describe('collectionStats', () => {
    describe('condenseCollectionStats', () => {
        it.skip('should condense the CSV data', async () => {
            await condenseCollectionStats('../collection_snapshots.csv');
        });

        it.skip('compress collections.json', async () => {
            const collectionsFile = Bun.file(path.join('public', 'data', 'collections.json'));
            const result = await collectionsFile.json();
            await collectionsFile.write(JSON.stringify(result));
        });
    });

    describe('optimizeQuranProgress', () => {
        it.skip('should optimize it', async () => {
            await optimizeQuranProgress('../quran10_progress.csv');
        });
    });

    describe('updateCollectionStats', () => {
        it.skip('should update the existing one it', async () => {
            await updateCollectionStats('../collection_snapshots.csv');
        });
    });
});
