import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import JobApplication from "@/app/models/JobApplication";

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
      const jobIds = applications
        .map((a) => (a.jobId != null ? String(a.jobId) : null))
        .filter(Boolean);
      return NextResponse.json({ jobIds });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ jobIds: [] });
    },
  });
}
