import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";
import { sendCronReport } from "@/app/lib/cronReportEmail";
import {
  normalizeSessionRole,
  sessionRoleMatch,
} from "@/app/lib/communitySessionRole";

const BATCH_LIMIT = parseInt(process.env.CRON_BATCH_LIMIT || "500", 10);
const SEP = "\x00";

function normRole(r) {
    return String(r || "").toLowerCase().trim();
}

function notCommunityClause() {
    return { $or: [{ isCommunityChat: false }, { isCommunityChat: { $exists: false } }] };
}

/**
 * Retention buckets (per userId + brand) - only these six shapes get retention:
 * (1) non-community + lead_journey + isWidget true
 * (2) non-community + lead_journey + isWidget not true
 * (3–5) community + role job_seeker | recruiter | friends (aliases: friend, dating; case-insensitive)
 * (6) non-community + job_seeker (mutually exclusive with (3) via isCommunityChat)
 * Returns null → single-log candidates are deleted in full (no retention).
 *
 * Per bucket: "empty" = fewer than 2 logs (0 or 1); "non-empty" = 2+ logs.
 * - If every session in the bucket is empty, keep one empty session (delete the rest).
 * - If any session is non-empty, delete every empty session in that bucket.
 */
function explicitRetentionBucket(session) {
    const userId = session.userId;
    const brand = String(session.brand ?? "kavisha").trim() || "kavisha";
    const role = normRole(session.role);
    const community = Boolean(session.isCommunityChat);
    const widget = session.isWidget === true;

    if (community) {
        const c = normalizeSessionRole(session.role);
        if (!c) return null;
        return {
            key: `${userId}${SEP}${brand}${SEP}c${SEP}${c}`,
            filter: {
                userId,
                brand,
                isCommunityChat: true,
                role: sessionRoleMatch(c),
            },
        };
    }
    if (role === "lead_journey" && widget) {
        return {
            key: `${userId}${SEP}${brand}${SEP}lj_w`,
            filter: {
                userId,
                brand,
                role: /^lead_journey$/i,
                isWidget: true,
                ...notCommunityClause(),
            },
        };
    }
    if (role === "lead_journey") {
        return {
            key: `${userId}${SEP}${brand}${SEP}lj_site`,
            filter: {
                userId,
                brand,
                role: /^lead_journey$/i,
                isWidget: { $ne: true },
                ...notCommunityClause(),
            },
        };
    }
    if (role === "job_seeker") {
        return {
            key: `${userId}${SEP}${brand}${SEP}js_nc`,
            filter: {
                userId,
                brand,
                role: /^job_seeker$/i,
                ...notCommunityClause(),
            },
        };
    }
    return null;
}

/** @param {Record<string, unknown>} sessionFilter */
async function retentionDeletesForBucket(sessionFilter) {
    const logColl = Logs.collection.collectionName;

    const rows = await Session.aggregate([
        { $match: sessionFilter },
        {
            $lookup: {
                from: logColl,
                let: { sid: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$sessionId", "$$sid"] } } },
                    { $count: "c" },
                ],
                as: "logc",
            },
        },
        {
            $addFields: {
                logCount: {
                    $cond: [
                        { $gt: [{ $size: "$logc" }, 0] },
                        { $arrayElemAt: ["$logc.c", 0] },
                        0,
                    ],
                },
            },
        },
        { $project: { _id: 1, logCount: 1 } },
    ]);

    if (rows.length === 0) return [];

    const emptyIds = rows.filter((r) => r.logCount < 2).map((r) => r._id);
    const allEmpty = rows.every((r) => r.logCount < 2);
    const anyNonEmpty = rows.some((r) => r.logCount >= 2);

    if (allEmpty) {
        return emptyIds.length <= 1 ? [] : emptyIds.slice(1);
    }
    if (anyNonEmpty) {
        return emptyIds;
    }
    return [];
}

async function sendCleanupCronReport(payload) {
    const {
        success,
        deleted = 0,
        message = "",
        error,
        candidateSessionCount = 0,
        bucketCount = 0,
        queuedForDelete = 0,
        batchLimit = BATCH_LIMIT,
        outsideRetentionCount = 0,
    } = payload;

    const subject = success
        ? `[Cron] Session cleanup — ${deleted} deleted`
        : `[Cron] Session cleanup failed`;

    const rulesHtml = `
      <p><strong>Retention buckets (per userId + brand)</strong> — empty = fewer than 2 logs (0 or 1); non-empty = 2 or more logs. If <em>every</em> session in the bucket is empty, one empty session is kept. If any session is non-empty, every empty session in that bucket is removed.</p>
      <ol style="margin:0 0 12px 18px;line-height:1.55">
        <li>Non-community + <code>lead_journey</code> + <code>isWidget: true</code></li>
        <li>Non-community + <code>lead_journey</code> + widget not true (site)</li>
        <li>Community + <code>job_seeker</code></li>
        <li>Community + <code>recruiter</code></li>
        <li>Community + <code>friends</code> (incl. legacy <code>friend</code>)</li>
        <li>Non-community + <code>job_seeker</code> (excludes community job_seeker)</li>
      </ol>
      <p style="margin:0 0 12px">Candidates outside these six shapes are deleted when they have a single log (no keep-one).</p>
    `;

    const statsHtml = success
        ? `<p><strong>Run summary</strong></p>
           <ul style="margin:0 0 12px 18px;line-height:1.5">
             <li>Single-log candidates scanned: <strong>${candidateSessionCount}</strong></li>
             <li>Outside the six retention shapes (always delete if single-log): <strong>${outsideRetentionCount}</strong></li>
             <li>Retention bucket groups (user + brand + bucket type): <strong>${bucketCount}</strong></li>
             <li>Session ids queued for delete (after retention): <strong>${queuedForDelete}</strong></li>
             <li>Batch limit applied: <strong>${batchLimit}</strong></li>
             <li>Session documents deleted this run: <strong>${deleted}</strong></li>
           </ul>
           <p style="margin:0">${message || ""}</p>`
        : `<p style="color:#b91c1c"><strong>Error:</strong> ${error || "Unknown"}</p>`;

    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">
      ${rulesHtml}
      ${statsHtml}
    </div>`;

    await sendCronReport({ subject, html });
}

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

    return { deleted: deletedCount, message: `Removed ${deletedCount} session(s) and related logs/matches/connections (cap ${BATCH_LIMIT} per run).` };
}

async function runCleanup() {
    await connectDB();

    const singleLogSessions = await Logs.aggregate([
        { $group: { _id: "$sessionId", count: { $sum: 1 } } },
        { $match: { count: 1 } },
        { $limit: BATCH_LIMIT * 2 },
    ]);
    const candidateSessionIds = singleLogSessions.map((s) => s._id);

    if (candidateSessionIds.length === 0) {
        await sendCleanupCronReport({
            success: true,
            deleted: 0,
            message: "No sessions with exactly one chat log.",
            candidateSessionCount: 0,
            bucketCount: 0,
            queuedForDelete: 0,
            outsideRetentionCount: 0,
        });
        return { success: true, deleted: 0, message: "No sessions with exactly 1 log." };
    }

    const sessions = await Session.find({ _id: { $in: candidateSessionIds } })
        .select("_id userId role isCommunityChat isWidget brand")
        .lean();

    const bucketFilters = new Map();
    const outsideRetentionIds = [];

    for (const s of sessions) {
        const bucket = explicitRetentionBucket(s);
        if (!bucket) {
            outsideRetentionIds.push(s._id);
            continue;
        }
        if (!bucketFilters.has(bucket.key)) {
            bucketFilters.set(bucket.key, bucket.filter);
        }
    }

    const toDelete = [];
    for (const filter of bucketFilters.values()) {
        toDelete.push(...(await retentionDeletesForBucket(filter)));
    }
    toDelete.push(...outsideRetentionIds);

    const batch = toDelete.slice(0, BATCH_LIMIT);
    const { deleted, message } = await deleteSessions(batch);

    await sendCleanupCronReport({
        success: true,
        deleted,
        message,
        candidateSessionCount: candidateSessionIds.length,
        bucketCount: bucketFilters.size,
        queuedForDelete: toDelete.length,
        outsideRetentionCount: outsideRetentionIds.length,
    });

    return {
        success: true,
        deleted,
        message,
        candidates: candidateSessionIds.length,
        buckets: bucketFilters.size,
        queuedForDelete: toDelete.length,
        outsideRetention: outsideRetentionIds.length,
    };
}

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
        await sendCleanupCronReport({
            success: false,
            error: err?.message ?? "Cleanup failed",
            candidateSessionCount: 0,
            bucketCount: 0,
            queuedForDelete: 0,
            outsideRetentionCount: 0,
        });
        return NextResponse.json(
            { success: false, error: err?.message ?? "Cleanup failed" },
            { status: 500 }
        );
    }
}
