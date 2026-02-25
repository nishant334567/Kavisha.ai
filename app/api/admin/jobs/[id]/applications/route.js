import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id: jobId } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!jobId || !brand) {
        return NextResponse.json({ error: "id and brand required" }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const job = await Job.findOne({ _id: jobId, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const applications = await JobApplication.find({ jobId })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json({
        job: {
          _id: job._id,
          title: job.title || "",
          description: job.description || "",
        },
        applications: applications.map((a) => ({
          _id: a._id,
          applicantEmail: a.applicantEmail,
          applicantName: a.applicantName || "",
          applicantImage: a.applicantImage || "",
          status: a.status || "new",
          starred: !!a.starred,
          assignedTo: Array.isArray(a.assignedTo) ? a.assignedTo : [],
          resumeLink: a.resumeLink,
          questionsAnswers: a.questionsAnswers || [],
          createdAt: a.createdAt,
          applicationSummary: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
        })),
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
