import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";

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

  const allProvidersList = allProviders
    .map(
      (s, i) => `
[B${i + 1}]
"userId": "${s.userId}"
"sessionId": "${s._id}"
"chatSummary": "${s.chatSummary}"`
    )
    .join("\n");

  const prompt = `
You are a smart job-matching assistant.

Your task is to compare one user [A] with multiple potential matches [B] based on their chat summaries.

[A] is a "${session?.role}" with the following requirements (chat summary):
---
${session?.chatSummary}
---

Each [B] is a "${oppositeRole}" session with their own offering (chat summary):
${allProvidersList}
---

Instructions:
- Compare [A]'s requirements with each [B]'s chatSummary.
- Select and recommend up to 10 of the most relevant matches.
- For each selected match, return:

  {
    "userId": "...",             // Use the exact userId from the [B] above
    "sessionId": "...",          // Use the exact sessionId from the [B] above
    "matchingReason": "Explain briefly why this match is relevant",
    "chatSummary": "Summarize B's offering clearly"
  }

Format:
- Return ONLY a JSON array of matched objects (maximum 10).
- Use double quotes for all keys.
- **For each match, use the exact userId and sessionId as provided above for each [B]. Do not invent or change these values.**
- DO NOT include any explanation, intro, or text outside the JSON.

Strictly follow the format below (using the real userId/sessionId from above):
[
  {
    "userId": "use from above",
    "sessionId": "use from above",
    "matchingReason": "This is what Kavisha found for you because ...",
    "chatSummary": "Recruiter is looking for ..."
  }
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
  const validUserIds = userIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  const users = await User.find(
    { _id: { $in: validUserIds } },
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
  // Filter out matches where both name and email are empty
  const filteredMatches = matchesWithNames.filter(
    (m) => m.name !== "" || m.email !== ""
  );
  return filteredMatches;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
