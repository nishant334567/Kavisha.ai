import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

BlogIngestUrlSchema.index({ brand: 1, status: 1 });
BlogIngestUrlSchema.index({ source: 1, status: 1 });

const BlogIngestUrl =
  mongoose.models.BlogIngestUrl ||
  mongoose.model("BlogIngestUrl", BlogIngestUrlSchema);

export default BlogIngestUrl;
export { STATUS as BLOG_INGEST_STATUS };
