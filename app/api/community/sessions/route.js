import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(request.url);
        const brand = searchParams.get("brand");
        if (!brand) {
          return NextResponse.json(
            { success: false, message: "Brand is required" },
            { status: 400 }
          );
        }

        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { success: false, message: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();

        const filter = {
          isCommunityChat: true,
          allDataCollected: true,
          userId: { $ne: user.id },
        };
        if (brand !== "kavisha") filter.brand = brand;

        const sessions = await Session.find(filter)
          .populate("userId", "name _id")
          .select("userId role chatSummary createdAt")
          .sort({ createdAt: -1 })
          .lean();

        const maskName = (name) => {
          if (!name) return "A*****";
          return name.split(" ").map(word =>
            word.charAt(0) + "*".repeat(Math.max(4, word.length - 1))
          ).join(" ");
        };

        const usersMap = new Map();

        sessions.forEach((session) => {
          if (!session?.userId?._id) return;
          const userId = session.userId._id.toString();
          const maskedName = maskName(session.userId?.name);

          if (!usersMap.has(userId)) {
            usersMap.set(userId, {
              userId,
              name: maskedName,
              sessions: [],
            });
          }

          usersMap.get(userId).sessions.push({
            _id: session._id,
            role: session.role,
            chatSummary: session.chatSummary,
            createdAt: session.createdAt,
          });
        });

        const users = Array.from(usersMap.values());
        return NextResponse.json({ success: true, users });
      } catch (err) {
        console.error("[community/sessions] error:", err);
        return NextResponse.json(
          { success: false, message: "Failed to fetch community sessions" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
