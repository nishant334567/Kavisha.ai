import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { getUserFromDB } from "../../lib/firebase/get-user";
import { SYSTEM_PROMPT_LEAD } from "../../lib/systemPrompt.js";
import { buildLeadRewritePrompt } from "../../lib/rewriteLeadQueryPrompt.js";
import { getLeadPromptFromSanity } from "../../lib/getLeadPromptFromSanity.js";
import {
  extractGeminiText,
  generateGeminiContentRest,
} from "../../lib/gemini-rest.js";
import { connectDB } from "../../lib/db.js";

const LEAD_JOURNEY_GEMINI_MAX_429_RETRIES = 2;
const LEAD_JOURNEY_GEMINI_RETRY_DELAY_MS = 1500;

// Simple token estimation: words * 1.33
function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.33);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        const { userMessage, history, sessionId, summary } = await req.json();
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return errorResponse(404, "User not found", "load-user");
        }
        if (!sessionId) {
          return errorResponse(400, "Missing sessionId", "validate-session");
        }
        await connectDB();

        // Get brand and serviceKey from session (single source of truth; no client override)
        const session = await Session.findById(sessionId)
          .select("brand serviceKey")
          .lean();
        if (!session) {
          return errorResponse(404, "Session not found", "load-session");
        }
        const brand = session.brand;
        const serviceKey = session.serviceKey;
        if (!brand || !serviceKey) {
          return errorResponse(
            400,
            "Session missing brand or serviceKey",
            "validate-session-config",
            { brandPresent: Boolean(brand), serviceKeyPresent: Boolean(serviceKey) }
          );
        }

        const prompt = await getLeadPromptFromSanity(brand, serviceKey);

        let inputToken = 0;
        let outputToken = 0;
        let sourceChunkIds = [];
        let sourceUrls = [];
        const modelName = process.env.AI_MODEL ?? "gemini-2.5-flash";

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

        const rewritePrompt = buildLeadRewritePrompt(
          formattedHistory,
          userMessage
        );
        inputToken += estimateTokens(rewritePrompt);
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
            temperature: 0.2,
          },
        });

        let responseText = extractGeminiText(responseQuery);
        outputToken += estimateTokens(responseText);

      // Extract JSON if wrapped in markdown
      let jsonText = responseText;
      if (jsonText.includes("```")) {
        const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (match) jsonText = match[1];
      }

        let parsedResponse;
        try {
          parsedResponse = JSON.parse(jsonText);
        } catch (error) {
          parsedResponse = { requery: userMessage };
        }

        const requery = parsedResponse?.requery;
        let betterQuery =
          requery !== undefined && requery !== null
            ? String(requery).trim()
            : userMessage;

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
          const [results, results2] = await Promise.all([
            pc.index("intelligent-kavisha").namespace(brand).query({
              vector: userMessageEmbedding,
              topK: 10,
              includeMetadata: true,
              includeValues: false,
            }),
            pc
              .index("kavisha-sparse")
              .namespace(brand)
              .searchRecords({
                query: {
                  topK: 10,
                  inputs: { text: betterQuery },
                },
              })
              .catch(() => ({ result: { hits: [] } })),
          ]);
          results?.matches?.forEach((match) => {
            uniqueContext.set(match.id, {
              text: match.metadata?.text || "",
              url: match.metadata?.chunkSourceUrl || "",
            });
          });

          results2?.result?.hits?.forEach((hit) => {

            if (!uniqueContext.has(hit._id)) {
              uniqueContext.set(hit._id, {
                text: hit.fields?.text || "",
                url: hit.fields?.chunkSourceUrl || hit.chunkSourceUrl || "",
              });
            }
          });

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

      const fullName = user?.name || "";
      const firstName = fullName.split(" ")[0] || "";
      const nameInstruction = firstName
        ? `\n\nIMPORTANT - PERSONAL CONNECTION: The user's first name is "${firstName}". Use their name naturally in your responses when it feels appropriate and adds warmth to the conversation. Consider the conversation history - if you've already used their name recently, you don't need to repeat it. Use it when it feels natural: at the beginning of a new topic, when emphasizing a point, or when transitioning between ideas. The goal is to create a personal connection without overusing it. Let the conversation flow naturally and use their name when it genuinely enhances the interaction.`
        : "";



      const finalPrompt = `${prompt}${nameInstruction}

              CONVERSATION HISTORY:
              ${fullFormattedHistory}

              RELEVANT CONTEXT (each chunk is marked with [CHUNK_ID:...]):
              ${context}

              USER QUESTION: ${betterQuery}

              IMPORTANT: The [CHUNK_ID:...] markers are for your internal tracking only. 
              Do NOT include these markers in your response text. 
              Extract the information but remove all [CHUNK_ID:...] markers from your answer.
              Only list the chunk IDs in Part 4 of your response.

              Please provide a helpful response based on the above information.`;

      const mainPrompt = finalPrompt + SYSTEM_PROMPT_LEAD;
      inputToken += estimateTokens(mainPrompt);

      let geminiContents = [
        {
          role: "user",
          parts: [{ text: mainPrompt }],
        },
      ];

      try {
        let responseGemini = await generateLeadJourneyGeminiContent({
          modelName,
          location: "global",
          contents: geminiContents,
        });

        let responseText = extractGeminiText(responseGemini);
        outputToken += estimateTokens(responseText);

        let reParts = responseText.split("////").map((item) => item.trim());

        // Extract chunk IDs from 4th part if present
        let usedChunkIds = [];
        if (reParts.length >= 4) {
          const chunkIdsPart = reParts[3].trim();
          try {
            // Try to parse as JSON array
            const parsed = JSON.parse(chunkIdsPart);
            if (Array.isArray(parsed)) {
              usedChunkIds = parsed.filter(id => typeof id === 'string' && id.trim());
            }
          } catch (e) {
            // If not valid JSON, try to extract from text
            const jsonArrayMatch = chunkIdsPart.match(/\[(.*?)\]/);
            if (jsonArrayMatch) {
              try {
                const parsed = JSON.parse(jsonArrayMatch[0]);
                if (Array.isArray(parsed)) {
                  usedChunkIds = parsed.filter(id => typeof id === 'string' && id.trim());
                }
              } catch (e2) {
                // Try extracting quoted strings
                const quotedIds = chunkIdsPart.match(/"([^"]+)"/g);
                if (quotedIds) {
                  usedChunkIds = quotedIds.map(q => q.replace(/"/g, '')).filter(id => id.trim());
                }
              }
            }
          }
        }

        // Filter to only include valid chunk IDs that exist in sourceChunkIds
        usedChunkIds = usedChunkIds.filter(id => sourceChunkIds.includes(id));

        // Map used chunk IDs to URLs (deduplicate with Set)
        if (usedChunkIds.length > 0) {
          const urlsSet = new Set();
          usedChunkIds.forEach((chunkId) => {
            const chunkData = uniqueContext.get(chunkId);
            const url = chunkData?.url || "";
            if (url && url.trim() !== "") {
              urlsSet.add(url);
            }
          });
          sourceUrls = Array.from(urlsSet);
          // Update sourceChunkIds to only include used ones
          sourceChunkIds = usedChunkIds;
        } else {
          // No chunks were used, return empty arrays
          sourceUrls = [];
          sourceChunkIds = [];
        }

        if (reParts.length !== 4) {
          const strictPrompt = `CRITICAL ERROR: Your previous response had ${reParts.length} parts but the format requires EXACTLY 4 parts separated by ////.\n\nYou MUST follow the format specified in the system instructions. This is MANDATORY, not optional.\n\nREMINDER: Do NOT include [CHUNK_ID:...] markers in your response text. Only list the chunk IDs in Part 4.\n\nPlease retry with the correct 4-part format.`;

          inputToken += estimateTokens(strictPrompt);
          responseGemini = await generateLeadJourneyGeminiContent({
            modelName,
            location: "global",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: mainPrompt + "\n\n" + strictPrompt,
                  },
                ],
              },
            ],
          });

          responseText = extractGeminiText(responseGemini);
          outputToken = estimateTokens(responseText);
          reParts = responseText.split("////").map((item) => item.trim());

          // Re-extract chunk IDs after retry
          if (reParts.length >= 4) {
            const chunkIdsPart = reParts[3].trim();
            try {
              const parsed = JSON.parse(chunkIdsPart);
              if (Array.isArray(parsed)) {
                usedChunkIds = parsed.filter(id => typeof id === 'string' && id.trim());
              }
            } catch (e) {
              const jsonArrayMatch = chunkIdsPart.match(/\[(.*?)\]/);
              if (jsonArrayMatch) {
                try {
                  const parsed = JSON.parse(jsonArrayMatch[0]);
                  if (Array.isArray(parsed)) {
                    usedChunkIds = parsed.filter(id => typeof id === 'string' && id.trim());
                  }
                } catch (e2) {
                  usedChunkIds = [];
                }
              }
            }
            usedChunkIds = usedChunkIds.filter(id => sourceChunkIds.includes(id));

            if (usedChunkIds.length > 0) {
              const urlsSet = new Set();
              usedChunkIds.forEach((chunkId) => {
                const chunkData = uniqueContext.get(chunkId);
                const url = chunkData?.url || "";
                if (url && url.trim() !== "") {
                  urlsSet.add(url);
                }
              });
              sourceUrls = Array.from(urlsSet);
              sourceChunkIds = usedChunkIds;
            } else {
              sourceUrls = [];
              sourceChunkIds = [];
            }
          }
        }

        if (reParts.length === 4) {
          setImmediate(async () => {
            try {
              await Logs.create({
                message: userMessage || "",
                altMessage: betterQuery || "",
                sessionId: sessionId,
                userId: user.id,
                role: "user",
              });

              await Logs.create({
                message: reParts[0] || "",
                sessionId: sessionId,
                userId: user.id,
                role: "assistant",
                sourceUrls: Array.isArray(sourceUrls) ? sourceUrls : [],
                sourceChunkIds: Array.isArray(sourceChunkIds) ? sourceChunkIds : [],
              });

              await Session.updateOne(
                { _id: sessionId },
                {
                  $set: {
                    chatSummary: reParts[1],
                    title: reParts[2],
                  },
                  $inc: {
                    totalInputTokens: inputToken,
                    totalOutputTokens: outputToken,
                  },
                },
                { upsert: true }
              );
            } catch (error) { }
          });


          return NextResponse.json({
            reply: reParts[0],
            summary: reParts[1],
            title: reParts[2],
            requery: betterQuery,
            sourceUrls: sourceUrls,
            inputTokens: inputToken,
            outputTokens: outputToken,
            totalTokens: inputToken + outputToken,
          });
        } else {
          return errorResponse(
            500,
            "Unexpected response format from AI model",
            "format-main-response",
            { partsReceived: reParts.length }
          );
        }
      } catch (error) {
        console.error("[lead-journey] Failed to generate AI response:", error);
        return errorResponse(
          500,
          "Failed to generate AI response",
          "generate-main-response",
          serializeError(error)
        );
      }
      } catch (error) {
        console.error("[lead-journey] Unhandled request error:", error);
        return errorResponse(
          500,
          "Lead journey request failed",
          "unhandled",
          serializeError(error)
        );
      }
    },
  });
}
