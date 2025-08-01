import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = 20;
  await connectDB();
  const sessions = await Session.find({})
    .select("title role chatSummary updatedAt allDataCollected userId")
    .populate("userId", "name email") // Add username and email
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1);

  // Fetch logs for each session
  const sessionsWithLogs = await Promise.all(
    sessions.map(async (session) => {
      const logs = await Logs.find({ sessionId: session._id })
        .select("message role createdAt")
        .sort({ createdAt: 1 })
        .limit(50); // Limit to last 50 logs for performance

      return {
        ...session.toObject(),
        logs: logs,
      };
    })
  );

  const hasMore = sessionsWithLogs.length > limit;
  const actualSessions = hasMore
    ? sessionsWithLogs.slice(0, limit)
    : sessionsWithLogs;

  return NextResponse.json({
    success: true,
    data: {
      sessions: actualSessions,
      pagination: {
        page,
        hasMore,
      },
    },
  });
}
