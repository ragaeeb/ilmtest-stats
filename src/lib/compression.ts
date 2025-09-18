import { readFile } from 'node:fs/promises';
import { brotliCompressSync, brotliDecompressSync, constants as zc } from 'node:zlib';
import { parse } from 'csv-parse/sync';
import { getDataFolderFilePath } from './utils';

type CompressOpts = {
    /** Sort object keys recursively before stringify for slightly better compression (default: true). */
    canonical?: boolean;
};

export const compressString = (value: string) => {
    const input = Buffer.from(value, 'utf8');

    // Brotli tuned for max compression of text/JSON
    const params: Record<number, number> = {
        [zc.BROTLI_PARAM_QUALITY]: 11, // max quality
        [zc.BROTLI_PARAM_MODE]: zc.BROTLI_MODE_TEXT, // text model helps JSON
        [zc.BROTLI_PARAM_LGWIN]: 24, // larger window can help redundancy
        [zc.BROTLI_PARAM_SIZE_HINT]: input.length, // small speed win, sometimes ratio too
    };

    return brotliCompressSync(input, { params });
};

export const compressJson = (value: unknown, opts: CompressOpts = {}) => {
    const { canonical = true } = opts;
    const json = JSON.stringify(canonical ? canonicalize(value) : value);

    return compressString(json);
};

export const decompressString = (buf: Buffer) => {
    const out = brotliDecompressSync(buf);
    return out.toString('utf8');
};

export const decompressJson = <T = unknown>(buf: Buffer) => {
    return JSON.parse(decompressString(buf)) as T;
};

export const decompressJsonFile = async <T = unknown>(filePath: string) => {
    const buffer = await readFile(filePath);
    return decompressJson(buffer) as T;
};

export const decompressJsonFileFromDataFolder = async <T = unknown>(...tokens: string[]) => {
    const buffer = await readFile(getDataFolderFilePath(...tokens));
    return decompressJson(buffer) as T;
};

// Base64url convenience helpers if you want a text token (DB/URLs):
export const compressJsonToBase64Url = (value: unknown, opts?: CompressOpts) => b64urlEncode(compressJson(value, opts));

export const decompressJsonFromBase64Url = <T = unknown>(token: string): T => decompressJson<T>(b64urlDecode(token));

const canonicalize = (v: unknown): unknown => {
    if (Array.isArray(v)) {
        return v.map(canonicalize);
    }
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(v as Record<string, unknown>).sort()) {
            out[k] = canonicalize((v as Record<string, unknown>)[k]);
        }
        return out;
    }
    return v; // primitives, dates (stringified), etc.
};

const b64urlEncode = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const b64urlDecode = (s: string) => {
    return Buffer.from(
        s
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(s.length / 4) * 4, '='),
        'base64',
    );
};

export const loadCompressedCsvFromDataFolder = async <T>(...tokens: string[]): Promise<T[]> => {
    const compressedBuffer = await readFile(getDataFolderFilePath(...tokens));
    const data = parse<T>(decompressString(compressedBuffer), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        skip_records_with_error: true,
        cast: true,
    });

    return data;
};
