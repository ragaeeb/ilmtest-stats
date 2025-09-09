import { createCipheriv, createDecipheriv, createSecretKey, hkdfSync, type KeyObject, randomBytes } from 'node:crypto';

const VERSION = 1;
const IV_LEN = 12; // AES-GCM 96-bit IV
const TAG_LEN = 16; // 128-bit tag
const AAD = Buffer.from([VERSION]);

// HKDF context (non-secret)
const HKDF_INFO = Buffer.from('aes-gcm:content-key:v1');
const HKDF_SALT = Buffer.from('security.ts:hkdf-salt:v1');

// Singleton key object
let KEY: KeyObject | null = null;

export const initSecrets = (encryptionSecret = process.env.ENCRYPTION_SECRET) => {
    if (KEY) {
        return;
    }

    const raw = (encryptionSecret ?? '').trim();
    if (!raw) {
        throw new Error('ENCRYPTION_SECRET is not set. Try: `openssl rand -base64 32`');
    }

    const secret = parseSecret(raw); // Buffer

    // Normalize to a 32-byte AES key (Buffer), then wrap as a KeyObject.
    const keyBuf =
        secret.length === 32 ? Buffer.from(secret) : toBuffer(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, 32));

    KEY = createSecretKey(keyBuf);
};

export const encrypt = (plaintext: string) => {
    initSecrets();

    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', KEY as KeyObject, iv, { authTagLength: TAG_LEN });
    cipher.setAAD(AAD);

    const c1 = cipher.update(plaintext, 'utf8');
    const c2 = cipher.final();
    const tag = cipher.getAuthTag();

    // [version | iv | ciphertext | tag], base64url
    return b64urlEncode(Buffer.concat([Buffer.from([VERSION]), iv, c1, c2, tag]));
};

export const decrypt = (token: string) => {
    initSecrets();

    const buf = b64urlDecode(token);
    if (buf.length < 1 + IV_LEN + TAG_LEN) throw new Error('Malformed token');

    let i = 0;
    const version = buf[i++];
    if (version !== VERSION) throw new Error(`Unsupported token version: ${version}`);

    const iv = buf.subarray(i, i + IV_LEN);
    i += IV_LEN;
    const body = buf.subarray(i);
    if (body.length < TAG_LEN) throw new Error('Malformed token');

    const ciphertext = body.subarray(0, body.length - TAG_LEN);
    const tag = body.subarray(body.length - TAG_LEN);

    const decipher = createDecipheriv('aes-256-gcm', KEY as KeyObject, iv, { authTagLength: TAG_LEN });
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);

    const p1 = decipher.update(ciphertext);
    const p2 = decipher.final();
    return Buffer.concat([p1, p2]).toString('utf8');
};

function parseSecret(s: string) {
    // hex
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) return Buffer.from(s, 'hex');
    // base64/base64url
    const maybeB64 = s.replace(/-/g, '+').replace(/_/g, '/');
    try {
        const b = Buffer.from(maybeB64, 'base64');
        if (b.length > 0) return b;
    } catch {
        /* fall through */
    }
    // utf8 fallback
    return Buffer.from(s, 'utf8');
}

function toBuffer(x: ArrayBuffer | Buffer) {
    return Buffer.isBuffer(x) ? x : Buffer.from(x);
}

function b64urlEncode(b: Buffer) {
    return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlDecode(s: string) {
    const base64 = s
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(s.length / 4) * 4, '=');
    return Buffer.from(base64, 'base64');
}
