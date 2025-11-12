import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import Session from "@/app/models/ChatSessions";
import { getMatches } from "../matches/[sessionId]/route";
import { generateResumeContext } from "@/app/utils/resumeContextGenerator";
import { SYSTEM_PROMPT } from "@/app/lib/systemPrompt";
import getGeminiModel from "@/app/lib/getAiModel";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  await connectDB();
  const logs = await Logs.find({ sessionId }).sort({ createdAt: 1 });
  return NextResponse.json({ logs });
}

const finalSystemPrompt = (prompt) => {
  return prompt + SYSTEM_PROMPT;
};
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const model = getGeminiModel("gemini-2.5-flash");

        if (!model) {
          return NextResponse.json(
            { error: "Vertex AI is not configured. Set GCP env vars." },
            { status: 500 }
          );
        }
        const body = await request.json();
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const {
          history,
          userMessage,
          sessionId,
          resume,
          type,
          prompt,
          userId,
        } = body;

        await connectDB();
        const resumeText = resume || "";

        const geminiContents = [];

        if (finalSystemPrompt(prompt, type)) {
          geminiContents.push({
            role: "user",
            parts: [{ text: `System: ${finalSystemPrompt(prompt, type)}` }],
          });
        }

        if (generateResumeContext(resumeText, type)) {
          geminiContents.push({
            role: "user",
            parts: [{ text: generateResumeContext(resumeText, type) }],
          });
        }

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

        geminiContents.push({
          role: "user",
          parts: [{ text: userMessage || "" }],
        });

        const responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        const reParts =
          responseGemini.response.candidates[0].content.parts[0].text
            .split("////")
            .map((item) => item.trim());

        let reply = "";
        let summary = "";
        let title = "";
        let allDataCollected = "";

        if (reParts.length === 4) {
          reply = reParts[0];
          summary = reParts[1];
          title = reParts[2];
          allDataCollected = reParts[3];
        } else {
          return NextResponse.json(
            { error: "AI response format invalid" },
            { status: 500 }
          );
        }

        let matchesLatest = [];
        if (allDataCollected === "true") {
          matchesLatest = await getMatches(userId, sessionId, type);
        }

        // Move DB operations to background
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
                  allDataCollected: allDataCollected === "true",
                },
              },
              { upsert: true }
            );
          } catch (error) {
            console.error("Background DB operations failed:", error);
          }
        });

        return NextResponse.json({
          reply,
          summary,
          title,
          allDataCollected,
          matchesWithObjectIds: matchesLatest,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { error: "something went wrong", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
