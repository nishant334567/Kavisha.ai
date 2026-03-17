import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import { refreshImageUrl } from "@/app/lib/gcs";
import JobApplication from "@/app/models/JobApplication";

export async function GET(req, { params }) {
  const { jobId: rawJobId } = await params;
  const jobId = rawJobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const email = decodedToken.email?.trim()?.toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Email not found" }, { status: 400 });
      }
      await connectDB();
      const application = await JobApplication.findOne(
        { jobId, applicantEmail: email },
        { resumeLink: 1, questionsAnswers: 1 }
      ).lean();
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      const resumeLink = application.resumeLink ? await refreshImageUrl(application.resumeLink) : "";
      return NextResponse.json({
        application: {
          resumeLink,
          questionsAnswers: application.questionsAnswers || [],
        },
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
