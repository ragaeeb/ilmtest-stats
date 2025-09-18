import { readFile } from 'node:fs/promises';
import { brotliCompressSync, brotliDecompressSync, constants as zc } from 'node:zlib';
import { parse } from 'csv-parse/sync';
import { getDataFolderFilePath } from './utils';

type CompressOpts = {
    /** Sort object keys recursively before stringify for slightly better compression (default: true). */
    canonical?: boolean;
};

/**
 * Compresses a UTF-8 string using Brotli with parameters tuned for textual data.
 *
 * @param value - The string to compress.
 * @returns A Brotli compressed buffer.
 */
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

/**
 * Serializes a value to JSON and compresses it using Brotli, optionally canonicalizing keys
 * for improved compression ratios.
 *
 * @param value - The JSON-compatible value to compress.
 * @param opts - Compression options controlling canonicalization.
 * @returns The compressed JSON buffer.
 */
export const compressJson = (value: unknown, opts: CompressOpts = {}) => {
    const { canonical = true } = opts;
    const json = JSON.stringify(canonical ? canonicalize(value) : value);

    return compressString(json);
};

/**
 * Decompresses a Brotli buffer into a UTF-8 string.
 *
 * @param buf - The compressed buffer.
 * @returns The decoded string.
 */
export const decompressString = (buf: Buffer) => {
    const out = brotliDecompressSync(buf);
    return out.toString('utf8');
};

/**
 * Decompresses a Brotli buffer and parses the JSON payload.
 *
 * @param buf - The compressed buffer.
 * @returns The parsed JSON value.
 */
export const decompressJson = <T = unknown>(buf: Buffer) => {
    return JSON.parse(decompressString(buf)) as T;
};

/**
 * Reads and decompresses a Brotli-compressed JSON file from disk.
 *
 * @param filePath - Absolute or relative path to the file.
 * @returns The parsed JSON payload.
 */
export const decompressJsonFile = async <T = unknown>(filePath: string) => {
    const buffer = await readFile(filePath);
    return decompressJson(buffer) as T;
};

/**
 * Convenience wrapper around {@link decompressJsonFile} for files stored in `public/data`.
 *
 * @param tokens - Path segments appended to the data directory.
 * @returns The parsed JSON payload.
 */
export const decompressJsonFileFromDataFolder = async <T = unknown>(...tokens: string[]) => {
    const buffer = await readFile(getDataFolderFilePath(...tokens));
    return decompressJson(buffer) as T;
};

// Base64url convenience helpers if you want a text token (DB/URLs):
/**
 * Compresses a JSON value and encodes the payload as a base64url string.
 *
 * @param value - The value to compress.
 * @param opts - Optional compression options.
 * @returns The Brotli-compressed payload encoded as base64url.
 */
export const compressJsonToBase64Url = (value: unknown, opts?: CompressOpts) => b64urlEncode(compressJson(value, opts));

/**
 * Decodes a base64url token created by {@link compressJsonToBase64Url} and returns the JSON value.
 *
 * @param token - The base64url encoded payload.
 * @returns The parsed JSON value.
 */
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

/**
 * Loads and parses a Brotli-compressed CSV file stored under the `public/data` folder.
 *
 * @param tokens - Path segments appended to the data directory.
 * @returns The parsed records typed according to the generic parameter.
 */
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
