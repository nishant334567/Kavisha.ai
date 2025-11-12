import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";

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
        const sessions = await Session.find({ userId: user.id });
        const sessionIds = sessions.map((session) => session._id);

        // Fetch logs for each session and build a map
        const sessionsMap = {};
        await Promise.all(
          sessions.map(async (s) => {
            const logs = await Logs.find({ sessionId: s._id });
            sessionsMap[s._id] = {
              id: s._id,
              resumeFilename: s.resumeFilename,
              resumeSummary: s.resumeSummary,
              title: s.title,
              logs: logs,
              matchesLatest: s.matches,
              role: s.role,
              updatedAt: s.updatedAt,
            };
          })
        );

        return NextResponse.json({
          sessionIds: sessionIds,
          sessions: sessionsMap,
        });
      } catch (err) {
        console.error("AllChats API error:", err, err?.stack);
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
