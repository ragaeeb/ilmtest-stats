import { beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { decompressJson } from './compression';
import { loadAnalytics, optimizeAnalytics } from './analytics';
import { resetSecretsForTests } from './security';

const SECRET = '0123456789abcdef0123456789abcdef';

describe('analytics pipeline', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_SECRET = SECRET;
        resetSecretsForTests();
    });

    it('optimizes analytics sessions and decrypts redacted fields on load', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-analytics-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            const sessions = [
                {
                    user_id: 42,
                    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
                    data: JSON.stringify([
                        { e: 'Translate', c: 'sura' },
                        { e: 'OpenLink', c: 'https://example.com/page' },
                    ]),
                    state: JSON.stringify({ step: 1 }),
                },
            ];
            await Bun.write('sessions.json', JSON.stringify(sessions));

            await optimizeAnalytics('sessions.json');
            const compressed = await Bun.file('analytics.json.br').arrayBuffer();
            const optimized = decompressJson<any>(Buffer.from(compressed));
            expect(optimized[0].events[0].c).toBe('4');
            expect(optimized[0].events[1]._redacted).toBeTrue();

            const analytics = await loadAnalytics('analytics.json.br', SECRET);
            expect(analytics[0].events[1]._redacted).toBeFalse();
            expect(analytics[0].events[1].c).toBe('https://example.com/page');

            delete process.env.ENCRYPTION_SECRET;
            resetSecretsForTests();
            const redactedOnly = await loadAnalytics('analytics.json.br');
            expect(redactedOnly[0].events[1]._redacted).toBeTrue();
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
