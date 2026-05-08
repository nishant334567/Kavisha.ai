import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { extractGeminiText, generateGeminiContentRest } from "@/app/lib/gemini-rest";

const SYSTEM_SUMMARY_INSTRUCTION = `You update a rolling plain-text summary of a chat session for (1) model context on later turns and (2) admin skim.

Output: plain text only—no markdown headings, no "Part 1/2", no labeled bullets. Never include internal IDs like [CHUNK_ID:...].

Be user-centric: lead with what the user asked, shared, wants, or decided (topics, facts, constraints). For each assistant message, add at most one short phrase on how the assistant helped (e.g. explained X, suggested Y)—do not reproduce long assistant replies.

Merge the previous summary with the new logs: keep stable facts from the previous summary unless newer logs contradict them; when they conflict, prefer newer logs. If new logs add nothing material, keep the previous summary with light edits only.

Respond with only the updated summary—no preamble, title, or explanation.`;

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
      .select("chatSummary summaryPendingCount summaryUpdatedAt")
      .lean();
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const pending = Number(session.summaryPendingCount || 0);
    if (pending < 4) {
      return NextResponse.json({ ok: true, skipped: true, reason: "pending<4" });
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

    const modelName =
      process.env.AI_MODEL_SUMMARY || process.env.AI_MODEL || "gemini-3.1-flash-lite";

    const userTurn = [
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

    const nextSummary = extractGeminiText(resp);

    await Session.updateOne(
      { _id: sessionId },
      {
        $set: {
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
