"use client";

import { useMemo, useState } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";


const METRICS = [
    { id: "users", label: "Number of users" },
    { id: "chats", label: "Chats" },
    { id: "messages", label: "Messages" },
];

function formatXAxisTick(v) {
    const raw = String(v || "");
    // If backend returns YYYY-MM-DD, show "May 7"
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00Z`);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
    }
    return raw;
}

export default function EngagementTrendChartCard({ data }) {
    const [activeMetric, setActiveMetric] = useState("users");
    const rows = Array.isArray(data) && data.length > 0 ? data : [];

    const activeMetricLabel = useMemo(() => {
        return METRICS.find((m) => m.id === activeMetric)?.label ?? "Number of users";
    }, [activeMetric]);

    const yTickFormatter = (v) => (typeof v === "number" ? v : Number(v) || 0);

    const tooltipFormatter = (value) => {
        return [value, activeMetricLabel];
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Growth Rate</p>
                <div
                    className="inline-flex items-center rounded-lg border border-border/60 bg-background p-1 text-xs text-muted-foreground"
                    role="tablist"
                    aria-label="Metric"
                >
                    {METRICS.map((m) => {
                        const active = m.id === activeMetric;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setActiveMetric(m.id)}
                                className={
                                    active
                                        ? "rounded-md bg-muted-bg px-2 py-1 text-foreground shadow-sm"
                                        : "rounded-md px-2 py-1 transition hover:bg-muted-bg/60 hover:text-foreground"
                                }
                            >
                                {m.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-3 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatXAxisTick}
                            tickMargin={8}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickLine={{ stroke: "hsl(var(--border))" }}
                        />
                        <YAxis
                            tickMargin={8}
                            tickFormatter={yTickFormatter}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickLine={{ stroke: "hsl(var(--border))" }}
                            width={34}
                        />
                        <Tooltip
                            formatter={tooltipFormatter}
                            contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 12,
                                color: "hsl(var(--foreground))",
                                fontSize: 12,
                            }}
                            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <Line
                            type="monotone"
                            dataKey={activeMetric}
                            stroke="#18A6B8"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}