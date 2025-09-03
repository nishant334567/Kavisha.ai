import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { cookies } from "next/headers";

export async function GET(req) {
  let token;
  try {
    token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const sessions = await Session.find({ userId: token.id });
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
}

export async function DELETE(req) {
  const { chatId } = await req.json();
  try {
    await connectDB();
    const res = await Session.deleteOne({ _id: chatId });
    return NextResponse.json({ message: "success" });
  } catch (err) {
    return NextResponse.json({ message: "failed to delete" });
  }
}
