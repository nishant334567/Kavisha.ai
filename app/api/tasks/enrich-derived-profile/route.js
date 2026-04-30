import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import DerivedProfile from "@/app/models/DerivedProfile";
import getGeminiModel from "@/app/lib/getAiModel";

function getSourceFromSession(session) {
  if (session?.isCommunityChat) return "community";
  if (session?.isWidget) return "widget";
  if (session?.isJobsRequirementPost) return "jobs_requirement";
  return "direct";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const secret = process.env.TASKS_SECRET;
    if (secret) {
      const got = request.headers.get("x-tasks-secret");
      if (got !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    await connectDB();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.allDataCollected) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "allDataCollected is false" },
        { status: 200 }
      );
    }

    const model = getGeminiModel("gemini-2.5-flash");
    if (!model) {
      return NextResponse.json(
        { error: "Vertex AI is not configured. Set GCP env vars." },
        { status: 500 }
      );
    }

    const summary = session.chatSummary || "";
    const type = session.role || "";
    const source = getSourceFromSession(session);

    // Minimal extraction contract: return ONLY a JSON object with a `payload` key.
    const prompt = [
      "Extract structured fields from the user profile summary.",
      `Type: ${type}`,
      "Return ONLY valid JSON (no markdown).",
      "Schema:",
      "{",
      '  "payload": { ... },',
      "}",
      "",
      "Guidance:",
      "- Keep values normalized for filtering (numbers as numbers, booleans as booleans).",
      "- Only include fields you are confident about from the summary.",
      "",
      "Summary:",
      summary,
    ].join("\n");

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = safeJsonParse(text);
    const payload = parsed?.payload && typeof parsed.payload === "object" ? parsed.payload : {};

    await DerivedProfile.updateOne(
      { sessionId: session._id },
      {
        $set: {
          userId: session.userId,
          sessionId: session._id,
          type,
          source,
          summary,
          payload,
          enrichmentStatus: "completed",
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Task failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

