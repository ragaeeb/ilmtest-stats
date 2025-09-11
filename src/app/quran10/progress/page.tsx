'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';

type ProcessedProgress = {
    timestamp: number;
    user: number;
    surah: number;
    verse: number;
    progressValue: number;
    percentage: number;
};

type UserSummary = {
    userId: number;
    totalEntries: number;
    firstTimestamp: number;
    lastTimestamp: number;
    maxProgress: number;
    maxPercentage: number;
    latestSurah: number;
    latestVerse: number;
};

type QuranProgressData = {
    data: ProcessedProgress[];
    uniqueUsers: number[];
    userSummaries: UserSummary[];
    totalEntries: number;
    totalVerses: number;
    quranStructure: number[];
};

const COLORS = [
    '#20A9E3',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#EC4899',
    '#14B8A6',
];

const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString();
};

const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    if (days > 0) return `${days} days`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return `${hours} hours`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes`;
};

const StatsCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-2 font-medium text-muted-foreground text-sm">{title}</h3>
        <div className="font-bold text-2xl text-foreground">{value}</div>
        {subtitle && <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>}
    </div>
);

const UserSelector = ({
    users,
    selectedUser,
    onUserChange,
    userSummaries,
}: {
    users: number[];
    selectedUser: number | null;
    onUserChange: (userId: number | null) => void;
    userSummaries: UserSummary[];
}) => (
    <div className="mb-6">
        <span className="mb-2 block font-medium text-foreground text-sm">Focus on User</span>
        <select
            value={selectedUser || ''}
            onChange={(e) => onUserChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full rounded-md border border-border bg-card p-2 text-foreground"
        >
            <option value="">All Users</option>
            {users.map((userId) => {
                const summary = userSummaries.find((s) => s.userId === userId);
                return (
                    <option key={userId} value={userId}>
                        User {userId} {summary && `(${summary.maxPercentage.toFixed(1)}% complete)`}
                    </option>
                );
            })}
        </select>
    </div>
);

const ProgressChart = ({
    data,
    selectedUser,
    totalVerses,
}: {
    data: ProcessedProgress[];
    selectedUser: number | null;
    totalVerses: number;
}) => {
    const chartData = useMemo(() => {
        if (!data.length) return [];

        // Group data by user and timestamp
        const userProgressMap = new Map<number, ProcessedProgress[]>();

        data.forEach((entry) => {
            if (!userProgressMap.has(entry.user)) {
                userProgressMap.set(entry.user, []);
            }
            userProgressMap.get(entry.user)!.push(entry);
        });

        // Sort each user's progress by timestamp
        userProgressMap.forEach((progress) => {
            progress.sort((a, b) => a.timestamp - b.timestamp);
        });

        // Create time-series data
        const allTimestamps = [...new Set(data.map((d) => d.timestamp))].sort();

        return allTimestamps.map((timestamp) => {
            const dataPoint: any = { timestamp, date: formatTimestamp(timestamp) };

            userProgressMap.forEach((progress, userId) => {
                if (selectedUser && selectedUser !== userId) return;

                // Find the latest progress for this user at or before this timestamp
                let latestProgress = 0;
                for (const entry of progress) {
                    if (entry.timestamp <= timestamp) {
                        latestProgress = Math.max(latestProgress, entry.progressValue);
                    }
                }
                dataPoint[`user_${userId}`] = latestProgress;
            });

            return dataPoint;
        });
    }, [data, selectedUser]);

    const users = useMemo(() => {
        const userSet = new Set(data.map((d) => d.user));
        return Array.from(userSet).sort();
    }, [data]);

    const visibleUsers = selectedUser ? [selectedUser] : users.slice(0, 10); // Limit to 10 users for performance

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold text-foreground text-lg">
                {selectedUser ? `User ${selectedUser} Progress` : 'All Users Progress'}
            </h3>
            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                        <XAxis
                            dataKey="date"
                            stroke="rgb(var(--foreground))"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis stroke="rgb(var(--foreground))" domain={[0, totalVerses]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgb(var(--card))',
                                border: '1px solid rgb(var(--border))',
                                color: 'rgb(var(--foreground))',
                            }}
                            formatter={(value: number, name: string) => [
                                `${value} verses (${((value / totalVerses) * 100).toFixed(1)}%)`,
                                name.replace('user_', 'User '),
                            ]}
                        />
                        {visibleUsers.map((userId, index) => (
                            <Line
                                key={userId}
                                type="monotone"
                                dataKey={`user_${userId}`}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                            />
                        ))}
                        <ReferenceLine
                            y={totalVerses}
                            stroke="rgb(var(--primary))"
                            strokeDasharray="5 5"
                            label={{ value: 'Complete', position: 'insideTopRight' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const UserSummaryTable = ({ userSummaries }: { userSummaries: UserSummary[] }) => (
    <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground text-lg">User Progress Summary</h3>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-border border-b">
                        <th className="p-2 text-left text-foreground">User</th>
                        <th className="p-2 text-left text-foreground">Progress</th>
                        <th className="p-2 text-left text-foreground">Latest Position</th>
                        <th className="p-2 text-left text-foreground">Entries</th>
                        <th className="p-2 text-left text-foreground">Duration</th>
                        <th className="p-2 text-left text-foreground">Last Activity</th>
                    </tr>
                </thead>
                <tbody>
                    {userSummaries.slice(0, 20).map((user) => (
                        <tr key={user.userId} className="border-border border-b">
                            <td className="p-2 text-foreground">User {user.userId}</td>
                            <td className="p-2 text-foreground">
                                <div className="flex items-center space-x-2">
                                    <div className="h-2 w-20 rounded bg-muted">
                                        <div
                                            className="h-2 rounded bg-primary"
                                            style={{ width: `${Math.min(user.maxPercentage, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm">{user.maxPercentage.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="p-2 text-foreground">
                                Surah {user.latestSurah}, Verse {user.latestVerse}
                            </td>
                            <td className="p-2 text-foreground">{user.totalEntries}</td>
                            <td className="p-2 text-foreground">
                                {formatDuration(user.lastTimestamp - user.firstTimestamp)}
                            </td>
                            <td className="p-2 text-foreground">{formatTimestamp(user.lastTimestamp)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const QuranProgressPage = () => {
    const [data, setData] = useState<QuranProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [filters, setFilters] = useState({
        user: '',
        limit: '10000',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (filters.user) queryParams.set('user', filters.user);
            if (filters.limit) queryParams.set('limit', filters.limit);

            const response = await fetch(`/api/quran10/progress?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch progress data');

            const progressData = await response.json();
            setData(progressData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="container-app py-8">
                <div className="flex h-64 items-center justify-center">
                    <div className="text-foreground text-lg">Loading progress data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-app py-8">
                <div className="text-center">
                    <div className="mb-4 text-lg text-red-500">Error loading progress data</div>
                    <div className="text-muted-foreground text-sm">{error}</div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container-app space-y-8 py-8">
            <div className="flex items-center justify-between">
                <h1 className="font-bold text-3xl text-foreground">Quran Reading Progress</h1>
                <Button
                    onClick={fetchData}
                    className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                >
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Progress Entries" value={data.totalEntries.toLocaleString()} />
                <StatsCard title="Active Users" value={data.uniqueUsers.length} />
                <StatsCard title="Total Verses in Quran" value={data.totalVerses.toLocaleString()} />
                <StatsCard
                    title="Top User Progress"
                    value={`${data.userSummaries[0]?.maxPercentage.toFixed(1) || 0}%`}
                    subtitle={`User ${data.userSummaries[0]?.userId || 'N/A'}`}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                    <label htmlFor="user_filter" className="mb-1 block font-medium text-foreground text-sm">
                        Filter by User
                    </label>
                    <input
                        type="text"
                        id="user_filter"
                        value={filters.user}
                        onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                        placeholder="Enter user ID"
                        className="w-full rounded-md border border-border bg-card p-2 text-foreground"
                    />
                </div>
                <div>
                    <label htmlFor="limit" className="mb-1 block font-medium text-foreground text-sm">
                        Limit Results
                    </label>
                    <input
                        id="limit"
                        type="number"
                        value={filters.limit}
                        onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                        placeholder="Limit results"
                        className="w-full rounded-md border border-border bg-card p-2 text-foreground"
                    />
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={fetchData}
                        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
                    >
                        Apply Filters
                    </Button>
                </div>
            </div>

            <UserSelector
                users={data.uniqueUsers}
                selectedUser={selectedUser}
                onUserChange={setSelectedUser}
                userSummaries={data.userSummaries}
            />

            <ProgressChart data={data.data} selectedUser={selectedUser} totalVerses={data.totalVerses} />

            <UserSummaryTable userSummaries={data.userSummaries} />
        </div>
    );
};

export default QuranProgressPage;
