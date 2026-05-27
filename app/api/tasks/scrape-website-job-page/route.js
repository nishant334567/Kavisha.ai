import { NextResponse } from "next/server";
import { processScrapeJobPage } from "@/app/lib/websiteScrapeJobRunner";

export const maxDuration = 120;

/** @returns {null | { error: string, status: number }} */
function requireTasksSecret(request) {
  if (process.env.NODE_ENV === "production" && !process.env.TASKS_SECRET) {
    return { error: "TASKS_SECRET not configured", status: 503 };
  }
  const secret = process.env.TASKS_SECRET;
  if (!secret) return null;
  const got = request.headers.get("x-tasks-secret");
  if (got !== secret) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

export async function POST(request) {
  try {
    const authErr = requireTasksSecret(request);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId } = body;
    const pageIndex = Number(body.pageIndex);

    if (!jobId || !Number.isInteger(pageIndex) || pageIndex < 0) {
      return NextResponse.json(
        { error: "Missing jobId or pageIndex" },
        { status: 400 }
      );
    }

    await processScrapeJobPage(jobId, pageIndex);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[tasks/scrape-website-job-page]", error);
    return NextResponse.json(
      { error: error?.message || "Scrape task failed" },
      { status: 500 }
    );
  }
}
