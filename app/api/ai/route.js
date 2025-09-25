import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import { getToken } from "next-auth/jwt";
import Session from "@/app/models/ChatSessions";
import { getMatches } from "../matches/[sessionId]/route";
import { generateResumeContext } from "@/app/utils/resumeContextGenerator";
import { SYSTEM_PROMPT } from "@/app/lib/systemPrompt";
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI =(process.env.GOOGLE_CLOUD_PROJECT)? new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: "us-central1",
}):null;

const model = vertexAI?.getGenerativeModel({
  model: "gemini-2.5-flash",
});
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

    const geminiContents = [];

    // Add system prompt as user content
    if (finalSystemPrompt(prompt, type)) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `System: ${finalSystemPrompt(prompt, type)}` }],
      });
    }

    // Add resume context
    if (generateResumeContext(resumeText, type)) {
      geminiContents.push({
        role: "user",
        parts: [{ text: generateResumeContext(resumeText, type) }],
      });
    }

    // Add history
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

    const responseGemini = await model.generateContent({
      contents: geminiContents,
    });

    const reParts = responseGemini.response.candidates[0].content.parts[0].text
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
        { error: "something went wrong" },
        { status: 500 }
      );
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
