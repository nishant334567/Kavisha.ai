import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import { getToken } from "next-auth/jwt";
import Session from "@/app/models/ChatSessions";
import { getMatches } from "../matches/[sessionId]/route";
import Matches from "@/app/models/Matches";
import {
  createChatCompletion,
  createEmbedding,
} from "@/app/utils/getAiResponse";
import { generateMatchMessage } from "@/app/utils/matchMessageGenerator";
import { generateReprompt } from "@/app/utils/repromptGenerator";
import { generateResumeContext } from "@/app/utils/resumeContextGenerator";
import { SYSTEM_PROMPT } from "@/app/lib/systemPrompt";

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

const finalSystemPrompt = (prompt, role) => {
  return prompt + SYSTEM_PROMPT;
};
export async function POST(request) {
  try {
    const body = await request.json();
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const { history, userMessage, sessionId, resume, type, prompt, userId } =
      body;

    await connectDB();
    const resumeText = resume || "";

    await Logs.create({
      message: userMessage || "",
      sessionId: sessionId,
      userId: token.id,
      role: "user",
    });

    const messages = [
      {
        role: "system",
        content: finalSystemPrompt(prompt, type) || "",
      },
      {
        role: "user",
        content: generateResumeContext(resumeText, type) || "",
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.message || "",
      })),
      { role: "user", content: userMessage || "" },
    ];

    const chatCompletion = await createChatCompletion(
      "gpt-4o-mini",
      messages,
      0.7,
      800
    );

    let replyAi = chatCompletion.choices[0].message.content;
    let reply = "";
    let summary = "";
    let title = "";
    let allDataCollected = "false";

    // Simplified format parsing - avoid re-prompting loops
    const parts = replyAi.split("////").map((item) => item.trim());
    if (parts.length === 4) {
      reply = parts[0];
      summary = parts[1];
      title = parts[2];
      allDataCollected = parts[3]; // Keep as string
    } else {
      const originalReply = parts[0] || replyAi; // Use parts[0] if available, otherwise full response

      const rePromptMessages = [
        {
          role: "system",
          content: finalSystemPrompt(prompt, type) || "",
        },
        {
          role: "user",
          content: generateResumeContext(resumeText, type) || "",
        },

        ...history.map((m) => ({
          role: m.role,
          content: m.message || "",
        })),
        { role: "user", content: userMessage || "" },
        {
          role: "assistant",
          content: originalReply,
        },
        {
          role: "system",
          content: generateReprompt(originalReply),
        },
      ];

      const reChatCompletion = await createChatCompletion(
        "gpt-4o-mini",
        rePromptMessages,
        0.1,
        800
      );
      const reReplyAi = reChatCompletion.choices[0].message.content;
      const reParts = reReplyAi.split("////").map((item) => item.trim());
      if (reParts.length === 4) {
        reply = reParts[0];
        summary = reParts[1];
        title = reParts[2];
        allDataCollected = reParts[3];
      } else {
        return NextResponse.json(
          { error: "something went wrong" },
          { status: 500 }
        );
      }
    }
    let matchesLatest = [];
    if (allDataCollected === "true") {
      matchesLatest = await getMatches(userId, sessionId, type);
    }

    await Logs.create({
      message: reply,
      sessionId: sessionId,
      userId: token.id,
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
}
