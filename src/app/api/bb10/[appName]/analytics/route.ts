import { type NextRequest, NextResponse } from 'next/server';
import { loadOptimizedAnalytics } from '@/lib/bb10';

export type AppAnalyticsEvent = {
    id: string;
    context?: number | string;
    count: number;
    user: number;
};

const processAnalyticsData = (data: AppAnalyticsEvent[]) => {
    const eventStats = new Map<
        string,
        { totalCount: number; uniqueUsers: Set<number>; contexts: Map<string | number, number> }
    >();
    const userStats = new Map<number, { totalEvents: number; uniqueEventTypes: Set<string> }>();
    let totalEvents = 0;
    const totalUsers = new Set<number>();
    let sessionTotalSum = 0;
    let sessionTotalCount = 0;

    for (let i = 0; i < data.length; i++) {
        const event = data[i];
        totalEvents += event.count;
        totalUsers.add(event.user);

        if (!eventStats.has(event.id)) {
            eventStats.set(event.id, {
                totalCount: 0,
                uniqueUsers: new Set<number>(),
                contexts: new Map<string | number, number>(),
            });
        }

        const eventStat = eventStats.get(event.id)!;
        eventStat.totalCount += event.count;
        eventStat.uniqueUsers.add(event.user);

        if (event.context !== undefined) {
            const contextKey = String(event.context);
            eventStat.contexts.set(contextKey, (eventStat.contexts.get(contextKey) || 0) + event.count);
        }

        // Fix: Only include positive session durations and validate the data
        if (event.id === 'SessionTotal' && typeof event.context === 'number' && event.context > 0) {
            sessionTotalSum += event.context * event.count;
            sessionTotalCount += event.count;
        }

        if (!userStats.has(event.user)) {
            userStats.set(event.user, {
                totalEvents: 0,
                uniqueEventTypes: new Set<string>(),
            });
        }

        const userStat = userStats.get(event.user)!;
        userStat.totalEvents += event.count;
        userStat.uniqueEventTypes.add(event.id);
    }

    const eventAnalytics = [];
    for (const [eventId, stats] of eventStats) {
        const contextsArray = [];
        for (const [context, count] of stats.contexts) {
            contextsArray.push({ context, count });
        }
        contextsArray.sort((a, b) => b.count - a.count);

        eventAnalytics.push({
            id: eventId,
            totalCount: stats.totalCount,
            uniqueUsers: stats.uniqueUsers.size,
            avgCountPerUser: stats.totalCount / stats.uniqueUsers.size,
            contexts: contextsArray,
        });
    }

    eventAnalytics.sort((a, b) => b.totalCount - a.totalCount);

    const userAnalytics = [];
    for (const [userId, stats] of userStats) {
        userAnalytics.push({
            userId,
            totalEvents: stats.totalEvents,
            uniqueEventTypes: stats.uniqueEventTypes.size,
            avgEventsPerType: stats.totalEvents / stats.uniqueEventTypes.size,
        });
    }

    userAnalytics.sort((a, b) => b.totalEvents - a.totalEvents);

    // Fix: Ensure avgSessionDuration is valid
    const avgSessionDuration = sessionTotalCount > 0 ? sessionTotalSum / sessionTotalCount : 0;

    return {
        summary: {
            totalEvents,
            totalUsers: totalUsers.size,
            totalEventTypes: eventStats.size,
            avgEventsPerUser: totalEvents / totalUsers.size,
            avgSessionDuration: Math.max(0, avgSessionDuration), // Ensure non-negative
        },
        eventAnalytics,
        userAnalytics: userAnalytics.slice(0, 100),
        topEvents: eventAnalytics.slice(0, 20),
        rawData: data,
    };
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ appName: string }> }) {
    try {
        const { appName } = await params;
        const searchParams = request.nextUrl.searchParams;

        const user = searchParams.get('user');
        const eventId = searchParams.get('eventId');
        const limit = searchParams.get('limit');

        const data = await loadOptimizedAnalytics(appName);

        let filteredData = data;

        if (user) {
            const userId = parseInt(user);
            if (!Number.isNaN(userId)) {
                const filtered = [];
                for (let i = 0; i < filteredData.length; i++) {
                    if (filteredData[i].user === userId) {
                        filtered.push(filteredData[i]);
                    }
                }
                filteredData = filtered;
            }
        }

        if (eventId) {
            const filtered = [];
            for (let i = 0; i < filteredData.length; i++) {
                if (filteredData[i].id === eventId) {
                    filtered.push(filteredData[i]);
                }
            }
            filteredData = filtered;
        }

        if (limit) {
            const limitNum = parseInt(limit);
            if (!Number.isNaN(limitNum) && limitNum > 0) {
                filteredData = filteredData.slice(0, limitNum);
            }
        }

        const processedData = processAnalyticsData(filteredData);

        return NextResponse.json(processedData);
    } catch (error) {
        console.error('Error loading analytics:', error);
        return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 });
    }
}
