import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";
import User from "@/app/models/Users";

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
      const emails = [...new Set(applications.map((a) => (a.applicantEmail || "").toLowerCase()).filter(Boolean))];
      const userByEmail = new Map();
      if (emails.length > 0) {
        const users = await User.find({ email: { $in: emails } }).select("_id email").lean();
        users.forEach((u) => userByEmail.set((u.email || "").toLowerCase(), u._id.toString()));
      }
      return NextResponse.json({
        job: {
          _id: job._id,
          title: job.title || "",
          description: job.description || "",
          statusCategories: Array.isArray(job.statusCategories) ? job.statusCategories : [],
        },
        applications: applications.map((a) => ({
          _id: a._id,
          applicantEmail: a.applicantEmail,
          applicantName: a.applicantName || "",
          applicantImage: a.applicantImage || "",
          applicantUserId: userByEmail.get((a.applicantEmail || "").toLowerCase()) || null,
          status: a.status || "",
          starred: !!a.starred,
          assignedTo: Array.isArray(a.assignedTo) ? a.assignedTo : [],
          resumeLink: a.resumeLink,
          questionsAnswers: a.questionsAnswers || [],
          createdAt: a.createdAt,
          applicationSummary: a.applicationSummary || "",
        })),
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
