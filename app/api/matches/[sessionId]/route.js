import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getMatches(sessionId) {
  await connectDB();
  const session = await Session.findById({ _id: sessionId });

  const oppositeRole =
    session?.role === "job_seeker" ? "recruiter" : "job_seeker";
  const allProviders = await Session.find({
    role: oppositeRole,
    chatSummary: { $exists: true, $ne: "" },
  });

  const prompt = `
  You are a smart job-matching assistant.
  
  Your task is to compare one user [A] with multiple potential matches [B1, B2, ..., Bn] based on their chat summaries.
  
  [A] is a "${session?.role}" with the following requirements (chat summary):
  ---
  ${session?.chatSummary}
  ---
  
  Each [B] is a "${oppositeRole}" session with their own offering (chat summary):
  ${allProviders
    .map(
      (s, i) => `
  [B${i + 1}]
  "userId": "${s.userId}"
  "sessionId": "${s._id}"
  "chatSummary": "${s.chatSummary}"`
    )
    .join("\n")}
  ---
  
  Instructions:
  - Treat [A] as the *consumer* and each [B] as a *provider*.
  - Compare [A]'s requirements with each [B]'s chatSummary.
  - Select and recommend up to 10 of the most relevant matches.
  - For each selected match, return:
  
    {
      "userId": "...",             // from B
      "sessionId": "...",          // from B
      "matchingReason": "Explain briefly why this match is relevant",
      "chatSummary": "Summarize B's offering clearly"
    }
  
  Format:
  - Return ONLY a JSON array of matched objects (maximum 10).
  - Use double quotes for all keys.
  - DO NOT include any explanation, intro, or text outside the JSON.
  
  Strictly follow the format below:
  [
    {
      "userId": "...",
      "sessionId": "...",
      "matchingReason": "This is what Kavisha found for you because ...",
      "chatSummary": "chatSummary": "${
        oppositeRole === "recruiter"
          ? "Recruiter is looking for"
          : "Job Seeker is looking for"
      } ..."

    },
    ...
  ]
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  const responseText = completion.choices[0].message.content;

  const match = responseText.match(/\[\s*{[\s\S]*?}\s*\]/);

  let matches = [];
  if (match) {
    try {
      matches = JSON.parse(match[0]);
    } catch (e) {
      return NextResponse.json(
        {
          error: "Could not parse matches (malformed JSON array)",
          raw: responseText,
        },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "No JSON array found in response", raw: responseText },
      { status: 500 }
    );
  }

  const userIds = matches.map((m) => m.userId);
  const users = await User.find(
    { _id: { $in: userIds } },
    { _id: 1, name: 1, email: 1 }
  );
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const matchesWithNames = matches.map((m) => ({
    ...m,
    name: userMap[m.userId]?.name || "",
    email: userMap[m.userId]?.email || "",
  }));
  return matchesWithNames;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
