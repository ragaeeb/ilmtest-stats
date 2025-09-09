import { describe, it } from 'bun:test';
import path from 'node:path';
import { condenseCollectionStats } from './collectionStats';

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
});
