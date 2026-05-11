"use client";
import { useEffect, useMemo, useState } from "react";
import TopCard from "@/app/admin/components/analytics/TopCard";
import EngagementTrendChartCard from "@/app/admin/components/analytics/EngagementTrendChartCard";
import PowerUsersCard from "@/app/admin/components/analytics/PowerUsersCard";
import EngagementInsightsCard from "@/app/admin/components/analytics/EngagementInsightsCard";
import PerformanceMetricsCard from "@/app/admin/components/analytics/PerformanceMetricsCard";
import TopKbDocsCard from "@/app/admin/components/analytics/TopKbDocsCard";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

function isoDateInputValue(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Analytics() {
    const brandContext = useBrandContext();
    if (!brandContext?.subdomain) return null;
    const brand = brandContext.subdomain;

    const defaultRange = useMemo(() => {
        const toD = new Date();
        const fromD = new Date();
        fromD.setDate(fromD.getDate() - 6);
        return { from: isoDateInputValue(fromD), to: isoDateInputValue(toD) };
    }, []);

    const [from, setFrom] = useState(defaultRange.from);
    const [to, setTo] = useState(defaultRange.to);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [totals, setTotals] = useState({
        userCount: 0,
        chatCount: 0,
        messageCount: 0,
    });
    const [daily, setDaily] = useState([]);
    const [performance, setPerformance] = useState({
        answersLiked: 0,
        answersShared: 0,
    });
    const [topKbDocs, setTopKbDocs] = useState([]);
    const [powerUsers, setPowerUsers] = useState([]);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsError, setInsightsError] = useState("");
    const [insights, setInsights] = useState({
        keywords: [],
        topQueries: [],
        meta: {},
    });

    const fetchAnalytics = async ({ from: fromDate, to: toDate }) => {
        setLoading(true);
        setError("");
        try {
            const q = new URLSearchParams({
                brand,
                fromDate,
                toDate,
            });
            const res = await fetch(`/api/admin/analytics?${q.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
            const a = data?.totals || {};
            setTotals({
                userCount: Number(a.userCount) || 0,
                chatCount: Number(a.chatCount) || 0,
                messageCount: Number(a.messageCount) || 0,
            });
            setDaily(Array.isArray(data?.daily) ? data.daily : []);
            const p = data?.performance;
            setPerformance({
                answersLiked: Number(p?.answersLiked) || 0,
                answersShared: Number(p?.answersShared) || 0,
            });
            setTopKbDocs(Array.isArray(data?.topKbDocs) ? data.topKbDocs : []);
            setPowerUsers(Array.isArray(data?.powerUsers) ? data.powerUsers : []);
        } catch (e) {
            setError(e?.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    /** GET `/api/admin/analytics/engagement-insights` — keywords + top queries (LLM). */
    const fetchEngagementInsights = async ({ from: fromDate, to: toDate }) => {
        setInsightsLoading(true);
        setInsightsError("");
        try {
            const q = new URLSearchParams({
                brand,
                fromDate,
                toDate,
            });
            const res = await fetch(
                `/api/admin/analytics/engagement-insights?${q.toString()}`
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    data?.error || `Insights failed (${res.status})`
                );
            }
            setInsights({
                keywords: Array.isArray(data?.keywords) ? data.keywords : [],
                topQueries: Array.isArray(data?.topQueries)
                    ? data.topQueries
                    : [],
                meta: data?.meta && typeof data.meta === "object" ? data.meta : {},
            });
        } catch (e) {
            setInsightsError(e?.message || "Failed to load insights");
            setInsights({ keywords: [], topQueries: [], meta: {} });
        } finally {
            setInsightsLoading(false);
        }
    };

    useEffect(() => {
        void fetchAnalytics(defaultRange);
        void fetchEngagementInsights(defaultRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brand]);

    return (
        <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 sm:px-6 sm:py-10">
            <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm font-semibold text-foreground">Analytics</p>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                    <div className="flex min-w-0 flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                            From
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:border-border focus:ring-2 focus:ring-ring/30 sm:min-w-[9.5rem] sm:flex-none sm:px-3"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                            To
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:border-border focus:ring-2 focus:ring-ring/30 sm:min-w-[9.5rem] sm:flex-none sm:px-3"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const range = { from, to };
                            void fetchAnalytics(range);
                            void fetchEngagementInsights(range);
                        }}
                        disabled={loading || insightsLoading}
                        className="h-9 w-full shrink-0 rounded-lg bg-foreground px-4 text-xs font-semibold text-background shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        {loading || insightsLoading ? "Applying…" : "Apply"}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                <TopCard title="People talked to your Avataar" value={totals.userCount} />
                <TopCard title="Chats" value={totals.chatCount} />
                <TopCard title="Messages" value={totals.messageCount} />
            </div>

            <div className="mt-6 sm:mt-8">
                <EngagementTrendChartCard data={daily} />
            </div>

            {/* Engagement (wider) | power users (narrower) */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-3">
                <div className="min-w-0 md:col-span-2">
                    <EngagementInsightsCard
                        loading={insightsLoading}
                        error={insightsError}
                        keywords={insights.keywords}
                        topQueries={insights.topQueries}
                        meta={insights.meta}
                    />
                </div>
                <div className="min-w-0 md:col-span-1">
                    <PowerUsersCard users={powerUsers} />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
                <PerformanceMetricsCard
                    answersLiked={performance.answersLiked}
                    answersShared={performance.answersShared}
                />
                <TopKbDocsCard docs={topKbDocs} />
            </div>
        </div>
    );
}