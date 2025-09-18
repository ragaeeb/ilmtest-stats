'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { AutoBlockStats } from '@/lib/autoBlock';

const formatNumber = (value: number) => value.toLocaleString();
const formatAverage = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const requestAutoBlockStats = async (): Promise<AutoBlockStats> => {
    const response = await fetch('/api/autoblock');

    if (!response.ok) {
        let message = 'Failed to fetch auto block stats';

        try {
            const errorPayload = (await response.json()) as { error?: string } | undefined;
            if (errorPayload?.error) {
                message = errorPayload.error;
            } else {
                message = `${message} (status ${response.status})`;
            }
        } catch {
            message = `${message} (status ${response.status})`;
        }

        throw new Error(message);
    }

    return (await response.json()) as AutoBlockStats;
};

const StatCard = ({ title, value, description }: { title: string; value: string; description?: string }) => (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft">
        <div className="text-[rgb(var(--muted-foreground))] text-xs uppercase tracking-wide">{title}</div>
        <div className="mt-2 font-semibold text-3xl text-[rgb(var(--card-foreground))]">{value}</div>
        {description && <div className="mt-1 text-[rgb(var(--muted-foreground))] text-sm">{description}</div>}
    </div>
);

const SectionCard = ({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) => (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft">
        <div className="mb-4 space-y-1">
            <h2 className="font-semibold text-2xl text-[rgb(var(--card-foreground))]">{title}</h2>
            {description && <p className="text-[rgb(var(--muted-foreground))] text-sm">{description}</p>}
        </div>
        {children}
    </section>
);

const Table = <T extends { [key: string]: ReactNode }>({
    columns,
    data,
    emptyLabel,
    getRowKey,
}: {
    columns: Array<{ key: string; header: string; align?: 'left' | 'right' }>;
    data: T[];
    emptyLabel: string;
    getRowKey: (row: T, index: number) => string;
}) => {
    if (data.length === 0) {
        return <div className="text-center text-[rgb(var(--muted-foreground))] text-sm">{emptyLabel}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[rgb(var(--border))]">
                <thead>
                    <tr className="bg-[rgb(var(--muted))]">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`px-4 py-3 font-medium text-[rgb(var(--muted-foreground))] text-xs uppercase tracking-wide ${
                                    column.align === 'right' ? 'text-right' : 'text-left'
                                }`}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                    {data.map((row, idx) => (
                        <tr key={getRowKey(row, idx)} className="hover:bg-[rgba(var(--muted),0.35)]">
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`px-4 py-3 text-sm ${
                                        column.align === 'right' ? 'text-right' : 'text-left'
                                    } text-[rgb(var(--card-foreground))]`}
                                >
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function AutoBlockPage() {
    const [data, setData] = useState<AutoBlockStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchData = async () => {
            const result = await requestAutoBlockStats()
                .then((stats) => ({ stats }))
                .catch((err: unknown) => ({ error: err instanceof Error ? err.message : 'Unexpected error occurred' }));

            if (!isMounted) {
                return;
            }

            if ('stats' in result) {
                setData(result.stats);
            } else {
                setError(result.error);
            }

            setLoading(false);
        };

        void fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    const summaryCards = useMemo(() => {
        if (!data) {
            return [];
        }
        return [
            {
                title: 'Total Reports',
                value: formatNumber(data.summary.totalReports),
                description: `${formatNumber(data.summary.totalReportedAddresses)} addresses · ${formatNumber(
                    data.summary.totalReportedKeywords,
                )} keywords`,
            },
            {
                title: 'Blocked Messages',
                value: formatNumber(data.summary.totalBlocks),
                description: `${formatNumber(data.summary.totalBlocksFromAddresses)} from addresses · ${formatNumber(
                    data.summary.totalBlocksFromKeywords,
                )} from keywords`,
            },
            {
                title: 'Active Reporters',
                value: formatNumber(data.summary.uniqueUsers),
                description: `${formatNumber(data.summary.uniqueAddresses)} addresses & ${formatNumber(
                    data.summary.uniqueKeywords,
                )} keywords tracked`,
            },
            {
                title: 'Zero Block Reports',
                value: formatNumber(data.summary.zeroBlockReports),
                description: 'Reports that have not yet triggered an automatic block',
            },
        ];
    }, [data]);

    const topAddressRows = useMemo(() => {
        if (!data) {
            return [];
        }
        return data.topAddresses.map((item) => ({
            key: item.address.toLowerCase(),
            address: <span className="font-medium">{item.address}</span>,
            reports: formatNumber(item.reports),
            reporters: formatNumber(item.reporters),
            blocks: formatNumber(item.blocks),
            average: formatAverage(item.averageBlocksPerReport),
        }));
    }, [data]);

    const topKeywordRows = useMemo(() => {
        if (!data) {
            return [];
        }
        return data.topKeywords.map((item) => ({
            key: item.term.toLowerCase(),
            term: <span className="break-words font-medium">{item.term}</span>,
            reports: formatNumber(item.reports),
            reporters: formatNumber(item.reporters),
            blocks: formatNumber(item.blocks),
            average: formatAverage(item.averageBlocksPerReport),
        }));
    }, [data]);

    const topReporterRows = useMemo(() => {
        if (!data) {
            return [];
        }
        return data.topReporters.map((item) => ({
            key: item.user_id,
            user: <span className="break-all font-medium">{item.user_id}</span>,
            totalReports: formatNumber(item.totalReports),
            addressReports: formatNumber(item.reportedAddresses),
            keywordReports: formatNumber(item.reportedKeywords),
            zeroBlocks: formatNumber(item.zeroBlockReports),
            totalBlocks: formatNumber(item.totalBlocks),
        }));
    }, [data]);

    const addressReportRows = useMemo(() => {
        if (!data) {
            return [];
        }
        return data.addresses.slice(0, 25).map((item) => ({
            key: `${item.user_id}::${item.address}`,
            address: <span className="font-medium">{item.address}</span>,
            reporter: <span className="break-all text-[rgb(var(--muted-foreground))]">{item.user_id}</span>,
            blocks: formatNumber(item.count),
        }));
    }, [data]);

    const keywordReportRows = useMemo(() => {
        if (!data) {
            return [];
        }
        return data.keywords.slice(0, 25).map((item, index) => ({
            key: `${item.user_id}::${item.term}::${index}`,
            keyword: <span className="break-words font-medium">{item.term}</span>,
            reporter: <span className="break-all text-[rgb(var(--muted-foreground))]">{item.user_id}</span>,
            blocks: formatNumber(item.count),
        }));
    }, [data]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))]">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[rgb(var(--primary))] border-t-transparent"></div>
                    <p className="mt-4 text-[rgb(var(--muted-foreground))]">Loading auto block statistics…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))]">
                <div className="space-y-3 text-center">
                    <div className="text-5xl">⚠️</div>
                    <h2 className="font-semibold text-2xl text-[rgb(var(--foreground))]">Unable to load stats</h2>
                    <p className="text-[rgb(var(--muted-foreground))]">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] p-6">
            <div className="mx-auto max-w-7xl space-y-8">
                <header className="space-y-2">
                    <h1 className="font-semibold text-4xl text-[rgb(var(--foreground))]">Auto Block Reports</h1>
                    <p className="text-[rgb(var(--muted-foreground))] text-base">
                        Insights into spam addresses and keywords submitted by users and how often they triggered
                        automatic blocking.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <StatCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            description={card.description}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SectionCard
                        title="Top Blocked Addresses"
                        description="Most frequently blocked sender addresses reported by the community"
                    >
                        <Table
                            columns={[
                                { key: 'address', header: 'Address' },
                                { key: 'reports', header: 'Reports', align: 'right' },
                                { key: 'reporters', header: 'Unique Reporters', align: 'right' },
                                { key: 'blocks', header: 'Blocks Triggered', align: 'right' },
                                { key: 'average', header: 'Avg Blocks / Report', align: 'right' },
                            ]}
                            data={topAddressRows}
                            emptyLabel="No address reports available"
                            getRowKey={(row) => String(row.key)}
                        />
                    </SectionCard>

                    <SectionCard
                        title="Top Blocked Keywords"
                        description="Keywords that most often caused automatic filtering"
                    >
                        <Table
                            columns={[
                                { key: 'term', header: 'Keyword / Phrase' },
                                { key: 'reports', header: 'Reports', align: 'right' },
                                { key: 'reporters', header: 'Unique Reporters', align: 'right' },
                                { key: 'blocks', header: 'Blocks Triggered', align: 'right' },
                                { key: 'average', header: 'Avg Blocks / Report', align: 'right' },
                            ]}
                            data={topKeywordRows}
                            emptyLabel="No keyword reports available"
                            getRowKey={(row) => String(row.key)}
                        />
                    </SectionCard>
                </div>

                <SectionCard
                    title="Most Active Reporters"
                    description="Users who submitted the most reports and triggered the most automatic blocks"
                >
                    <Table
                        columns={[
                            { key: 'user', header: 'User' },
                            { key: 'totalReports', header: 'Total Reports', align: 'right' },
                            { key: 'addressReports', header: 'Addresses', align: 'right' },
                            { key: 'keywordReports', header: 'Keywords', align: 'right' },
                            { key: 'zeroBlocks', header: 'Zero-Block Reports', align: 'right' },
                            { key: 'totalBlocks', header: 'Blocks Triggered', align: 'right' },
                        ]}
                        data={topReporterRows}
                        emptyLabel="No reporter data found"
                        getRowKey={(row) => String(row.key)}
                    />
                </SectionCard>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SectionCard
                        title="Recent Address Reports"
                        description="Latest reported sender addresses and how often they were blocked"
                    >
                        <Table
                            columns={[
                                { key: 'address', header: 'Address' },
                                { key: 'reporter', header: 'Reporter' },
                                { key: 'blocks', header: 'Blocks Triggered', align: 'right' },
                            ]}
                            data={addressReportRows}
                            emptyLabel="No reported addresses yet"
                            getRowKey={(row) => String(row.key)}
                        />
                    </SectionCard>

                    <SectionCard
                        title="Recent Keyword Reports"
                        description="Latest spam keywords submitted by the community"
                    >
                        <Table
                            columns={[
                                { key: 'keyword', header: 'Keyword / Phrase' },
                                { key: 'reporter', header: 'Reporter' },
                                { key: 'blocks', header: 'Blocks Triggered', align: 'right' },
                            ]}
                            data={keywordReportRows}
                            emptyLabel="No keyword reports yet"
                            getRowKey={(row) => String(row.key)}
                        />
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
