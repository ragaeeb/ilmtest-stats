import path from 'node:path';

/**
 * Concatenates conditional class name values into a single string.
 *
 * @param classes - Class name values that may include falsy entries.
 * @returns The filtered class list.
 */
export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// --- Add near the other helpers ---
const DATE_FMT: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' };
// Choose 'UTC' for consistency across users; remove to use local time
const DATE_TZ: 'UTC' | undefined = 'UTC';

/**
 * Attempts to coerce a value into a `Date`, handling ISO strings and YYYY-MM-DD formats.
 *
 * @param v - The value to normalize.
 * @returns A valid `Date` instance or `null` when parsing fails.
 */
export const toDate = (v: unknown): Date | null => {
    if (v instanceof Date) {
        return Number.isNaN(+v) ? null : v;
    }
    if (typeof v !== 'string') {
        return null;
    }

    // Handles "YYYY-MM-DD", ISO with Z, etc.
    const d = new Date(v);
    if (!Number.isNaN(+d)) {
        return d;
    }

    // As a fallback, coerce plain dates to UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d2 = new Date(`${v}T00:00:00Z`);
        return Number.isNaN(+d2) ? null : d2;
    }
    return null;
};

/**
 * Formats a value as a localized date string when possible, otherwise returns the original value.
 *
 * @param v - The value to format.
 * @param opts - Optional format overrides applied to the default formatter.
 * @returns The formatted string representation.
 */
export const formatDate = (v: unknown, opts: Intl.DateTimeFormatOptions = DATE_FMT): string => {
    const d = toDate(v);
    if (!d) {
        return String(v ?? '');
    }
    return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: DATE_TZ }).format(d);
};

// Make date detection more forgiving (date columns often have many blanks)
/**
 * Infers a column type by sampling values and counting numeric/date candidates.
 *
 * @param values - Sample values from a dataset column.
 * @returns The inferred type used for downstream normalization.
 */
export const inferType = (values: unknown[]): 'string' | 'number' | 'date' => {
    let numbers = 0,
        dates = 0,
        total = 0;
    for (const val of values) {
        if (val == null || val === '') {
            continue;
        }
        total++;
        if (isNumeric(val)) {
            numbers++;
        } else if (toDate(val)) {
            dates++;
        }
    }
    const rNum = numbers / Math.max(total, 1);
    const rDate = dates / Math.max(total, 1);

    if (rDate >= 0.3 && rDate >= rNum) {
        return 'date'; // more lenient for dates
    }
    if (rNum >= 0.7) {
        return 'number';
    }
    return 'string';
};

/**
 * Determines whether a value represents a finite number.
 *
 * @param v - The value to inspect.
 * @returns True when the value is numeric.
 */
export const isNumeric = (v: unknown) => {
    if (v == null) {
        return false;
    }
    if (typeof v === 'number') {
        return Number.isFinite(v);
    }
    if (typeof v === 'string') return parseNumericString(v) !== null;
    return false;
};

/**
 * Parses a numeric value from strings while tolerating delimiters, returning `null` on failure.
 *
 * @param v - The value to parse.
 * @returns The numeric value or `null`.
 */
export const tryParseNumber = (v: unknown) => {
    if (v == null) {
        return null;
    }
    if (typeof v === 'number') {
        return Number.isFinite(v) ? v : null;
    }
    if (typeof v === 'string') return parseNumericString(v);
    return null;
};

const parseNumericString = (value: string) => {
    const cleaned = value.trim().replace(/[,_\s]/g, '');
    return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
};

/**
 * Parses a date from a string when possible.
 *
 * @param v - The value to parse.
 * @returns A `Date` instance or `null` if parsing fails.
 */
export const tryParseDate = (v: unknown): Date | null => {
    if (typeof v !== 'string') {
        return null;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Produces the inverse of a mapping object by swapping keys and values.
 *
 * @param obj - Mapping of string keys to numeric identifiers.
 * @returns The inverted object with numeric keys.
 */
export const invertObject = (obj: Record<string, number>) => {
    return Object.fromEntries(Object.entries(obj).map(([e, id]) => [id, e]));
};

/**
 * Resolves a path under the `public/data` directory relative to the current working directory.
 *
 * @param tokens - Additional path segments appended to the data folder.
 * @returns The absolute path to the requested file.
 */
export const getDataFolderFilePath = (...tokens: string[]) => {
    return path.join(process.cwd(), 'public', 'data', ...tokens);
};
