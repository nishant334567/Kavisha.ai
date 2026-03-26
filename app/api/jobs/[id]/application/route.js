import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import { refreshImageUrl } from "@/app/lib/gcs";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id: jobId } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      const email = decodedToken.email?.trim()?.toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Email not found" }, { status: 400 });
      }
      if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
        return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
      }
      await connectDB();
      const jobQuery = { _id: jobId };
      if (brand) jobQuery.brand = brand;
      const job = await Job.findOne(jobQuery).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const application = await JobApplication.findOne({
        jobId,
        applicantEmail: email,
      }).lean();
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      const jdLink = job.jdLink ? await refreshImageUrl(job.jdLink) : "";
      const resumeLink = application.resumeLink ? await refreshImageUrl(application.resumeLink) : "";
      return NextResponse.json({
        job: {
          _id: job._id,
          title: job.title || "",
          description: job.description || "",
          jdLink,
        },
        application: {
          _id: application._id,
          applicantEmail: application.applicantEmail,
          applicantName: application.applicantName || "",
          applicantImage: application.applicantImage || "",
          applicationSummary: application.applicationSummary || "",
          status: application.status || "new",
          resumeLink,
          questionsAnswers: application.questionsAnswers || [],
          createdAt: application.createdAt,
        },
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
