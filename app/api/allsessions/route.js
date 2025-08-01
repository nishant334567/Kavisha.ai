import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import User from "@/app/models/Users";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const chatSessions = await Session.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const modifiedChat = await Promise.all(
      chatSessions.map(async (session) => {
        // Only get count and last chat log for performance
        const [chatLogsCount, lastChatLog, user] = await Promise.all([
          Logs.countDocuments({ sessionId: session._id }),
          Logs.findOne({ sessionId: session._id })
            .select("createdAt")
            .sort({ createdAt: -1 }),
          User.findById(session.userId).select("name email profileType"),
        ]);

        return {
          sessionId: session._id,
          sessionTitle: session.title,
          chatSummary: session.chatSummary,
          allDataCollected: session.allDataCollected,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          chatLogsCount: chatLogsCount,
          lastChatLog: lastChatLog,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "Unknown",
          userProfileType: user?.profileType || "Unknown",
        };
      })
    );

    // Get total count for pagination
    const totalSessions = await Session.countDocuments({});
    const hasMore = skip + limit < totalSessions;

    return NextResponse.json({
      success: true,
      allSessions: modifiedChat,
      pagination: {
        page,
        limit,
        total: totalSessions,
        hasMore,
        totalPages: Math.ceil(totalSessions / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: error.message },
      { status: 500 }
    );
  }
}
