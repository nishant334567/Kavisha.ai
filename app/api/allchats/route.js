import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const sessions = await Session.find({ userId: token.id });
  const sessionIds = sessions.map((session) => session._id);

  return NextResponse.json({
    sessionIds: sessionIds,
    sessions: sessions.map((s) => ({
      id: s._id,
      resumeFilename: s.resumeFilename,
      resumeSummary: s.resumeSummary,
      title: s.title,
    })),
  });
}
