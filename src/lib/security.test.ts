import { beforeEach, describe, expect, it } from 'bun:test';
import { decrypt, encrypt, initSecrets, resetSecretsForTests } from './security';

describe('security', () => {
    const ORIGINAL_SECRET = process.env.ENCRYPTION_SECRET;

    beforeEach(() => {
        resetSecretsForTests();
        if (ORIGINAL_SECRET === undefined) {
            delete process.env.ENCRYPTION_SECRET;
        } else {
            process.env.ENCRYPTION_SECRET = ORIGINAL_SECRET;
        }
    });

    it('throws when no encryption secret is configured', () => {
        delete process.env.ENCRYPTION_SECRET;
        expect(() => initSecrets()).toThrow('ENCRYPTION_SECRET is not set');
    });

    it('supports hexadecimal secrets and round-trips payloads', () => {
        resetSecretsForTests();
        initSecrets('41424344');
        const token = encrypt('hello world');
        expect(token).not.toBe('hello world');
        expect(decrypt(token)).toBe('hello world');

        // Calling again with a falsy secret should be a no-op once initialized.
        expect(() => initSecrets('')).not.toThrow();
    });

    it('derives a key from utf8 secrets and rejects tampered tokens', () => {
        resetSecretsForTests();
        initSecrets('plain text secret');
        const token = encrypt('secure data');

        // Tamper with the token so that decrypting fails validation.
        expect(() => decrypt('bad-token')).toThrow('Malformed token');

        const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='), 'base64');
        buf[0] = 2; // invalid version
        const tampered = buf
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
        expect(() => decrypt(tampered)).toThrow('Unsupported token version');

        expect(decrypt(token)).toBe('secure data');

        // Force the base64 parsing branch to throw to exercise the catch block.
        resetSecretsForTests();
        const originalFrom = Buffer.from;
        try {
            (Buffer as any).from = (value: any, encoding?: string) => {
                if (encoding === 'base64') {
                    throw new Error('invalid base64');
                }
                return originalFrom(value, encoding as any);
            };
            initSecrets('fallback-secret');
        } finally {
            (Buffer as any).from = originalFrom;
        }
        const token2 = encrypt('fallback path');
        expect(decrypt(token2)).toBe('fallback path');
    });

    it('reads base64url secrets from the environment', () => {
        resetSecretsForTests();
        process.env.ENCRYPTION_SECRET = 'QUJDRA';
        initSecrets();
        const token = encrypt('env secret');
        expect(decrypt(token)).toBe('env secret');
    });
});
