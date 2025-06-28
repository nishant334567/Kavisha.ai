import {
  SYSTEM_PROMPT_JOB_SEEKER,
  SYSTEM_PROMPT_RECRUITER,
} from "@/app/lib/systemPrompt";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import { getToken } from "next-auth/jwt";
import Session from "@/app/models/ChatSessions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function POST(request) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const body = await request.json();
    const { history, userMessage, jobseeker, sessionId, resume } = body;
    const resumeText = resume || "";
    const systemPrompt = `You are a job-matching assistant. If resume information is provided, consider it in every response before asking question. Also in subsequent convrsation user can update/tweak it, consider that.`;
    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Missing or invalid user message" },
        { status: 400 }
      );
    }

    await Logs.create({
      message: userMessage,
      sessionId: sessionId,
      userId: token.id,
      role: "user",
    });

    const messages = [
      {
        role: "system",
        content: jobseeker ? SYSTEM_PROMPT_JOB_SEEKER : SYSTEM_PROMPT_RECRUITER,
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.message,
      })),
      { role: "user", content: userMessage },
      { role: "system", content: systemPrompt },
      ...(resumeText
        ? [{ role: "system", content: `Resume: ${resumeText}` }]
        : []),
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.1,
    });

    let replyAi = chatCompletion.choices[0].message.content;
    let reply = "";
    let summary = "";
    let title = "";

    const parts = replyAi.split("////").map((item) => item.trim());
    if (parts.length >= 2) {
      reply = parts[0];
      summary = parts[1];
      title = parts.length >= 3 ? parts[2] : "";
    } else {
      const rePromptMessages = [
        ...messages,
        {
          role: "system",
          content:
            "You did not follow the required format. Please reformat your last answer as per the instructions: reply, then ////, then a summary, then ////. Never skip the summary, even if it's brief.",
        },
      ];
      const reChatCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: rePromptMessages,
        temperature: 0.1,
      });
      const reReplyAi = reChatCompletion.choices[0].message.content;
      const reParts = reReplyAi.split("////").map((item) => item.trim());
      if (reParts.length >= 2) {
        reply = reParts[0];
        summary = reParts[1];
        title = reParts.length >= 3 ? reParts[2] : "";
      } else {
        reply = reReplyAi.trim();
        summary = "";
      }
    }
    await Logs.create({
      message: reply,
      sessionId: sessionId,
      userId: token.id,
      role: "assistant",
    });

    await Session.updateOne(
      { _id: sessionId },
      { $set: { chatSummary: summary, title: title } },
      { upsert: true }
    );
    return NextResponse.json({ reply, summary, title });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "something went wrong", details: error.message },
      { status: 500 }
    );
  }
}
