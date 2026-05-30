import { generateEmbedding } from "./embeddings.js";
import pc from "./pinecone.js";
import Logs from "../models/ChatLogs.js";
import Session from "../models/ChatSessions.js";
import { SYSTEM_PROMPT_LEAD } from "./systemPrompt.js";
import { buildLeadRewritePrompt } from "./rewriteLeadQueryPrompt.js";
import { getBrandBySubdomain, getLeadPrompt } from "@/app/lib/brandRepository";
import { loadShopifySessionByBrand } from "@/app/lib/shopifyRepository";
import { SHOPIFY_COMMERCE_PROMPT } from "@/app/lib/shopifyCart";
import { isShopifyProductCard } from "@/app/lib/shopifyProductIngest";
import {
  extractGeminiText,
  generateGeminiContentRest,
} from "./gemini-rest.js";
import { connectDB } from "./db.js";
import { enqueueCloudTask } from "./cloudTasks.js";
import { recordKbChunkReferences } from "./recordKbChunkReferences.js";

const LEAD_JOURNEY_GEMINI_MAX_429_RETRIES = 2;
const LEAD_JOURNEY_GEMINI_RETRY_DELAY_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourcesFromUsedChunkIds(usedChunkIds, uniqueContext) {
  const seen = new Set();
  const sourceUrls = [];
  const sourceCards = [];
  const productCards = [];
  for (const chunkId of usedChunkIds) {
    const d = uniqueContext.get(chunkId);
    const url = (d?.url || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sourceUrls.push(url);
    const card = {
      url,
      title: String(d?.title ?? "").trim(),
      description: String(d?.description ?? "").trim(),
      docid: String(d?.docid ?? "").trim(),
    };
    if (isShopifyProductCard(d) || isShopifyProductCard(card)) {
      if (d?.shopifyProductId) card.shopifyProductId = d.shopifyProductId;
      if (d?.defaultVariantId) card.defaultVariantId = d.defaultVariantId;
      if (d?.price) card.price = d.price;
      if (d?.imageUrl) card.imageUrl = d.imageUrl;
      productCards.push(card);
    } else {
      sourceCards.push(card);
    }
  }
  return { sourceUrls, sourceCards, productCards };
}

function commerceMetaFromMatch(meta) {
  return {
    shopifyProductId: String(meta?.shopifyProductId || "").trim(),
    defaultVariantId: String(meta?.defaultVariantId || "").trim(),
    price: String(meta?.price || "").trim(),
    imageUrl: String(meta?.imageUrl || "").trim(),
  };
}

function contextEntryFromFields(fields, docid) {
  const commerce = commerceMetaFromMatch(fields);
  return {
    text: fields?.text || "",
    url: fields?.chunkSourceUrl || fields?.url || "",
    title: String(fields?.title || "").trim(),
    description: String(fields?.description || "").trim(),
    docid: String(docid || fields?.docid || "").trim(),
    ...commerce,
  };
}

const PUBLISHED_AT_MS_MIN = Date.UTC(1995, 0, 1);
function publishedAtMsMaxAllowed() {
  return Date.now() + 2 * 86400000;
}

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
  const out = {};
  if (gte !== undefined) out.gte = gte;
  if (lte !== undefined) out.lte = lte;
  return out;
}

function buildPublishedAtMsMetadataFilter(t) {
  if (!t || (t.gte === undefined && t.lte === undefined)) return null;
  const inner = {};
  if (t.gte !== undefined) inner.$gte = t.gte;
  if (t.lte !== undefined) inner.$lte = t.lte;
  return { publishedAtMs: inner };
}

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
    const meta = match.metadata || {};
    uniqueContext.set(match.id, {
      text: meta.text || "",
      url: meta.chunkSourceUrl || "",
      title: String(meta.title || "").trim(),
      description: String(meta.description || "").trim(),
      docid: String(meta.docid || "").trim(),
      ...commerceMetaFromMatch(meta),
    });
  });
  results2?.result?.hits?.forEach((hit) => {
    const docid = String(hit.fields?.docid || "").trim();
    if (!uniqueContext.has(hit._id)) {
      uniqueContext.set(hit._id, contextEntryFromFields(hit.fields, docid));
    } else if (docid) {
      const cur = uniqueContext.get(hit._id);
      if (cur && !String(cur.docid || "").trim()) {
        uniqueContext.set(hit._id, { ...cur, docid, ...commerceMetaFromMatch(hit.fields) });
      }
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

export async function runLeadJourneyTurn({
  sessionId,
  user,
  userMessage,
  history,
  brand,
  serviceKey,
  chatSummary = "",
}) {
  try {
    await connectDB();

    const [prompt, brandDoc, shopifySession] = await Promise.all([
      getLeadPrompt(brand, serviceKey),
      getBrandBySubdomain(brand),
      loadShopifySessionByBrand(brand),
    ]);
    const shopifyCommerceEnabled = Boolean(
      shopifySession?.accessToken &&
        String(brandDoc?.shopifyShopUrl || "").trim()
    );

    let sourceChunkIds = [];
    let sourceUrls = [];
    let sourceCards = [];
    let productCards = [];
    const modelName = process.env.AI_MODEL ?? "gemini-3.1-flash-lite";

    if (!modelName) {
      return {
        ok: false,
        status: 500,
        error: "AI model not configured",
        stage: "load-model",
      };
    }

    const messagesExcludingCurrent =
      history.length > 1 ? history.slice(0, -1) : [];

    const lastTwoPairs =
      messagesExcludingCurrent.length >= 4
        ? messagesExcludingCurrent.slice(-4)
        : messagesExcludingCurrent.length >= 2
          ? messagesExcludingCurrent.slice(-2)
          : messagesExcludingCurrent;
    const formattedHistory = lastTwoPairs
      .map((h) => `${h.role}: ${h.message || h.text || ""}`)
      .join("\n");

    const referenceNowMsUtc = Date.now();
    const referenceNowIsoUtc = new Date(referenceNowMsUtc).toISOString();
    const rewritePrompt = buildLeadRewritePrompt(
      formattedHistory,
      userMessage,
      referenceNowIsoUtc,
      referenceNowMsUtc,
      shopifyCommerceEnabled
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

    let jsonText = responseText.trim();
    if (jsonText.includes("```")) {
      const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (match) jsonText = match[1];
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonText);
    } catch {
      parsedResponse = {
        requery: userMessage,
        timeFilterPublishedAtMs: null,
        mode: "general",
      };
    }

    const commerceMode =
      shopifyCommerceEnabled &&
      String(parsedResponse?.mode || "").toLowerCase() === "commerce";

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
    const shopifyProductFilter = commerceMode
      ? { sourceType: { $eq: "shopify_product" } }
      : null;
    const pineconeMetadataFilter =
      shopifyProductFilter || pineconePublishedAtFilter;

    let context = "";
    const uniqueContext = new Map();

    if (betterQuery && betterQuery !== '""' && betterQuery !== "''") {
      const userMessageEmbedding = await generateEmbedding(
        betterQuery,
        "RETRIEVAL_QUERY"
      );
      if (
        userMessageEmbedding === 0 ||
        !Array.isArray(userMessageEmbedding)
      ) {
        return {
          ok: false,
          status: 500,
          error: "Failed to generate embedding",
          stage: "generate-embedding",
        };
      }

      if (userMessageEmbedding.length === 0) {
        return {
          ok: false,
          status: 500,
          error: "Invalid embedding generated",
          stage: "validate-embedding",
        };
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

        if (pineconeMetadataFilter) {
          try {
            const filteredMap = await runPineconeRetrieval(
              pineconeMetadataFilter
            );
            if (filteredMap.size > 0) {
              filteredMap.forEach((v, k) => uniqueContext.set(k, v));
            } else if (commerceMode) {
              const unfiltered = await runPineconeRetrieval(null);
              unfiltered.forEach((v, k) => {
                const docid = String(v?.docid || "");
                if (docid.startsWith("shopify-p-")) uniqueContext.set(k, v);
              });
            } else {
              const unfiltered = await runPineconeRetrieval(null);
              unfiltered.forEach((v, k) => uniqueContext.set(k, v));
            }
          } catch {
            const unfiltered = await runPineconeRetrieval(null);
            if (commerceMode) {
              unfiltered.forEach((v, k) => {
                const docid = String(v?.docid || "");
                if (docid.startsWith("shopify-p-")) uniqueContext.set(k, v);
              });
            } else {
              unfiltered.forEach((v, k) => uniqueContext.set(k, v));
            }
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
          if (documentsForRerank.length <= 10) {
            context = documentsForRerank
              .map(({ id, text }) => {
                if (!text || !id) return "";
                return `[CHUNK_ID:${id}] ${text}`;
              })
              .filter(Boolean)
              .join("\n\n");
            sourceChunkIds = documentsForRerank.map((doc) => doc.id).filter(Boolean);
          } else {
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
            } catch {
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
      } catch {
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

    const summaryStr = String(chatSummary || "").trim();
    const summaryBlock = summaryStr
      ? `SUMMARY:\n${summaryStr}`
      : "SUMMARY:\n(empty)";

    const commerceBlock = shopifyCommerceEnabled
      ? `\n\n${SHOPIFY_COMMERCE_PROMPT}\n`
      : "";

    const finalPrompt = `${prompt}${commerceBlock}${nameInstruction}

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

    const geminiContents = [
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

      const mainResponseText = extractGeminiText(responseGemini);
      const reParts = mainResponseText.split("////").map((item) => item.trim());

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
        reply = mainResponseText.trim();
        usedChunkIds = [];
      }

      if (usedChunkIds.length > 0) {
        const next = sourcesFromUsedChunkIds(usedChunkIds, uniqueContext);
        sourceUrls = next.sourceUrls;
        sourceCards = next.sourceCards;
        productCards = next.productCards;
        sourceChunkIds = usedChunkIds;
      } else {
        sourceUrls = [];
        sourceCards = [];
        productCards = [];
        sourceChunkIds = [];
      }

      let assistantLogId;
      try {
        await Logs.create({
          message: userMessage || "",
          altMessage: betterQuery || "",
          sessionId,
          userId: user.id,
          role: "user",
        });

        const assistantLog = await Logs.create({
          message: reply || "",
          sessionId,
          userId: user.id,
          role: "assistant",
          sourceUrls: Array.isArray(sourceUrls) ? sourceUrls : [],
          sourceCards: Array.isArray(sourceCards) ? sourceCards : [],
          productCards: Array.isArray(productCards) ? productCards : [],
          sourceChunkIds: Array.isArray(sourceChunkIds) ? sourceChunkIds : [],
        });
        assistantLogId = assistantLog?._id?.toString();

        const persistedChunkIds = Array.isArray(sourceChunkIds)
          ? sourceChunkIds.filter(Boolean)
          : [];
        if (persistedChunkIds.length > 0) {
          setImmediate(() => {
            void recordKbChunkReferences(
              brand,
              persistedChunkIds,
              uniqueContext
            );
          });
        }

        const updated = await Session.findOneAndUpdate(
          { _id: sessionId },
          { $inc: { summaryPendingCount: 2 } },
          { new: true, select: "summaryPendingCount summaryUpdatedAt" }
        ).lean();

        const pending = Number(updated?.summaryPendingCount || 0);
        const tasksSecret = process.env.TASKS_SECRET;
        if (
          tasksSecret &&
          (pending >= 6 || (pending >= 2 && !updated?.summaryUpdatedAt))
        ) {
          const baseUrl = String(
            process.env.CLOUD_TASKS_BASE_URL ||
              process.env.PUBLIC_BASE_URL ||
              process.env.BASE_URL ||
              ""
          )
            .trim()
            .replace(/\/$/, "");
          if (baseUrl) {
            try {
              await enqueueCloudTask({
                url: `${baseUrl}/api/tasks/summarize-session`,
                payload: { sessionId },
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
        }
      } catch (persistErr) {
        console.error("[lead-journey] log/session update failed:", persistErr);
      }

      return {
        ok: true,
        payload: {
          reply,
          requery: betterQuery,
          sourceUrls,
          sourceCards,
          productCards,
          ...(assistantLogId ? { assistantLogId } : {}),
        },
      };
    } catch (error) {
      const status = responseStatusForVertexError(error);
      const message =
        status === 429
          ? "Rate limited; please try again later"
          : "Failed to generate AI response";
      return {
        ok: false,
        status,
        error: message,
        stage: "generate-main-response",
        details: serializeError(error),
      };
    }
  } catch (error) {
    const status = responseStatusForVertexError(error);
    const message =
      status === 429
        ? "Rate limited; please try again later"
        : "Lead journey request failed";
    return {
      ok: false,
      status,
      error: message,
      stage: "unhandled",
      details: serializeError(error),
    };
  }
}
