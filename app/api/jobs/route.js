import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import { refreshImageUrl } from "@/app/lib/gcs";

export async function GET(req) {
  try {
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!brand) {
      return NextResponse.json({ error: "brand required" }, { status: 400 });
    }
    await connectDB();
    const jobs = await Job.find({ brand }).sort({ createdAt: -1 }).lean();
    const jobsWithFreshJd = await Promise.all(
      jobs.map(async (j) => ({
        ...j,
        jdLink: j.jdLink ? await refreshImageUrl(j.jdLink) : "",
      }))
    );
    return NextResponse.json({ jobs: jobsWithFreshJd });
  } catch (e) {
    console.error("jobs GET:", e);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
