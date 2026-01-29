import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Assessments from "@/app/models/Assessment";
import Attempts from "@/app/models/Attempt";
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

      // Count unique users who attempted any quiz/survey for this brand
      const assessmentIds = await Assessments.find({ brand })
        .select("_id")
        .lean();
      const aIds = assessmentIds.map((a) => a._id);
      const quizSurveyUserIds =
        aIds.length > 0
          ? await Attempts.distinct("userId", { assessmentId: { $in: aIds } })
          : [];
      const quizSurveyCount = quizSurveyUserIds.length;

      return NextResponse.json({
        success: true,
        communityCount: communityUserIds.size,
        chatRequestCount: normalUserIds.size,
        quizSurveyAttemptCount: quizSurveyCount,
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
      .select(
        "userId role title chatSummary status allDataCollected createdAt updatedAt comment totalInputTokens totalOutputTokens assignedTo serviceKey"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Get message counts for all sessions
    const sessionIds = sessions.map((s) => s._id);
    const messageCounts = await Logs.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: "$sessionId", count: { $sum: 1 } } },
    ]);
    const messageCountMap = new Map(
      messageCounts.map((item) => [item._id.toString(), item.count])
    );

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

      const messageCount = messageCountMap.get(session._id.toString()) || 0;
      const inputTokens = session.totalInputTokens || 0;
      const outputTokens = session.totalOutputTokens || 0;
      const totalCostUSD =
        (inputTokens / 1000000) * 0.3 + (outputTokens / 1000000) * 2.5;
      const totalCost = totalCostUSD * 88;

      usersMap.get(userId).sessions.push({
        _id: session._id,
        role: session.role,
        serviceKey: session.serviceKey || null,
        title: session.title,
        chatSummary: session.chatSummary,
        status: session.status,
        allDataCollected: session.allDataCollected,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        comment: session.comment,
        assignedTo: session.assignedTo || "",
        messageCount: messageCount,
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalCost: totalCost,
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
