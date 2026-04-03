import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import BlogIngestUrl from "@/app/models/BlogIngestUrl";

/**
 * GET ?brand=&source=entrackr&status=&limit=100&skip=0
 * Returns recent rows + aggregate counts (optionally filtered by brand / source / status).
 */
export async function GET(req) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand")?.trim() ?? "";
  const source = searchParams.get("source")?.trim() || "entrackr";
  const status = searchParams.get("status")?.trim() ?? "";

  let limit = parseInt(searchParams.get("limit") || "100", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(limit, 2000);

  let skip = parseInt(searchParams.get("skip") || "0", 10);
  if (!Number.isFinite(skip) || skip < 0) skip = 0;
  skip = Math.min(skip, 100_000);

  await connectDB();

  const match = {};
  if (brand) match.brand = brand;
  if (source) match.source = source;
  if (status && ["pending", "scraped", "failed"].includes(status)) match.status = status;

  const [items, total, statusGroups] = await Promise.all([
    BlogIngestUrl.find(match)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("url status source brand sitemapDate createdAt updatedAt")
      .lean(),
    BlogIngestUrl.countDocuments(match),
    BlogIngestUrl.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = { pending: 0, scraped: 0, failed: 0 };
  for (const row of statusGroups) {
    if (row._id && row._id in byStatus) byStatus[row._id] = row.count;
  }

  return NextResponse.json({
    items,
    total,
    byStatus,
    limit,
    skip,
  });
}
