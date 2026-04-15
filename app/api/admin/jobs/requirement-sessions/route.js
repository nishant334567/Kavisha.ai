import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

/** GET /api/admin/jobs/requirement-sessions?brand= — completed private job requirement chats (allDataCollected) for this brand */
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
        const sessions = await Session.find({
          brand,
          isJobsRequirementPost: true,
          role: "job_seeker",
          allDataCollected: true,
        })
          .populate("userId", "name email")
          .select("title name userId createdAt updatedAt")
          .sort({ createdAt: -1 })
          .lean();

        const rows = sessions.map((s) => {
          const u = s.userId;
          const userObj = u && typeof u === "object" && u._id ? u : null;
          return {
            _id: String(s._id),
            title: s.title || s.name || "Requirement",
            userName: userObj?.name || "",
            userEmail: userObj?.email || "",
            userId: userObj?._id ? String(userObj._id) : null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
        });

        return NextResponse.json({ sessions: rows });
      } catch (err) {
        console.error("[admin/jobs/requirement-sessions GET]", err);
        return NextResponse.json(
          { error: "Failed to load requirement sessions" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
