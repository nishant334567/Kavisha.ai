import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        const sessions = await Session.find({
          userId: user.id,
          brand,
          isJobsRequirementPost: true,
          role: "job_seeker",
        })
          .select("title name createdAt updatedAt allDataCollected")
          .sort({ createdAt: -1 })
          .lean();

        return NextResponse.json({
          sessions: sessions.map((s) => ({
            _id: String(s._id),
            title: s.title || s.name || "Requirement",
            name: s.name || null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            allDataCollected: Boolean(s.allDataCollected),
          })),
        });
      } catch (err) {
        console.error("[jobs/requirement-sessions GET]", err);
        return NextResponse.json(
          { error: "Failed to load sessions" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}
