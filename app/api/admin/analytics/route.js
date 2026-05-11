import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import TrainingData from "@/app/models/TrainingData";
import { docidFromChunkId } from "@/app/lib/chunkDocid";

const getAnalytics = async (brand, fromDate, toDate) => {
    // Treat YYYY-MM-DD inputs as whole-day range (inclusive).
    const from = new Date(`${fromDate}T00:00:00.000Z`);
    const to = new Date(`${toDate}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new Error("Invalid date range");
    }

    const sessionsDaily = await Session.aggregate([
        { $match: { brand, role: "lead_journey", createdAt: { $gte: from, $lte: to } } },
        {
            $group: {
                _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
                chats: { $sum: 1 },
                usersSet: { $addToSet: "$userId" },
            },
        },
        {
            $project: {
                _id: 0,
                date: { $dateToString: { format: "%Y-%m-%d", date: "$_id" } },
                chats: 1,
                users: { $size: "$usersSet" },
            },
        },
        { $sort: { date: 1 } },
    ]);

    const messageDaily = await Logs.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
            $lookup: {
                from: "chatsessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: "$session" },
        { $match: { "session.brand": brand } },
        {
            $group: {
                _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
                messages: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                date: { $dateToString: { format: "%Y-%m-%d", date: "$_id" } },
                messages: 1,
            },
        },
        { $sort: { date: 1 } },
    ]);

    const totalsAgg = await Session.aggregate([
        { $match: { brand, createdAt: { $gte: from, $lte: to } } },
        {
            $group: {
                _id: null,
                chatCount: { $sum: 1 },
                usersSet: { $addToSet: "$userId" },
            },
        },
        { $project: { _id: 0, chatCount: 1, userCount: { $size: "$usersSet" } } },
    ]);
    const totalsFromSessions = totalsAgg?.[0] || { userCount: 0, chatCount: 0 };

    const messageTotalAgg = await Logs.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
            $lookup: {
                from: "chatsessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: "$session" },
        { $match: { "session.brand": brand } },
        { $count: "messageCount" },
    ]);
    const messageCount = messageTotalAgg?.[0]?.messageCount || 0;

    const performanceAgg = await Logs.aggregate([
        {
            $match: {
                role: "assistant",
                createdAt: { $gte: from, $lte: to },
            },
        },
        {
            $lookup: {
                from: "chatsessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: "$session" },
        { $match: { "session.brand": brand } },
        {
            $group: {
                _id: null,
                answersLiked: {
                    $sum: { $ifNull: ["$likeCount", 0] },
                },
                answersCopied: {
                    $sum: { $ifNull: ["$copyCount", 0] },
                },
            },
        },
    ]);
    const performanceRow = performanceAgg?.[0] || {};
    const answersLiked = Number(performanceRow.answersLiked) || 0;
    const answersCopied = Number(performanceRow.answersCopied) || 0;

    const citationLogs = await Logs.aggregate([
        {
            $match: {
                role: "assistant",
                createdAt: { $gte: from, $lte: to },
                sourceChunkIds: { $exists: true, $ne: [] },
            },
        },
        {
            $lookup: {
                from: "chatsessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: "$session" },
        { $match: { "session.brand": brand } },
        { $project: { sourceChunkIds: 1 } },
    ]);

    /** Per doc: number of assistant answers in range that cited that doc (≥1 chunk). */
    const docTotals = new Map();
    for (const log of citationLogs) {
        const docids = new Set();
        for (const chunkId of log.sourceChunkIds || []) {
            const docid = docidFromChunkId(String(chunkId || ""));
            if (docid) docids.add(docid);
        }
        for (const docid of docids) {
            docTotals.set(docid, (docTotals.get(docid) || 0) + 1);
        }
    }
    const topDocids = [...docTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([d]) => d);

    let topKbDocs = [];
    if (topDocids.length > 0) {
        const meta = await TrainingData.find({
            brand,
            docid: { $in: topDocids },
        })
            .select("docid title sourceUrl")
            .lean();
        topKbDocs = topDocids.map((docid) => {
            const doc = meta.find((m) => m.docid === docid);
            return {
                docid,
                referenceCount: docTotals.get(docid) || 0,
                title: doc?.title || "",
                sourceUrl: doc?.sourceUrl || "",
            };
        });
    }

    /** Top 5 users by user message count for this brand in range. */
    const powerUsersAgg = await Logs.aggregate([
        {
            $match: {
                role: "user",
                createdAt: { $gte: from, $lte: to },
            },
        },
        {
            $lookup: {
                from: "chatsessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: "$session" },
        { $match: { "session.brand": brand } },
        {
            $group: {
                _id: "$userId",
                messageCount: { $sum: 1 },
            },
        },
        { $sort: { messageCount: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                userId: { $toString: "$_id" },
                messageCount: 1,
                name: { $ifNull: ["$user.name", ""] },
                email: { $ifNull: ["$user.email", ""] },
                image: { $ifNull: ["$user.image", ""] },
            },
        },
    ]);

    const msgMap = new Map(messageDaily.map((r) => [r.date, r.messages]));
    const sessionsMap = new Map(
        sessionsDaily.map((r) => [
            r.date,
            { users: r.users || 0, chats: r.chats || 0 },
        ])
    );

    const dayKey = (d) => d.toISOString().slice(0, 10);
    const daily = [];
    // Fill every day in the range, even when there are 0 sessions/logs.
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = dayKey(d);
        const s = sessionsMap.get(key) || { users: 0, chats: 0 };
        daily.push({
            date: key,
            users: s.users,
            chats: s.chats,
            messages: msgMap.get(key) || 0,
        });
    }

    return {
        totals: {
            userCount: totalsFromSessions.userCount || 0,
            chatCount: totalsFromSessions.chatCount || 0,
            messageCount,
        },
        performance: {
            answersLiked,
            answersCopied,
        },
        topKbDocs,
        /** Ordered by messageCount (user messages only) descending. */
        powerUsers: powerUsersAgg,
        daily,
    };
};

export async function GET(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const { searchParams } = new URL(req.url);
                const brand = searchParams.get("brand");
                const fromDate = searchParams.get("fromDate");
                const toDate = searchParams.get("toDate");

                if (!brand || !fromDate || !toDate) {
                    return NextResponse.json(
                        { error: "Brand, fromDate and toDate are required" },
                        { status: 400 }
                    );
                }

                const isAdmin = await isBrandAdmin(decodedToken.email, brand);
                if (!isAdmin) {
                    return NextResponse.json(
                        { error: "Forbidden - not a brand admin" },
                        { status: 403 }
                    );
                }

                await connectDB();
                const analytics = await getAnalytics(brand, fromDate, toDate);
                return NextResponse.json(analytics, { status: 200 });
            } catch (error) {
                const msg = String(error?.message || "");
                if (msg.toLowerCase().includes("invalid date")) {
                    return NextResponse.json(
                        { error: "Invalid fromDate/toDate" },
                        { status: 400 }
                    );
                }
                console.error("Error fetching analytics:", error);
                return NextResponse.json(
                    { error: "Failed to fetch analytics" },
                    { status: 500 }
                );
            }
        },
        onUnauthenticated: async () => {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        },
    });
}