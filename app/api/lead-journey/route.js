import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { getUserFromDB } from "../../lib/firebase/get-user";
import { SYSTEM_PROMPT } from "../../lib/systemPrompt.js";
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
      const model = await getGeminiModel("gemini-2.5-flash");

      if (!model) {
        return NextResponse.json(
          { error: "AI model not available" },
          { status: 500 }
        );
      }
      const formattedHistory = history
        .map((h) => `${h.role}: ${h.message || h.text || ""}`)
        .join("\n");

      const lastTwoMessages = {
        lastUserQuery:
          history.length >= 3 ? history[history.length - 3]?.message : null,
        lastChatbotResponse:
          history.length >= 2 ? history[history.length - 2]?.message : null,
      };

      const rewriteQueryPrompt = `You are a query rewriter. Your task is to convert user messages into explicit search queries for document retrieval.

CONVERSATION  UPTIL NOW:
${formattedHistory}

CURRENT USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
1. If the user's message is short, ambiguous, or a follow-up (like "should i try?", "tell me more", "what about that?"), you MUST expand it using the conversation context to make it a complete, explicit query.
2. Extract the main topic/subject from the conversation history and incorporate it into the query.
3. If the user's message is already complete and explicit, return it as-is.
4. Remove conversational phrases and make it search-friendly.

EXAMPLES:
- User says "should i try?" in a conversation about investing → "should i try investing in stock market?"
- User says "tell me more" after discussing student assessment → "student assessment methods best practices"
- User says "what is machine learning?" → "what is machine learning?" (already complete)

CRITICAL RULES:
- Use the conversation history to understand what the user is referring to
- Expand incomplete queries by adding the relevant topic from the conversation
- ALWAYS return the COMPLETE query - never truncate or cut off mid-word
- If the user mentions a person's name, use the FULL name from context
- If the user mentions a company/topic, use the COMPLETE name/topic
- Output ONLY the complete rewritten query, nothing else. No explanations, no prefixes, no truncation.`;

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

      const betterQuery =
        responseQuery.response.candidates[0].content.parts[0].text;

      const userMessageEmbedding = await generateEmbedding(
        betterQuery,
        "RETRIEVAL_QUERY"
      );
      if (userMessageEmbedding === 0 || !Array.isArray(userMessageEmbedding)) {
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
      let context = "";
      try {
        const index = pc.index("intelligent-kavisha").namespace(brand);
        const results = await index.query({
          vector: userMessageEmbedding,
          topK: 2,
          includeMetadata: true,
          includeValues: false,
        });

        const results2 = await pc
          .index("kavisha-sparse")
          .namespace(brand)
          .searchRecords({
            query: {
              topK: 2,
              inputs: { text: betterQuery },
            },
          });
        results?.matches?.forEach((match) => {
          uniqueContext.set(match.id, match.metadata?.text);
        });

        results2?.result?.hits?.forEach((hit) => {
          if (!uniqueContext.has(hit._id)) {
            uniqueContext.set(hit._id, hit.fields?.text);
          }
        });

        context = [...uniqueContext.values()].join(" ");
      } catch (pineconeError) {
        context = "";
      }

      const finalPrompt = `${prompt}
CONVERSATION HISTORY:
${formattedHistory}

RELEVANT CONTEXT:
${context}

USER QUESTION: ${betterQuery}

Please provide a helpful response based on the above information:`;

      let geminiContents = [
        {
          role: "user",
          parts: [{ text: finalPrompt + SYSTEM_PROMPT }],
        },
      ];

      try {
        const responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        const responseText =
          responseGemini.response.candidates[0].content.parts[0].text;
        const reParts = responseText.split("////").map((item) => item.trim());

        if (reParts.length === 4) {
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
                    allDataCollected: reParts[3] === "true",
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
            allDataCollected: reParts[3],
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
