import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";

const BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE || "500", 10);

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const singleLogSessions = await Logs.aggregate([
            { $group: { _id: "$sessionId", count: { $sum: 1 } } },
            { $match: { count: 1 } },
            { $project: { sessionId: "$_id" } },
            { $limit: BATCH_SIZE },
        ]);

        const sessionIds = singleLogSessions.map((s) => s.sessionId);
        if (sessionIds.length === 0) {
            return NextResponse.json({
                success: true,
                deleted: 0,
                message: "No sessions with exactly one log found.",
            });
        }

        await Logs.deleteMany({ sessionId: { $in: sessionIds } });
        await Matches.deleteMany({
            $or: [
                { sessionId: { $in: sessionIds } },
                { matchedSessionId: { $in: sessionIds } },
            ],
        });
        await Connection.deleteMany({
            $or: [
                { senderSession: { $in: sessionIds } },
                { receiverSession: { $in: sessionIds } },
            ],
        });
        const { deletedCount } = await Session.deleteMany({ _id: { $in: sessionIds } });

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
            batchSize: sessionIds.length,
            message: `Deleted ${deletedCount} session(s) with exactly one log.`,
        });
    } catch (err) {
        console.error("[cron] cleanup error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Cleanup failed" },
            { status: 500 }
        );
    }
}
