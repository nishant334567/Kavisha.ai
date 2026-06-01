import mongoose from "mongoose";

const PAGE_STATUS = [
  "pending",
  "training",
  "trained",
  "scraping",
  "scraped",
  "error",
  "skipped",
];

const WebsiteScrapeJobPageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    label: { type: String, default: "" },
    category: { type: String, default: "" },
    status: {
      type: String,
      enum: PAGE_STATUS,
      default: "pending",
    },
    error: { type: String, default: "" },
    docid: { type: String, default: "" },
    payload: {
      title: String,
      content: String,
      sourceUrl: String,
      prepared: Boolean,
      substantive: Boolean,
      pageTitle: String,
      docid: String,
    },
  },
  { _id: false }
);

const JOB_STATUS = [
  "discovered",
  "pending",
  "running",
  "completed",
  "failed",
  "stopped",
];

const WebsiteScrapeJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      index: true,
    },
    seedUrl: { type: String, default: "" },
    mode: {
      type: String,
      enum: ["generic", "blog", "ecommerce"],
      default: "generic",
      index: true,
    },
    folderId: { type: String, default: "" },
    folderName: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    status: {
      type: String,
      enum: JOB_STATUS,
      default: "pending",
      index: true,
    },
    pages: {
      type: [WebsiteScrapeJobPageSchema],
      default: [],
    },
    completedAt: { type: Date },
  },
  { timestamps: true, collection: "websitescrapejobs" }
);

WebsiteScrapeJobSchema.index({ brand: 1, mode: 1, updatedAt: -1 });

// Hot-reload in dev can cache an older schema without newer page statuses.
if (mongoose.models.WebsiteScrapeJob) {
  delete mongoose.models.WebsiteScrapeJob;
}

const WebsiteScrapeJob = mongoose.model("WebsiteScrapeJob", WebsiteScrapeJobSchema);

export default WebsiteScrapeJob;
export { PAGE_STATUS, JOB_STATUS };
