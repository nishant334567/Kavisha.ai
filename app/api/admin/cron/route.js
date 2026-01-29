import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const CRON_REPORT_EMAIL = "hello@kavisha.ai";
const BATCH_LIMIT = parseInt(process.env.CRON_BATCH_LIMIT || "500", 10); // max sessions deleted per run (e.g. per day)

async function sendCronReport({ success, deleted = 0, message, error }) {
    if (!resend) return;
    const subject = success ? `[Cron] Cleanup ok – ${deleted} deleted` : `[Cron] Cleanup failed`;
    const body = success
        ? `Deleted: ${deleted}<br>${message || ""}`
        : `Error: ${error || "Unknown"}`;
    try {
        await resend.emails.send({
            from: CRON_REPORT_EMAIL,
            to: [CRON_REPORT_EMAIL],
            subject,
            html: `<p>${body}</p>`,
        });
    } catch (e) {
        console.error("[cron] email report failed:", e);
    }
}

async function runCleanupWithSessionIds(sessionIds) {
    if (sessionIds.length === 0) {
        await sendCronReport({
            success: true,
            deleted: 0,
            message: "No sessions with exactly one log found.",
        });
        return { success: true, deleted: 0, message: "No sessions with exactly one log found." };
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
    const message = `Deleted ${deletedCount} session(s) with exactly one log (batch limit: ${BATCH_LIMIT}/run).`;

    await sendCronReport({
        success: true,
        deleted: deletedCount,
        message,
    });

    return { success: true, deleted: deletedCount, message };
}

async function runCleanup() {
    await connectDB();

    const singleLogSessions = await Logs.aggregate([
        { $group: { _id: "$sessionId", count: { $sum: 1 } } },
        { $match: { count: 1 } },
        { $project: { sessionId: "$_id" } },
        { $limit: BATCH_LIMIT },
    ]);

    const sessionIds = singleLogSessions.map((s) => s.sessionId);
    return runCleanupWithSessionIds(sessionIds);
}

// POST only – requires valid Bearer token when CRON_SECRET is set (e.g. for scheduler)
export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const result = await runCleanup();
        return NextResponse.json(result);
    } catch (err) {
        console.error("[cron] cleanup error:", err);
        await sendCronReport({
            success: false,
            error: err?.message ?? "Cleanup failed",
        });
        return NextResponse.json(
            { success: false, error: err?.message ?? "Cleanup failed" },
            { status: 500 }
        );
    }
}
