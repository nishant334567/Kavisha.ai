import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import WebsiteScrapeJob from "@/app/models/WebsiteScrapeJob";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";
import {
  createDiscoverSession,
  serializeJob,
  setJobPagesIncluded,
  startTrainingJob,
  stopTrainingJob,
} from "@/app/lib/websiteScrapeJobRunner";
import {
  isWebsiteImportMode,
  normalizeWebsiteImportMode,
} from "@/app/lib/websiteImportMode";

export const maxDuration = 60;

function validatePages(pages) {
  const validatedPages = [];
  for (const item of pages) {
    const parsed = parseAndValidateScrapeUrl(item.url);
    if (!parsed.ok) {
      return { error: parsed.error || "Invalid page URL" };
    }
    validatedPages.push({
      url: parsed.href,
      label: typeof item.label === "string" ? item.label : "",
      category: typeof item.category === "string" ? item.category : "",
      status: "pending",
      error: "",
      docid: "",
    });
  }

  const seen = new Set();
  const uniquePages = [];
  for (const p of validatedPages) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    uniquePages.push(p);
  }

  return { pages: uniquePages };
}

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("brand");
        const jobId = searchParams.get("jobId");
        const active = searchParams.get("active") === "true";
        const mode = searchParams.get("mode");

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
          const query = {
            brand,
            status: {
              $in: ["discovered", "pending", "running", "stopped", "completed"],
            },
          };
          const queryMode = normalizeWebsiteImportMode(mode);
          if (isWebsiteImportMode(queryMode)) {
            query.mode = queryMode;
          }
          const job = await WebsiteScrapeJob.findOne(query)
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
        const {
          brand,
          pages,
          seedUrl,
          folderId,
          folderName,
          mode,
          discoverOnly,
          startTraining,
          jobId,
        } = body;

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

        const importMode = normalizeWebsiteImportMode(mode);

        if (startTraining && jobId) {
          try {
            const job = await startTrainingJob(jobId);
            return NextResponse.json({ success: true, job });
          } catch (e) {
            return NextResponse.json(
              { error: e?.message || "Failed to start training" },
              { status: 400 }
            );
          }
        }

        if (!Array.isArray(pages) || pages.length === 0) {
          return NextResponse.json(
            { error: "Select at least one page" },
            { status: 400 }
          );
        }

        const validated = validatePages(pages);
        if (validated.error) {
          return NextResponse.json({ error: validated.error }, { status: 400 });
        }

        if (discoverOnly) {
          const job = await createDiscoverSession({
            brand,
            mode: importMode,
            pages: validated.pages,
            seedUrl: typeof seedUrl === "string" ? seedUrl : "",
            folderId: typeof folderId === "string" ? folderId : "",
            folderName: typeof folderName === "string" ? folderName : "",
            createdBy: decodedToken.email || "",
          });
          return NextResponse.json({ success: true, job });
        }

        return NextResponse.json(
          {
            error:
              "Invalid request. Use discoverOnly to save links or startTraining with jobId.",
          },
          { status: 400 }
        );
      } catch (error) {
        console.error("[admin/website-scrape-jobs POST]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to save session" },
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
        const { brand, jobId, urls, url, included, cancel, stopTraining } = body;

        if (!brand || !jobId) {
          return NextResponse.json(
            { error: "Brand and jobId are required" },
            { status: 400 }
          );
        }

        const wantsStop = cancel === true || stopTraining === true;

        if (!wantsStop && typeof included !== "boolean") {
          return NextResponse.json(
            { error: "included (boolean) is required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (wantsStop) {
          const job = await stopTrainingJob(jobId);
          return NextResponse.json({ success: true, job });
        }

        const targetUrls = Array.isArray(urls) ? urls : url ? [url] : [];
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
          { error: error?.message || "Failed to reset session" },
          { status: 500 }
        );
      }
    },
  });
}
