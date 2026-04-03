import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import BlogIngestUrl from "@/app/models/BlogIngestUrl";

export const maxDuration = 300;

const DEFAULT_INDEX = "https://entrackr.com/webcontent-sitemap.xml";
const UA = "KavishaBlogIngest/1.0 (+https://kavisha.ai)";
const FETCH_MS = 45_000;
const BULK_BATCH = 800;
const CHILD_FETCH_CONCURRENCY = 8;

const DATE_IN_NAME = /sitemap_(\d{4}-\d{2}-\d{2})\.xml/i;

function isEntrackrUrl(stringUrl) {
  try {
    const u = new URL(stringUrl);
    return u.protocol === "https:" && (u.hostname === "entrackr.com" || u.hostname === "www.entrackr.com");
  } catch {
    return false;
  }
}

function extractLocs(xml) {
  const out = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const s = m[1].trim();
    if (s) out.push(s);
  }
  return out;
}

function dateFromChildUrl(childUrl) {
  try {
    const hit = new URL(childUrl).pathname.match(DATE_IN_NAME);
    return hit ? hit[1] : "";
  } catch {
    return "";
  }
}

function childSitemapMatchesYear(childUrl, yearStr) {
  const d = dateFromChildUrl(childUrl);
  if (!d) return false;
  return d.startsWith(`${yearStr}-`);
}

async function fetchXml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/xml, text/xml, */*" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function mapPool(items, concurrency, fn) {
  if (!items.length) return [];
  const n = Math.min(Math.max(1, concurrency), items.length);
  const ret = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) break;
        ret[i] = await fn(items[i], i);
      }
    })
  );
  return ret;
}

/**
 * POST JSON body:
 * - year (required): e.g. 2024 — only child sitemaps sitemap_YYYY-MM-DD.xml for that year
 * - brand (optional): stored on new rows
 * - indexUrl (optional)
 * - source (optional): default "entrackr"
 *
 * Upserts each article URL with $setOnInsert pending. URLs already in DB are unchanged (skipped).
 */
export async function POST(req) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "MONGODB_URI not configured" }, { status: 500 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const yearRaw = body.year;
  const yearNum = parseInt(yearRaw, 10);
  if (!Number.isFinite(yearNum) || yearNum < 1990 || yearNum > 2100) {
    return NextResponse.json({ error: "year is required (e.g. 2024)" }, { status: 400 });
  }
  const yearKey = String(yearNum);

  const indexUrl = (body.indexUrl || DEFAULT_INDEX).toString().trim() || DEFAULT_INDEX;
  if (!isEntrackrUrl(indexUrl)) {
    return NextResponse.json({ error: "indexUrl must be https://entrackr.com/..." }, { status: 400 });
  }

  const brand = (body.brand ?? "").toString().trim();
  const source = (body.source ?? "entrackr").toString().trim() || "entrackr";

  let indexXml;
  try {
    indexXml = await fetchXml(indexUrl);
  } catch (e) {
    return NextResponse.json({ error: `Index fetch failed: ${e.message}` }, { status: 502 });
  }

  const allChildLocs = extractLocs(indexXml).filter(isEntrackrUrl);
  const childLocs = allChildLocs.filter((loc) => childSitemapMatchesYear(loc, yearKey));

  if (childLocs.length === 0) {
    return NextResponse.json({
      ok: true,
      year: yearNum,
      indexUrl,
      message: `No child sitemaps found for year ${yearNum} in the index.`,
      childSitemapsInIndex: allChildLocs.length,
      childSitemapsForYear: 0,
      uniqueArticleUrls: 0,
      newRowsInserted: 0,
      existingUrlsSkipped: 0,
      childSitemapErrors: [],
    });
  }

  const fetchResults = await mapPool(childLocs, CHILD_FETCH_CONCURRENCY, async (child) => {
    const sitemapDate = dateFromChildUrl(child);
    try {
      const xml = await fetchXml(child);
      const locs = [...new Set(extractLocs(xml).filter(isEntrackrUrl))];
      return { ok: true, child, sitemapDate, locs };
    } catch (e) {
      return { ok: false, child, sitemapDate, error: e.message };
    }
  });

  const pairs = [];
  const errors = [];
  for (const r of fetchResults) {
    if (!r.ok) {
      errors.push(`${r.child}: ${r.error}`);
      continue;
    }
    for (const url of r.locs) {
      pairs.push({ url, sitemapDate: r.sitemapDate });
    }
  }

  const rawRows = pairs;
  const byUrl = new Map();
  for (const row of rawRows) {
    if (!byUrl.has(row.url)) byUrl.set(row.url, row);
  }
  const urlRows = [...byUrl.values()];

  await connectDB();

  let inserted = 0;
  let skippedExisting = 0;
  for (let i = 0; i < urlRows.length; i += BULK_BATCH) {
    const batch = urlRows.slice(i, i + BULK_BATCH);
    const ops = batch.map(({ url, sitemapDate }) => ({
      updateOne: {
        filter: { url },
        update: {
          $setOnInsert: {
            url,
            status: "pending",
            source,
            brand,
            sitemapDate: sitemapDate || "",
            lastError: "",
          },
        },
        upsert: true,
      },
    }));
    if (ops.length === 0) continue;
    const res = await BlogIngestUrl.bulkWrite(ops, { ordered: false });
    inserted += res.upsertedCount ?? 0;
    skippedExisting += res.matchedCount ?? 0;
  }

  return NextResponse.json({
    ok: true,
    year: yearNum,
    indexUrl,
    childSitemapsInIndex: allChildLocs.length,
    childSitemapsForYear: childLocs.length,
    articleUrlsCollected: rawRows.length,
    uniqueArticleUrls: urlRows.length,
    newRowsInserted: inserted,
    existingUrlsSkipped: skippedExisting,
    childSitemapErrors: errors,
  });
}
