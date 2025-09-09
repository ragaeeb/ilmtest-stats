import { readFile, writeFile } from 'node:fs/promises';
import { compressJson, decompressJson } from './compression';
import { decrypt, encrypt, initSecrets } from './security';
import type { Analytics, AnalyticsEvent, SessionData } from './types';

export const optimizeAnalytics = async (filePath: string) => {
    const fileContent = await readFile(filePath, 'utf-8');
    const sessions: SessionData[] = JSON.parse(fileContent);
    const structured: Analytics[] = [];
    initSecrets();

    console.log('Optimizing...');
    for (const s of sessions) {
        const events = JSON.parse(s.data) as AnalyticsEvent[];

        for (const event of events) {
            if (typeof event.c === 'string' && event.c?.includes('https://')) {
                event.c = encrypt(event.c);
                event._redacted = true;
            }

            if (event.e === 'Translate' && event.c) {
                event.c = event.c.length.toString();
            }
        }

        structured.push({
            t: Math.floor(new Date(s.timestamp).getTime() / 1000),
            user: s.user_id,
            events,
            state: JSON.parse(s.state),
        });
    }

    console.log('Compressing...');
    const result = compressJson(structured);

    console.log('Saving...');
    await writeFile('analytics.json.br', result);
    console.log('Saved');
};

export const loadAnalytics = async (filePath: string, decryptionKey = process.env.ENCRYPTION_SECRET) => {
    const buffer = await readFile(filePath);
    const analytics: Analytics[] = decompressJson(buffer);

    if (decryptionKey) {
        initSecrets(decryptionKey);
    }

    for (const stats of analytics) {
        for (const event of stats.events) {
            if (event._redacted && decryptionKey) {
                event._redacted = false;
                event.c = decrypt(event.c);
            }
        }
    }

    return analytics;
};
