import { describe, it } from 'bun:test';
import { optimizeAddresses } from './autoBlock';

describe('autoBlock', () => {
    describe('optimizeAddresses', () => {
        it.skip(
            'optimize analytics.json',
            async () => {
                await optimizeAddresses('reported_addresses.csv', 'reported_keywords.csv');
            },
            { timeout: 120000 },
        );
    });
});
