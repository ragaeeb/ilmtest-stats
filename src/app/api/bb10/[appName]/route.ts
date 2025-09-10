import { type NextRequest, NextResponse } from 'next/server';
import {
    calculateStats,
    denormalizeRecords,
    isValidAppName,
    loadCompressedCsv,
    loadReferenceData,
    type ValidAppName,
} from '@/lib/blackberry';
import type { BB10Response } from '@/lib/types';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ appName: string }> }) {
    try {
        const { appName } = await params;

        if (!isValidAppName(appName)) {
            return NextResponse.json(
                { error: 'Invalid app name. Must be one of: quran10, sunnah10, salat10' },
                { status: 400 },
            );
        }

        // Load reference data and CSV records in parallel
        const [referenceData, rawRecords] = await Promise.all([
            loadReferenceData(),
            loadCompressedCsv(appName as ValidAppName),
        ]);

        // Calculate statistics
        const stats = calculateStats(rawRecords, referenceData);

        // Denormalize records for frontend use
        const normalizedRecords = denormalizeRecords(rawRecords, referenceData, appName as ValidAppName);

        const response: BB10Response = {
            appName,
            stats,
            records: normalizedRecords,
        };

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error(`Error loading BB10 data:`, error);

        return NextResponse.json(
            {
                error: 'Failed to load data',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
