import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { getUserFromDB } from "../../lib/firebase/get-user";
import { SYSTEM_PROMPT_LEAD } from "../../lib/systemPrompt.js";
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
      const model = await getGeminiModel("gemini-2.5-flash-lite");

      if (!model) {
        return NextResponse.json(
          { error: "AI model not available" },
          { status: 500 }
        );
      }
      // Get messages excluding the current/last message
      const messagesExcludingCurrent =
        history.length > 1 ? history.slice(0, -1) : [];

      // If 4+ messages available, take last 4; if 2-3 available, take last 2; otherwise take all
      const lastTwoPairs =
        messagesExcludingCurrent.length >= 4
          ? messagesExcludingCurrent.slice(-4) // Last 4 messages
          : messagesExcludingCurrent.length >= 2
            ? messagesExcludingCurrent.slice(-2) // Last 2 messages
            : messagesExcludingCurrent; // All available (0, 1, or 2)
      const formattedHistory = lastTwoPairs
        .map((h) => `${h.role}: ${h.message || h.text || ""}`)
        .join("\n");
      console.log(
        "Last 2 pairs (excluding current message): ",
        formattedHistory
      );
      const rewriteQueryPrompt = `If user is asking/questioning: rewrite to search query 
      (expand if unclear, return as-is if clear). if it just If closing/satisfied/not
       interested: return "".

Context: ${formattedHistory}
User: "${userMessage}"

Query or "":`;

      const responseQuery = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: rewriteQueryPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      });

      let betterQuery =
        responseQuery.response.candidates[0].content.parts[0].text.trim();
      console.log("betterQuery query prompt: ", betterQuery);

      // If empty string, skip embedding/search - conversation history is enough
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
          // Parallelize both Pinecone queries for better performance
          const [results, results2] = await Promise.all([
            pc.index("intelligent-kavisha").namespace(brand).query({
              vector: userMessageEmbedding,
              topK: 2,
              includeMetadata: true,
              includeValues: false,
            }),
            pc
              .index("kavisha-sparse")
              .namespace(brand)
              .searchRecords({
                query: {
                  topK: 2,
                  inputs: { text: betterQuery },
                },
              })
              .catch(() => ({ result: { hits: [] } })), // Fallback if sparse fails
          ]);
          results?.matches?.forEach((match) => {
            uniqueContext.set(match.id, match.metadata?.text);
          });

          results2?.result?.hits?.forEach((hit) => {
            if (!uniqueContext.has(hit._id)) {
              uniqueContext.set(hit._id, hit.fields?.text);
            }
          });

          context = [...uniqueContext.values()].join(" ");
          console.log("Context: ", context);
        } catch (pineconeError) {
          context = "";
        }
      } else {
        // Empty query means no lookup needed - use original message for final prompt
        betterQuery = userMessage;
      }

      // Use full history for final response (needs full context for quality)
      const fullFormattedHistory = history
        .map((h) => `${h.role}: ${h.message || h.text || ""}`)
        .join("\n");

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

        // Retry with stricter prompt if format is wrong
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
                sessionId: sessionId,
                userId: user.id,
                role: "user",
              });

              await Logs.create({
                message: reParts[0] || "",
                sessionId: sessionId,
                userId: user.id,
                role: "assistant",
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
