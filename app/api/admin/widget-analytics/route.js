import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import WidgetEvent from "@/app/models/WidgetEvent";

function parseDateRange(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  return { from, to };
}

function openRatePercent(loads, clicks) {
  if (!loads) return 0;
  return Math.round((clicks / loads) * 1000) / 10;
}

async function getWidgetAnalytics(brand, fromDate, toDate) {
  const { from, to } = parseDateRange(fromDate, toDate);

  const dailyAgg = await WidgetEvent.aggregate([
    { $match: { brand, createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          date: { $dateTrunc: { date: "$createdAt", unit: "day" } },
          event: "$event",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const dayMap = new Map();
  for (const row of dailyAgg) {
    const key = row._id.date.toISOString().slice(0, 10);
    const entry = dayMap.get(key) || { loads: 0, clicks: 0 };
    if (row._id.event === "widget_impression") entry.loads = row.count;
    if (row._id.event === "widget_open") entry.clicks = row.count;
    dayMap.set(key, entry);
  }

  const daily = [];
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const row = dayMap.get(key) || { loads: 0, clicks: 0 };
    daily.push({
      date: key,
      loads: row.loads,
      clicks: row.clicks,
      openRate: openRatePercent(row.loads, row.clicks),
    });
  }

  const loads = daily.reduce((sum, r) => sum + r.loads, 0);
  const clicks = daily.reduce((sum, r) => sum + r.clicks, 0);

  return {
    totals: { loads, clicks, openRate: openRatePercent(loads, clicks) },
    daily,
  };
}

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brand = (searchParams.get("brand") || "").trim().toLowerCase();
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");

        if (!brand || !fromDate || !toDate) {
          return NextResponse.json(
            { error: "Brand, fromDate and toDate are required" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        await connectDB();
        const analytics = await getWidgetAnalytics(brand, fromDate, toDate);
        return NextResponse.json(analytics, { status: 200 });
      } catch (error) {
        const msg = String(error?.message || "");
        if (msg.toLowerCase().includes("invalid date")) {
          return NextResponse.json(
            { error: "Invalid fromDate/toDate" },
            { status: 400 }
          );
        }
        console.error("Error fetching widget analytics:", error);
        return NextResponse.json(
          { error: "Failed to fetch widget analytics" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    },
  });
}
