import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import type { OptimizedStats } from '@/lib/collectionStats';
import { decompressJson } from '@/lib/compression';

export const dynamic = 'force-static';

interface StatsEntry {
    covered?: number;
    reviews?: number;
    drafts?: number;
    explained?: number;
    unlinked?: number;
    verify?: number;
    entries?: number;
    t: number;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
    try {
        const { collectionId } = await params;

        // Read the stats file
        const allStats: OptimizedStats = decompressJson(
            await readFile(join(process.cwd(), 'public', 'data', 'collection_stats.json.br')),
        );

        // Get stats for this specific collection
        const rawStats = allStats.stats[collectionId];
        if (!rawStats || !Array.isArray(rawStats) || rawStats.length === 0) {
            return NextResponse.json({ error: 'Collection stats not found' }, { status: 404 });
        }

        // Process the stats data - build up from patches
        const processedStats: StatsEntry[] = [];
        let currentState: Partial<StatsEntry> = {};

        for (const entry of rawStats) {
            // Merge the current entry with the accumulated state
            currentState = { ...currentState, ...entry };

            // Add the complete entry to our processed stats
            processedStats.push({
                covered: currentState.covered || 0,
                reviews: currentState.reviews || 0,
                drafts: currentState.drafts || 0,
                explained: currentState.explained || 0,
                unlinked: currentState.unlinked || 0,
                verify: currentState.verify || 0,
                entries: currentState.entries || 0,
                t: entry.t,
                date: new Date(entry.t * 1000).toISOString(),
            } as StatsEntry & { date: string });
        }

        // Calculate additional metrics for the latest entry
        const latestStats = processedStats.at(-1)!;
        const totalEntries = latestStats.entries || 0;
        const metrics = {
            ...latestStats,
            coveragePercentage: 0, // Will be calculated on frontend with collection data
            reviewsPercentage: totalEntries > 0 ? ((latestStats.reviews || 0) / totalEntries) * 100 : 0,
            draftsPercentage: totalEntries > 0 ? ((latestStats.drafts || 0) / totalEntries) * 100 : 0,
            explainedPercentage: totalEntries > 0 ? ((latestStats.explained || 0) / totalEntries) * 100 : 0,
            unlinkedPercentage: totalEntries > 0 ? ((latestStats.unlinked || 0) / totalEntries) * 100 : 0,
            verifyPercentage: totalEntries > 0 ? ((latestStats.verify || 0) / totalEntries) * 100 : 0,
        };

        return NextResponse.json(
            {
                collectionId,
                timeSeries: processedStats,
                latestMetrics: metrics,
                totalEntries: processedStats.length,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('Failed to process collection stats:', error);
        return NextResponse.json({ error: 'Failed to load collection stats' }, { status: 500 });
    }
}
