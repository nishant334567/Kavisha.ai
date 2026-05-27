import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import WebsiteScrapeJob from "@/app/models/WebsiteScrapeJob";
import { scrapeSinglePage } from "@/app/lib/agenticScraper";
import { enqueueCloudTask } from "@/app/lib/cloudTasks";
import {
  prepareContentForTraining,
  resolveDocumentTitle,
} from "@/app/lib/websiteScrapeContent";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";

const BATCH_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function friendlyScrapeReason(message = "") {
  const m = String(message).toLowerCase();
  if (m.includes("timeout")) return "Page didn't load in time";
  if (m.includes("network") || m.includes("econnreset")) {
    return "Connection problem";
  }
  return message || "Could not load this page";
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
  const hasScraping = job.pages.some((p) => p.status === "scraping");
  if (!hasPending && !hasScraping) {
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

  const hasScraping = job.pages.some((p) => p.status === "scraping");
  if (!hasScraping) {
    await dispatchScrapeJobPage(jobId, first);
  }
}

async function finishOrContinue(job, fromIndex) {
  const nextIndex = findNextPendingIndex(job.pages, fromIndex);
  if (nextIndex === -1) {
    await maybeCompleteJobIfDone(job.jobId);
    return;
  }
  await dispatchScrapeJobPage(job.jobId, nextIndex);
}

export async function processScrapeJobPage(jobId, pageIndex) {
  await connectDB();

  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) return;
  if (job.status === "failed") return;

  const page = job.pages[pageIndex];
  if (!page) {
    await markJobCompleted(jobId);
    return;
  }

  if (page.status === "skipped" || page.status === "scraped") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  if (page.status === "error") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  if (page.status !== "pending") {
    await finishOrContinue(job, pageIndex);
    return;
  }

  await WebsiteScrapeJob.updateOne(
    { jobId },
    {
      $set: {
        status: "running",
        [`pages.${pageIndex}.status`]: "scraping",
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

    await WebsiteScrapeJob.updateOne(
      { jobId },
      {
        $set: {
          [`pages.${pageIndex}.status`]: "scraped",
          [`pages.${pageIndex}.error`]: "",
          [`pages.${pageIndex}.payload`]: {
            title,
            content,
            sourceUrl,
            prepared: true,
            substantive: scraped.substantive === true,
            pageTitle: scraped.title,
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
  if (!updated) return;
  await finishOrContinue(updated, pageIndex);
}

export async function startScrapeJobProcessing(jobId) {
  await connectDB();
  const job = await WebsiteScrapeJob.findOne({ jobId }).lean();
  if (!job) return;

  const first = findNextPendingIndex(job.pages, -1);
  if (first === -1) {
    await WebsiteScrapeJob.updateOne(
      { jobId },
      { $set: { status: "completed", completedAt: new Date() } }
    );
    return;
  }

  await WebsiteScrapeJob.updateOne({ jobId }, { $set: { status: "running" } });
  await dispatchScrapeJobPage(jobId, first);
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
    (p) => p.status === "scraped" || p.status === "error"
  ).length;
  const scrapedCount = pages.filter((p) => p.status === "scraped").length;
  const errorCount = pages.filter((p) => p.status === "error").length;
  const skippedCount = pages.filter((p) => p.status === "skipped").length;

  return {
    jobId: job.jobId,
    brand: job.brand,
    seedUrl: job.seedUrl,
    folderId: job.folderId,
    folderName: job.folderName,
    status: job.status,
    pages,
    doneCount,
    totalCount: activePages.length,
    scrapedCount,
    errorCount,
    skippedCount,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt,
    createdAt: job.createdAt,
  };
}
