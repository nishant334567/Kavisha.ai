import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const type = searchParams.get("type");
    await connectDB();
    const filter = { brand };
    if (type === "community") {
      filter.isCommunityChat = true;
    } else if (type === "normal") {
      filter.isCommunityChat = { $ne: true };
    }
    // If type is not specified, don't filter by isCommunityChat
    const sessions = await Session.find(filter)
      .populate("userId", "name email _id")
      .sort({ createdAt: -1 })
      .lean();

    const usersMap = new Map();

    sessions.forEach((session) => {
      // Skip sessions without valid userId
      if (!session?.userId?._id) {
        return;
      }

      const userId = session.userId._id.toString();
      const userEmail = session.userId?.email;
      const userName = session.userId?.name;

      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          userId: userId,
          email: userEmail,
          name: userName,
          sessions: [],
        });
      }

      usersMap.get(userId).sessions.push({
        _id: session._id,
        role: session.role,
        title: session.title,
        chatSummary: session.chatSummary,
        status: session.status,
        allDataCollected: session.allDataCollected,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        comment: session.comment,
      });
    });
    const users = Array.from(usersMap.values());
    return NextResponse.json({
      success: true,
      //   count: sessions.length,
      users: users,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
