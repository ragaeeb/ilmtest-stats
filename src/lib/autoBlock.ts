import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { decompressString } from './compression';

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'auto_block');
const ADDRESSES_FILE = 'reported_addresses.csv.br';
const KEYWORDS_FILE = 'reported_keywords.csv.br';

const parseCount = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
};

const normalizeUserId = (value: string | number): string => {
    if (typeof value === 'number') {
        return String(value);
    }
    return value.trim();
};

type RawReportedAddress = {
    user_id: string;
    address: string;
    count: string;
};

type RawReportedKeyword = {
    user_id: string;
    term: string;
    count: string;
};

export type ReportedAddress = {
    userId: string;
    address: string;
    count: number;
};

export type ReportedKeyword = {
    userId: string;
    term: string;
    count: number;
};

export type AutoBlockSummary = {
    totalReports: number;
    totalReportedAddresses: number;
    totalReportedKeywords: number;
    uniqueUsers: number;
    uniqueAddresses: number;
    uniqueKeywords: number;
    totalBlocksFromAddresses: number;
    totalBlocksFromKeywords: number;
    totalBlocks: number;
    zeroBlockReports: number;
};

export type AutoBlockTopAddress = {
    address: string;
    reports: number;
    reporters: number;
    blocks: number;
    averageBlocksPerReport: number;
};

export type AutoBlockTopKeyword = {
    term: string;
    reports: number;
    reporters: number;
    blocks: number;
    averageBlocksPerReport: number;
};

export type AutoBlockTopReporter = {
    userId: string;
    reportedAddresses: number;
    reportedKeywords: number;
    zeroBlockReports: number;
    totalReports: number;
    blocksFromAddresses: number;
    blocksFromKeywords: number;
    totalBlocks: number;
};

export type AutoBlockStats = {
    summary: AutoBlockSummary;
    topAddresses: AutoBlockTopAddress[];
    topKeywords: AutoBlockTopKeyword[];
    topReporters: AutoBlockTopReporter[];
    addresses: ReportedAddress[];
    keywords: ReportedKeyword[];
};

const loadCompressedCsv = async <T>(fileName: string): Promise<T[]> => {
    const filePath = path.join(DATA_DIR, fileName);
    const compressedBuffer = await readFile(filePath);
    const csvContent = decompressString(compressedBuffer);

    return parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as T[];
};

export const loadReportedAddresses = async (): Promise<ReportedAddress[]> => {
    const rawRows = await loadCompressedCsv<RawReportedAddress>(ADDRESSES_FILE);
    const addresses: ReportedAddress[] = [];

    for (const row of rawRows) {
        if (!row) continue;
        const userId = row.user_id?.trim();
        const address = row.address?.trim();
        if (!userId || userId === 'user_id' || !address) {
            continue;
        }

        addresses.push({
            userId: normalizeUserId(userId),
            address,
            count: parseCount(row.count),
        });
    }

    return addresses;
};

export const loadReportedKeywords = async (): Promise<ReportedKeyword[]> => {
    const rawRows = await loadCompressedCsv<RawReportedKeyword>(KEYWORDS_FILE);
    const keywords: ReportedKeyword[] = [];

    for (const row of rawRows) {
        if (!row) continue;
        const userId = row.user_id?.trim();
        const term = row.term?.trim();
        if (!userId || userId === 'user_id' || !term) {
            continue;
        }

        keywords.push({
            userId: normalizeUserId(userId),
            term,
            count: parseCount(row.count),
        });
    }

    return keywords;
};

const buildSummary = (addresses: ReportedAddress[], keywords: ReportedKeyword[]): AutoBlockSummary => {
    let totalBlocksFromAddresses = 0;
    let totalBlocksFromKeywords = 0;
    let zeroBlockReports = 0;

    for (const entry of addresses) {
        totalBlocksFromAddresses += entry.count;
        if (entry.count === 0) zeroBlockReports++;
    }

    for (const entry of keywords) {
        totalBlocksFromKeywords += entry.count;
        if (entry.count === 0) zeroBlockReports++;
    }

    const uniqueUserIds = new Set<string>();
    const uniqueAddresses = new Set<string>();
    const uniqueKeywords = new Set<string>();

    for (const entry of addresses) {
        uniqueUserIds.add(entry.userId);
        uniqueAddresses.add(entry.address.toLowerCase());
    }

    for (const entry of keywords) {
        uniqueUserIds.add(entry.userId);
        uniqueKeywords.add(entry.term);
    }

    const totalReportedAddresses = addresses.length;
    const totalReportedKeywords = keywords.length;
    const totalBlocks = totalBlocksFromAddresses + totalBlocksFromKeywords;

    return {
        totalReports: totalReportedAddresses + totalReportedKeywords,
        totalReportedAddresses,
        totalReportedKeywords,
        uniqueUsers: uniqueUserIds.size,
        uniqueAddresses: uniqueAddresses.size,
        uniqueKeywords: uniqueKeywords.size,
        totalBlocksFromAddresses,
        totalBlocksFromKeywords,
        totalBlocks,
        zeroBlockReports,
    };
};

const buildTopAddresses = (addresses: ReportedAddress[]): AutoBlockTopAddress[] => {
    const aggregates = new Map<string, { address: string; reports: number; reporters: Set<string>; blocks: number }>();

    for (const entry of addresses) {
        const key = entry.address.toLowerCase();
        let aggregate = aggregates.get(key);

        if (!aggregate) {
            aggregate = { address: entry.address, reports: 0, reporters: new Set<string>(), blocks: 0 };
            aggregates.set(key, aggregate);
        }

        aggregate.reports += 1;
        aggregate.blocks += entry.count;
        aggregate.reporters.add(entry.userId);
    }

    const topAddresses = Array.from(aggregates.values()).map((value) => ({
        address: value.address,
        reports: value.reports,
        reporters: value.reporters.size,
        blocks: value.blocks,
        averageBlocksPerReport: value.reports > 0 ? Number.parseFloat((value.blocks / value.reports).toFixed(2)) : 0,
    }));

    topAddresses.sort((a, b) => {
        if (b.blocks !== a.blocks) return b.blocks - a.blocks;
        if (b.reports !== a.reports) return b.reports - a.reports;
        return a.address.localeCompare(b.address);
    });

    return topAddresses.slice(0, 10);
};

const buildTopKeywords = (keywords: ReportedKeyword[]): AutoBlockTopKeyword[] => {
    const aggregates = new Map<string, { term: string; reports: number; reporters: Set<string>; blocks: number }>();

    for (const entry of keywords) {
        const key = entry.term.toLowerCase();
        let aggregate = aggregates.get(key);

        if (!aggregate) {
            aggregate = { term: entry.term, reports: 0, reporters: new Set<string>(), blocks: 0 };
            aggregates.set(key, aggregate);
        }

        aggregate.reports += 1;
        aggregate.blocks += entry.count;
        aggregate.reporters.add(entry.userId);
    }

    const topKeywords = Array.from(aggregates.values()).map((value) => ({
        term: value.term,
        reports: value.reports,
        reporters: value.reporters.size,
        blocks: value.blocks,
        averageBlocksPerReport: value.reports > 0 ? Number.parseFloat((value.blocks / value.reports).toFixed(2)) : 0,
    }));

    topKeywords.sort((a, b) => {
        if (b.blocks !== a.blocks) return b.blocks - a.blocks;
        if (b.reports !== a.reports) return b.reports - a.reports;
        return a.term.localeCompare(b.term);
    });

    return topKeywords.slice(0, 10);
};

const buildTopReporters = (addresses: ReportedAddress[], keywords: ReportedKeyword[]): AutoBlockTopReporter[] => {
    const aggregates = new Map<
        string,
        {
            userId: string;
            reportedAddresses: number;
            reportedKeywords: number;
            zeroBlockReports: number;
            blocksFromAddresses: number;
            blocksFromKeywords: number;
        }
    >();

    for (const entry of addresses) {
        let aggregate = aggregates.get(entry.userId);
        if (!aggregate) {
            aggregate = {
                userId: entry.userId,
                reportedAddresses: 0,
                reportedKeywords: 0,
                zeroBlockReports: 0,
                blocksFromAddresses: 0,
                blocksFromKeywords: 0,
            };
            aggregates.set(entry.userId, aggregate);
        }

        aggregate.reportedAddresses += 1;
        aggregate.blocksFromAddresses += entry.count;
        if (entry.count === 0) aggregate.zeroBlockReports += 1;
    }

    for (const entry of keywords) {
        let aggregate = aggregates.get(entry.userId);
        if (!aggregate) {
            aggregate = {
                userId: entry.userId,
                reportedAddresses: 0,
                reportedKeywords: 0,
                zeroBlockReports: 0,
                blocksFromAddresses: 0,
                blocksFromKeywords: 0,
            };
            aggregates.set(entry.userId, aggregate);
        }

        aggregate.reportedKeywords += 1;
        aggregate.blocksFromKeywords += entry.count;
        if (entry.count === 0) aggregate.zeroBlockReports += 1;
    }

    const topReporters = Array.from(aggregates.values()).map((value) => ({
        userId: value.userId,
        reportedAddresses: value.reportedAddresses,
        reportedKeywords: value.reportedKeywords,
        zeroBlockReports: value.zeroBlockReports,
        totalReports: value.reportedAddresses + value.reportedKeywords,
        blocksFromAddresses: value.blocksFromAddresses,
        blocksFromKeywords: value.blocksFromKeywords,
        totalBlocks: value.blocksFromAddresses + value.blocksFromKeywords,
    }));

    topReporters.sort((a, b) => {
        if (b.totalBlocks !== a.totalBlocks) return b.totalBlocks - a.totalBlocks;
        if (b.totalReports !== a.totalReports) return b.totalReports - a.totalReports;
        return a.userId.localeCompare(b.userId);
    });

    return topReporters.slice(0, 10);
};

export const loadAutoBlockStats = async (): Promise<AutoBlockStats> => {
    const [addresses, keywords] = await Promise.all([loadReportedAddresses(), loadReportedKeywords()]);

    // Sort raw entries by count descending for convenience in the UI
    addresses.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.address.localeCompare(b.address);
    });

    keywords.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.term.localeCompare(b.term);
    });

    return {
        summary: buildSummary(addresses, keywords),
        topAddresses: buildTopAddresses(addresses),
        topKeywords: buildTopKeywords(keywords),
        topReporters: buildTopReporters(addresses, keywords),
        addresses,
        keywords,
    };
};
