import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { getUserFromDB } from "../../lib/firebase/get-user";
import { SYSTEM_PROMPT_LEAD } from "../../lib/systemPrompt.js";
import { buildLeadRewritePrompt } from "../../lib/rewriteLeadQueryPrompt.js";
import getGeminiModel from "../../lib/getAiModel.js";
import { connectDB } from "../../lib/db.js";
import { client } from "../../lib/sanity.js";

// Simple token estimation: words * 1.33
function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.33);
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { userMessage, history, sessionId, brand, prompt, summary } =
        await req.json();
      const user = await getUserFromDB(decodedToken.email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      let inputToken = 0;
      let outputToken = 0;
      await connectDB();
      let sourceChunkIds = [];
      let sourceUrls = [];
      const model = getGeminiModel(process.env.AI_MODEL ?? "gemini-2.5-flash");

      if (!model) {
        return NextResponse.json(
          { error: "AI model not available" },
          { status: 500 }
        );
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
      const responseQuery = await model.generateContent({
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

      let responseText =
        responseQuery.response.candidates[0].content.parts[0].text.trim();
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
        parsedResponse = {
          changeIntent: false,
          requery: userMessage,
        };
      }

      const { changeIntent, requery, intent } = parsedResponse;

      if (changeIntent === true) {
        let redirectMessage;
        if (intent === "community_onboarding") {
          redirectMessage = `I'd be happy to help you with that! To join our community, connect with members, explore job opportunities, hire talent, or find friends, please start a new chat session with our community chatbot. They'll guide you through everything you need to know.`;
        }
        if (intent === "personal_call") {
          // Fetch acceptPayment setting from Sanity
          let acceptPayment = false;
          try {
            const brandData = await client.fetch(
              `*[_type == "brand" && subdomain == "${brand}"]{
                acceptPayment
              }[0]`
            );
            acceptPayment = brandData?.acceptPayment || false;
          } catch (error) { }

          if (acceptPayment) {
            redirectMessage = `I'd love to have a one-on-one conversation with you! To schedule a personal call with me, please complete a payment of ₹500 using the QR code below. Once the payment is confirmed, we can set up a time that works for both of us. Looking forward to our conversation!`;
          } else {
            redirectMessage = `I appreciate your interest in having a one-on-one call with me! However, my current schedule doesn't allow for personal calls right now. But don't worry - my avatar is here to help you with any questions or assistance you need. Feel free to continue our conversation, and I'll do my best to support you!`;
          }
        }

        setImmediate(async () => {
          try {
            await Logs.create({
              message: userMessage || "",
              sessionId: sessionId,
              userId: user.id,
              role: "user",
            });
            await Logs.create({
              message: redirectMessage,
              sessionId: sessionId,
              userId: user.id,
              role: "assistant",
            });
            // Update session with token counts
            await Session.updateOne(
              { _id: sessionId },
              {
                $inc: {
                  totalInputTokens: inputToken,
                  totalOutputTokens: outputToken,
                },
              }
            );
          } catch (error) { }
        });

        return NextResponse.json({
          reply: redirectMessage,
          summary: summary || "",
          title: "Community Chat",
          intent: intent,
          sources: [],
          sourceUrls: [],
          inputTokens: inputToken,
          outputTokens: outputToken,
          totalTokens: inputToken + outputToken,
        });
      }

      let betterQuery = requery || userMessage;

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
          return NextResponse.json(
            { error: "Failed to generate embedding" },
            { status: 500 }
          );
        }

        // Validate embedding is a proper array with values
        if (userMessageEmbedding.length === 0) {
          return NextResponse.json(
            { error: "Invalid embedding generated" },
            { status: 500 }
          );
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
        let responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        let responseText =
          responseGemini.response.candidates[0].content.parts[0].text;
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
          responseGemini = await model.generateContent({
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

          responseText =
            responseGemini.response.candidates[0].content.parts[0].text;
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
          return NextResponse.json(
            { error: "Unexpected response format from AI model" },
            { status: 500 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to generate AI response", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
