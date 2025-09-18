import { beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compressJson, compressString, decompressJson, decompressString } from './compression';
import { loadAutoBlockStats, optimizeAddresses } from './autoBlock';
import { resetSecretsForTests } from './security';

const SECRET = '0123456789abcdef0123456789abcdef';

describe('autoBlock analytics', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_SECRET = SECRET;
        resetSecretsForTests();
    });

    it('optimizes raw CSV exports and loads the computed stats', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-autoblock-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            const addressCsv = [
                'user_id,address,count',
                'alice@example.com,spam@example.com,3',
                'bob@example.com,bad@spam.com,0',
                'carol@example.com,neutral@example.com,3',
                'dave@example.com,neutral@example.com,0',
                'frank@example.com,extra@example.com,2',
                'grace@example.com,extra@example.com,1',
            ].join('\n');
            const keywordCsv = [
                'user_id,term,count',
                'alice@example.com,phishing,2',
                'bob@example.com,"scam",0',
                'carol@example.com,fraud,2',
                'dave@example.com,fraud,0',
                'erin@example.com,ads,1',
                'frank@example.com,phishing,0',
                'grace@example.com,ads,0',
                'heidi@example.com,ads,0',
                'ivan@example.com,spoof,1',
                'judy@example.com,spoof,0',
            ].join('\n');
            await Bun.write('addresses.csv', addressCsv);
            await Bun.write('keywords.csv', keywordCsv);

            await optimizeAddresses('addresses.csv', 'keywords.csv');

            const addressBuf = Buffer.from(await Bun.file('address.csv.br').arrayBuffer());
            const addressCsvOptimized = decompressString(addressBuf);
            expect(addressCsvOptimized).toContain('user_id,address,count');

            const keywordJson = Buffer.from(await Bun.file('keywords.json.br').arrayBuffer());
            const optimizedKeywords = decompressJson<Array<{ user_id: number; term: string; count: number }>>(keywordJson);
            expect(optimizedKeywords).toHaveLength(10);

            const userMap = JSON.parse(await Bun.file('user_to_email.json').text()) as Record<string, string>;
            const encryptedEmail = Object.values(userMap)[0];
            expect(encryptedEmail).not.toContain('@');
            expect(encryptedEmail).not.toHaveLength(0);
            expect(encryptedEmail).not.toBe('alice@example.com');

            const dataDir = path.join('public', 'data', 'autoblock');
            await mkdir(dataDir, { recursive: true });
            await Bun.write(path.join(dataDir, 'address.csv.br'), addressBuf);
            const keywordRecords = optimizedKeywords.map((k) => `${k.user_id},${JSON.stringify(k.term)},${k.count}`);
            const keywordCsvCompressed = compressString(['user_id,term,count', ...keywordRecords].join('\n'));
            await Bun.write(path.join(dataDir, 'keywords.csv.br'), keywordCsvCompressed);

            const stats = await loadAutoBlockStats();
            expect(stats.summary.totalReports).toBe(16);
            expect(stats.topAddresses[0].address).toContain('extra');
            expect(stats.topKeywords[0].term).toBe('fraud');
            expect(stats.topReporters[0].totalReports).toBe(2);
            expect(stats.topReporters[0].user_id).toBeGreaterThan(stats.topReporters[1].user_id);
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
