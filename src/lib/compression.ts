import { brotliCompressSync, brotliDecompressSync, constants as zc } from 'node:zlib';

type CompressOpts = {
    /** Sort object keys recursively before stringify for slightly better compression (default: true). */
    canonical?: boolean;
};

export const compressJson = (value: unknown, opts: CompressOpts = {}) => {
    const { canonical = true } = opts;
    const json = JSON.stringify(canonical ? canonicalize(value) : value);
    const input = Buffer.from(json, 'utf8');

    // Brotli tuned for max compression of text/JSON
    const params: Record<number, number> = {
        [zc.BROTLI_PARAM_QUALITY]: 11, // max quality
        [zc.BROTLI_PARAM_MODE]: zc.BROTLI_MODE_TEXT, // text model helps JSON
        [zc.BROTLI_PARAM_LGWIN]: 24, // larger window can help redundancy
        [zc.BROTLI_PARAM_SIZE_HINT]: input.length, // small speed win, sometimes ratio too
    };

    return brotliCompressSync(input, { params });
};

export const decompressJson = <T = unknown>(buf: Buffer) => {
    const out = brotliDecompressSync(buf);
    return JSON.parse(out.toString('utf8')) as T;
};

// Base64url convenience helpers if you want a text token (DB/URLs):
export const compressJsonToBase64Url = (value: unknown, opts?: CompressOpts) => b64urlEncode(compressJson(value, opts));

export const decompressJsonFromBase64Url = <T = unknown>(token: string): T => decompressJson<T>(b64urlDecode(token));

const canonicalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonicalize);
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
