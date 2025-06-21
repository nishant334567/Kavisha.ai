import {
  SYSTEM_PROMPT_JOB_SEEKER,
  SYSTEM_PROMPT_RECRUITER,
} from "@/app/lib/systemPrompt";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { history, userMessage, jobseeker } = body;
    if (!userMessage || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const messages = [
      {
        role: "system",
        content: jobseeker ? SYSTEM_PROMPT_JOB_SEEKER : SYSTEM_PROMPT_RECRUITER,
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user", content: userMessage },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.1,
    });

    let replyAi = chatCompletion.choices[0].message.content;
    let [reply, jsonPart] = replyAi.split("////").map((item) => item.trim());
    let parsedData;
    let needsRePrompt = false;
    if (jsonPart) {
      try {
        parsedData = JSON.parse(jsonPart);
      } catch (e) {
        needsRePrompt = true;
      }
    } else {
      needsRePrompt = true;
    }

    // If the format is wrong, re-prompt the model once
    if (needsRePrompt) {
      const rePromptMessages = [
        ...messages,
        {
          role: "system",
          content:
            "You did not follow the required format. Please reformat your last answer as per the instructions: reply, then ////, then a valid JSON block, then ////. Never skip the JSON block, even if all values are null.",
        },
      ];
      const reChatCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: rePromptMessages,
        temperature: 0.1,
      });
      replyAi = reChatCompletion.choices[0].message.content;
      [reply, jsonPart] = replyAi.split("////").map((item) => item.trim());
      if (jsonPart) {
        try {
          parsedData = JSON.parse(jsonPart);
        } catch (e) {
          parsedData = undefined;
        }
      }
    }
    return NextResponse.json({ reply, parsedData });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "something went wrong", details: error.message },
      { status: 500 }
    );
  }
}
