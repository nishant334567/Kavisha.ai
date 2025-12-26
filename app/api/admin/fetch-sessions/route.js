import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const type = searchParams.get("type");
    const countOnly = searchParams.get("count") === "true";

    await connectDB();

    // If count=true, return counts instead of full data
    if (countOnly) {
      // Count users for community chats
      const communitySessions = await Session.find({
        brand,
        isCommunityChat: true,
      })
        .populate("userId", "_id")
        .select("userId")
        .lean();

      // Count users for chat requests (normal chats)
      const normalSessions = await Session.find({
        brand,
        isCommunityChat: { $ne: true },
      })
        .populate("userId", "_id")
        .select("userId")
        .lean();

      // Get unique user IDs for each type
      const communityUserIds = new Set();
      communitySessions.forEach((session) => {
        if (session?.userId?._id) {
          communityUserIds.add(session.userId._id.toString());
        }
      });

      const normalUserIds = new Set();
      normalSessions.forEach((session) => {
        if (session?.userId?._id) {
          normalUserIds.add(session.userId._id.toString());
        }
      });

      return NextResponse.json({
        success: true,
        communityCount: communityUserIds.size,
        chatRequestCount: normalUserIds.size,
      });
    }

    // Original logic for fetching full user data
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
