"use client";
import { useEffect, useMemo, useState } from "react";
import TopCard from "@/app/admin/components/analytics/TopCard";
import EngagementTrendChartCard from "@/app/admin/components/analytics/EngagementTrendChartCard";
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
    const [applied, setApplied] = useState(defaultRange);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [totals, setTotals] = useState({
        userCount: 0,
        chatCount: 0,
        messageCount: 0,
    });
    const [daily, setDaily] = useState([]);

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
        } catch (e) {
            setError(e?.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchAnalytics(defaultRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brand]);

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
            <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm font-semibold text-foreground">Analytics</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex items-end gap-2">
                        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                            From
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-9 rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground shadow-sm outline-none focus:border-border focus:ring-2 focus:ring-ring/30"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                            To
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-9 rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground shadow-sm outline-none focus:border-border focus:ring-2 focus:ring-ring/30"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const range = { from, to };
                            setApplied(range);
                            void fetchAnalytics(range);
                        }}
                        disabled={loading}
                        className="h-9 rounded-lg bg-foreground px-4 text-xs font-semibold text-background shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Applying…" : "Apply"}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TopCard title="People talked to your Avataar" value={totals.userCount} />
                <TopCard title="Chats" value={totals.chatCount} />
                <TopCard title="Messages" value={totals.messageCount} />
            </div>

            <div className="mt-8">
                <EngagementTrendChartCard data={daily} />
            </div>
        </div>
    );
}