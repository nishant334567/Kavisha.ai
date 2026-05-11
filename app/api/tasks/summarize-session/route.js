import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { extractGeminiText, generateGeminiContentRest } from "@/app/lib/gemini-rest";

/** Same delimiter as lead-journey Part 1 / Part 2 parsing. */
const TITLE_SUMMARY_SEP = "////";

const SYSTEM_SUMMARY_INSTRUCTION = `You update (1) a short chat list title and (2) a rolling plain-text summary for session context and admin skim.

Output format — exactly two parts separated by ${TITLE_SUMMARY_SEP} on one line (four slashes):
Part 1 — TITLE: a concise session title for sidebars (roughly 3–10 words; plain text; describe what the user is trying to do or asking about; no quotes or markdown).
Part 2 — SUMMARY: plain text only—no markdown headings, no "Part 1/2", no labeled bullets. Never include internal IDs like [CHUNK_ID:...].

Summary style — user-centric: lead with what the user asked, shared, wants, or decided (topics, facts, constraints). For each assistant message, add at most one short phrase on how the assistant helped—do not reproduce long assistant replies.

Merge the previous summary with the new logs: keep stable facts from the previous summary unless newer logs contradict them; when they conflict, prefer newer logs. If new logs add nothing material, keep the previous summary with light edits only. Refine the title when the conversation topic shifts meaningfully; otherwise keep the previous title’s intent.

Do not use ${TITLE_SUMMARY_SEP} inside the summary body. No text before Part 1 or after Part 2.`;

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

/** Build text for summarization (full assistant message text; user lines may include altMessage). */
function formatMessagesForSummary(logs) {
  return logs
    .map((l) => {
      const msg = String(l.message || "").trim();
      if (l.role === "user") {
        const alt = String(l.altMessage || "").trim();
        if (alt && alt !== msg) {
          return `user: ${msg}\n(user intent / retrieval query: ${alt})`;
        }
        return `user: ${msg}`;
      }
      return `assistant: ${msg}`;
    })
    .filter(Boolean)
    .join("\n\n");
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
      .select("chatSummary title summaryPendingCount summaryUpdatedAt")
      .lean();
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const pending = Number(session.summaryPendingCount || 0);
    // Matches lead-journey: enqueue after 3 user turns (3×2 log rows = 6).
    if (pending < 6) {
      return NextResponse.json({ ok: true, skipped: true, reason: "pending<6" });
    }

    const logFilter = { sessionId };
    if (session.summaryUpdatedAt) {
      logFilter.createdAt = { $gt: session.summaryUpdatedAt };
    }

    const sessionLogs = await Logs.find(logFilter)
      .sort({ createdAt: 1 })
      .select("role message altMessage createdAt")
      .lean();

    const conversationText = formatMessagesForSummary(sessionLogs).trim();
    if (sessionLogs.length === 0 || !conversationText) {
      console.warn("[summarize-session] skip summarize: no logs in window or empty content", {
        sessionId,
        logCount: sessionLogs.length,
      });
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          sessionLogs.length === 0 ? "no_logs_in_window" : "empty_log_messages",
      });
    }

    const oldSummary = String(session.chatSummary || "").trim();
    const oldTitle = String(session.title || "").trim();

    const modelName =
      process.env.AI_MODEL_SUMMARY || process.env.AI_MODEL || "gemini-3.1-flash-lite";

    const userTurn = [
      "Previous session title:",
      oldTitle ? oldTitle : "(none)",
      "",
      "Previous summary:",
      oldSummary ? oldSummary : "(empty)",
      "",
      "New chat logs since last summary update (chronological):",
      conversationText,
    ].join("\n");

    const resp = await generateGeminiContentRest({
      modelName,
      location: "global",
      systemInstruction: {
        parts: [{ text: SYSTEM_SUMMARY_INSTRUCTION }],
      },
      contents: [{ role: "user", parts: [{ text: userTurn }] }],
      generationConfig: {
        temperature: 0,
      },
    });

    const rawOut = extractGeminiText(resp);
    const parts = rawOut.split(TITLE_SUMMARY_SEP).map((p) => p.trim());
    let nextTitle = oldTitle;
    let nextSummary = rawOut;
    if (parts.length >= 2) {
      const t = parts[0].replace(/\s+/g, " ").trim();
      nextSummary = parts.slice(1).join(TITLE_SUMMARY_SEP).trim();
      if (t) nextTitle = t;
    }

    await Session.updateOne(
      { _id: sessionId },
      {
        $set: {
          title: nextTitle,
          chatSummary: nextSummary,
          summaryUpdatedAt: new Date(),
          summaryPendingCount: 0,
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Task failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
