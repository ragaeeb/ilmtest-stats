import { readFile, writeFile } from 'node:fs/promises';
import { compressJson, decompressJson, decompressJsonFile } from './compression';
import { decrypt, encrypt, initSecrets } from './security';
import type { Analytics, AnalyticsEvent, SessionData } from './types';

/**
 * Normalizes raw session analytics JSON into a compressed Brotli artifact while encrypting
 * sensitive event payloads and collapsing timestamps.
 *
 * @param filePath - Path to the raw analytics JSON file containing {@link SessionData[]}.
 * @returns A promise that resolves once the optimized artifact has been written to disk.
 */
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

/**
 * Loads a compressed analytics artifact, optionally decrypting any redacted event payloads.
 *
 * @param filePath - The Brotli compressed analytics file to load.
 * @param decryptionKey - Optional override for the encryption secret used to decrypt payloads.
 * @returns Parsed analytics records ready for the dashboard.
 */
export const loadAnalytics = async (filePath: string, decryptionKey = process.env.ENCRYPTION_SECRET) => {
    const analytics: Analytics[] = await decompressJsonFile(filePath);

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
