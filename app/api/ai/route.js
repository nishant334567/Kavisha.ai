import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import Session from "@/app/models/ChatSessions";
import { getMatches } from "../matches/[sessionId]/route";
import { generateResumeContext } from "@/app/utils/resumeContextGenerator";
import {
  JOB_SEEKER_PROMPT,
  MAKE_FRIENDS_PROMPT,
  RECRUITER_PROMPT,
  SYSTEM_PROMPT,
} from "@/app/lib/systemPrompt";
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

const finalSystemPrompt = (prompt, type) => {
  if (prompt === "") {
    if (type === "job_seeker" || type === "JOB_SEEKER") {
      return SYSTEM_PROMPT + JOB_SEEKER_PROMPT;
    }
    if (type === "recruiter" || type === "RECRUITER") {
      return SYSTEM_PROMPT + RECRUITER_PROMPT;
    }
    if (type === "friends") {
      return SYSTEM_PROMPT + MAKE_FRIENDS_PROMPT;
    }
  }

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

        // Check if data is already collected - if so, preserve existing summary
        const existingSession = await Session.findById(sessionId);
        const isDataAlreadyCollected =
          existingSession?.allDataCollected === true;
        const existingSummary = existingSession?.chatSummary || "";

        const geminiContents = [];

        let systemPromptText = finalSystemPrompt(prompt, type);
        // If data is already collected, instruct AI to preserve the existing summary
        if (isDataAlreadyCollected && existingSummary) {
          systemPromptText += `\n\nCRITICAL: All required data has already been collected. In your response, you MUST return the EXACT same summary: "${existingSummary}". Do not modify, update, or change this summary in any way. This summary is used for matching and must remain unchanged. Only update your reply message (part 1), but keep the summary (part 2) exactly as shown above.`;
        }

        if (systemPromptText) {
          geminiContents.push({
            role: "user",
            parts: [{ text: `System: ${systemPromptText}` }],
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

        let responseGemini = await model.generateContent({
          contents: geminiContents,
        });

        let responseText =
          responseGemini.response.candidates[0].content.parts[0].text;
        let reParts = responseText.split("////").map((item) => item.trim());

        // Retry once if format is invalid
        if (reParts.length !== 4) {
          const retryContents = [...geminiContents];
          retryContents.push({
            role: "user",
            parts: [
              {
                text: `CRITICAL: Your response must have EXACTLY 4 parts separated by ////. You returned ${reParts.length} parts. Format: [reply] //// [summary] //// [title] //// [true/false]. Return ONLY these 4 parts, nothing else.`,
              },
            ],
          });
          responseGemini = await model.generateContent({
            contents: retryContents,
          });
          responseText =
            responseGemini.response.candidates[0].content.parts[0].text;
          reParts = responseText.split("////").map((item) => item.trim());
        }

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
            {
              error: "AI response format invalid",
              details: `Expected 4 parts, got ${reParts.length}`,
            },
            { status: 500 }
          );
        }

        let matchesLatest = [];
        if (allDataCollected === "true" && type !== "pitch_to_investor") {
          try {
            matchesLatest = await getMatches(userId, sessionId, type);
          } catch (error) {
            matchesLatest = [];
          }
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
          } catch (error) {}
        });

        return NextResponse.json({
          reply,
          summary,
          title,
          allDataCollected,
          matchesWithObjectIds: matchesLatest,
        });
      } catch (error) {
        return NextResponse.json(
          { error: "something went wrong", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
