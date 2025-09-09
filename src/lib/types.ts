export type Row = Record<string, string | number | null | Date>;

export type ColumnInfo = {
    key: string;
    type: 'string' | 'number' | 'date';
    uniqueCount: number;
};

export type StatsResponse = {
    rows: Row[];
    meta: {
        columns: ColumnInfo[];
        rowCount: number;
    };
};

export type AnalyticsEvent = {
    e: string;
    t: number;
    c?: any;
    _redacted?: boolean;
    [key: string]: any;
};

export type Analytics = {
    user: number;
    state: {
        appVersion?: string;
        userAgent: string;
        language: string;
        platform: string;
    };
    events: AnalyticsEvent[];
    t: number;
};

export type SessionData = {
    data: string;
    id: number;
    state: string;
    timestamp: string;
    user_id: number;
};

export type ProcessedSession = Pick<Analytics, 'events' | 'user'> & {
    startTime: number;
    endTime: number;
    duration: number;
    visibilityChanges: number;
};

export type SessionStats = {
    totalSessions: number;
    averageSessionDuration: number;
    longestSession: number;
    shortestSession: number;
    totalEvents: number;
    uniqueUsers: number;
    totalVisibilityChanges: number;
    eventCounts: Record<string, number>;
    eventsByDay: Record<string, number>;
    userSessions: Record<number, number>;
    appVersions: Record<string, number>;
    platforms: Record<string, number>;
    browsers: Record<string, number>;
};

export type ProcessedAnalytics = {
    sessions: ProcessedSession[];
    stats: SessionStats;
    eventDetails: Record<
        string,
        {
            count: number;
            contexts: Record<string, number>;
            metadata: any[];
        }
    >;
    filters: {
        event: string | null;
        dateFrom: string | null;
        dateTo: string | null;
    };
};
