import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

/** Embed widget: only sessions started from the widget (`isWidget: true`) for this user + brand */
export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const brand = request.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      try {
        await connectDB();
        const sessions = await Session.find({
          userId: user.id,
          brand,
          role: "lead_journey",
          isWidget: true,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .select("_id title name createdAt isWidget")
          .lean();

        return NextResponse.json({
          sessions: sessions.map((s) => ({
            id: String(s._id),
            title: s.title || s.name || "Chat",
            createdAt: s.createdAt,
            isWidget: true,
          })),
        });
      } catch (e) {
        console.error("[widget/sessions GET]", e);
        return NextResponse.json(
          { error: "Failed to list sessions" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
