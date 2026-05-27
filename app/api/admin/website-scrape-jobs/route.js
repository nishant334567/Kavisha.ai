import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import WebsiteScrapeJob from "@/app/models/WebsiteScrapeJob";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";
import {
  serializeJob,
  setJobPagesIncluded,
  startScrapeJobProcessing,
} from "@/app/lib/websiteScrapeJobRunner";
import {
  MAX_WEBSITE_BATCH_PAGES,
  websiteBatchLimitMessage,
} from "@/app/lib/websiteScrapeLimits";

export const maxDuration = 60;

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("brand");
        const jobId = searchParams.get("jobId");
        const active = searchParams.get("active") === "true";

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();

        if (jobId) {
          const job = await WebsiteScrapeJob.findOne({ jobId, brand }).lean();
          if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
          }
          return NextResponse.json({ job: serializeJob(job) });
        }

        if (active) {
          const job = await WebsiteScrapeJob.findOne({
            brand,
            status: { $in: ["pending", "running", "completed"] },
          })
            .sort({ updatedAt: -1 })
            .lean();
          return NextResponse.json({ job: job ? serializeJob(job) : null });
        }

        return NextResponse.json(
          { error: "Provide jobId or active=true" },
          { status: 400 }
        );
      } catch (error) {
        console.error("[admin/website-scrape-jobs GET]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to load job" },
          { status: 500 }
        );
      }
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, pages, seedUrl, folderId, folderName } = body;

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        if (!Array.isArray(pages) || pages.length === 0) {
          return NextResponse.json(
            { error: "Select at least one page to scrape" },
            { status: 400 }
          );
        }

        if (pages.length > MAX_WEBSITE_BATCH_PAGES) {
          return NextResponse.json(
            { error: websiteBatchLimitMessage("scrape") },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const validatedPages = [];
        for (const item of pages) {
          const parsed = parseAndValidateScrapeUrl(item.url);
          if (!parsed.ok) {
            return NextResponse.json(
              { error: parsed.error || "Invalid page URL" },
              { status: 400 }
            );
          }
          validatedPages.push({
            url: parsed.href,
            label: typeof item.label === "string" ? item.label : "",
            category: typeof item.category === "string" ? item.category : "",
            status: "pending",
            error: "",
          });
        }

        const seen = new Set();
        const uniquePages = [];
        for (const p of validatedPages) {
          if (seen.has(p.url)) continue;
          seen.add(p.url);
          uniquePages.push(p);
        }

        await connectDB();

        const running = await WebsiteScrapeJob.findOne({
          brand,
          status: { $in: ["pending", "running"] },
        }).lean();
        if (running) {
          return NextResponse.json(
            {
              error:
                "A scrape job is already running for this brand. Wait for it to finish or expand the progress bar.",
              job: serializeJob(running),
            },
            { status: 409 }
          );
        }

        const jobId = uuidv4();
        const job = await WebsiteScrapeJob.create({
          jobId,
          brand,
          seedUrl: typeof seedUrl === "string" ? seedUrl : "",
          folderId: typeof folderId === "string" ? folderId : "",
          folderName: typeof folderName === "string" ? folderName : "",
          createdBy: decodedToken.email || "",
          status: "pending",
          pages: uniquePages,
        });

        void startScrapeJobProcessing(jobId);

        return NextResponse.json({
          success: true,
          job: serializeJob(job.toObject ? job.toObject() : job),
        });
      } catch (error) {
        console.error("[admin/website-scrape-jobs POST]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to start scrape job" },
          { status: 500 }
        );
      }
    },
  });
}

export async function PATCH(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, jobId, urls, url, included } = body;

        if (!brand || !jobId) {
          return NextResponse.json(
            { error: "Brand and jobId are required" },
            { status: 400 }
          );
        }

        if (typeof included !== "boolean") {
          return NextResponse.json(
            { error: "included (boolean) is required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const targetUrls = Array.isArray(urls)
          ? urls
          : url
            ? [url]
            : [];
        if (!targetUrls.length) {
          return NextResponse.json(
            { error: "Provide url or urls" },
            { status: 400 }
          );
        }

        await connectDB();
        const job = await setJobPagesIncluded(jobId, targetUrls, included);

        return NextResponse.json({ success: true, job });
      } catch (error) {
        console.error("[admin/website-scrape-jobs PATCH]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to update selection" },
          { status: 500 }
        );
      }
    },
  });
}

export async function DELETE(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("brand");
        const jobId = searchParams.get("jobId");

        if (!brand || !jobId) {
          return NextResponse.json(
            { error: "Brand and jobId are required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        await WebsiteScrapeJob.deleteOne({ jobId, brand });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("[admin/website-scrape-jobs DELETE]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to dismiss job" },
          { status: 500 }
        );
      }
    },
  });
}
