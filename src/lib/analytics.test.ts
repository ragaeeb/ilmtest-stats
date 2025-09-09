import { describe, expect, it } from 'bun:test';
import { loadAnalytics, optimizeAnalytics } from './analytics';

describe('analytics', () => {
    describe('optimizeAnalytics', () => {
        it.skip(
            'optimize analytics.json',
            async () => {
                await optimizeAnalytics('../analytics.json');
            },
            { timeout: 120000 },
        );
    });

    describe('loadAnalytics', () => {
        it('should load the analytics', async () => {
            const analytics = await loadAnalytics('public/data/analytics.json.br');
            expect(analytics.length >= 2475).toBeTrue();
        });
    });
});
