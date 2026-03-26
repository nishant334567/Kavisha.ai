import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import { refreshImageUrl } from "@/app/lib/gcs";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }
    await connectDB();
    const query = { _id: id };
    if (brand) query.brand = brand;
    const job = await Job.findOne(query).lean();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const jdLink = job.jdLink ? await refreshImageUrl(job.jdLink) : "";
    return NextResponse.json({ job: { ...job, jdLink } });
  } catch (e) {
    console.error("jobs [id] GET:", e);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
