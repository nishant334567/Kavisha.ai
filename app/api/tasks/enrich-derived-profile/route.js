import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import DerivedProfile from "@/app/models/DerivedProfile";
import getGeminiModel from "@/app/lib/getAiModel";
import { generateEmbedding } from "@/app/lib/embeddings";
import { enqueueCloudTask } from "@/app/lib/cloudTasks";
import { normalizeSessionRole } from "@/app/lib/communitySessionRole";

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

function extractFirstJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  return safeJsonParse(candidate);
}

function schemaForType(type) {
  const c = normalizeSessionRole(type);
  if (c === "job_seeker") {
    return {
      locationCountry: null,
      locationCity: null,
      locationArea: null,
      workMode: "any", // remote | hybrid | onsite | any
      experienceYears: null,
      currentRole: null,
      targetRole: null,
      currentSalaryInr: null,
      expectedSalaryInr: null,
      noticePeriodDays: null,
      skills: [],
    };
  }
  if (c === "recruiter") {
    return {
      roleTitle: null,
      openings: null,
      experienceMinYears: null,
      experienceMaxYears: null,
      locationCountry: null,
      locationCity: null,
      workMode: "any", // remote | hybrid | onsite | any
      salaryInr: null,
      urgentJoinInDays: null,
      employmentType: "unknown", // permanent | contract | internship | unknown
      requiredSkills: [],
    };
  }
  // friends (and unknown → same schema)
  return {
    locationCountry: null,
    locationCity: null,
    meetupMode: "any", // online | offline | hybrid | any
    age: null,
    gender: "unknown", // male | female | other | unknown
    groupPreference: "any", // 1to1 | small | any
    intent: null,
    interests: [],
    dealbreakers: [],
  };
}

function normalizePayload(parsedPayload, schema) {
  const out = { ...schema };
  if (!parsedPayload || typeof parsedPayload !== "object") return out;
  for (const k of Object.keys(schema)) {
    if (k in parsedPayload) out[k] = parsedPayload[k];
  }
  return out;
}

export async function POST(request) {
  try {
    // const secret = process.env.TASKS_SECRET;
    // if (secret) {
    //   const got = request.headers.get("x-tasks-secret");
    //   if (got !== secret) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    //   }
    // }

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
    const type =
      normalizeSessionRole(session.role) ?? String(session.role || "").trim();
    const source = getSourceFromSession(session);

    const schema = schemaForType(session.role);
    const schemaJson = JSON.stringify({ payload: schema }, null, 2);

    const prompt = [
      "You extract structured fields from a user profile summary.",
      "Return ONLY valid JSON. No markdown, no backticks, no extra text.",
      "",
      `Type: ${type || session.role || ""}`,
      "",
      "Fill the JSON exactly matching this schema (same keys).",
      "- Use null when unknown.",
      "- Use numbers for numeric fields.",
      '- Salary fields must be in INR as an integer number of rupees (example: 16 LPA -> 1600000).',
      "- Enums:",
      '  - workMode: "remote" | "hybrid" | "onsite" | "any"',
      '  - meetupMode: "online" | "offline" | "hybrid" | "any"',
      '  - employmentType: "permanent" | "contract" | "internship" | "unknown"',
      '  - gender: "male" | "female" | "other" | "unknown"',
      '  - groupPreference: "1to1" | "small" | "any"',
      "",
      "Schema:",
      schemaJson,
      "",
      "Summary:",
      summary,
    ].join("\n");

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = safeJsonParse(text) || extractFirstJsonObject(text);
    const payloadRaw =
      parsed?.payload && typeof parsed.payload === "object" ? parsed.payload : null;

    // If parsing fails, return non-2xx so Cloud Tasks retries and we don't mark completed with empty payload.
    if (!payloadRaw) {
      return NextResponse.json(
        {
          error: "Extraction JSON parse failed",
          details: text.slice(0, 800),
        },
        { status: 500 }
      );
    }

    const payload = normalizePayload(payloadRaw, schema);

    const embedding = await generateEmbedding(summary, "RETRIEVAL_DOCUMENT");
    if (embedding === 0 || !Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json(
        { error: "Embedding generation failed" },
        { status: 500 }
      );
    }

    await DerivedProfile.updateOne(
      { sessionId: session._id },
      {
        $set: {
          userId: session.userId,
          sessionId: session._id,
          type,
          source,
          summary,
          embedding,
          payload,
          enrichmentStatus: "completed",
        },
      },
      { upsert: true }
    );

    // Option A: enqueue match computation after enrichment completes.
    try {
      const requestOrigin = new URL(request.url).origin;
      const baseUrl =
        process.env.PUBLIC_BASE_URL || process.env.BASE_URL || requestOrigin;
      await enqueueCloudTask({
        url: `${baseUrl}/api/tasks/compute-matches`,
        payload: { sessionId },
        headers: process.env.TASKS_SECRET
          ? { "x-tasks-secret": process.env.TASKS_SECRET }
          : {},
      });
    } catch (e) {
      // Best-effort enqueue; enrichment should still be considered successful.
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Task failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

