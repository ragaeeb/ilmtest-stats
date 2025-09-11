import { describe, expect, it } from 'bun:test';
import { loadOptimizedAnalytics, optimizeAnalytics } from './bb10';

describe('bb10', () => {
    describe('optimizeAnalytics', () => {
        it.skip(
            'optimize analytics',
            async () => {
                await optimizeAnalytics('../events.csv');
            },
            { timeout: 120000 },
        );
    });

    describe('loadOptimizedAnalytics', () => {
        it('should load the analytics', async () => {
            const analytics = await loadOptimizedAnalytics('salat10');
            expect(analytics.length >= 2475).toBeTrue();
        });
    });
});
