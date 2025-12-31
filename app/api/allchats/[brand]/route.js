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
        const sessions = await Session.find({
          userId: user.id,
          brand: brand,
        }).sort({ updatedAt: -1 });
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
              chatType: s.role,
            };
          })
        );

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
