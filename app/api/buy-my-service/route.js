import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import Service from "@/app/models/Service";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { BUY_MY_SERVICE_PROMPT } from "@/app/lib/systemPrompt";
import getGeminiModel from "@/app/lib/getAiModel";

// Simple token estimation: words * 1.33
function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.33);
}

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        // Initialize AI model
        const model = getGeminiModel("gemini-2.5-flash");
        if (!model) {
          return NextResponse.json(
            { error: "Vertex AI is not configured. Set GCP env vars." },
            { status: 500 }
          );
        }

        // Get user and request data
        const body = await request.json();
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const { history, userMessage, sessionId, prompt } = body;
        await connectDB();

        // Get session to retrieve brand
        const session = await Session.findById(sessionId);
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        // Fetch all services for this brand
        const services = await Service.find({ brand: session.brand }).lean();

        // Build services context for AI
        let servicesContext = "";
        if (services.length > 0) {
          servicesContext = "\n\n**AVAILABLE SERVICES:**\n";
          services.forEach((service, index) => {
            servicesContext += `${index + 1}. **${service.name}**\n`;
            if (service.description) {
              servicesContext += `   Description: ${service.description}\n`;
            }
            servicesContext += "\n";
          });
          servicesContext +=
            "Use the above service information to help answer user questions, suggest relevant services, and provide service descriptions when appropriate. Always include service names and descriptions when recommending services.\n";
        } else {
          servicesContext =
            "\n\n**Note:** No services are currently available for this brand.\n";
        }

        // Build system prompt: service prompt + buy-my-service prompt + services context
        const systemPromptText =
          (prompt || "") + BUY_MY_SERVICE_PROMPT + servicesContext;

        // Prepare conversation for AI
        const geminiContents = [
          {
            role: "user",
            parts: [{ text: `System: ${systemPromptText}` }],
          },
        ];

        // Add conversation history
        history.forEach((m) => {
          if (m.role === "user") {
            geminiContents.push({
              role: "user",
              parts: [{ text: m.message || "" }],
            });
          } else if (m.role === "assistant") {
            geminiContents.push({
              role: "model",
              parts: [{ text: m.message || "" }],
            });
          }
        });

        // Add current user message
        geminiContents.push({
          role: "user",
          parts: [{ text: userMessage || "" }],
        });

        // Calculate tokens
        let inputToken = estimateTokens(systemPromptText);
        history.forEach((m) => {
          if (m.role === "user") {
            inputToken += estimateTokens(m.message || "");
          }
        });
        inputToken += estimateTokens(userMessage || "");

        // Generate AI response
        let responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        let responseText =
          responseGemini.response.candidates[0].content.parts[0].text;
        let outputToken = estimateTokens(responseText);

        // Parse response format: [reply] //// [summary] //// [title]
        let reParts = responseText.split("////").map((item) => item.trim());

        // Retry once if format is invalid
        if (reParts.length !== 3) {
          const retryPrompt = `CRITICAL: Your response must have EXACTLY 3 parts separated by ////. Format: [reply] //// [summary] //// [title]. Return ONLY these 3 parts.`;
          inputToken += estimateTokens(retryPrompt);

          const retryContents = [...geminiContents];
          retryContents.push({
            role: "user",
            parts: [{ text: retryPrompt }],
          });

          responseGemini = await model.generateContent({
            contents: retryContents,
          });
          responseText =
            responseGemini.response.candidates[0].content.parts[0].text;
          outputToken = estimateTokens(responseText);
          reParts = responseText.split("////").map((item) => item.trim());
        }

        // Extract response parts
        if (reParts.length !== 3) {
          return NextResponse.json(
            {
              error: "AI response format invalid",
              details: `Expected 3 parts, got ${reParts.length}`,
            },
            { status: 500 }
          );
        }

        const [reply, summary, title] = reParts;

        // Save logs and update session in background
        setImmediate(async () => {
          try {
            await Logs.create({
              message: userMessage || "",
              sessionId: sessionId,
              userId: user.id,
              role: "user",
            });

            await Logs.create({
              message: reply,
              sessionId: sessionId,
              userId: user.id,
              role: "assistant",
            });

            await Session.updateOne(
              { _id: sessionId },
              {
                $set: {
                  chatSummary: summary,
                  title: title,
                },
                $inc: {
                  totalInputTokens: inputToken,
                  totalOutputTokens: outputToken,
                },
              }
            );
          } catch (error) {
            console.error("Error saving logs/session:", error);
          }
        });

        return NextResponse.json({
          reply,
          summary,
          title,
          inputTokens: inputToken,
          outputTokens: outputToken,
          totalTokens: inputToken + outputToken,
        });
      } catch (error) {
        console.error("Error in buy-my-service API:", error);
        return NextResponse.json(
          { error: "something went wrong", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
