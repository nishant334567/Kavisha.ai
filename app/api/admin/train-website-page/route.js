import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import WebsiteScrapeJob from "@/app/models/WebsiteScrapeJob";
import {
  processTrainJobPage,
  serializeJob,
} from "@/app/lib/websiteScrapeJobRunner";

export const maxDuration = 120;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, jobId, url } = body;

        if (!brand || !jobId || !url) {
          return NextResponse.json(
            { error: "Brand, jobId, and url are required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const job = await WebsiteScrapeJob.findOne({ jobId, brand }).lean();
        if (!job) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (job.status === "running") {
          return NextResponse.json(
            {
              error:
                "Batch training is running. Stop training or wait before training a single page.",
            },
            { status: 409 }
          );
        }

        const pageIndex = job.pages.findIndex((p) => p.url === url);
        if (pageIndex === -1) {
          return NextResponse.json({ error: "Page not in session" }, { status: 404 });
        }

        if (job.pages[pageIndex].status === "skipped") {
          return NextResponse.json(
            { error: "This page is unchecked and skipped" },
            { status: 400 }
          );
        }

        if (job.status === "discovered" || job.status === "stopped") {
          await WebsiteScrapeJob.updateOne(
            { jobId },
            { $set: { status: "running" }, $unset: { completedAt: 1 } }
          );
        }

        await processTrainJobPage(jobId, pageIndex, { chain: false });

        const updated = await WebsiteScrapeJob.findOne({ jobId }).lean();
        const page = updated?.pages?.[pageIndex];

        return NextResponse.json({
          success: page?.status === "trained",
          job: serializeJob(updated),
          page: page
            ? {
                url: page.url,
                status: page.status,
                error: page.error,
                docid: page.docid || page.payload?.docid,
              }
            : null,
        });
      } catch (error) {
        console.error("[admin/train-website-page]", error);
        return NextResponse.json(
          { error: error?.message || "Training failed" },
          { status: 500 }
        );
      }
    },
  });
}
