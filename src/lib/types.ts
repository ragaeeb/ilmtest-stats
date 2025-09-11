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

export type NormalizedRecord = {
    ProductName: string;
    FileBundleName: string;
    VersionId: number;
    DateTime: number; // Unix timestamp in seconds
    DeviceId: number;
    OSId: number;
    CarrierId: number;
    LocaleId: number;
    CountryId: number;
};

export type RawBB10Record = {
    VersionId: number;
    DateTime: number;
    DeviceId: number;
    OSId: number;
    CarrierId: number;
    LocaleId: number;
    CountryId: number;
};

export type BB10ReferenceData = {
    countries: Record<string, string>;
    devices: Record<string, string>;
    locales: Record<string, string>;
    osVersions: Record<string, string>;
    versions: Record<string, string>;
    carriers: Record<string, string>;
};

export type BB10Stats = {
    totalDownloads: number;
    uniqueDevices: number;
    dateRange: {
        start: Date;
        end: Date;
    };
    downloadsByCountry: Array<{
        country: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByVersion: Array<{
        version: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByDevice: Array<{
        device: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByCarrier: Array<{
        carrier: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByOS: Array<{
        osVersion: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsByLocale: Array<{
        locale: string;
        downloads: number;
        percentage: number;
    }>;
    downloadsOverTime: Array<{
        date: string;
        downloads: number;
    }>;
    topCountries: string[];
    topDevices: string[];
    topVersions: string[];
};

export type BB10Response = {
    appName: string;
    stats: BB10Stats;
    records: NormalizedRecord[];
};

export type AppAnalyticsEvent = {
    id: string;
    context?: number | string;
    count: number;
    user: number;
};
