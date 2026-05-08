import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { createOrGetUser } from "../../lib/firebase/create-user";
import { SYSTEM_PROMPT_LEAD } from "../../lib/systemPrompt.js";
import { buildLeadRewritePrompt } from "../../lib/rewriteLeadQueryPrompt.js";
import { getLeadPromptFromSanity } from "../../lib/getLeadPromptFromSanity.js";
import {
  extractGeminiText,
  generateGeminiContentRest,
} from "../../lib/gemini-rest.js";
import { connectDB } from "../../lib/db.js";
import { enqueueCloudTask } from "../../lib/cloudTasks.js";

const LEAD_JOURNEY_GEMINI_MAX_429_RETRIES = 2;
const LEAD_JOURNEY_GEMINI_RETRY_DELAY_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ordered unique URLs + KB cards from Pinecone chunk metadata. */
function sourcesFromUsedChunkIds(usedChunkIds, uniqueContext) {
  const seen = new Set();
  const sourceUrls = [];
  const sourceCards = [];
  for (const chunkId of usedChunkIds) {
    const d = uniqueContext.get(chunkId);
    const url = (d?.url || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sourceUrls.push(url);
    sourceCards.push({
      url,
      title: String(d?.title ?? "").trim(),
      description: String(d?.description ?? "").trim(),
    });
  }
  return { sourceUrls, sourceCards };
}

const PUBLISHED_AT_MS_MIN = Date.UTC(1995, 0, 1);
function publishedAtMsMaxAllowed() {
  return Date.now() + 2 * 86400000;
}

/** Normalize rewriter output for Pinecone `publishedAtMs` (number metadata). */
function normalizeTimeFilterPublishedAtMs(raw) {
  if (raw == null || raw === false) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  let gte = raw.gte;
  let lte = raw.lte;
  if (gte != null && gte !== "") {
    const n = Number(gte);
    gte = Number.isFinite(n) ? n : undefined;
  } else gte = undefined;
  if (lte != null && lte !== "") {
    const n = Number(lte);
    lte = Number.isFinite(n) ? n : undefined;
  } else lte = undefined;
  if (gte === undefined && lte === undefined) return null;
  const hi = publishedAtMsMaxAllowed();
  const clamp = (x) => Math.min(hi, Math.max(PUBLISHED_AT_MS_MIN, x));
  if (gte !== undefined) gte = clamp(gte);
  if (lte !== undefined) lte = clamp(lte);
  if (gte !== undefined && lte !== undefined && gte > lte) return null;
  /** @type {{ gte?: number, lte?: number }} */
  const out = {};
  if (gte !== undefined) out.gte = gte;
  if (lte !== undefined) out.lte = lte;
  return out;
}

/** Pinecone metadata filter: only matches records that have numeric `publishedAtMs` in range. */
function buildPublishedAtMsMetadataFilter(t) {
  if (!t || (t.gte === undefined && t.lte === undefined)) return null;
  const inner = {};
  if (t.gte !== undefined) inner.$gte = t.gte;
  if (t.lte !== undefined) inner.$lte = t.lte;
  return { publishedAtMs: inner };
}

/** Parse Part 2 JSON array of chunk ids (verbatim ids from context). */
function extractChunkIdsFromPart4(chunkIdsPart) {
  const raw = typeof chunkIdsPart === "string" ? chunkIdsPart.trim() : "";
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === "string" && id.trim());
    }
  } catch {
    const jsonArrayMatch = raw.match(/\[(.*?)\]/);
    if (jsonArrayMatch) {
      try {
        const parsed = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "string" && id.trim());
        }
      } catch {
        const quotedIds = raw.match(/"([^"]+)"/g);
        if (quotedIds) {
          return quotedIds
            .map((q) => q.replace(/"/g, ""))
            .filter((id) => id.trim());
        }
      }
    }
  }
  return [];
}

function mergePineconeIntoUniqueContext(uniqueContext, results, results2) {
  results?.matches?.forEach((match) => {
    uniqueContext.set(match.id, {
      text: match.metadata?.text || "",
      url: match.metadata?.chunkSourceUrl || "",
      title: String(match.metadata?.title || "").trim(),
      description: String(match.metadata?.description || "").trim(),
    });
  });
  results2?.result?.hits?.forEach((hit) => {
    if (!uniqueContext.has(hit._id)) {
      uniqueContext.set(hit._id, {
        text: hit.fields?.text || "",
        url: hit.fields?.chunkSourceUrl || hit.chunkSourceUrl || "",
        title: String(hit.fields?.title || "").trim(),
        description: String(hit.fields?.description || "").trim(),
      });
    }
  });
}

function serializeError(error) {
  if (!error) return null;

  return {
    name: error.name || "Error",
    message: error.message || "Unknown error",
    ...(error.code ? { code: error.code } : {}),
    ...(error.status ? { status: error.status } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

function errorResponse(status, error, stage, details = null) {
  return NextResponse.json(
    {
      error,
      stage,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function isRetryableGemini429(error) {
  return error?.status === 429 || error?.vertexStatus === "RESOURCE_EXHAUSTED";
}

function responseStatusForVertexError(error) {
  return isRetryableGemini429(error) ? 429 : 500;
}

async function generateLeadJourneyGeminiContent(params) {
  let lastError;

  for (
    let attempt = 0;
    attempt <= LEAD_JOURNEY_GEMINI_MAX_429_RETRIES;
    attempt++
  ) {
    try {
      return await generateGeminiContentRest(params);
    } catch (error) {
      lastError = error;

      if (
        attempt === LEAD_JOURNEY_GEMINI_MAX_429_RETRIES ||
        !isRetryableGemini429(error)
      ) {
        throw error;
      }

      await delay(LEAD_JOURNEY_GEMINI_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json();
        const history = Array.isArray(body.history) ? body.history : [];
        const { userMessage, sessionId } = body;
        const dbUser = await createOrGetUser(decodedToken);
        const user = {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          profileType: dbUser.profileType,
          isAdmin: dbUser.isAdmin || false,
        };
        if (!sessionId) {
          return errorResponse(400, "Missing sessionId", "validate-session");
        }
        await connectDB();

        // Get brand and serviceKey from session (single source of truth; no client override)
        const session = await Session.findById(sessionId)
          .select("brand serviceKey chatSummary summaryPendingCount userId")
          .lean();
        if (!session) {
          return errorResponse(404, "Session not found", "load-session");
        }
        const sessionOwnerId =
          session.userId != null ? String(session.userId) : "";
        if (!sessionOwnerId || sessionOwnerId !== user.id) {
          return errorResponse(
            403,
            "Forbidden — session does not belong to this user",
            "validate-session-owner"
          );
        }
        const brand = session.brand;
        const serviceKey = session.serviceKey;
        const chatSummary = String(session.chatSummary || "").trim();
        if (!brand || !serviceKey) {
          return errorResponse(
            400,
            "Session missing brand or serviceKey",
            "validate-session-config",
            { brandPresent: Boolean(brand), serviceKeyPresent: Boolean(serviceKey) }
          );
        }

        const prompt = await getLeadPromptFromSanity(brand, serviceKey);

        let sourceChunkIds = [];
        let sourceUrls = [];
        let sourceCards = [];
        const modelName = process.env.AI_MODEL ?? "gemini-3.1-flash-lite";

        if (!modelName) {
          return errorResponse(500, "AI model not configured", "load-model");
        }
        // Get messages excluding the current/last message
        const messagesExcludingCurrent =
          history.length > 1 ? history.slice(0, -1) : [];

        const fullFormattedHistory = history
          .map((h) => `${h.role}: ${h.message || h.text || ""}`)
          .join("\n");
        const lastTwoPairs =
          messagesExcludingCurrent.length >= 4
            ? messagesExcludingCurrent.slice(-4) // Last 4 messages
            : messagesExcludingCurrent.length >= 2
              ? messagesExcludingCurrent.slice(-2) // Last 2 messages
              : messagesExcludingCurrent; // All available (0, 1, or 2)
        const formattedHistory = lastTwoPairs
          .map((h) => `${h.role}: ${h.message || h.text || ""}`)
          .join("\n");

        const referenceNowMsUtc = Date.now();
        const referenceNowIsoUtc = new Date(referenceNowMsUtc).toISOString();
        const rewritePrompt = buildLeadRewritePrompt(
          formattedHistory,
          userMessage,
          referenceNowIsoUtc,
          referenceNowMsUtc
        );
        const responseQuery = await generateLeadJourneyGeminiContent({
          modelName,
          location: "global",
          contents: [
            {
              role: "user",
              parts: [{ text: rewritePrompt }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        });

        let responseText = extractGeminiText(responseQuery);

        // Extract JSON (JSON mode should return raw object text; still tolerate markdown)
        let jsonText = responseText.trim();
        if (jsonText.includes("```")) {
          const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (match) jsonText = match[1];
        }

        let parsedResponse;
        try {
          parsedResponse = JSON.parse(jsonText);
        } catch (error) {
          parsedResponse = { requery: userMessage, timeFilterPublishedAtMs: null };
        }

        const requery = parsedResponse?.requery;
        let betterQuery =
          requery !== undefined && requery !== null
            ? String(requery).trim()
            : userMessage;

        const timeFilterPublishedAtMs = normalizeTimeFilterPublishedAtMs(
          parsedResponse?.timeFilterPublishedAtMs
        );
        const pineconePublishedAtFilter =
          buildPublishedAtMsMetadataFilter(timeFilterPublishedAtMs);

        let context = "";
        const uniqueContext = new Map(); // Declare at higher scope so it's always available

        if (betterQuery && betterQuery !== '""' && betterQuery !== "''") {
          const userMessageEmbedding = await generateEmbedding(
            betterQuery,
            "RETRIEVAL_QUERY"
          );
          if (
            userMessageEmbedding === 0 ||
            !Array.isArray(userMessageEmbedding)
          ) {
            return errorResponse(500, "Failed to generate embedding", "generate-embedding");
          }

          // Validate embedding is a proper array with values
          if (userMessageEmbedding.length === 0) {
            return errorResponse(500, "Invalid embedding generated", "validate-embedding");
          }
          try {
            const runPineconeRetrieval = async (metadataFilter) => {
              const denseOpts = {
                vector: userMessageEmbedding,
                topK: 10,
                includeMetadata: true,
                includeValues: false,
                ...(metadataFilter ? { filter: metadataFilter } : {}),
              };
              const sparseQuery = {
                topK: 10,
                inputs: { text: betterQuery },
                ...(metadataFilter ? { filter: metadataFilter } : {}),
              };
              const [results, results2] = await Promise.all([
                pc.index("intelligent-kavisha").namespace(brand).query(denseOpts),
                pc
                  .index("kavisha-sparse")
                  .namespace(brand)
                  .searchRecords({ query: sparseQuery })
                  .catch(() => ({ result: { hits: [] } })),
              ]);
              const map = new Map();
              mergePineconeIntoUniqueContext(map, results, results2);
              return map;
            };

            if (pineconePublishedAtFilter) {
              try {
                const filteredMap = await runPineconeRetrieval(
                  pineconePublishedAtFilter
                );
                if (filteredMap.size > 0) {
                  filteredMap.forEach((v, k) => uniqueContext.set(k, v));
                } else {
                  const unfiltered = await runPineconeRetrieval(null);
                  unfiltered.forEach((v, k) => uniqueContext.set(k, v));
                }
              } catch {
                const unfiltered = await runPineconeRetrieval(null);
                unfiltered.forEach((v, k) => uniqueContext.set(k, v));
              }
            } else {
              const m = await runPineconeRetrieval(null);
              m.forEach((v, k) => uniqueContext.set(k, v));
            }

            const documentsForRerank = Array.from(uniqueContext.entries()).map(
              ([id, data]) => ({
                id,
                text: data?.text || "",
              })
            );

            if (documentsForRerank.length > 0) {
              // Skip reranking if we have 10 or fewer chunks (optimization)
              if (documentsForRerank.length <= 10) {

                context = documentsForRerank
                  .map(({ id, text }) => {
                    if (!text || !id) return "";
                    return `[CHUNK_ID:${id}] ${text}`;
                  })
                  .filter(Boolean)
                  .join("\n\n");
                sourceChunkIds = documentsForRerank.map(doc => doc.id).filter(Boolean);
              } else {
                // Rerank for larger contexts
                try {
                  const rerankOptions = {
                    topN: 10,
                    rankFields: ["text"],
                    returnDocuments: true,
                  };

                  const reranked = await pc.inference.rerank(
                    "bge-reranker-v2-m3",
                    betterQuery,
                    documentsForRerank,
                    rerankOptions
                  );

                  if (
                    reranked &&
                    reranked.data &&
                    Array.isArray(reranked.data) &&
                    reranked.data.length > 0
                  ) {
                    const rerankedItems = reranked.data.map((item) => {
                      let text = "";
                      let id = "";

                      if (item.document) {
                        text = item.document.text || "";
                        id = item.document.id || item.id || "";
                      }

                      return { text, id };
                    });
                    // Format context with chunk IDs: [CHUNK_ID:id] text
                    context = rerankedItems
                      .map((item) => {
                        if (!item.text || !item.id) return "";
                        return `[CHUNK_ID:${item.id}] ${item.text}`;
                      })
                      .filter(Boolean)
                      .join("\n\n");
                    sourceChunkIds = rerankedItems
                      .map((item) => item.id)
                      .filter(Boolean);

                  } else {
                    // Format context with chunk IDs when reranking fails
                    const contextItems = Array.from(uniqueContext.entries());
                    context = contextItems
                      .map(([id, data]) => {
                        if (!data?.text || !id) return "";
                        return `[CHUNK_ID:${id}] ${data.text}`;
                      })
                      .filter(Boolean)
                      .join("\n\n");
                    sourceChunkIds = Array.from(uniqueContext.keys());
                  }
                } catch (rerankError) {
                  // Format context with chunk IDs when reranking errors
                  const contextItems = Array.from(uniqueContext.entries());
                  context = contextItems
                    .map(([id, data]) => {
                      if (!data?.text || !id) return "";
                      return `[CHUNK_ID:${id}] ${data.text}`;
                    })
                    .filter(Boolean)
                    .join("\n\n");
                  sourceChunkIds = Array.from(uniqueContext.keys());
                }
              }
            } else {
              context = "";
            }
          } catch (pineconeError) {
            context = "";
          }
        } else {
          betterQuery = userMessage;
        }

        const citationAllowlistChunkIds =
          Array.isArray(sourceChunkIds) && sourceChunkIds.length > 0
            ? [...sourceChunkIds]
            : [];

        const fullName = user?.name || "";
        const firstName = fullName.split(" ")[0] || "";
        const nameInstruction = firstName
          ? `\n\nIMPORTANT - PERSONAL CONNECTION: The user's first name is "${firstName}". Use their name naturally in your responses when it feels appropriate and adds warmth to the conversation. Consider the conversation history - if you've already used their name recently, you don't need to repeat it. Use it when it feels natural: at the beginning of a new topic, when emphasizing a point, or when transitioning between ideas. The goal is to create a personal connection without overusing it. Let the conversation flow naturally and use their name when it genuinely enhances the interaction.`
          : "";



        const summaryBlock = chatSummary
          ? `SUMMARY:\n${chatSummary}`
          : "SUMMARY:\n(empty)";

        const finalPrompt = `${prompt}${nameInstruction}

              ${summaryBlock}

              RECENT MESSAGES:
              ${formattedHistory}

              RELEVANT CONTEXT (each chunk is marked with [CHUNK_ID:...]):
              ${context}

              USER QUESTION: ${betterQuery}

              IMPORTANT: The [CHUNK_ID:...] prefixes in RELEVANT CONTEXT are for your internal tracking only.
              Your visible answer (Part 1 only) must contain **zero** retrieval identifiers: no \`[CHUNK_ID:...]\`, and no bracketed strings that look like chunk ids (e.g. long tokens with underscores and hex, ending in \`_0\`, \`_1\`, etc.).
              Extract facts into clean prose; attribute in words when helpful (e.g. publication name), never by pasting ids.
              Follow the system instructions: respond as EXACTLY 2 parts separated by //// — Part 1 your reply, Part 2 a JSON array of the **full** chunk id strings you used from \`[CHUNK_ID:...]\` (use [] if none).`;

        const mainPrompt = finalPrompt + SYSTEM_PROMPT_LEAD;

        let geminiContents = [
          {
            role: "user",
            parts: [{ text: mainPrompt }],
          },
        ];

        try {
          const responseGemini = await generateLeadJourneyGeminiContent({
            modelName,
            location: "global",
            contents: geminiContents,
          });

          const responseText = extractGeminiText(responseGemini);
          const reParts = responseText.split("////").map((item) => item.trim());

          let reply = "";
          let usedChunkIds = [];

          if (reParts.length >= 2) {
            reply = reParts[0] || "";
            const chunkIdsPartRaw = reParts[1].trim();
            usedChunkIds = extractChunkIdsFromPart4(chunkIdsPartRaw);
            usedChunkIds = usedChunkIds.filter((id) =>
              citationAllowlistChunkIds.includes(id)
            );
          } else {
            reply = responseText.trim();
            usedChunkIds = [];
          }

          if (usedChunkIds.length > 0) {
            const next = sourcesFromUsedChunkIds(usedChunkIds, uniqueContext);
            sourceUrls = next.sourceUrls;
            sourceCards = next.sourceCards;
            sourceChunkIds = usedChunkIds;
          } else {
            sourceUrls = [];
            sourceCards = [];
            sourceChunkIds = [];
          }

          try {
            await Logs.create({
              message: userMessage || "",
              altMessage: betterQuery || "",
              sessionId: sessionId,
              userId: user.id,
              role: "user",
            });

            await Logs.create({
              message: reply || "",
              sessionId: sessionId,
              userId: user.id,
              role: "assistant",
              sourceUrls: Array.isArray(sourceUrls) ? sourceUrls : [],
              sourceCards: Array.isArray(sourceCards) ? sourceCards : [],
              sourceChunkIds: Array.isArray(sourceChunkIds) ? sourceChunkIds : [],
            });

            const updated = await Session.findOneAndUpdate(
              { _id: sessionId },
              { $inc: { summaryPendingCount: 2 } },
              { new: true, select: "summaryPendingCount" }
            ).lean();

            const pending = Number(updated?.summaryPendingCount || 0);
            const tasksSecret = process.env.TASKS_SECRET;

            if (pending >= 4 && tasksSecret) {
              try {
                const requestOrigin = new URL(req.url).origin;
                const baseUrl =
                  process.env.PUBLIC_BASE_URL ||
                  process.env.BASE_URL ||
                  requestOrigin;
                await enqueueCloudTask({
                  url: `${baseUrl.replace(/\/$/, "")}/api/tasks/summarize-session`,
                  payload: { sessionId },
                  // Unique name per enqueue: Cloud Tasks forbids reusing the same task name for ~1h after completion (409 ALREADY_EXISTS).
                  taskNameSuffix: `summarize-${sessionId}-${Date.now()}`,
                  headers: { "x-tasks-secret": tasksSecret },
                });
              } catch (e) {
                console.error(
                  "[lead-journey] summarize Cloud Task enqueue failed:",
                  e?.message || e
                );
              }
            }
          } catch (persistErr) {
            console.error("[lead-journey] log/session update failed:", persistErr);
          }

          return NextResponse.json({
            reply,
            requery: betterQuery,
            sourceUrls,
            sourceCards,
          });
        } catch (error) {
          const status = responseStatusForVertexError(error);
          const message =
            status === 429
              ? "Rate limited; please try again later"
              : "Failed to generate AI response";
          return errorResponse(status, message, "generate-main-response", serializeError(error));
        }
      } catch (error) {
        const status = responseStatusForVertexError(error);
        const message =
          status === 429
            ? "Rate limited; please try again later"
            : "Lead journey request failed";
        return errorResponse(status, message, "unhandled", serializeError(error));
      }
    },
  });
}
