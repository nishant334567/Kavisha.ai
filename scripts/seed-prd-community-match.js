/**
 * Backfills DerivedProfile for existing community ChatSessions (no inserts).
 * Same flow as POST /api/tasks/enrich-derived-profile: Gemini → payload, embedding on chatSummary.
 *
 * Query (no brand / role filter):
 *   isCommunityChat: true, non-empty chatSummary, optional allDataCollected (default true).
 *
 * MATCH_SEED_REQUIRE_ALL_DATA_COLLECTED (default true)
 * MATCH_SEED_SKIP_ALREADY_ENRICHED (default false)
 * MATCH_SEED_DELAY_MS (default 2000) — pause between sessions (reduces Vertex 429s)
 * MATCH_SEED_VERTEX_RETRIES (default 6) — Gemini + embedding retries on rate limit
 * MATCH_SEED_VERTEX_RETRY_BASE_MS (default 2500) — backoff base between retries
 * MATCH_SEED_MAX_SESSIONS (optional) — max sessions to enrich; omit or 0 = no cap
 */
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const mongoose = require("mongoose");

const root = path.join(__dirname, "..");
if (fs.existsSync(path.join(root, ".env.local"))) {
  require("dotenv").config({ path: path.join(root, ".env.local") });
}

const { connectDB } = require(path.join(root, "app/lib/db.js"));
const Session = require(path.join(root, "app/models/ChatSessions.js"));
const DerivedProfile = require(path.join(root, "app/models/DerivedProfile.js"));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function isVertexRateLimitError(err) {
  const m = String(err?.message || err || "");
  return /429|RESOURCE_EXHAUSTED|Too Many Requests|Resource exhausted|quota/i.test(m);
}

async function generateContentWithRetries(model, requestPayload, { maxAttempts, baseDelayMs }) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await model.generateContent(requestPayload);
    } catch (e) {
      lastErr = e;
      const retryable = i < maxAttempts - 1 && isVertexRateLimitError(e);
      if (!retryable) throw e;
      const wait = baseDelayMs * (i + 1);
      console.warn(`[Gemini retry ${i + 1}/${maxAttempts}] waiting ${wait}ms`);
      await delay(wait);
    }
  }
  throw lastErr;
}

async function embeddingWithRetries(generateEmbeddingWithDebug, text, taskType, { maxAttempts, baseDelayMs }) {
  let lastDetail = "";
  for (let i = 0; i < maxAttempts; i++) {
    const { embedding, error } = await generateEmbeddingWithDebug(text, taskType);
    if (Array.isArray(embedding) && embedding.length > 0) {
      return embedding;
    }
    const status = error?.status;
    const msg = error?.message || "";
    lastDetail = msg ? `${msg}${status != null ? ` (HTTP ${status})` : ""}` : "empty embedding";
    const retryable =
      i < maxAttempts - 1 &&
      (status === 429 ||
        /429|RESOURCE_EXHAUSTED|quota|rate|exhausted/i.test(msg) ||
        status >= 500);
    if (!retryable) {
      throw new Error(lastDetail || "Embedding API returned no vector");
    }
    const wait = baseDelayMs * (i + 1);
    console.warn(`[embedding retry ${i + 1}/${maxAttempts}] waiting ${wait}ms`);
    await delay(wait);
  }
  throw new Error(`Embedding failed after retries: ${lastDetail}`);
}

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
  return safeJsonParse(text.slice(start, end + 1));
}

function normalizePayload(parsedPayload, schema) {
  const out = { ...schema };
  if (!parsedPayload || typeof parsedPayload !== "object") return out;
  for (const k of Object.keys(schema)) {
    if (k in parsedPayload) out[k] = parsedPayload[k];
  }
  return out;
}

async function loadAiModules() {
  const embUrl = pathToFileURL(path.join(root, "app/lib/embeddings.js")).href;
  const aiUrl = pathToFileURL(path.join(root, "app/lib/getAiModel.js")).href;
  const { generateEmbeddingWithDebug } = await import(embUrl);
  const { default: getGeminiModel } = await import(aiUrl);
  return { generateEmbeddingWithDebug, getGeminiModel };
}

async function loadCommunityRoleLib() {
  const url = pathToFileURL(path.join(root, "app/lib/communitySessionRole.js")).href;
  return import(url);
}

async function enrichDerivedLikeApi(
  sessionDoc,
  { generateEmbeddingWithDebug, getGeminiModel, vertexRetries, vertexRetryBaseMs },
  { schemaForType, normalizeSessionRole }
) {
  const retryOpts = { maxAttempts: vertexRetries, baseDelayMs: vertexRetryBaseMs };
  const summary = sessionDoc.chatSummary || "";
  const type =
    normalizeSessionRole(sessionDoc.role) ?? String(sessionDoc.role || "").trim();
  const source = getSourceFromSession(sessionDoc);

  const model = getGeminiModel("gemini-2.5-flash");
  if (!model) {
    throw new Error(
      "Vertex / Gemini not configured (GOOGLE_CLOUD_PROJECT, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY)"
    );
  }

  const schema = schemaForType(sessionDoc.role);
  const schemaJson = JSON.stringify({ payload: schema }, null, 2);
  const prompt = [
    "You extract structured fields from a user profile summary.",
    "Return ONLY valid JSON. No markdown, no backticks, no extra text.",
    "",
    `Type: ${type || sessionDoc.role || ""}`,
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

  const response = await generateContentWithRetries(
    model,
    { contents: [{ role: "user", parts: [{ text: prompt }] }] },
    retryOpts
  );

  const text =
    response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = safeJsonParse(text) || extractFirstJsonObject(text);
  const payloadRaw =
    parsed?.payload && typeof parsed.payload === "object" ? parsed.payload : null;
  if (!payloadRaw) {
    throw new Error(`Gemini JSON parse failed for session ${sessionDoc._id}: ${text.slice(0, 200)}`);
  }

  const payload = normalizePayload(payloadRaw, schema);

  const embedding = await embeddingWithRetries(
    generateEmbeddingWithDebug,
    summary,
    "RETRIEVAL_DOCUMENT",
    retryOpts
  );

  await DerivedProfile.updateOne(
    { sessionId: sessionDoc._id },
    {
      $set: {
        userId: sessionDoc.userId,
        sessionId: sessionDoc._id,
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
}

function envBool(name, defaultVal) {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultVal;
  return !/^(0|false|no|off)$/i.test(String(v).trim());
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  const gapMs = Math.max(
    0,
    parseInt(process.env.MATCH_SEED_DELAY_MS || "2000", 10) || 2000
  );
  const vertexRetries = Math.max(
    1,
    parseInt(process.env.MATCH_SEED_VERTEX_RETRIES || "6", 10) || 6
  );
  const vertexRetryBaseMs = Math.max(
    500,
    parseInt(process.env.MATCH_SEED_VERTEX_RETRY_BASE_MS || "2500", 10) || 2500
  );
  const requireAllData = envBool("MATCH_SEED_REQUIRE_ALL_DATA_COLLECTED", true);
  const skipEnriched = envBool("MATCH_SEED_SKIP_ALREADY_ENRICHED", false);
  const maxSessions = Math.max(
    0,
    parseInt(process.env.MATCH_SEED_MAX_SESSIONS || "0", 10) || 0
  );

  const { generateEmbeddingWithDebug, getGeminiModel } = await loadAiModules();
  const { normalizeSessionRole } = await loadCommunityRoleLib();

  function schemaForType(type) {
    const c = normalizeSessionRole(type);
    if (c === "job_seeker") {
      return {
        locationCountry: null,
        locationCity: null,
        locationArea: null,
        workMode: "any",
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
        workMode: "any",
        salaryInr: null,
        urgentJoinInDays: null,
        employmentType: "unknown",
        requiredSkills: [],
      };
    }
    return {
      locationCountry: null,
      locationCity: null,
      meetupMode: "any",
      age: null,
      gender: "unknown",
      groupPreference: "any",
      intent: null,
      interests: [],
      dealbreakers: [],
    };
  }

  await connectDB();

  let enrichedSessionIds = [];
  if (skipEnriched) {
    enrichedSessionIds = await DerivedProfile.find({
      enrichmentStatus: "completed",
    })
      .distinct("sessionId")
      .then((ids) => ids.filter(Boolean));
  }

  const filter = {
    isCommunityChat: true,
    chatSummary: { $exists: true, $nin: [null, ""] },
  };
  if (requireAllData) filter.allDataCollected = true;
  if (enrichedSessionIds.length) {
    filter._id = { $nin: enrichedSessionIds };
  }

  let ok = 0;
  let failed = 0;
  let skippedEmpty = 0;
  let processed = 0;

  const cursor = Session.find(filter).sort({ createdAt: -1 }).lean().cursor();

  for await (const session of cursor) {
    if (!String(session.chatSummary || "").trim()) {
      skippedEmpty++;
      continue;
    }
    if (maxSessions > 0 && processed >= maxSessions) break;
    processed++;

    try {
      await enrichDerivedLikeApi(
        session,
        {
          generateEmbeddingWithDebug,
          getGeminiModel,
          vertexRetries,
          vertexRetryBaseMs,
        },
        { schemaForType, normalizeSessionRole }
      );
      ok++;
      if (skipEnriched) enrichedSessionIds.push(session._id);
    } catch (e) {
      failed++;
      console.error(`[fail] session=${session._id}:`, e?.message || e);
    }
    if (gapMs) await delay(gapMs);
  }

  console.log(
    `Done. enriched=${ok} failed=${failed} skippedEmptySummary=${skippedEmpty} processedAttempt=${processed} requireAllData=${requireAllData}` +
      (maxSessions > 0 ? ` maxSessions=${maxSessions}` : "")
  );
  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
