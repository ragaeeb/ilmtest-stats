import { describe, it } from 'bun:test';
import { normalizeDownloads } from './blackberry';

describe('blackberry', () => {
    describe('normalizeDownloads', () => {
        it.skip(
            'optimize downloads',
            async () => {
                await normalizeDownloads(['../quran10.csv', '../sunnah10.csv', '../salat10.csv']);
            },
            { timeout: 40000 },
        );
    });
});
