import { NextResponse } from "next/server";
import { uploadToBucket, refreshJobJdLink } from "@/app/lib/gcs";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const jobs = await Job.find({ brand }).sort({ createdAt: -1 }).lean();
      const jobIds = jobs.map((j) => j._id);
      const counts =
        jobIds.length > 0
          ? await JobApplication.aggregate([
              { $match: { jobId: { $in: jobIds } } },
              { $group: { _id: "$jobId", count: { $sum: 1 } } },
            ])
          : [];
      const countByJobId = Object.fromEntries(
        counts.map((c) => [String(c._id), c.count])
      );
      const jobsWithCount = jobs.map((j) => ({
        ...j,
        applicationCount: countByJobId[String(j._id)] ?? 0,
      }));
      await Promise.all(jobsWithCount.map((j) => refreshJobJdLink(j)));
      return NextResponse.json({ jobs: jobsWithCount });
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        const brand = formData.get("brand")?.toString()?.trim();
        const title = formData.get("title")?.toString()?.trim() || "Untitled Job";
        const description = formData.get("description")?.toString()?.trim() || "";
        let questions = [];
        try {
          const q = formData.get("questions");
          if (q && typeof q === "string") questions = JSON.parse(q);
          if (!Array.isArray(questions)) questions = [];
        } catch {
          questions = [];
        }

        if (!file || typeof file.arrayBuffer !== "function") {
          return NextResponse.json({ error: "file required" }, { status: 400 });
        }
        if (!brand) {
          return NextResponse.json({ error: "brand required" }, { status: 400 });
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const name = (file.name || "jd").replace(/[^a-zA-Z0-9._-]/g, "_");
        const gcsPath = `jd/${brand}/${uuidv4()}_${name}`;
        const url = await uploadToBucket(gcsPath, file);
        if (!url) {
          return NextResponse.json(
            { error: "Storage not configured" },
            { status: 500 }
          );
        }

        await connectDB();
        const job = await Job.create({
          title,
          description,
          questions,
          jdLink: url,
          brand,
        });

        return NextResponse.json(
          { url, job: { id: job._id, title: job.title, jdLink: job.jdLink } },
          { status: 201 }
        );
      } catch (e) {
        console.error("jobs POST:", e);
        return NextResponse.json(
          { error: e?.message || "Upload failed" },
          { status: 500 }
        );
      }
    },
  });
}
