import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import Logs from "@/app/models/ChatLogs";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    // Get all chat sessions where allDataCollected is true
    const chatSessions = await Session.find({ allDataCollected: true })
      .sort({ createdAt: -1 })
      .select("_id title role chatSummary allDataCollected userId");



    // Get count of sessions where allDataCollected is true
    const count = await Session.countDocuments({ allDataCollected: true });
    const countTotal = await Session.countDocuments({});
    // Enhance sessions with user information and logs
    const enhancedSessions = await Promise.all(
      chatSessions.map(async (session) => {
        try {
          // Get user information
          const user = await User.findById(session.userId).select("name email");

          // Get chat logs for this session
          const logs = await Logs.find({ sessionId: session._id })
            .select("message role createdAt")
            .sort({ createdAt: 1 });
          // Only get last 3 messages for preview

          return {
            _id: session._id,
            title: session.title || "Untitled",
            role: session.role,
            messageCount: await Logs.countDocuments({ sessionId: session._id }),
            allDataCollected: session.allDataCollected,
            userName: user?.name || "Unknown",
            userEmail: user?.email || "N/A",
            logs: logs,
          };
        } catch (error) {
          console.error("Error enhancing session:", error);
          return {
            _id: session._id,
            title: session.title || "Untitled",
            role: session.role,
            startedAt: session.createdAt,
            lastActivity: session.updatedAt,
            messageCount: 0,
            allDataCollected: session.allDataCollected,
            userName: "Unknown",
            userEmail: "N/A",
            logs: [],
          };
        }
      })
    );

   

    return NextResponse.json({
      success: true,
      sessions: enhancedSessions,
      count: count,
      countTotal: countTotal,
    });
  } catch (error) {
    console.error("Error fetching all data collected sessions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
