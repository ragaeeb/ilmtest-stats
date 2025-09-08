export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// --- Add near the other helpers ---
const DATE_FMT: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' };
// Choose 'UTC' for consistency across users; remove to use local time
const DATE_TZ: 'UTC' | undefined = 'UTC';

export const toDate = (v: unknown): Date | null => {
    if (v instanceof Date) return Number.isNaN(+v) ? null : v;
    if (typeof v !== 'string') return null;

    // Handles "YYYY-MM-DD", ISO with Z, etc.
    const d = new Date(v);
    if (!Number.isNaN(+d)) return d;

    // As a fallback, coerce plain dates to UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d2 = new Date(`${v}T00:00:00Z`);
        return Number.isNaN(+d2) ? null : d2;
    }
    return null;
};

export const formatDate = (v: unknown, opts: Intl.DateTimeFormatOptions = DATE_FMT): string => {
    const d = toDate(v);
    if (!d) return String(v ?? '');
    return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: DATE_TZ }).format(d);
};

// Make date detection more forgiving (date columns often have many blanks)
export const inferType = (values: unknown[]): 'string' | 'number' | 'date' => {
    let numbers = 0,
        dates = 0,
        total = 0;
    for (const val of values) {
        if (val == null || val === '') continue;
        total++;
        if (isNumeric(val)) numbers++;
        else if (toDate(val)) dates++;
    }
    const rNum = numbers / Math.max(total, 1);
    const rDate = dates / Math.max(total, 1);

    if (rDate >= 0.3 && rDate >= rNum) return 'date'; // more lenient for dates
    if (rNum >= 0.7) return 'number';
    return 'string';
};

export const isNumeric = (v: unknown) => {
    if (v == null) return false;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') {
        const cleaned = v.trim().replace(/[,_\s]/g, '');
        return /^-?\d+(?:\.\d+)?$/.test(cleaned);
    }
    return false;
};

export const tryParseNumber = (v: unknown) => {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
        const cleaned = v.trim().replace(/[,_\s]/g, '');
        return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
    }
    return null;
};

export const tryParseDate = (v: unknown): Date | null => {
    if (typeof v !== 'string') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
