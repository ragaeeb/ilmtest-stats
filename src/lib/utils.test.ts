import { describe, expect, it } from 'bun:test';
import path from 'node:path';
import {
    cn,
    formatDate,
    getDataFolderFilePath,
    inferType,
    invertObject,
    isNumeric,
    toDate,
    tryParseDate,
    tryParseNumber,
} from './utils';

describe('utility helpers', () => {
    it('merges class names', () => {
        expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
    });

    it('normalizes date inputs and formats fallbacks', () => {
        const date = new Date('2021-01-02T00:00:00Z');
        expect(toDate(date)).toBe(date);
        expect(toDate('2021-01-02')).toEqual(new Date('2021-01-02T00:00:00Z'));
        expect(toDate('2021-13-01')).toBeNull();
        expect(toDate('invalid')).toBeNull();
        expect(toDate(123)).toBeNull();

        expect(formatDate(date)).toContain('2021');
        expect(formatDate('not a date')).toBe('not a date');
    });

    it('infers column types', () => {
        expect(inferType(['1', '2', '3'])).toBe('number');
        expect(inferType(['2020-01-01', '2020-02-01', ''])).toBe('date');
        expect(inferType(['abc', '123abc'])).toBe('string');
    });

    it('detects numeric values and parses numbers/dates', () => {
        expect(isNumeric(42)).toBeTrue();
        expect(isNumeric(Number.POSITIVE_INFINITY)).toBeFalse();
        expect(isNumeric(' 1,234 ')).toBeTrue();
        expect(isNumeric('abc')).toBeFalse();
        expect(isNumeric(null)).toBeFalse();

        expect(tryParseNumber('1_000')).toBe(1000);
        expect(tryParseNumber('123abc')).toBeNull();
        expect(tryParseNumber(Number.NaN)).toBeNull();
        expect(tryParseNumber(Number.POSITIVE_INFINITY)).toBeNull();
        expect(tryParseNumber(undefined)).toBeNull();

        expect(tryParseDate('2020-05-06')?.toISOString()).toBe('2020-05-06T00:00:00.000Z');
        expect(tryParseDate(123 as unknown as string)).toBeNull();
    });

    it('inverts objects and builds data paths', () => {
        expect(invertObject({ a: 1, b: 2 })).toEqual({ 1: 'a', 2: 'b' });
        const resolved = getDataFolderFilePath('foo', 'bar');
        expect(resolved.endsWith(path.join('public', 'data', 'foo', 'bar'))).toBeTrue();
    });
});
