const mongoose = require("mongoose");

const STATUS = ["pending", "scraped", "failed"];

const BlogIngestUrlSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "pending",
      index: true,
    },
    /** e.g. entrackr — for filtering when you add more sources */
    source: {
      type: String,
      default: "entrackr",
      trim: true,
      index: true,
    },
    /** Kavisha brand subdomain; optional until you scrape into TrainingData */
    brand: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    /** From sitemap filename sitemap_YYYY-MM-DD.xml */
    sitemapDate: {
      type: String,
      default: "",
      trim: true,
    },
    lastError: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    author: {
      type: String,
      default: "",
      trim: true,
    },
    /** Raw published date string from the article page */
    publishedDate: {
      type: String,
      default: "",
      trim: true,
    },
    text: {
      type: String,
      default: "",
    },
    sourceUrl: {
      type: String,
      default: "",
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    scrapedAt: {
      type: Date,
    },
    /** Set true after the worker scrape step succeeds */
    scraped: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Set true after the worker ingest step succeeds */
    ingested: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true, collection: "blogingesturls" }
);

BlogIngestUrlSchema.index({ brand: 1, status: 1 });
BlogIngestUrlSchema.index({ source: 1, status: 1 });

const BlogIngestUrl =
  mongoose.models.BlogIngestUrl ||
  mongoose.model("BlogIngestUrl", BlogIngestUrlSchema);

module.exports = BlogIngestUrl;
module.exports.BLOG_INGEST_STATUS = STATUS;
