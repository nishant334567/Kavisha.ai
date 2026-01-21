import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();
        const sessions = await Session.find({ userId: user.id })
          .select("_id title role updatedAt brand")
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

export async function DELETE(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { chatId } = await request.json();
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();
        const session = await Session.findOne({ _id: chatId, userId: user.id });
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
