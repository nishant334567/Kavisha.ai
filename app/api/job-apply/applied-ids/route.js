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
        return NextResponse.json({ jobIds: [] });
      }
      await connectDB();
      const applications = await JobApplication.find(
        { applicantEmail: email },
        { jobId: 1 }
      )
        .lean();
      const rawIds = [
        ...new Set(
          applications
            .map((a) => (a.jobId != null ? String(a.jobId) : null))
            .filter(Boolean)
        ),
      ];
      if (rawIds.length === 0) {
        return NextResponse.json({ jobIds: [] });
      }
      const published = await Job.find({
        _id: { $in: rawIds },
        published: { $ne: false },
      })
        .select("_id")
        .lean();
      const jobIds = published.map((j) => String(j._id));
      return NextResponse.json({ jobIds });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ jobIds: [] });
    },
  });
}
