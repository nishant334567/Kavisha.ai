import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import "@/app/models/Users";
import { getMatches } from "@/app/api/matches/[sessionId]/route";
import { sendEmail } from "@/app/lib/email";
import { sendCronReport } from "@/app/lib/cronReportEmail";
import { maskCommunityPeerName } from "@/app/lib/communityPeerDisplayName";
import {
  getBrandOrigin,
  getKavishaRootHost,
} from "@/app/lib/kavishaSiteEnv";

const BATCH_LIMIT = parseInt(
  process.env.CRON_COMMUNITY_MATCH_BATCH || "80",
  10,
);
const DELAY_MS = parseInt(
  process.env.CRON_COMMUNITY_MATCH_DELAY_MS || "400",
  10,
);
const MIN_HOURS_BETWEEN_DIGESTS = parseInt(
  process.env.CRON_COMMUNITY_MATCH_MIN_HOURS_BETWEEN || "20",
  10,
);

function authorizeCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") === cronSecret) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function normalizeRole(role) {
  const r = String(role || "").toLowerCase().trim();
  if (r === "dating") return "friends";
  return r;
}

function skipRole(role) {
  const r = normalizeRole(role);
  return ["pitch_to_investor", "lead_journey"].includes(r);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCommunityBrandLabel(brand) {
  const raw = String(brand || "").trim();
  if (!raw) return "Kavisha";
  // Title-case-ish: entrackr -> Entrackr, vishalgupta -> Vishalgupta
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** ~2 lines in typical mobile mail (~14px); avoids relying on CSS line-clamp in email clients */
function truncateMatchingReason(reason, maxChars = 148) {
  const s = String(reason ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const wordSafe = lastSpace > maxChars * 0.55 ? cut.slice(0, lastSpace) : cut;
  return `${wordSafe.trimEnd()}…`;
}

function buildEmailHtml({
  recipientName,
  matches,
  sessionUrl,
  sessionSummary,
  brand,
  role,
}) {
  const brandLabel = formatCommunityBrandLabel(brand);
  const r = normalizeRole(role);
  const lookingFor =
    r === "job_seeker"
      ? "jobs"
      : r === "recruiter"
        ? "candidates"
        : r === "friends"
          ? "friends"
          : "matches";

  const kavishaOrigin = getBrandOrigin("kavisha");
  const kavishaLabel = `kavisha.${getKavishaRootHost()}`;

  const summaryBlock =
    sessionSummary && String(sessionSummary).trim()
      ? `<p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.5;">We’re from ${escapeHtml(
        `${brandLabel}’s`,
      )} community, and you were looking for ${escapeHtml(
        lookingFor,
      )}.</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.5;"><strong style="display:block;margin-bottom:6px;color:#111;">${escapeHtml(
        "What you're looking for",
      )}</strong>${escapeHtml(String(sessionSummary).trim())}</p>`
      : "";

  const rows = matches
    .map(
      (m) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;">
        <strong>${escapeHtml(
        maskCommunityPeerName(m.matchedUserName || m.title || ""),
      )}</strong>
        ${m.matchPercentage
          ? ` <span style="color:#555;">— ${escapeHtml(m.matchPercentage)}</span>`
          : ""
        }
        ${m.matchingReason
          ? `<p style="margin:8px 0 0;font-size:14px;color:#333;line-height:1.35;">${escapeHtml(
            truncateMatchingReason(m.matchingReason),
          )}</p>`
          : ""
        }
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
  <p style="margin:0 0 12px;">Hey ${escapeHtml(recipientName || "there")},</p>
  ${summaryBlock}
  <p style="margin:0 0 8px;">Here are some matches for you:</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>

  <p style="margin:22px 0 0;text-align:center;">
    <a href="${escapeHtml(sessionUrl)}" style="display:inline-block;padding:10px 18px;background:#2d545e;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">View matches</a>
  </p>

  <hr style="margin:22px 0 14px;border:none;border-top:1px solid #e5e7eb;" />
  <p style="margin:0;text-align:center;font-size:12px;color:#6b7280;">
    This mail is powered by <a href="${escapeHtml(
    kavishaOrigin,
  )}" style="color:#2d545e;text-decoration:none;">${escapeHtml(
    kavishaLabel,
  )}</a>
  </p>
</body></html>`;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runCommunityMatchDigest({ dryRun = false } = {}) {
  await connectDB();

  const fromRaw = process.env.RESEND_FROM || "hello@kavisha.ai";
  const mailbox = fromRaw.includes("<")
    ? fromRaw.match(/<([^>]+)>/)?.[1]?.trim() || fromRaw
    : fromRaw.trim();

  const cutoff = new Date(
    Date.now() - MIN_HOURS_BETWEEN_DIGESTS * 60 * 60 * 1000,
  );

  const sessions = await Session.find({
    isCommunityChat: true,
    $or: [{ allDataCollected: true }, { onboardingPercent: { $gte: 40 } }],
    chatSummary: { $exists: true, $nin: [null, ""] },
    $or: [
      { communityMatchDigestLastSentAt: { $exists: false } },
      { communityMatchDigestLastSentAt: null },
      { communityMatchDigestLastSentAt: { $lt: cutoff } },
    ],
  })
    .select("_id userId role brand title updatedAt chatSummary communityMatchDigestLastSentAt")
    .populate("userId", "email name")
    .sort({ updatedAt: -1 })
    .limit(BATCH_LIMIT)
    .lean();

  let processed = 0;
  let emailsSent = 0;
  let skipped = 0;
  const errors = [];
  const recipients = [];
  let wouldSend = 0;

  for (const s of sessions) {
    if (skipRole(s.role)) {
      skipped++;
      continue;
    }
    const role = normalizeRole(s.role);
    const userDoc = s.userId;
    if (!userDoc?.email) {
      skipped++;
      continue;
    }

    const uid = String(userDoc._id || userDoc);
    const sid = String(s._id);
    const recipientEmail = String(userDoc.email || "").trim();

    try {
      const matches = await getMatches(uid, sid, role);
      processed++;
      if (!Array.isArray(matches) || matches.length === 0) {
        recipients.push({
          email: recipientEmail,
          sessionId: sid,
          brand: s.brand || "kavisha",
          sent: false,
          reason: "no_matches",
        });
        await delay(DELAY_MS);
        continue;
      }

      wouldSend++;
      const sessionUrl = `${getBrandOrigin(s.brand)}/community/${sid}`;
      const html = buildEmailHtml({
        recipientName: userDoc.name,
        matches,
        sessionUrl,
        sessionSummary: s.chatSummary,
        brand: s.brand || "kavisha",
        role,
      });

      const brandName = String(s.brand || "kavisha").trim() || "kavisha";
      const brandLabel = formatCommunityBrandLabel(s.brand || "kavisha");
      if (dryRun) {
        recipients.push({
          email: recipientEmail,
          sessionId: sid,
          brand: s.brand || "kavisha",
          sent: false,
          reason: "dry_run",
          matchCount: matches.length,
          sessionUrl,
        });
      } else {
        const result = await sendEmail({
          to: userDoc.email,
          from: `${brandName} community <${mailbox}>`,
          subject: `You’ve got a match! (${brandLabel}’s Community)`,
          body: html,
        });
        if (result.ok) {
          emailsSent++;
          // Mark digest as sent only after successful email.
          await Session.updateOne(
            { _id: s._id },
            { $set: { communityMatchDigestLastSentAt: new Date() } },
          );
          recipients.push({
            email: recipientEmail,
            sessionId: sid,
            brand: s.brand || "kavisha",
            sent: true,
            matchCount: matches.length,
            sessionUrl,
          });
        } else {
          errors.push(`${recipientEmail}: ${result.error}`);
          recipients.push({
            email: recipientEmail,
            sessionId: sid,
            brand: s.brand || "kavisha",
            sent: false,
            reason: "send_failed",
            error: String(result.error || "Send failed"),
          });
        }
      }
    } catch (e) {
      errors.push(`${sid}: ${e?.message || String(e)}`);
      recipients.push({
        email: recipientEmail,
        sessionId: sid,
        brand: s.brand || "kavisha",
        sent: false,
        reason: "exception",
        error: String(e?.message || e),
      });
    }
    await delay(DELAY_MS);
  }

  return {
    processed,
    emailsSent,
    wouldSend,
    dryRun: Boolean(dryRun),
    skipped,
    errors,
    recipients,
    batchLimit: BATCH_LIMIT,
    candidates: sessions.length,
  };
}

async function handleRequest(req) {
  // if (!authorizeCron(req)) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const url = new URL(req.url);
    const dryRun =
      url.searchParams.get("dryRun") === "1" ||
      url.searchParams.get("dryRun") === "true" ||
      req.headers.get("x-dry-run") === "1";

    const result = await runCommunityMatchDigest({ dryRun });
    await sendCronReport({
      subject: dryRun
        ? `[cron] community-match-digest DRY RUN — wouldSend ${result.wouldSend}`
        : `[cron] community-match-digest ok — emails ${result.emailsSent}`,
      html: `<pre>${JSON.stringify(
        {
          ...result,
          recipients: (result.recipients || []).map((r) => ({
            email: r.email,
            sent: r.sent,
            brand: r.brand,
            sessionId: r.sessionId,
            matchCount: r.matchCount,
            sessionUrl: r.sessionUrl,
            reason: r.reason,
            error: r.error,
          })),
        },
        null,
        2,
      )}</pre>`,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron] community-match-digest:", err);
    await sendCronReport({
      subject: `[cron] community-match-digest FAILED`,
      html: `<pre>${String(err?.message || err)}</pre>`,
    });
    return NextResponse.json(
      { success: false, error: err?.message || "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  return handleRequest(req);
}

/** External schedulers often call cron endpoints with GET and `?secret=` */
export async function GET(req) {
  return handleRequest(req);
}
