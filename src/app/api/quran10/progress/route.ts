import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { type NextRequest, NextResponse } from 'next/server';

export type QuranProgress = {
    timestamp: number;
    user: number;
    surah: number;
    verse: number;
};

export type ProcessedProgress = {
    timestamp: number;
    user: number;
    surah: number;
    verse: number;
    progressValue: number;
    percentage: number;
};

// Quran structure: 114 surahs with their verse counts
const QURAN_STRUCTURE = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
    227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
    55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19,
    36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const TOTAL_VERSES = QURAN_STRUCTURE.reduce((sum, verses) => sum + verses, 0); // 6236 verses

// Convert surah/verse to a cumulative progress value
const calculateProgressValue = (surah: number, verse: number): number => {
    if (surah < 1 || surah > 114) return 0;

    // Calculate cumulative verses from previous surahs
    let cumulativeVerses = 0;
    for (let i = 0; i < surah - 1; i++) {
        cumulativeVerses += QURAN_STRUCTURE[i];
    }

    // Add current verse (capped at surah's max verses)
    const maxVerses = QURAN_STRUCTURE[surah - 1];
    const currentVerse = Math.min(verse, maxVerses);

    return cumulativeVerses + currentVerse;
};

// Calculate percentage completion
const calculatePercentage = (progressValue: number): number => {
    return Math.min((progressValue / TOTAL_VERSES) * 100, 100);
};

const processProgressData = (data: QuranProgress[]): ProcessedProgress[] => {
    return data
        .map((entry) => ({
            ...entry,
            progressValue: calculateProgressValue(entry.surah, entry.verse),
            percentage: calculatePercentage(calculateProgressValue(entry.surah, entry.verse)),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
};

const getUniqueUsers = (data: ProcessedProgress[]): number[] => {
    const users = new Set<number>();
    data.forEach((entry) => {
        users.add(entry.user);
    });
    return Array.from(users).sort((a, b) => a - b);
};

const getUserProgressSummary = (data: ProcessedProgress[]) => {
    const userStats = new Map<
        number,
        {
            totalEntries: number;
            firstTimestamp: number;
            lastTimestamp: number;
            maxProgress: number;
            maxPercentage: number;
            latestSurah: number;
            latestVerse: number;
        }
    >();

    data.forEach((entry) => {
        const existing = userStats.get(entry.user);
        if (!existing) {
            userStats.set(entry.user, {
                totalEntries: 1,
                firstTimestamp: entry.timestamp,
                lastTimestamp: entry.timestamp,
                maxProgress: entry.progressValue,
                maxPercentage: entry.percentage,
                latestSurah: entry.surah,
                latestVerse: entry.verse,
            });
        } else {
            existing.totalEntries++;
            existing.firstTimestamp = Math.min(existing.firstTimestamp, entry.timestamp);
            existing.lastTimestamp = Math.max(existing.lastTimestamp, entry.timestamp);
            if (entry.progressValue > existing.maxProgress) {
                existing.maxProgress = entry.progressValue;
                existing.maxPercentage = entry.percentage;
                existing.latestSurah = entry.surah;
                existing.latestVerse = entry.verse;
            }
        }
    });

    return Array.from(userStats.entries())
        .map(([userId, stats]) => ({
            userId,
            ...stats,
        }))
        .sort((a, b) => b.maxProgress - a.maxProgress);
};

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const user = searchParams.get('user');
        const limit = searchParams.get('limit');

        const filePath = path.join(process.cwd(), 'public', 'data', 'quran10', 'progress.csv');
        const fileContent = await fs.readFile(filePath, 'utf-8');

        const records = parse<QuranProgress>(fileContent, {
            columns: true,
            cast: true,
            skip_empty_lines: true,
            trim: true,
        });

        let filteredData = records;

        // Apply user filter
        if (user) {
            const userId = parseInt(user);
            if (!Number.isNaN(userId)) {
                filteredData = filteredData.filter((entry) => entry.user === userId);
            }
        }

        // Apply limit
        if (limit) {
            const limitNum = parseInt(limit);
            if (!Number.isNaN(limitNum) && limitNum > 0) {
                filteredData = filteredData.slice(0, limitNum);
            }
        }

        const processedData = processProgressData(filteredData);
        const uniqueUsers = getUniqueUsers(processedData);
        const userSummaries = getUserProgressSummary(processedData);

        return NextResponse.json({
            data: processedData,
            uniqueUsers,
            userSummaries,
            totalEntries: processedData.length,
            totalVerses: TOTAL_VERSES,
            quranStructure: QURAN_STRUCTURE,
        });
    } catch (error) {
        console.error('Error loading Quran progress data:', error);
        return NextResponse.json({ error: 'Failed to load progress data' }, { status: 500 });
    }
}
