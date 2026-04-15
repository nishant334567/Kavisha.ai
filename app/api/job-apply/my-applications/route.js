import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import JobApplication from "@/app/models/JobApplication";
import Job from "@/app/models/Job";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const email = decodedToken.email?.trim()?.toLowerCase();
      if (!email) {
        return NextResponse.json({ applications: [] });
      }
      const { searchParams } = new URL(req.url);
      const brand = searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json(
          { error: "Query parameter brand is required" },
          { status: 400 }
        );
      }
      try {
        await connectDB();
        const apps = await JobApplication.find({ applicantEmail: email })
          .sort({ updatedAt: -1 })
          .lean();

        const jobIds = [
          ...new Set(
            apps
              .map((a) => a.jobId)
              .filter((id) => id != null)
              .map((id) => String(id))
          ),
        ];

        if (jobIds.length === 0) {
          return NextResponse.json({ applications: [] });
        }

        const jobs = await Job.find({
          _id: { $in: jobIds },
          brand,
        })
          .select("title statusCategories")
          .lean();

        const jobMap = new Map(jobs.map((j) => [String(j._id), j]));

        const applications = apps
          .map((a) => {
            const job = jobMap.get(String(a.jobId));
            if (!job) return null;
            return {
              applicationId: String(a._id),
              jobId: String(job._id),
              title: job.title,
              status: a.status || "",
              appliedAt: a.createdAt,
              updatedAt: a.updatedAt,
            };
          })
          .filter(Boolean);

        return NextResponse.json({ applications });
      } catch (err) {
        console.error("[job-apply/my-applications GET]", err);
        return NextResponse.json(
          { error: "Failed to load applications" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}
