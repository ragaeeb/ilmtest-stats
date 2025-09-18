import { parse } from 'csv-parse/sync';
import { compressJson, compressString, loadCompressedCsvFromDataFolder } from './compression';
import { encrypt, initSecrets } from './security';
import { invertObject } from './utils';

type ReportedData = {
    user_id: number;
    count: number;
};

export type ReportedAddress = ReportedData & {
    address: string;
};

export type ReportedKeyword = ReportedData & {
    term: string;
};

type CommonStats = {
    reports: number;
    reporters: number;
    blocks: number;
    averageBlocksPerReport: number;
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

export type AutoBlockTopAddress = CommonStats & {
    address: string;
};

export type AutoBlockTopKeyword = CommonStats & {
    term: string;
};

export type AutoBlockTopReporter = {
    user_id: number;
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

/**
 * Normalizes auto-block CSV exports by encrypting user identifiers, canonicalizing keywords
 * and addresses, and emitting compressed artifacts consumed by the dashboard.
 *
 * @param addressCsvFile - Path to the raw address CSV export.
 * @param keywordsCsvFile - Path to the raw keyword CSV export.
 */
export const optimizeAddresses = async (addressCsvFile: string, keywordsCsvFile: string) => {
    initSecrets();

    const addresses = parse<ReportedAddress>(await Bun.file(addressCsvFile).text(), {
        columns: true,
        cast: true,
        skip_empty_lines: true,
        trim: true,
    });

    const keywords = parse<ReportedKeyword>(await Bun.file(keywordsCsvFile).text(), {
        columns: true,
        cast: true,
        skip_empty_lines: true,
        trim: true,
    });

    const emailToEncryptedEmail: Record<string, string> = {};
    const emailToUserId: Record<string, number> = {};
    let nextUserId = 0;

    for (const k of [...addresses, ...keywords]) {
        if (k.user_id.toString().includes('@')) {
            // legacy userIds were just plain-text email addresses
            if (emailToUserId[k.user_id]) {
                k.user_id = emailToUserId[k.user_id];
            } else {
                emailToEncryptedEmail[k.user_id] = encrypt(k.user_id.toString());
                emailToUserId[k.user_id] = ++nextUserId;
                k.user_id = nextUserId;
            }
        }
    }

    let csvRows = ['user_id,address,count'];

    for (const record of addresses) {
        csvRows.push([record.user_id, record.address, record.count].join(','));
    }

    await Bun.write(`address.csv.br`, compressString(csvRows.join('\n')));

    csvRows = ['user_id,term,count'];

    for (const record of keywords) {
        csvRows.push([record.user_id, JSON.stringify(record.term), record.count].join(','));
    }

    await Bun.write(`keywords.json.br`, compressJson(keywords));

    const userIdToEmail = invertObject(emailToUserId);

    for (const [userId, email] of Object.entries(userIdToEmail)) {
        userIdToEmail[userId] = emailToEncryptedEmail[email];
    }

    await Bun.write(`user_to_email.json`, JSON.stringify(userIdToEmail));
};

const buildSummary = (addresses: ReportedAddress[], keywords: ReportedKeyword[]): AutoBlockSummary => {
    let totalBlocksFromAddresses = 0;
    let totalBlocksFromKeywords = 0;
    let zeroBlockReports = 0;

    for (const entry of addresses) {
        totalBlocksFromAddresses += entry.count;
        if (entry.count === 0) {
            zeroBlockReports++;
        }
    }

    for (const entry of keywords) {
        totalBlocksFromKeywords += entry.count;
        if (entry.count === 0) {
            zeroBlockReports++;
        }
    }

    const uniqueUserIds = new Set<number>();
    const uniqueAddresses = new Set<string>();
    const uniqueKeywords = new Set<string>();

    for (const entry of addresses) {
        uniqueUserIds.add(entry.user_id);
        uniqueAddresses.add(entry.address.toLowerCase());
    }

    for (const entry of keywords) {
        uniqueUserIds.add(entry.user_id);
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

type AggregateBase = { reports: number; reporters: Set<number>; blocks: number };

const buildTopAddresses = (addresses: ReportedAddress[]): AutoBlockTopAddress[] => {
    const aggregates = new Map<string, AggregateBase & { address: string }>();

    for (const entry of addresses) {
        const key = entry.address.toLowerCase();
        let aggregate = aggregates.get(key);

        if (!aggregate) {
            aggregate = { address: entry.address, reports: 0, reporters: new Set<number>(), blocks: 0 };
            aggregates.set(key, aggregate);
        }

        aggregate.reports += 1;
        aggregate.blocks += entry.count;
        aggregate.reporters.add(entry.user_id);
    }

    const topAddresses = Array.from(aggregates.values()).map((value) => ({
        address: value.address,
        reports: value.reports,
        reporters: value.reporters.size,
        blocks: value.blocks,
        averageBlocksPerReport: value.reports > 0 ? Number.parseFloat((value.blocks / value.reports).toFixed(2)) : 0,
    }));

    topAddresses.sort((a, b) => {
        if (b.blocks !== a.blocks) {
            return b.blocks - a.blocks;
        }
        if (b.reports !== a.reports) {
            return b.reports - a.reports;
        }
        return a.address.localeCompare(b.address);
    });

    return topAddresses.slice(0, 10);
};

const buildTopKeywords = (keywords: ReportedKeyword[]): AutoBlockTopKeyword[] => {
    const aggregates = new Map<string, AggregateBase & { term: string }>();

    for (const entry of keywords) {
        const key = entry.term.toLowerCase();
        let aggregate = aggregates.get(key);

        if (!aggregate) {
            aggregate = { term: entry.term, reports: 0, reporters: new Set<number>(), blocks: 0 };
            aggregates.set(key, aggregate);
        }

        aggregate.reports += 1;
        aggregate.blocks += entry.count;
        aggregate.reporters.add(entry.user_id);
    }

    const topKeywords = Array.from(aggregates.values()).map((value) => ({
        term: value.term,
        reports: value.reports,
        reporters: value.reporters.size,
        blocks: value.blocks,
        averageBlocksPerReport: value.reports > 0 ? Number.parseFloat((value.blocks / value.reports).toFixed(2)) : 0,
    }));

    topKeywords.sort((a, b) => {
        if (b.blocks !== a.blocks) {
            return b.blocks - a.blocks;
        }
        if (b.reports !== a.reports) {
            return b.reports - a.reports;
        }
        return a.term.localeCompare(b.term);
    });

    return topKeywords.slice(0, 10);
};

const buildTopReporters = (addresses: ReportedAddress[], keywords: ReportedKeyword[]): AutoBlockTopReporter[] => {
    const aggregates = new Map<
        number,
        {
            user_id: number;
            reportedAddresses: number;
            reportedKeywords: number;
            zeroBlockReports: number;
            blocksFromAddresses: number;
            blocksFromKeywords: number;
        }
    >();

    for (const entry of addresses) {
        let aggregate = aggregates.get(entry.user_id);
        if (!aggregate) {
            aggregate = {
                user_id: entry.user_id,
                reportedAddresses: 0,
                reportedKeywords: 0,
                zeroBlockReports: 0,
                blocksFromAddresses: 0,
                blocksFromKeywords: 0,
            };
            aggregates.set(entry.user_id, aggregate);
        }

        aggregate.reportedAddresses += 1;
        aggregate.blocksFromAddresses += entry.count;
        if (entry.count === 0) {
            aggregate.zeroBlockReports += 1;
        }
    }

    for (const entry of keywords) {
        let aggregate = aggregates.get(entry.user_id);
        if (!aggregate) {
            aggregate = {
                user_id: entry.user_id,
                reportedAddresses: 0,
                reportedKeywords: 0,
                zeroBlockReports: 0,
                blocksFromAddresses: 0,
                blocksFromKeywords: 0,
            };
            aggregates.set(entry.user_id, aggregate);
        }

        aggregate.reportedKeywords += 1;
        aggregate.blocksFromKeywords += entry.count;
        if (entry.count === 0) {
            aggregate.zeroBlockReports += 1;
        }
    }

    const topReporters = Array.from(aggregates.values()).map((value) => ({
        user_id: value.user_id,
        reportedAddresses: value.reportedAddresses,
        reportedKeywords: value.reportedKeywords,
        zeroBlockReports: value.zeroBlockReports,
        totalReports: value.reportedAddresses + value.reportedKeywords,
        blocksFromAddresses: value.blocksFromAddresses,
        blocksFromKeywords: value.blocksFromKeywords,
        totalBlocks: value.blocksFromAddresses + value.blocksFromKeywords,
    }));

    topReporters.sort((a, b) => {
        if (b.totalBlocks !== a.totalBlocks) {
            return b.totalBlocks - a.totalBlocks;
        }
        if (b.totalReports !== a.totalReports) {
            return b.totalReports - a.totalReports;
        }
        return b.user_id - a.user_id;
    });

    return topReporters.slice(0, 10);
};

/**
 * Loads the pre-computed auto-block analytics bundle and materializes summary/top lists
 * alongside the raw entries for UI consumption.
 *
 * @returns Structured auto-block analytics including leaderboards and summaries.
 */
export const loadAutoBlockStats = async (): Promise<AutoBlockStats> => {
    const [addresses, keywords] = (await Promise.all([
        loadCompressedCsvFromDataFolder('autoblock', 'address.csv.br'),
        loadCompressedCsvFromDataFolder('autoblock', 'keywords.csv.br'),
    ])) as [ReportedAddress[], ReportedKeyword[]];

    for (const address of addresses) {
        address.address = address.address.toString();
    }

    for (const keyword of keywords) {
        keyword.term = keyword.term.toString();
    }

    // Sort raw entries by count descending for convenience in the UI
    addresses.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }

        return a.address.localeCompare(b.address);
    });

    keywords.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }

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
