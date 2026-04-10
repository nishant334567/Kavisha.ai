/**
 * RSS sync → BlogIngestUrl upsert → scrape + ingest.
 * Used by scripts/blog-feed-sync-and-ingest.js and admin cron.
 */
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const BlogIngestUrl = require("../models/BlogIngestUrl");
const { scrape, ingest } = require("../../scripts/blog-ingest-handlers.js");

const DEFAULT_FEED_URL = "https://entrackr.com/rss";
const USER_AGENT = "KavishaBlogIngest/1.0 (+https://kavisha.ai)";
const UPSERT_BATCH = 250;
const SCRAPE_PREVIEW_CHARS = 2000;

function stripCdata(s) {
  return String(s || "")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .trim();
}

function articleUrlFromRssItem(block) {
  const linkRe = /<link\b[^>]*>([\s\S]*?)<\/link>/gi;
  let m;
  while ((m = linkRe.exec(block)) !== null) {
    const u = stripCdata(m[1]);
    if (/^https?:\/\//i.test(u)) return u;
  }
  const guidM = /<guid\b[^>]*>([\s\S]*?)<\/guid>/i.exec(block);
  if (guidM) {
    const u = stripCdata(guidM[1]);
    if (/^https?:\/\//i.test(u)) return u;
  }
  return "";
}

function extractUrlsFromRss(xml) {
  const seen = new Set();
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const u = articleUrlFromRssItem(m[1]);
    if (u && /^https?:\/\//i.test(u)) seen.add(u.trim());
  }
  return [...seen];
}

function hostnamePatternFromEnv() {
  const raw = (process.env.BLOG_ALLOWED_HOST_PATTERN || "").trim();
  if (raw) {
    try {
      return new RegExp(raw, "i");
    } catch {
      console.warn("Invalid BLOG_ALLOWED_HOST_PATTERN, using entrackr default.");
    }
  }
  return /(^|\.)entrackr\.com$/i;
}

function isArticleUrl(u, hostRe) {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (!hostRe.test(parsed.hostname)) return false;
    if (/\.xml(\?|$)/i.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.text();
}

async function upsertNewUrls(urls, source) {
  if (urls.length === 0) return 0;
  let total = 0;
  for (let j = 0; j < urls.length; j += UPSERT_BATCH) {
    const chunk = urls.slice(j, j + UPSERT_BATCH);
    const ops = chunk.map((url) => ({
      updateOne: {
        filter: { url },
        update: {
          $setOnInsert: {
            url,
            scraped: false,
            ingested: false,
            source,
            sitemapDate: "",
            status: "pending",
          },
        },
        upsert: true,
      },
    }));
    const result = await BlogIngestUrl.bulkWrite(ops, { ordered: false });
    total += result.upsertedCount || 0;
  }
  return total;
}

function logScrapeOutput(scraped) {
  const text = scraped.text || "";
  const preview =
    text.length > SCRAPE_PREVIEW_CHARS
      ? `${text.slice(0, SCRAPE_PREVIEW_CHARS)}\n… (${text.length} chars total)`
      : text;
  const line = "─".repeat(72);
  console.log(`\n${line}`);
  console.log("SCRAPE OUTPUT");
  console.log(line);
  console.log("url:    ", scraped.url);
  console.log("title:  ", scraped.title || "(empty)");
  console.log("author: ", scraped.author || "(empty)");
  console.log("date:   ", scraped.date || "(empty)");
  console.log("image:  ", scraped.imageUrl || "(none)");
  console.log("text:   ", `${text.length} character(s)`);
  console.log(line);
  console.log(preview || "(no body text)");
  console.log(`${line}\n`);
}

async function runIngestPending() {
  const rows = await BlogIngestUrl.find({ ingested: { $ne: true } })
    .select("url")
    .lean();
  const urls = rows.map((r) => r.url).filter(Boolean);
  console.log(
    `Scrape + ingest: ${urls.length} URL(s) where ingested is not yet true`
  );

  let ok = 0;
  let fail = 0;
  for (const url of urls) {
    try {
      const scraped = await scrape(url);
      logScrapeOutput(scraped);
      await ingest(scraped);
      console.log("[ok — scraped + ingested]", url);
      ok += 1;
    } catch (e) {
      console.error("[fail]", url, e?.message || e);
      fail += 1;
    }
  }
  return { ok, fail };
}

/**
 * @param {{ disconnectAfter?: boolean }} [opts]
 * @returns {Promise<{ success: true, feedUrl: string, articleUrlsCount: number, upserted: number, ingestOk: number, ingestFail: number }>}
 */
async function runBlogFeedSyncAndIngest(opts = {}) {
  const { disconnectAfter = false } = opts;

  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("Missing MONGODB_URI");
  }

  const feedUrl = (process.env.BLOG_FEED_URL || DEFAULT_FEED_URL).trim();
  const source = (process.env.BLOG_INGEST_SOURCE || "entrackr").trim();
  const hostRe = hostnamePatternFromEnv();

  await connectDB();
  try {
    console.log(`RSS: ${feedUrl}`);
    const xml = await fetchFeed(feedUrl);
    const raw = extractUrlsFromRss(xml);
    const urls = raw.filter((u) => isArticleUrl(u, hostRe));
    console.log(`Found ${urls.length} article URL(s) in feed`);

    const upserted = await upsertNewUrls(urls, source);
    console.log(`Inserted new rows: ${upserted}`);

    const { ok: ingestOk, fail: ingestFail } = await runIngestPending();
    console.log(`Done. OK: ${ingestOk}, failed: ${ingestFail}`);

    return {
      success: true,
      feedUrl,
      articleUrlsCount: urls.length,
      upserted,
      ingestOk,
      ingestFail,
    };
  } finally {
    if (disconnectAfter) {
      await mongoose.disconnect();
    }
  }
}

module.exports = { runBlogFeedSyncAndIngest };
