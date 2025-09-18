import { describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    compressJson,
    compressJsonToBase64Url,
    compressString,
    decompressJson,
    decompressJsonFile,
    decompressJsonFileFromDataFolder,
    decompressJsonFromBase64Url,
    decompressString,
    loadCompressedCsvFromDataFolder,
} from './compression';
import { getDataFolderFilePath } from './utils';

describe('compression utilities', () => {
    const createTempDir = async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-compression-'));
        await writeFile(path.join(dir, '.keep'), '');
        return dir;
    };

    it('round-trips strings and json payloads', () => {
        const compressed = compressString('hello world');
        expect(decompressString(compressed)).toBe('hello world');

        const canonicalCompressed = compressJson({ b: 2, a: { z: 1, m: 2 } });
        expect(decompressJson<Record<string, unknown>>(canonicalCompressed)).toEqual({ a: { m: 2, z: 1 }, b: 2 });

        const nonCanonical = compressJson({ z: 1, a: 2 }, { canonical: false });
        expect(decompressJson(nonCanonical)).toEqual({ z: 1, a: 2 });
    });

    it('handles file helpers and base64url encoding', async () => {
        const dir = await createTempDir();
        const prev = process.cwd();
        try {
            process.chdir(dir);
            await writeFile('data.json.br', compressJson({ foo: 'bar' }));
            expect(await decompressJsonFile<{ foo: string }>('data.json.br')).toEqual({ foo: 'bar' });

            await rm(path.join(dir, '.keep'));
            await rm(dir, { recursive: true, force: true });
        } finally {
            process.chdir(prev);
        }
    });

    it('loads compressed CSV data from the data folder', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'ilmtest-compression-data-'));
        const prev = process.cwd();
        try {
            process.chdir(dir);
            const dataDir = path.join(dir, 'public', 'data', 'sample');
            await rm(dataDir, { recursive: true, force: true });
            await mkdir(dataDir, { recursive: true });
            const csv = 'id,name\n1,Alice\n2,Bob';
            await Bun.write(getDataFolderFilePath('sample', 'data.csv.br'), compressString(csv));

            await Bun.write(getDataFolderFilePath('sample', 'data.json.br'), compressJson([{ id: 1 }]));
            expect(await decompressJsonFileFromDataFolder<{ id: number }[]>('sample', 'data.json.br')).toEqual([
                { id: 1 },
            ]);

            const records = await loadCompressedCsvFromDataFolder<{ id: number; name: string }>('sample', 'data.csv.br');
            expect(records).toEqual([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ]);

            const token = compressJsonToBase64Url({ hello: 'world' });
            expect(decompressJsonFromBase64Url<{ hello: string }>(token)).toEqual({ hello: 'world' });
        } finally {
            process.chdir(prev);
            await rm(dir, { recursive: true, force: true });
        }
    });
});
