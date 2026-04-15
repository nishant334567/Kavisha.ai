import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import { refreshImageUrl } from "@/app/lib/gcs";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

/** GET /api/admin/jobs/applications?brand= — all applications for every job in this brand */
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
      try {
        await connectDB();
        const jobs = await Job.find({ brand }).select("_id title").lean();
        const jobIds = jobs.map((j) => j._id);
        const titleByJobId = new Map(jobs.map((j) => [String(j._id), j.title || "Untitled"]));
        if (jobIds.length === 0) {
          return NextResponse.json({ applications: [] });
        }
        const applications = await JobApplication.find({ jobId: { $in: jobIds } })
          .sort({ createdAt: -1 })
          .lean();

        const rows = await Promise.all(
          applications.map(async (a) => {
            const resumeLink = a.resumeLink ? await refreshImageUrl(a.resumeLink) : "";
            return {
              _id: String(a._id),
              jobId: String(a.jobId),
              jobTitle: titleByJobId.get(String(a.jobId)) || "Job",
              applicantEmail: a.applicantEmail || "",
              applicantName: a.applicantName || "",
              status: a.status || "",
              starred: !!a.starred,
              resumeLink,
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
            };
          })
        );

        return NextResponse.json({ applications: rows });
      } catch (err) {
        console.error("[admin/jobs/applications GET]", err);
        return NextResponse.json(
          { error: "Failed to load applications" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
