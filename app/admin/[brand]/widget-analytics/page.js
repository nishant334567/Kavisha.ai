"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TopCard from "@/app/admin/components/analytics/TopCard";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

const CHART_METRICS = [
  { id: "loads", label: "Load" },
  { id: "clicks", label: "Click" },
  { id: "openRate", label: "Open %" },
];

function isoDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDefaultRange() {
  const toD = new Date();
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 6);
  return { from: isoDateInputValue(fromD), to: isoDateInputValue(toD) };
}

function formatXAxisTick(v) {
  const raw = String(v || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function WidgetTrendChart({ data = [] }) {
  const [metric, setMetric] = useState("loads");
  const isPercent = metric === "openRate";
  const label = CHART_METRICS.find((m) => m.id === metric)?.label ?? "Load";

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm ring-1 ring-black/[0.03] sm:p-4 dark:ring-white/[0.05]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">Trend</p>
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background p-1 text-xs">
          {CHART_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={
                metric === m.id
                  ? "rounded-md bg-muted-bg px-2 py-1 text-foreground shadow-sm"
                  : "rounded-md px-2 py-1 text-muted-foreground hover:bg-muted-bg/60"
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => (isPercent ? `${v}%` : v)}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={40}
            />
            <Tooltip
              formatter={(v) => [isPercent ? `${v}%` : v, label]}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
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

export default function WidgetAnalyticsPage() {
  const { subdomain: brand } = useBrandContext();
  const [from, setFrom] = useState(() => getDefaultRange().from);
  const [to, setTo] = useState(() => getDefaultRange().to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState({ loads: 0, clicks: 0, openRate: 0 });
  const [daily, setDaily] = useState([]);

  const fetchAnalytics = useCallback(
    async ({ from: fromDate, to: toDate }) => {
      setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({ brand, fromDate, toDate });
        const res = await fetch(`/api/admin/widget-analytics?${q}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

        const t = data?.totals || {};
        setTotals({
          loads: Number(t.loads) || 0,
          clicks: Number(t.clicks) || 0,
          openRate: Number(t.openRate) || 0,
        });
        setDaily(Array.isArray(data?.daily) ? data.daily : []);
      } catch (e) {
        setError(e?.message || "Failed to load widget analytics");
      } finally {
        setLoading(false);
      }
    },
    [brand]
  );

  useEffect(() => {
    void fetchAnalytics(getDefaultRange());
  }, [brand, fetchAnalytics]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm font-semibold text-foreground">Widget analytics</p>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring/30 sm:min-w-[9.5rem] sm:flex-none sm:px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring/30 sm:min-w-[9.5rem] sm:flex-none sm:px-3"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void fetchAnalytics({ from, to })}
            disabled={loading}
            className="h-9 w-full rounded-lg bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:opacity-90 disabled:opacity-60 sm:w-auto"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <TopCard title="Load" value={totals.loads} />
        <TopCard title="Click" value={totals.clicks} />
        <TopCard title="Open %" value={`${totals.openRate}%`} />
      </div>

      <div className="mt-6 sm:mt-8">
        <WidgetTrendChart data={daily} />
      </div>
    </div>
  );
}
