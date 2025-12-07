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

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { userMessage, history, sessionId, brand, prompt, summary } =
        await req.json();
      const user = await getUserFromDB(decodedToken.email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await connectDB();
      let sourceChunkIds = [];
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
        console.error("Error parsing intent response:", error);

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
          redirectMessage = `I'd love to have a one-on-one conversation with you! To schedule a personal call with me, please complete a payment of ₹500 using the QR code below. Once the payment is confirmed, we can set up a time that works for both of us. Looking forward to our conversation!`;
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
          } catch (error) {
            console.error("Error saving logs:", error);
          }
        });

        return NextResponse.json({
          reply: redirectMessage,
          summary: summary || "",
          title: "Community Chat",
          intent: intent,
        });
      }

      let betterQuery = requery || userMessage;

      let context = "";
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

        const uniqueContext = new Map();
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
            uniqueContext.set(match.id, match.metadata?.text);
          });

          results2?.result?.hits?.forEach((hit) => {
            if (!uniqueContext.has(hit._id)) {
              uniqueContext.set(hit._id, hit.fields?.text);
            }
          });

          const documentsForRerank = Array.from(uniqueContext.entries()).map(
            ([id, text]) => ({
              id,
              text: text || "",
            })
          );

          if (documentsForRerank.length > 0) {
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

              console.log("Reranked : ", reranked);

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
                  .map((item) => item.text)
                  .filter(Boolean)
                  .join(" ");
                sourceChunkIds = rerankedItems
                  .map((item) => item.id)
                  .filter(Boolean);
              } else {
                context = [...uniqueContext.values()].join(" ");
                sourceChunkIds = Array.from(uniqueContext.keys());
              }
            } catch (rerankError) {
              context = [...uniqueContext.values()].join(" ");
              sourceChunkIds = Array.from(uniqueContext.keys());
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

      const finalPrompt = `${prompt}
CONVERSATION HISTORY:
${fullFormattedHistory}

RELEVANT CONTEXT:
${context}

USER QUESTION: ${betterQuery}

Please provide a helpful response based on the above information:`;

      let geminiContents = [
        {
          role: "user",
          parts: [{ text: finalPrompt + SYSTEM_PROMPT_LEAD }],
        },
      ];

      try {
        let responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        let responseText =
          responseGemini.response.candidates[0].content.parts[0].text;
        let reParts = responseText.split("////").map((item) => item.trim());

        if (reParts.length !== 3) {
          const strictPrompt = `CRITICAL: You MUST respond in EXACT format: [Your reply] //// [Summary] //// [Title]\n\nPrevious response was invalid. Retry with EXACT format - 3 parts separated by //// only.`;

          responseGemini = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      finalPrompt + SYSTEM_PROMPT_LEAD + "\n\n" + strictPrompt,
                  },
                ],
              },
            ],
          });

          responseText =
            responseGemini.response.candidates[0].content.parts[0].text;
          reParts = responseText.split("////").map((item) => item.trim());
        }

        if (reParts.length === 3) {
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
                sourceChunk: Array.isArray(sourceChunkIds)
                  ? sourceChunkIds
                  : [],
              });

              await Session.updateOne(
                { _id: sessionId },
                {
                  $set: {
                    chatSummary: reParts[1],
                    title: reParts[2],
                  },
                },
                { upsert: true }
              );
            } catch (error) {}
          });

          return NextResponse.json({
            reply: reParts[0],
            summary: reParts[1],
            title: reParts[2],
            requery: betterQuery,
            sources: sourceChunkIds,
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
