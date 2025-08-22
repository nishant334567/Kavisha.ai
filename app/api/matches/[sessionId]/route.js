import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function getMatches(sessionId) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  await connectDB();
  const session = await Session.findById({ _id: sessionId });

  const role = session?.role;
  const isDating = role === "male" || role === "female";
  let oppositeRole;
  if (isDating) {
    oppositeRole = role === "male" ? "female" : "male";
  } else {
    oppositeRole = role === "job_seeker" ? "recruiter" : "job_seeker";
  }
  const allProviders = await Session.find({
    role: oppositeRole,
    allDataCollected: true,
    chatSummary: { $exists: true, $ne: "" },
    // Never suggest the same user's other sessions
    userId: { $ne: session?.userId },
  }).populate("userId", "name email");

  const allProvidersList = allProviders
    .map(
      (s, i) => `
[B${i + 1}]
"userId": "${s.userId?._id}"
"name": "${s.userId?.name}"
"email": "${s.userId?.email}"
"sessionId": "${s._id}"
"title": "${s.title}"
"chatSummary": "${s.chatSummary}"`
    )
    .join("\n");

  const jobPrompt = `
You are a smart job-matching assistant.

Your task is to compare one user [A] (the user of this app) with multiple potential matches [B] based on their chat summaries.

[A] is a "${role}" with the following requirements (chat summary):
---
${session?.chatSummary}
---

Each [B] is a "${oppositeRole}" session with their data and requirements:
${allProvidersList}
---

Rules:
- Address [A] as "you" or "your" in all explanations.
- Compare [A] and [B] summaries and only suggest matches where job titles/roles are compatible or closely related.
- Skip candidates with incompatible roles entirely.

For each selected match, return:
{
  "sessionId": "${sessionId}",
  "matchedUserId": "...",
  "matchedSessionId": "...",
  "title": "...",
  "chatSummary": "...",
  "matchingReason": "...",
  "matchPercentage": "50%",
  "mismatchReason": "..."
}

Return only a JSON array (max 10), no extra text.
`;

  const datingPrompt = `
You are a thoughtful dating match assistant.

Match [A] with potential partners [B] based on compatibility in values, interests, lifestyle, location, and preferences extracted from their chat summaries.

[A] is "${role}" with the following details (chat summary):
---
${session?.chatSummary}
---

Each [B] is "${oppositeRole}" with details:
${allProvidersList}
---

Rules:
- Address [A] as "you" or "your" in all explanations.
- Consider interests, age range, goals, lifestyle, and dealbreakers if mentioned.
- Avoid suggesting matches with strong conflicts (e.g., non-overlapping locations or opposite relationship goals).

For each selected match, return:
[
  {
    "sessionId": "${sessionId}",
    "matchedUserId": "use from above",
    "matchedSessionId": "use from above",
    "title": "use from above",
    "chatSummary": "use from above",
    "matchingReason": "Why this person may be a good match for you",
    "matchPercentage": "70%",
    "mismatchReason": "Any potential incompatibilities"
  }
]

Return only the JSON array (max 10).`;

  const prompt = isDating ? datingPrompt : jobPrompt;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
    temperature: 1,
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

  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
  const allowedSessionIds = new Set(allProviders.map((s) => String(s._id)));
  const filteredmatches = Array.isArray(matches)
    ? matches.filter((item) => {
        if (
          !isValidObjectId(item.sessionId) ||
          !isValidObjectId(item.matchedUserId) ||
          !isValidObjectId(item.matchedSessionId)
        ) {
          return false;
        }
        // Do not recommend self (same user) or the same session
        if (
          String(item.matchedSessionId) === String(sessionId) ||
          String(item.matchedUserId) === String(session?.userId)
        ) {
          return false;
        }
        // Ensure the matched session comes from the candidate pool
        if (!allowedSessionIds.has(String(item.matchedSessionId))) {
          return false;
        }
        return true;
      })
    : [];
  return filteredmatches;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
