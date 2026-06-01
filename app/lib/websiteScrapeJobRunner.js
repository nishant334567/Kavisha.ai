import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/db";
import WebsiteScrapeJob from "@/app/models/WebsiteScrapeJob";
import { scrapeSinglePage } from "@/app/lib/agenticScraper";
import { enqueueCloudTask } from "@/app/lib/cloudTasks";
import {
  prepareContentForTraining,
  resolveDocumentTitle,
  resolveTrainingText,
} from "@/app/lib/websiteScrapeContent";
import { trainDocument } from "@/app/lib/trainDocument";
import { isSubstantiveContent } from "@/app/lib/scrapePageQuality";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";
import {
  friendlyScrapeReason,
  MAX_WEBSITE_BATCH_PAGES,
  websiteBatchLimitMessage,
} from "@/app/lib/websiteScrapeLimits";

const BATCH_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getTasksBaseUrl() {
  const base = String(
    process.env.CLOUD_TASKS_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      process.env.NEXTAUTH_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");
  return base;
}

export function canEnqueueCloudTasks() {
  const baseUrl = getTasksBaseUrl();
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const location =
    process.env.CLOUD_TASKS_LOCATION || process.env.GOOGLE_CLOUD_LOCATION;
  const queue = process.env.CLOUD_TASKS_QUEUE;
  return Boolean(baseUrl && projectId && location && queue);
}

function findNextPendingIndex(pages, afterIndex = -1) {
  if (!Array.isArray(pages)) return -1;
  for (let i = afterIndex + 1; i < pages.length; i++) {
    if (pages[i]?.status === "pending") return i;
  }
  return -1;
}

function countActivePages(pages) {
  return (pages || []).filter((p) => p.status !== "skipped");
}

function isJobStopped(status) {
  return status === "stopped" || status === "failed";
}

async function enqueuePageTask(jobId, pageIndex) {
  const baseUrl = getTasksBaseUrl();
  const tasksSecret = process.env.TASKS_SECRET || "";
  const headers = tasksSecret ? { "x-tasks-secret": tasksSecret } : {};

  await enqueueCloudTask({
    url: `${baseUrl}/api/tasks/scrape-website-job-page`,
    payload: { jobId, pageIndex },
    taskNameSuffix: `web-scrape-${jobId}-${pageIndex}`,
    headers,
  });
}

function scheduleLocalPage(jobId, pageIndex) {
  const waitMs = pageIndex > 0 ? BATCH_DELAY_MS : 0;
  setTimeout(() => {
    void processScrapeJobPage(jobId, pageIndex).catch((err) => {
      console.error(
        "[website-scrape-job] local page failed:",
        err?.message || err
      );
    });
  }, waitMs);
}

export async function dispatchScrapeJobPage(jobId, pageIndex) {
  if (canEnqueueCloudTasks()) {
    try {
      await enqueuePageTask(jobId, pageIndex);
      return;
    } catch (err) {
      console.error(
        "[website-scrape-job] Cloud Tasks enqueue failed, falling back to local:",
        err?.message || err
      );
    }
  }
  scheduleLocalPage(jobId, pageIndex);
}

async function markJobCompleted(jobId) {
  await WebsiteScrapeJob.updateOne(
    { jobId },
    { $set: { status: "completed", completedAt: new Date() } }
  );
}

async function maybeCompleteJobIfDone(jobId) {
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job || job.status !== "running") return;

  const hasPending = job.pages.some((p) => p.status === "pending");
  const hasTraining = job.pages.some(
    (p) => p.status === "training" || p.status === "scraping"
  );
  if (!hasPending && !hasTraining) {
    await markJobCompleted(jobId);
  }
}

async function resumeJobIfNeeded(jobId) {
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) return;

  const first = findNextPendingIndex(job.pages, -1);
  if (first === -1) {
    await maybeCompleteJobIfDone(jobId);
    return;
  }

  if (job.status === "completed") {
    await WebsiteScrapeJob.updateOne(
      { jobId },
      { $set: { status: "running" }, $unset: { completedAt: 1 } }
    );
  }

  const hasScraping = job.pages.some(
    (p) => p.status === "scraping" || p.status === "training"
  );
  if (!hasScraping) {
    await dispatchScrapeJobPage(jobId, first);
  }
}

async function finishOrContinue(job, fromIndex, { chain = true } = {}) {
  if (!chain || isJobStopped(job.status)) {
    await maybeCompleteJobIfDone(job.jobId);
    return;
  }
  const nextIndex = findNextPendingIndex(job.pages, fromIndex);
  if (nextIndex === -1) {
    await maybeCompleteJobIfDone(job.jobId);
    return;
  }
  await dispatchScrapeJobPage(job.jobId, nextIndex);
}

export async function processScrapeJobPage(jobId, pageIndex, options = {}) {
  return processTrainJobPage(jobId, pageIndex, options);
}

export async function processTrainJobPage(jobId, pageIndex, { chain = true } = {}) {
  await connectDB();

  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) return;
  if (isJobStopped(job.status)) return;

  const page = job.pages[pageIndex];
  if (!page) {
    await markJobCompleted(jobId);
    return;
  }

  if (page.status === "skipped" || page.status === "trained") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  if (page.status === "error") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  if (page.status !== "pending" && page.status !== "scraped") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  await WebsiteScrapeJob.updateOne(
    { jobId },
    {
      $set: {
        status: "running",
        [`pages.${pageIndex}.status`]: "training",
        [`pages.${pageIndex}.error`]: "",
      },
    }
  );

  try {
    const parsed = parseAndValidateScrapeUrl(page.url);
    if (!parsed.ok) {
      throw new Error(parsed.error || "Invalid page URL");
    }

    const scraped = await scrapeSinglePage(parsed.href);
    const sourceUrl = scraped.url || parsed.href;
    const title = resolveDocumentTitle({
      label: page.label,
      url: parsed.href,
      pageTitle: scraped.title,
    });
    const content = prepareContentForTraining(scraped.content, {
      sourceUrl,
      seedUrl: job.seedUrl || parsed.href,
    });
    const text = resolveTrainingText(content, {
      prepared: true,
      sourceUrl,
      seedUrl: job.seedUrl || "",
    });

    if (!text) {
      throw new Error("Empty content after preparation");
    }

    const fullTitle = title.trim();
    const titleDb =
      fullTitle.length > 50 ? fullTitle.substring(0, 50) : fullTitle;

    const trainResult = await trainDocument({
      brand: job.brand,
      title: titleDb,
      text,
      description: titleDb,
      sourceUrl,
      embeddingProfile: "bulk",
      ...(job.folderId && { folderId: job.folderId }),
    });

    await WebsiteScrapeJob.updateOne(
      { jobId },
      {
        $set: {
          [`pages.${pageIndex}.status`]: "trained",
          [`pages.${pageIndex}.error`]: "",
          [`pages.${pageIndex}.docid`]: trainResult.docid || "",
          [`pages.${pageIndex}.payload`]: {
            title: titleDb,
            content: text,
            sourceUrl,
            prepared: true,
            substantive: isSubstantiveContent(text),
            pageTitle: scraped.title,
            docid: trainResult.docid || "",
          },
        },
      }
    );
  } catch (e) {
    await WebsiteScrapeJob.updateOne(
      { jobId },
      {
        $set: {
          [`pages.${pageIndex}.status`]: "error",
          [`pages.${pageIndex}.error`]: friendlyScrapeReason(e?.message),
        },
      }
    );
  }

  const updated = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!updated || isJobStopped(updated.status)) return;

  if (!chain) {
    const hasPending = updated.pages.some((p) => p.status === "pending");
    const hasTraining = updated.pages.some(
      (p) => p.status === "training" || p.status === "scraping"
    );
    if (!hasTraining) {
      await WebsiteScrapeJob.updateOne(
        { jobId },
        {
          $set: {
            status: hasPending ? "stopped" : "completed",
            ...(hasPending ? {} : { completedAt: new Date() }),
          },
        }
      );
    }
    return;
  }

  await finishOrContinue(updated, pageIndex, { chain: true });
}

/** @param {string} jobId @param {string[]} urls @param {boolean} included */
export async function setJobPagesIncluded(jobId, urls, included) {
  await connectDB();
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) throw new Error("Job not found");

  const urlSet = new Set(urls.map((u) => String(u).trim()).filter(Boolean));
  const collection = mongoose.connection.collection("websitescrapejobs");

  for (let i = 0; i < job.pages.length; i++) {
    const page = job.pages[i];
    if (!urlSet.has(page.url)) continue;

    if (included && page.status === "skipped") {
      await collection.updateOne(
        { jobId },
        { $set: { [`pages.${i}.status`]: "pending", [`pages.${i}.error`]: "" } }
      );
    } else if (!included && page.status === "pending") {
      await collection.updateOne(
        { jobId },
        { $set: { [`pages.${i}.status`]: "skipped", [`pages.${i}.error`]: "" } }
      );
    }
  }

  if (included) {
    await resumeJobIfNeeded(jobId);
  } else {
    await maybeCompleteJobIfDone(jobId);
  }

  const updated = await WebsiteScrapeJob.findOne({ jobId }).lean();
  return serializeJob(updated);
}

export function serializeJob(job) {
  if (!job) return null;
  const pages = job.pages || [];
  const activePages = countActivePages(pages);
  const doneCount = activePages.filter(
    (p) =>
      p.status === "trained" ||
      p.status === "scraped" ||
      p.status === "error"
  ).length;
  const trainedCount = pages.filter((p) => p.status === "trained").length;
  const scrapedCount = pages.filter((p) => p.status === "scraped").length;
  const errorCount = pages.filter((p) => p.status === "error").length;
  const skippedCount = pages.filter((p) => p.status === "skipped").length;

  return {
    jobId: job.jobId,
    brand: job.brand,
    seedUrl: job.seedUrl,
    mode: job.mode || "generic",
    folderId: job.folderId,
    folderName: job.folderName,
    status: job.status,
    pages,
    doneCount,
    totalCount: activePages.length,
    trainedCount,
    scrapedCount,
    errorCount,
    skippedCount,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt,
    createdAt: job.createdAt,
  };
}

export async function createDiscoverSession({
  brand,
  mode = "generic",
  pages,
  seedUrl,
  folderId,
  folderName,
  createdBy,
}) {
  await connectDB();

  await WebsiteScrapeJob.deleteMany({
    brand,
    mode,
    status: { $in: ["discovered", "stopped", "completed", "failed"] },
  });

  const running = await WebsiteScrapeJob.findOne({
    brand,
    status: { $in: ["pending", "running"] },
  }).lean();
  if (running) {
    throw new Error(
      "Training is already running. Stop it before starting a new link discovery."
    );
  }

  const jobId = uuidv4();

  const job = await WebsiteScrapeJob.create({
    jobId,
    brand,
    mode,
    seedUrl: seedUrl || "",
    folderId: folderId || "",
    folderName: folderName || "",
    createdBy: createdBy || "",
    status: "discovered",
    pages,
  });

  return serializeJob(job.toObject ? job.toObject() : job);
}

export async function startTrainingJob(jobId) {
  await connectDB();
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) throw new Error("Job not found");
  if (job.status === "running" || job.status === "pending") {
    await resumeJobIfNeeded(jobId);
    return serializeJob(await WebsiteScrapeJob.findOne({ jobId }).lean());
  }
  if (job.status !== "discovered" && job.status !== "stopped") {
    throw new Error("This session cannot be started");
  }

  const pendingCount = (job.pages || []).filter(
    (p) => p.status === "pending"
  ).length;
  if (pendingCount > MAX_WEBSITE_BATCH_PAGES) {
    throw new Error(websiteBatchLimitMessage());
  }

  const first = findNextPendingIndex(job.pages, -1);
  if (first === -1) {
    await WebsiteScrapeJob.updateOne(
      { jobId },
      { $set: { status: "completed", completedAt: new Date() } }
    );
    return serializeJob(await WebsiteScrapeJob.findOne({ jobId }).lean());
  }

  await WebsiteScrapeJob.updateOne(
    { jobId },
    { $set: { status: "running" }, $unset: { completedAt: 1 } }
  );
  await dispatchScrapeJobPage(jobId, first);
  return serializeJob(await WebsiteScrapeJob.findOne({ jobId }).lean());
}

export async function stopTrainingJob(jobId) {
  await connectDB();
  await WebsiteScrapeJob.updateOne(
    { jobId },
    { $set: { status: "stopped" } }
  );
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  return serializeJob(job);
}
