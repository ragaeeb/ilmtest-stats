import { beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadOptimizedAnalytics, optimizeAnalytics } from './bb10';
import { resetSecretsForTests } from './security';

const SECRET = '0123456789abcdef0123456789abcdef';

const RAW_EVENTS = [
    'id,user_id,event,context,count,app',
    '1,1,AppLaunch,1000,1,quran10',
    '2,1,AppLaunch,1500,1,quran10',
    '3,1,AppClose,2600,1,quran10',
    '4,1,ScreenView,"45.123456,-75.654321",2,quran10',
    '5,1,ScreenView,"45.123456,-75.654321",3,quran10',
    '6,2,AppLaunch,5000,1,quran10',
    '7,2,AppClose,8600,1,quran10',
    '8,2,Location,"<html>ignore</html>",1,quran10',
    '9,2,Feedback,user@example.com,1,quran10',
    '10,2,Custom,42,5,quran10',
].join('\n');

describe('BB10 analytics optimizer', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_SECRET = SECRET;
        resetSecretsForTests();
    });

    it('normalizes events and emits compressed artifacts', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-bb10-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            await Bun.write('events.csv', RAW_EVENTS);

            await optimizeAnalytics('events.csv', false, false);
            const csv = await Bun.file('quran10.csv').text();
            expect(csv).toContain('user,id,context,contextId,count');
            const [, firstRow] = csv.trim().split('\n');
            const cells = firstRow.split(',');
            const [user, eventId] = cells;
            expect(user).toBe('1');
            expect(eventId).toBe('1');
            expect(cells).toHaveLength(5);

            const events = JSON.parse(await Bun.file('events.json').text()) as Record<string, string>;
            expect(Object.values(events)).not.toContain('AppClose');
            expect(events['1']).toBe('SessionTotal');

            const contexts = JSON.parse(await Bun.file('contexts.json').text());
            const redacted = Object.values<string>(contexts).find((value) => value.startsWith('__REDACTED__'));
            expect(redacted).toBeDefined();
            expect(Object.values(contexts)).toContain('45.123,-75.655');

            await optimizeAnalytics('events.csv');
            await mkdir(path.join('public', 'data', 'bb10', 'analytics'), { recursive: true });
            await Bun.write(path.join('public', 'data', 'bb10', 'analytics', 'quran10.csv.br'), await Bun.file('quran10.csv.br').arrayBuffer());
            await Bun.write(
                path.join('public', 'data', 'bb10', 'analytics', 'events.json'),
                await Bun.file('events.json').text(),
            );
            await Bun.write(
                path.join('public', 'data', 'bb10', 'analytics', 'contexts.json.br'),
                await Bun.file('contexts.json.br').arrayBuffer(),
            );

            const analytics = await loadOptimizedAnalytics('quran10');
            const sessionEvent = analytics.find((e) => e.id === 'SessionTotal');
            expect(sessionEvent?.context).toBeLessThan(3600);
            const piiEvent = analytics.find((e) => typeof e.context === 'string' && e.context.startsWith('__REDACTED__'));
            expect(piiEvent).toBeDefined();
            const numericContext = analytics.find((e) => e.context === 42);
            expect(numericContext?.count).toBe(5);
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
