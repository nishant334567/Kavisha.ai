import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { brand } = await params;
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        await connectDB();
        const { searchParams } = new URL(req.url);
        const communityOnly = searchParams.get("community") === "true";
        const filter = { userId: user.id, brand };
        if (communityOnly) filter.isCommunityChat = true;
        const sessions = await Session.find(filter)
          .select("_id title role updatedAt brand allDataCollected")
          .sort({ updatedAt: -1 });

        const sessionIds = sessions.map((session) => session._id);

        // Build sessions map with only essential data for sidebar
        const sessionsMap = {};
        sessions.forEach((s) => {
          sessionsMap[s._id] = {
            id: s._id,
            title: s.title,
            role: s.role,
            updatedAt: s.updatedAt,
            brand: s.brand,
            allDataCollected: !!s.allDataCollected,
          };
        });

        return NextResponse.json({
          sessionIds: sessionIds,
          sessions: sessionsMap,
        });
      } catch (err) {
        return NextResponse.json(
          { error: err?.message || String(err), stack: err?.stack },
          { status: 500 }
        );
      }
    },
  });
}

export async function DELETE(req) {
  return withAuth(req, {
    onAuthenticated: async () => {
      try {
        const { chatId } = await req.json();
        await connectDB();

        // Verify session exists
        const session = await Session.findOne({ _id: chatId });
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        // Delete all chat logs for this session
        await Logs.deleteMany({ sessionId: chatId });

        // Delete all matches for this session
        await Matches.deleteMany({ sessionId: chatId });

        // Finally, delete the session
        await Session.deleteOne({ _id: chatId });
        return NextResponse.json({ message: "success" });
      } catch (err) {
        return NextResponse.json(
          { message: "failed to delete" },
          { status: 500 }
        );
      }
    },
  });
}
