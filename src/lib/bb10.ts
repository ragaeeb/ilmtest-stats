import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { compressJson, compressString, decompressJson, decompressString } from './compression';
import { hasPII } from './pii';
import { encrypt, initSecrets } from './security';
import type { AppAnalyticsEvent } from './types';

type RawEvent = {
    id: number;
    user_id: number;
    event: string;
    context?: string | number;
    count: number;
    app: string;
};

type ProcessedEvent = Pick<RawEvent, 'count'> & {
    id: number;
    context?: number;
    contextId?: number;
};

const invertObject = (obj: Record<string, number>) => Object.fromEntries(Object.entries(obj).map(([e, id]) => [id, e]));

const mapRecordsToAppUserEvents = async (filePath: string) => {
    const records = parse<RawEvent>(await Bun.file(filePath).text(), {
        columns: true,
        cast: true,
        skip_empty_lines: true,
        trim: true,
    });

    const eventToId: Record<string, number> = {};
    const contextToId: Record<string, number> = {};
    const appToUserEvents: Record<string, Record<string, ProcessedEvent[]>> = {};
    let nextEventId = 0;
    let nextContextId = 0;

    for (const record of records) {
        if (!eventToId[record.event]) {
            eventToId[record.event] = ++nextEventId;
        }

        if (!appToUserEvents[record.app]) {
            appToUserEvents[record.app] = {};
        }

        const userToEvents = appToUserEvents[record.app];

        if (!userToEvents[record.user_id]) {
            userToEvents[record.user_id] = [];
        }

        const event: ProcessedEvent = { count: record.count, id: eventToId[record.event] };

        if (typeof record.context === 'string') {
            if (!record.context.includes('<html') && !record.context.includes('<HTML')) {
                if (!contextToId[record.context]) {
                    contextToId[record.context] = ++nextContextId;
                }

                event.contextId = contextToId[record.context];
            }
        } else {
            event.context = record.context;
        }

        userToEvents[record.user_id].push(event);
    }

    return {
        idToEvent: invertObject(eventToId),
        idToContext: invertObject(contextToId),
        appToUserEvents,
        appLaunchId: eventToId.AppLaunch,
        appCloseId: eventToId.AppClose,
    };
};

const truncateToThreeDecimals = (num: number) => {
    return Math.floor(num * 1000) / 1000;
};

const truncateCoordinateString = (coordStr: string) => {
    return coordStr.replace(/-?\d+\.\d+/g, (match) => {
        const num = parseFloat(match);
        return (Math.floor(num * 1000) / 1000).toString();
    });
};

export const optimizeAnalytics = async (filePath: string, omitSubsequentRequireds = true, shouldCompress = true) => {
    const { idToEvent, idToContext, appToUserEvents, appLaunchId, appCloseId } =
        await mapRecordsToAppUserEvents(filePath);

    for (const userToEvents of Object.values(appToUserEvents)) {
        for (const user of Object.keys(userToEvents)) {
            const events = userToEvents[user];
            const appLaunches: number[] = [];
            const appExits: number[] = [];
            const miscEvents: ProcessedEvent[] = [];
            const eventContextToEvent: Record<string, ProcessedEvent> = {};

            let currentLaunch: number | null = null;

            for (const event of events) {
                if (event.id === appLaunchId) {
                    // App Launch
                    if (currentLaunch !== null) {
                        // Already in a launch window, cancel the previous one
                        currentLaunch = event.context!;
                    } else {
                        // Start a new launch window
                        currentLaunch = event.context!;
                    }
                } else if (event.id === appCloseId) {
                    // App Exit
                    if (currentLaunch !== null) {
                        // We have a valid launch-exit pair
                        appLaunches.push(currentLaunch);
                        appExits.push(event.context!);
                        currentLaunch = null;
                    }
                    // If currentLaunch is null, discard this exit (no matching launch)
                } else {
                    if (event.context) {
                        event.context = truncateToThreeDecimals(event.context);
                    }

                    const hashKey = `${event.id}/${event.contextId}`;

                    if (eventContextToEvent[hashKey]) {
                        eventContextToEvent[hashKey].count += event.count;
                    } else {
                        eventContextToEvent[hashKey] = event;
                        miscEvents.push(event);
                    }
                }
            }

            // Now appLaunches and appExits are perfectly paired
            for (let i = 0; i < appLaunches.length; i++) {
                const context = Math.floor((appExits[i] - appLaunches[i]) / 1000);

                if (context < 3600 * 24) {
                    // less than 1 day to filter out false positives
                    miscEvents.push({
                        id: appLaunchId,
                        context,
                        count: 1,
                    });
                }
            }

            userToEvents[user] = miscEvents;
        }
    }

    for (const [app, userToEvents] of Object.entries(appToUserEvents)) {
        const csvRows = ['user,id,context,contextId,count'];
        const userIds = Object.keys(userToEvents)
            .map(Number)
            .sort((a, b) => a - b);

        for (const user of userIds) {
            const events = userToEvents[user].sort((a, b) => a.id - b.id);

            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                csvRows.push(
                    [
                        !omitSubsequentRequireds || i === 0 ? user : '',
                        !omitSubsequentRequireds || i === 0 || events[i].id !== events[i - 1].id ? event.id : '',
                        event.context || '',
                        event.contextId || '',
                        event.count,
                    ].join(','),
                );
            }
        }

        const result = csvRows.join('\n');

        if (shouldCompress) {
            const compressed = compressString(result);
            await Bun.write(`${app}.csv.br`, compressed);
        } else {
            await Bun.write(`${app}.csv`, result);
        }
    }

    idToEvent[appLaunchId] = 'SessionTotal';
    delete idToEvent[appCloseId];

    initSecrets();

    for (const key of Object.keys(idToContext)) {
        let value = truncateCoordinateString(idToContext[key]);

        if (hasPII(value)) {
            value = `__REDACTED__${encrypt(value)}`;
        }

        idToContext[key] = value;
    }

    if (shouldCompress) {
        await Promise.all([
            Bun.file('events.json').write(JSON.stringify(idToEvent)),
            Bun.file('contexts.json.br').write(compressJson(idToContext)),
        ]);
    } else {
        await Promise.all([
            Bun.file('events.json').write(JSON.stringify(idToEvent)),
            Bun.file('contexts.json').write(JSON.stringify(idToContext)),
        ]);
    }
};

export const loadOptimizedAnalytics = async (appName: string) => {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'bb10', 'analytics');

    const [contextsBuffer, eventsData, csvData] = await Promise.all([
        readFile(path.join(dataPath, 'contexts.json.br')),
        readFile(path.join(dataPath, 'events.json'), 'utf-8'),
        readFile(path.join(dataPath, `${appName}.csv.br`)),
    ]);

    const idToContext: Record<string, string> = decompressJson(contextsBuffer);
    const idToEvent: Record<string, string> = JSON.parse(eventsData);
    const events = parse<ProcessedEvent & { user?: number }>(decompressString(csvData), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
    });

    const analytics: AppAnalyticsEvent[] = [];
    let lastUserId = 0;
    let lastEventId = 0;

    for (const event of events) {
        const data: AppAnalyticsEvent = {
            id: idToEvent[event.id || lastEventId],
            count: event.count,
            user: event.user || lastUserId,
        };

        if (event.contextId && idToContext[event.contextId]) {
            data.context = idToContext[event.contextId];
        } else if (event.context) {
            data.context = event.context;
        }

        if (event.id) {
            lastEventId = event.id;
        }

        if (event.user) {
            lastUserId = event.user;
        }

        analytics.push(data);
    }

    return analytics;
};
