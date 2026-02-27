import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Assessments from "@/app/models/Assessment";
import Attempts from "@/app/models/Attempt";
import SentEmailLog from "@/app/models/SentEmailLog";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const type = searchParams.get("type");
    const countOnly = searchParams.get("count") === "true";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = searchParams.get("dateField") || "updatedAt";
    const lastDays = searchParams.get("lastDays");
    const serviceKey = searchParams.get("serviceKey");
    const limitParam = searchParams.get("limit");
    const limit =
      limitParam === "all" || limitParam === "" || limitParam == null
        ? null
        : Math.min(10000, Math.max(1, parseInt(limitParam || "50", 10)));
    const minMessagesParam = searchParams.get("minMessages");
    const minMessages =
      minMessagesParam == null || minMessagesParam === "" || minMessagesParam === "all"
        ? null
        : parseInt(minMessagesParam, 10);
    const minSessionsParam = searchParams.get("minSessions");
    const minSessions =
      minSessionsParam == null || minSessionsParam === "" || minSessionsParam === "all"
        ? null
        : parseInt(minSessionsParam, 10);
    const minEmailsSentParam = searchParams.get("minEmailsSent");
    const minEmailsSent =
      minEmailsSentParam == null || minEmailsSentParam === "" || minEmailsSentParam === "all"
        ? null
        : parseInt(minEmailsSentParam, 10);
    const lastEmailDaysParam = searchParams.get("lastEmailDays");
    const lastEmailDays =
      lastEmailDaysParam == null || lastEmailDaysParam === "" || lastEmailDaysParam === "all"
        ? null
        : parseInt(lastEmailDaysParam, 10);
    const lastEmailFrom = searchParams.get("lastEmailFrom");
    const lastEmailTo = searchParams.get("lastEmailTo");

    // Resolve date range: lastDays overrides explicit dateFrom/dateTo
    let dateFromVal = dateFrom ? new Date(dateFrom) : null;
    let dateToVal = dateTo ? new Date(dateTo) : null;
    if (lastDays) {
      const n = parseInt(lastDays, 10);
      if (!isNaN(n) && n > 0) {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - n);
        dateFromVal = from;
        dateToVal = now;
      }
    }

    await connectDB();

    const applyDateFilter = (f, field) => {
      if (dateFromVal || dateToVal) {
        f[field] = f[field] || {};
        if (dateFromVal) f[field].$gte = dateFromVal;
        if (dateToVal) f[field].$lte = dateToVal;
      }
    };

    // If count=true, return counts instead of full data
    if (countOnly) {
      const communityFilter = { brand, isCommunityChat: true };
      const normalFilter = { brand, isCommunityChat: { $ne: true } };
      applyDateFilter(communityFilter, dateField);
      applyDateFilter(normalFilter, dateField);

      // Count users for community chats
      const communitySessions = await Session.find(communityFilter)
        .populate("userId", "_id")
        .select("userId")
        .lean();

      // Count users for chat requests (normal chats)
      const normalSessions = await Session.find(normalFilter)
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
    applyDateFilter(filter, dateField);
    if (serviceKey && serviceKey !== "") {
      filter.serviceKey = serviceKey;
    }
    const sessions = await Session.find(filter)
      .populate("userId", "name email _id")
      .select(
        "userId role title chatSummary status allDataCollected createdAt updatedAt comment totalInputTokens totalOutputTokens assignedTo serviceKey"
      )
      .sort({ createdAt: -1 })
      .lean();

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
        assignedTo: Array.isArray(session.assignedTo) ? session.assignedTo : (session.assignedTo ? [session.assignedTo] : []),
        messageCount: messageCount,
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalCost: totalCost,
      });
    });
    let allUsers = Array.from(usersMap.values());

    if (minMessages != null && !isNaN(minMessages) && minMessages > 0) {
      allUsers = allUsers.filter((u) => {
        const total = (u.sessions || []).reduce((sum, s) => sum + (s.messageCount ?? 0), 0);
        return total >= minMessages;
      });
    }
    if (minSessions != null && !isNaN(minSessions) && minSessions > 0) {
      allUsers = allUsers.filter((u) => (u.sessions?.length ?? 0) >= minSessions);
    }

    // Filter by emails sent (SentEmailLog): min count and/or last email date range
    if (
      brand &&
      (minEmailsSent != null || lastEmailDays != null || lastEmailFrom || lastEmailTo)
    ) {
      const userEmails = [...new Set(allUsers.map((u) => (u.email || "").toLowerCase()).filter(Boolean))];
      if (userEmails.length > 0) {
        const emailMatch = { brand: brand.toLowerCase().trim(), toEmail: { $in: userEmails }, status: "sent" };
        const lastEmailFromVal = lastEmailFrom ? new Date(lastEmailFrom) : null;
        const lastEmailToVal = lastEmailTo ? new Date(lastEmailTo) : null;
        let lastEmailSentAtFilter = null;
        if (lastEmailDays != null && !isNaN(lastEmailDays) && lastEmailDays > 0) {
          const now = new Date();
          const from = new Date(now);
          from.setDate(from.getDate() - lastEmailDays);
          lastEmailSentAtFilter = { $gte: from, $lte: now };
        } else if (lastEmailFromVal || lastEmailToVal) {
          lastEmailSentAtFilter = {};
          if (lastEmailFromVal) lastEmailSentAtFilter.$gte = lastEmailFromVal;
          if (lastEmailToVal) lastEmailSentAtFilter.$lte = lastEmailToVal;
        }
        if (lastEmailSentAtFilter) {
          emailMatch.sentAt = lastEmailSentAtFilter;
        }
        const agg = await SentEmailLog.aggregate([
          { $match: emailMatch },
          {
            $group: {
              _id: "$toEmail",
              count: { $sum: 1 },
              lastSentAt: { $max: "$sentAt" },
            },
          },
        ]);
        const emailStats = new Map(agg.map((r) => [r._id, { count: r.count, lastSentAt: r.lastSentAt }]));

        allUsers = allUsers.filter((u) => {
          const email = (u.email || "").toLowerCase();
          if (!email) return false;
          const stats = emailStats.get(email);
          const count = stats ? stats.count : 0;
          if (minEmailsSent != null && !isNaN(minEmailsSent) && count < minEmailsSent) return false;
          if (lastEmailSentAtFilter && !stats) return false;
          return true;
        });
      }
    }

    const users = limit == null ? allUsers : allUsers.slice(0, limit);
    return NextResponse.json({
      success: true,
      users,
      total: allUsers.length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
