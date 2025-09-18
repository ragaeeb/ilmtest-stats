import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

import { compressString, decompressString } from './compression';
import type { BB10ReferenceData, BB10Stats, NormalizedRecord, RawBB10Record } from './types';

type Info = {
    ProductName: string;
    FileBundleName: string;
    Version: string;
    DateTime: string;
    DeviceModel: string;
    OSVersion: string;
    Carrier: string;
    Locale: string;
    Country: string;
};

/**
 * Normalizes raw BlackBerry download CSV exports into compressed per-app datasets and
 * mapping tables that the dashboard can load efficiently.
 *
 * @param filePaths - Paths to one or more download CSV exports to normalize.
 * @returns The grouped normalized records and lookup mappings written to disk.
 */
export const normalizeDownloads = async (filePaths: string[]) => {
    // Pre-allocate maps for better memory efficiency
    const uniqueVersions = new Map<string, number>();
    const uniqueDevices = new Map<string, number>();
    const uniqueOSVersions = new Map<string, number>();
    const uniqueLocales = new Map<string, number>();
    const uniqueCountries = new Map<string, number>();
    const uniqueCarriers = new Map<string, number>();

    let versionCounter = 1;
    let deviceCounter = 1;
    let osCounter = 1;
    let localeCounter = 1;
    let countryCounter = 1;
    let carrierCounter = 1;

    const allRecords: Info[] = [];

    // Process files one by one to avoid loading everything into memory
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const records = parse<Info>(await Bun.file(filePath).text(), {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        // Use traditional for loop for better performance
        for (let j = 0; j < records.length; j++) {
            const record = records[j];
            allRecords.push(record);

            // Build unique value maps incrementally
            const version = record.Version.trim();
            if (version && !uniqueVersions.has(version)) {
                uniqueVersions.set(version, versionCounter++);
            }

            const device = record.DeviceModel.trim();
            if (device && !uniqueDevices.has(device)) {
                uniqueDevices.set(device, deviceCounter++);
            }

            const os = record.OSVersion.trim();
            if (os && !uniqueOSVersions.has(os)) {
                uniqueOSVersions.set(os, osCounter++);
            }

            const locale = record.Locale.trim();
            if (locale && !uniqueLocales.has(locale)) {
                uniqueLocales.set(locale, localeCounter++);
            }

            const country = record.Country.trim();
            if (country && !uniqueCountries.has(country)) {
                uniqueCountries.set(country, countryCounter++);
            }

            const carrier = record.Carrier.trim();
            if (carrier && !uniqueCarriers.has(carrier)) {
                uniqueCarriers.set(carrier, carrierCounter++);
            }
        }
    }

    // Convert maps to sorted arrays for consistent ordering
    const sortedVersions = Array.from(uniqueVersions.keys()).sort();
    const sortedDevices = Array.from(uniqueDevices.keys()).sort();
    const sortedOSVersions = Array.from(uniqueOSVersions.keys()).sort();
    const sortedLocales = Array.from(uniqueLocales.keys()).sort();
    const sortedCountries = Array.from(uniqueCountries.keys()).sort();
    const sortedCarriers = Array.from(uniqueCarriers.keys()).sort();

    // Create final ID mappings
    const appVersionToId = new Map<string, number>();
    const deviceToId = new Map<string, number>();
    const osToId = new Map<string, number>();
    const localeToId = new Map<string, number>();
    const countryToId = new Map<string, number>();
    const carrierToId = new Map<string, number>();

    for (let i = 0; i < sortedVersions.length; i++) {
        appVersionToId.set(sortedVersions[i], i + 1);
    }
    for (let i = 0; i < sortedDevices.length; i++) {
        deviceToId.set(sortedDevices[i], i + 1);
    }
    for (let i = 0; i < sortedOSVersions.length; i++) {
        osToId.set(sortedOSVersions[i], i + 1);
    }
    for (let i = 0; i < sortedLocales.length; i++) {
        localeToId.set(sortedLocales[i], i + 1);
    }
    for (let i = 0; i < sortedCountries.length; i++) {
        countryToId.set(sortedCountries[i], i + 1);
    }
    for (let i = 0; i < sortedCarriers.length; i++) {
        carrierToId.set(sortedCarriers[i], i + 1);
    }

    // Process records and normalize
    const normalizedRecords: NormalizedRecord[] = [];

    for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i];

        const version = record.Version.trim();
        const device = record.DeviceModel.trim();
        const os = record.OSVersion.trim();
        const locale = record.Locale.trim();
        const country = record.Country.trim();
        const carrier = record.Carrier.trim();

        // Skip invalid records
        if (!version || !device || !os || !locale || !country || !carrier) {
            continue;
        }

        const versionId = appVersionToId.get(version);
        const deviceId = deviceToId.get(device);
        const osId = osToId.get(os);
        const localeId = localeToId.get(locale);
        const countryId = countryToId.get(country);
        const carrierId = carrierToId.get(carrier);

        if (versionId && deviceId && osId && localeId && countryId && carrierId) {
            normalizedRecords.push({
                ProductName: record.ProductName,
                FileBundleName: record.FileBundleName,
                VersionId: versionId,
                DateTime: Math.floor(new Date(record.DateTime).getTime() / 1000),
                DeviceId: deviceId,
                OSId: osId,
                CarrierId: carrierId,
                LocaleId: localeId,
                CountryId: countryId,
            });
        }
    }

    // Sort by date using efficient sort
    normalizedRecords.sort((a, b) => a.DateTime - b.DateTime);

    // Group by ProductName more efficiently
    const groupedRecords = new Map<string, NormalizedRecord[]>();
    for (let i = 0; i < normalizedRecords.length; i++) {
        const record = normalizedRecords[i];
        const productName = record.ProductName;

        if (!groupedRecords.has(productName)) {
            groupedRecords.set(productName, []);
        }
        groupedRecords.get(productName)!.push(record);
    }

    // Create mappings for output
    const mappings = {
        versions: Object.fromEntries(appVersionToId.entries()),
        devices: Object.fromEntries(deviceToId.entries()),
        osVersions: Object.fromEntries(osToId.entries()),
        locales: Object.fromEntries(localeToId.entries()),
        countries: Object.fromEntries(countryToId.entries()),
        carriers: Object.fromEntries(carrierToId.entries()),
    };

    // Write mapping files
    const mappingKeys = Object.keys(mappings) as Array<keyof typeof mappings>;
    for (let i = 0; i < mappingKeys.length; i++) {
        const key = mappingKeys[i];
        const value = mappings[key];
        await Bun.write(`${key}.json`, JSON.stringify(value));
    }

    // Write compressed CSV files
    for (const [productName, records] of groupedRecords) {
        const csvRows = ['VersionId,DateTime,DeviceId,OSId,CarrierId,LocaleId,CountryId'];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            csvRows.push(
                `${record.VersionId},${record.DateTime},${record.DeviceId},${record.OSId},${record.CarrierId},${record.LocaleId},${record.CountryId}`,
            );
        }

        const compressed = compressString(csvRows.join('\n'));
        await Bun.write(`${productName}.csv.br`, compressed);
    }

    return {
        normalizedRecords: Object.fromEntries(groupedRecords),
        mappings,
    };
};

const VALID_APP_NAMES = ['quran10', 'sunnah10', 'salat10'] as const;
export type ValidAppName = (typeof VALID_APP_NAMES)[number];

/**
 * Type guard that checks if a string corresponds to a supported BB10 app name.
 *
 * @param appName - The potential app name.
 * @returns True when the app is one of the supported values.
 */
export const isValidAppName = (appName: string): appName is ValidAppName => {
    for (let i = 0; i < VALID_APP_NAMES.length; i++) {
        if (VALID_APP_NAMES[i] === appName) {
            return true;
        }
    }
    return false;
};

/**
 * Loads all BB10 lookup tables (countries, devices, etc.) from the data directory.
 *
 * @returns Parsed reference data keyed by identifier.
 */
export const loadReferenceData = async (): Promise<BB10ReferenceData> => {
    const dataDir = path.join(process.cwd(), 'public', 'data', 'bb10');

    const [countries, devices, locales, osVersions, versions, carriers] = await Promise.all([
        readFile(path.join(dataDir, 'countries.json'), 'utf-8').then(JSON.parse),
        readFile(path.join(dataDir, 'devices.json'), 'utf-8').then(JSON.parse),
        readFile(path.join(dataDir, 'locales.json'), 'utf-8').then(JSON.parse),
        readFile(path.join(dataDir, 'osVersions.json'), 'utf-8').then(JSON.parse),
        readFile(path.join(dataDir, 'versions.json'), 'utf-8').then(JSON.parse),
        readFile(path.join(dataDir, 'carriers.json'), 'utf-8').then(JSON.parse),
    ]);

    return {
        countries,
        devices,
        locales,
        osVersions,
        versions,
        carriers,
    };
};

/**
 * Loads a Brotli-compressed normalized download CSV for the given BB10 app.
 *
 * @param appName - The app to load data for.
 * @returns Parsed normalized download records.
 */
export const loadCompressedCsv = async (appName: ValidAppName): Promise<RawBB10Record[]> => {
    const filePath = path.join(process.cwd(), 'public', 'data', 'bb10', `${appName}.csv.br`);
    const compressedBuffer = await readFile(filePath);
    const csvContent = decompressString(compressedBuffer);

    return parse<RawBB10Record>(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
            if (
                context.column &&
                typeof context.column === 'string' &&
                ['VersionId', 'DateTime', 'DeviceId', 'OSId', 'CarrierId', 'LocaleId', 'CountryId'].includes(
                    context.column,
                )
            ) {
                return Number.parseInt(value as string, 10);
            }
            return value;
        },
    });
};

/**
 * Converts normalized raw records and reference data back into the denormalized format used
 * for analytics computations.
 *
 * @param rawRecords - Records loaded from {@link loadCompressedCsv}.
 * @param referenceData - Lookup tables for resolving IDs to values.
 * @param appName - App identifier used to set product/file names.
 * @returns Denormalized records ready for statistical analysis.
 */
export const denormalizeRecords = (
    rawRecords: RawBB10Record[],
    referenceData: BB10ReferenceData,
    appName: ValidAppName,
): NormalizedRecord[] => {
    const normalizedRecords: NormalizedRecord[] = new Array(rawRecords.length);

    for (let i = 0; i < rawRecords.length; i++) {
        const record = rawRecords[i];
        normalizedRecords[i] = {
            ProductName: appName,
            FileBundleName: appName,
            VersionId: record.VersionId,
            DateTime: record.DateTime,
            DeviceId: record.DeviceId,
            OSId: record.OSId,
            CarrierId: record.CarrierId,
            LocaleId: record.LocaleId,
            CountryId: record.CountryId,
        };
    }

    return normalizedRecords;
};

const calculatePercentages = <T extends { downloads: number }>(items: T[]): (T & { percentage: number })[] => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].downloads;
    }

    const result = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
        result[i] = {
            ...items[i],
            percentage: total > 0 ? Math.round((items[i].downloads / total) * 10000) / 100 : 0,
        };
    }
    return result;
};

const groupByField = <T extends Record<string, any>>(
    records: T[],
    field: keyof T,
    lookup: Record<string, string>,
): Array<{ name: string; downloads: number }> => {
    const counts = new Map<string, number>();

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const id = String(record[field]);
        const name = lookup[id] || `Unknown (${id})`;
        counts.set(name, (counts.get(name) || 0) + 1);
    }

    const result: Array<{ name: string; downloads: number }> = [];
    for (const [name, downloads] of counts) {
        result.push({ name, downloads });
    }

    result.sort((a, b) => b.downloads - a.downloads);
    return result;
};

const groupByDate = (records: RawBB10Record[]): Array<{ date: string; downloads: number }> => {
    const counts = new Map<string, number>();

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const date = new Date(record.DateTime * 1000).toISOString().split('T')[0];
        counts.set(date, (counts.get(date) || 0) + 1);
    }

    const result: Array<{ date: string; downloads: number }> = [];
    for (const [date, downloads] of counts) {
        result.push({ date, downloads });
    }

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
};

/**
 * Aggregates normalized download records into summary statistics and leaderboard breakdowns.
 *
 * @param records - Download records for a BB10 app.
 * @param referenceData - Lookup data providing human-readable labels.
 * @returns Rich download analytics for rendering in the UI.
 */
export const calculateStats = (records: RawBB10Record[], referenceData: BB10ReferenceData): BB10Stats => {
    if (records.length === 0) {
        return {
            totalDownloads: 0,
            uniqueDevices: 0,
            dateRange: { start: new Date(), end: new Date() },
            downloadsByCountry: [],
            downloadsByVersion: [],
            downloadsByDevice: [],
            downloadsByCarrier: [],
            downloadsByOS: [],
            downloadsByLocale: [],
            downloadsOverTime: [],
            topCountries: [],
            topDevices: [],
            topVersions: [],
        };
    }

    const totalDownloads = records.length;

    // Count unique devices efficiently
    const deviceIds = new Set<number>();
    let minTimestamp = Number.MAX_SAFE_INTEGER;
    let maxTimestamp = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        deviceIds.add(record.DeviceId);

        if (record.DateTime < minTimestamp) {
            minTimestamp = record.DateTime;
        }
        if (record.DateTime > maxTimestamp) {
            maxTimestamp = record.DateTime;
        }
    }

    const uniqueDevices = deviceIds.size;

    const downloadsByCountry = calculatePercentages(
        groupByField(records, 'CountryId', referenceData.countries).map(({ name, downloads }) => ({
            country: name,
            downloads,
        })),
    );

    const downloadsByVersion = calculatePercentages(
        groupByField(records, 'VersionId', referenceData.versions).map(({ name, downloads }) => ({
            version: name,
            downloads,
        })),
    );

    const downloadsByDevice = calculatePercentages(
        groupByField(records, 'DeviceId', referenceData.devices).map(({ name, downloads }) => ({
            device: name,
            downloads,
        })),
    );

    const downloadsByCarrier = calculatePercentages(
        groupByField(records, 'CarrierId', referenceData.carriers).map(({ name, downloads }) => ({
            carrier: name,
            downloads,
        })),
    );

    const downloadsByOS = calculatePercentages(
        groupByField(records, 'OSId', referenceData.osVersions).map(({ name, downloads }) => ({
            osVersion: name,
            downloads,
        })),
    );

    const downloadsByLocale = calculatePercentages(
        groupByField(records, 'LocaleId', referenceData.locales).map(({ name, downloads }) => ({
            locale: name,
            downloads,
        })),
    );

    const downloadsOverTime = groupByDate(records);

    // Get top items efficiently
    const topCountries: string[] = [];
    const maxCountries = Math.min(10, downloadsByCountry.length);
    for (let i = 0; i < maxCountries; i++) {
        topCountries.push(downloadsByCountry[i].country);
    }

    const topDevices: string[] = [];
    const maxDevices = Math.min(10, downloadsByDevice.length);
    for (let i = 0; i < maxDevices; i++) {
        topDevices.push(downloadsByDevice[i].device);
    }

    const topVersions: string[] = [];
    const maxVersions = Math.min(5, downloadsByVersion.length);
    for (let i = 0; i < maxVersions; i++) {
        topVersions.push(downloadsByVersion[i].version);
    }

    return {
        totalDownloads,
        uniqueDevices,
        dateRange: {
            start: new Date(minTimestamp * 1000),
            end: new Date(maxTimestamp * 1000),
        },
        downloadsByCountry,
        downloadsByVersion,
        downloadsByDevice,
        downloadsByCarrier,
        downloadsByOS,
        downloadsByLocale,
        downloadsOverTime,
        topCountries,
        topDevices,
        topVersions,
    };
};
