import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { extractGeminiText, generateGeminiContentRest } from "@/app/lib/gemini-rest";

/** @returns {null | { error: string, status: number }} */
function requireTasksSecret(request) {
  if (process.env.NODE_ENV === "production" && !process.env.TASKS_SECRET) {
    return { error: "TASKS_SECRET not configured", status: 503 };
  }
  const secret = process.env.TASKS_SECRET;
  if (!secret) return null;
  const got = request.headers.get("x-tasks-secret");
  if (got !== secret) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}

function formatMessagesForSummary(logs) {
  return logs
    .map((l) => `${l.role}: ${String(l.message || "").trim()}`)
    .filter(Boolean)
    .join("\n");
}

export async function POST(request) {
  try {
    const authErr = requireTasksSecret(request);
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    await connectDB();

    const session = await Session.findById(sessionId)
      .select("chatSummary summaryPendingCount")
      .lean();
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // No-op when nothing is pending (idempotent).
    const pending = Number(session.summaryPendingCount || 0);
    if (pending < 4) {
      return NextResponse.json({ ok: true, skipped: true, reason: "pending<4" });
    }

    const recentLogs = await Logs.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(4)
      .select("role message createdAt")
      .lean();

    const recent = formatMessagesForSummary([...recentLogs].reverse());
    const oldSummary = String(session.chatSummary || "").trim();

    const modelName = process.env.AI_MODEL_SUMMARY || process.env.AI_MODEL || "gemini-3.1-flash-lite";

    const prompt = [
      "You maintain a concise rolling conversation summary for future context.",
      "Update the summary using the previous summary + recent messages.",
      "",
      "Rules:",
      "- Output ONLY the updated summary text (no markdown, no headings).",
      "- Keep it short: aim <= 400 tokens. Hard cap: ~2500 characters.",
      "- Preserve stable user facts/preferences and important decisions.",
      "- Do not include any internal IDs like [CHUNK_ID:...].",
      "",
      "Previous summary (may be empty):",
      oldSummary ? oldSummary : "(empty)",
      "",
      "Recent messages:",
      recent ? recent : "(no recent messages)",
      "",
      "Updated summary:",
    ].join("\n");

    const resp = await generateGeminiContentRest({
      modelName,
      location: "global",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    });

    let nextSummary = extractGeminiText(resp);
    if (nextSummary.length > 2500) nextSummary = nextSummary.slice(0, 2500);

    await Session.updateOne(
      { _id: sessionId },
      { $set: { chatSummary: nextSummary, summaryUpdatedAt: new Date(), summaryPendingCount: 0 } }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Task failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

