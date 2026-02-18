import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const CRON_REPORT_EMAIL = "hello@kavisha.ai";

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

const BATCH_LIMIT = parseInt(process.env.CRON_BATCH_LIMIT || "500", 10);

// Delete sessions and their logs, matches, connections
async function deleteSessions(sessionIds) {
    if (sessionIds.length === 0) {
        return { deleted: 0, message: "No sessions to delete." };
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

    return { deleted: deletedCount, message: `Deleted ${deletedCount} session(s) with 1 log (batch: ${BATCH_LIMIT}).` };
}

async function runCleanup() {
    await connectDB();

    // 1. Find sessions that have exactly 1 log (candidates for deletion)
    const singleLogSessions = await Logs.aggregate([
        { $group: { _id: "$sessionId", count: { $sum: 1 } } },
        { $match: { count: 1 } },
        { $limit: BATCH_LIMIT * 2 },
    ]);
    const candidateSessionIds = singleLogSessions.map((s) => s._id);

    if (candidateSessionIds.length === 0) {
        await sendCronReport({ success: true, deleted: 0, message: "No sessions with exactly 1 log." });
        return { success: true, deleted: 0, message: "No sessions with exactly 1 log." };
    }

    // 2. Get userId for each candidate
    const sessions = await Session.find({ _id: { $in: candidateSessionIds } })
        .select("_id userId")
        .lean();

    // 3. Group candidates by userId
    const byUser = {};
    for (const s of sessions) {
        const uid = s.userId.toString();
        if (!byUser[uid]) byUser[uid] = [];
        byUser[uid].push(s._id);
    }

    // 4. Decide what to delete: if user's ALL sessions would be deleted, keep 1
    const toDelete = [];
    for (const uid of Object.keys(byUser)) {
        const userCandidates = byUser[uid];
        const userTotalSessions = await Session.countDocuments({ userId: uid });

        // All of this user's sessions are candidates (all have 1 log) → keep 1, delete rest
        if (userTotalSessions === userCandidates.length) {
            toDelete.push(...userCandidates.slice(1));
        } else {
            toDelete.push(...userCandidates);
        }
    }

    const batch = toDelete.slice(0, BATCH_LIMIT);
    const { deleted, message } = await deleteSessions(batch);

    await sendCronReport({ success: true, deleted, message });
    return { success: true, deleted, message };
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
