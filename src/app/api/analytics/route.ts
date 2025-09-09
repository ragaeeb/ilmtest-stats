import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { loadAnalytics } from '@/lib/analytics';
import type { Analytics, ProcessedAnalytics, ProcessedSession, SessionStats } from '@/lib/types';

export const dynamic = 'force-static';

function extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
}

function processSessionEvents(events: any[]): { startTime: number; endTime: number; visibilityChanges: number } {
    if (events.length === 0) {
        return { startTime: 0, endTime: 0, visibilityChanges: 0 };
    }

    let startTime = events[0]?.t || 0;
    let endTime = events[events.length - 1]?.t || startTime;
    let visibilityChanges = 0;

    for (const event of events) {
        if (event.e === 'StartSession') startTime = event.t;
        if (event.e === 'EndSession') endTime = event.t;
        if (event.e === 'Hidden' || event.e === 'Visible') visibilityChanges++;
    }

    return { startTime, endTime, visibilityChanges };
}

function updateEventCounts(events: any[], eventCounts: Record<string, number>, eventsByDay: Record<string, number>): void {
    for (const event of events) {
        eventCounts[event.e] = (eventCounts[event.e] || 0) + 1;

        const day = new Date(event.t * 1000).toISOString().split('T')[0];
        eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    }
}

function updateSessionStats(
    sessionData: Analytics,
    userSessions: Record<number, number>,
    appVersions: Record<string, number>,
    platforms: Record<string, number>,
    browsers: Record<string, number>
): void {
    const { state } = sessionData;

    userSessions[sessionData.user] = (userSessions[sessionData.user] || 0) + 1;

    if (state.appVersion) {
        appVersions[state.appVersion] = (appVersions[state.appVersion] || 0) + 1;
    }

    if (state.platform) {
        platforms[state.platform] = (platforms[state.platform] || 0) + 1;
    }

    if (state.userAgent) {
        const browser = extractBrowser(state.userAgent);
        browsers[browser] = (browsers[browser] || 0) + 1;
    }
}

function calculateSessionStats(
    allSessions: ProcessedSession[],
    totalEvents: number,
    totalVisibilityChanges: number,
    eventCounts: Record<string, number>,
    eventsByDay: Record<string, number>,
    userSessions: Record<number, number>,
    appVersions: Record<string, number>,
    platforms: Record<string, number>,
    browsers: Record<string, number>
): SessionStats {
    const durations = allSessions.map((s) => s.duration).filter((d) => d > 0);
    
    return {
        totalSessions: allSessions.length,
        averageSessionDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        longestSession: durations.length > 0 ? Math.max(...durations) : 0,
        shortestSession: durations.length > 0 ? Math.min(...durations) : 0,
        totalEvents,
        uniqueUsers: Object.keys(userSessions).length,
        totalVisibilityChanges,
        eventCounts,
        eventsByDay,
        userSessions,
        appVersions,
        platforms,
        browsers,
    };
}

function processAnalyticsData(analytics: Analytics[]): { sessions: ProcessedSession[]; stats: SessionStats } {
    const allSessions: ProcessedSession[] = [];
    const eventCounts: Record<string, number> = {};
    const eventsByDay: Record<string, number> = {};
    const userSessions: Record<number, number> = {};
    const appVersions: Record<string, number> = {};
    const platforms: Record<string, number> = {};
    const browsers: Record<string, number> = {};

    let totalVisibilityChanges = 0;
    let totalEvents = 0;

    for (const sessionData of analytics) {
        try {
            const { events } = sessionData;

            if (events.length === 0) {
                continue;
            }

            const { startTime, endTime, visibilityChanges } = processSessionEvents(events);
            const duration = endTime - startTime;

            updateEventCounts(events, eventCounts, eventsByDay);
            updateSessionStats(sessionData, userSessions, appVersions, platforms, browsers);

            allSessions.push({
                startTime,
                endTime,
                duration,
                user: sessionData.user,
                events,
                visibilityChanges,
            });

            totalEvents += events.length;
            totalVisibilityChanges += visibilityChanges;
        } catch (e) {
            console.warn('Failed to parse session data:', e);
        }
    }

    const stats = calculateSessionStats(
        allSessions,
        totalEvents,
        totalVisibilityChanges,
        eventCounts,
        eventsByDay,
        userSessions,
        appVersions,
        platforms,
        browsers
    );

    return { sessions: allSessions, stats };
}

function applySessionFilters(
    sessions: ProcessedSession[],
    eventFilter: string | null,
    dateFrom: string | null,
    dateTo: string | null
): ProcessedSession[] {
    let filteredSessions = sessions;

    if (eventFilter) {
        filteredSessions = filteredSessions.filter((session) =>
            session.events.some((event) => event.e === eventFilter),
        );
    }

    if (dateFrom || dateTo) {
        const fromTime = dateFrom ? new Date(dateFrom).getTime() / 1000 : 0;
        const toTime = dateTo ? new Date(dateTo).getTime() / 1000 : Number.MAX_SAFE_INTEGER;

        filteredSessions = filteredSessions.filter(
            (session) => session.startTime >= fromTime && session.startTime <= toTime,
        );
    }

    return filteredSessions;
}

function generateEventDetails(sessions: ProcessedSession[]): Record<string, { count: number; contexts: Record<string, number>; metadata: any[] }> {
    const eventDetails: Record<string, { count: number; contexts: Record<string, number>; metadata: any[] }> = {};

    for (const session of sessions) {
        for (const event of session.events) {
            if (!eventDetails[event.e]) {
                eventDetails[event.e] = { count: 0, contexts: {}, metadata: [] };
            }

            eventDetails[event.e].count++;

            if (event.c) {
                eventDetails[event.e].contexts[event.c] = (eventDetails[event.e].contexts[event.c] || 0) + 1;
            }

            const { e: _e, t: _t, c: _c, ...metadata } = event;

            if (Object.keys(metadata).length > 0) {
                eventDetails[event.e].metadata.push(metadata);
            }
        }
    }

    return eventDetails;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const eventFilter = searchParams.get('event');
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        const filePath = join(process.cwd(), 'public', 'data', 'analytics.json.br');
        const analytics = await loadAnalytics(filePath, searchParams.get('ENCRYPTION_SECRET') || undefined);

        const { sessions, stats } = processAnalyticsData(analytics);
        const filteredSessions = applySessionFilters(sessions, eventFilter, dateFrom, dateTo);
        const eventDetails = generateEventDetails(filteredSessions);

        return NextResponse.json({
            sessions: filteredSessions,
            stats,
            eventDetails,
            filters: {
                event: eventFilter,
                dateFrom,
                dateTo,
            },
        } satisfies ProcessedAnalytics);
    } catch (error) {
        console.error('Failed to process analytics:', error);
        return NextResponse.json(
            {
                error: 'Failed to process analytics data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}