import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { "user-id": userId } = params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    // Fetch all chat sessions for the user
    const sessions = await Session.find({ userId })
      .select("title createdAt updatedAt status allDataCollected role")
      .sort({ updatedAt: -1 }); // Most recent first

    // Fetch chat logs for each session
    const sessionsWithLogs = await Promise.all(
      sessions.map(async (session) => {
        const logs = await Logs.find({ sessionId: session._id })
          .select("message role createdAt")
          .sort({ createdAt: 1 }); // Chronological order

        return {
          sessionId: session._id,
          title: session.title,
          role: session.role,
          status: session.status,
          allDataCollected: session.allDataCollected,
          startedAt: session.createdAt,
          lastActivity: session.updatedAt,
          messageCount: logs.length,
          logs: logs,
        };
      })
    );

    return NextResponse.json({
      success: true,
      userId: userId,
      totalSessions: sessionsWithLogs.length,
      sessions: sessionsWithLogs,
    });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user chats",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
