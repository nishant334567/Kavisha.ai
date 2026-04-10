/**
 * Blog ingest pipeline — scrape + ingest.
 * Used by scripts/blog-feed-sync-and-ingest.js
 */
const { scrapeEntrackrArticle } = require("./entrackr-article-scrape.js");
const { connectDB } = require("../app/lib/db.js");
const BlogIngestUrl = require("../app/models/BlogIngestUrl.js");
const { runBlogIngestTraining } = require("./blog-ingest-training.js");

/**
 * @param {string} url
 * @returns {Promise<Record<string, unknown>>} payload passed to ingest()
 */
async function scrape(url) {
  const out = await scrapeEntrackrArticle(url);

  await connectDB();
  const res = await BlogIngestUrl.updateOne(
    { url },
    {
      $set: {
        scraped: true,
        scrapedAt: new Date(),
        title: out.title || "",
        text: out.text || "",
        description: (out.text || "").slice(0, 500),
        sourceUrl: out.url || url,
        imageUrls: out.imageUrl ? [out.imageUrl] : [],
        author: out.author || "",
        publishedDate: out.date || "",
        lastError: "",
      },
    }
  );
  if (res.matchedCount === 0) {
    ;
  }

  return out;
}

/**
 * @param {Record<string, unknown>} scraped — return value from scrape()
 */
async function ingest(scraped) {
  const url = scraped.url;
  ;
  try {
    await runBlogIngestTraining(scraped);
  } catch (e) {
    if (url) {
      await connectDB();
      await BlogIngestUrl.updateOne(
        { url },
        { $set: { lastError: (e && e.message) || String(e) } }
      );
    }
    throw e;
  }
  ;
}

module.exports = { scrape, ingest };
