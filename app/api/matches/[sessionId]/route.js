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
- Dont return a match if match precentage is less tha 30%
- For each selected match, return:

  {
    "sessionId": "${sessionId}"    // A's session 
    "matchedUserId": "...",             // Use the exact userId from the [B] above
    "matchedSessionId": "...",          // Use the exact sessionId from the [B] above
    "matchingReason": "Explain briefly why this match is relevant",
    "matchPercentage": "50%" // if all data points matches then 100% , if only half of it matches then 50% and so on. This is based on your calculation and matching, basically your intelligence
    "mismatchReason": "Preferred location and salary expectaions differs"
  }


Format:
- Return ONLY a JSON array of matched objects (maximum 10).
- Use double quotes for all keys.
- **For each match, use the exact userId and sessionId as provided above for each [B]. Do not invent or change these values.**
- DO NOT include any explanation, intro, or text outside the JSON.

Strictly follow the format below (using the real userId/sessionId from above):
[
  {
    "sessionId": "${sessionId}",
    "matchedUserId": "use from above",
    "matchedSessionId": "use from above",
    "matchingReason": "This is what Kavisha found for you because ...",
    "matchPercentage": "40%", //dont hard code the value, this is just a example. based on matching algo , calculate the matching percentage yourself
    "mismatchReason": "Recruiter is looking for onsite but you have remote as a preference. Also offered salary range os 100k-140k but you expectation is 200k."
  }
]
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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

  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
  const filteredmatches = matches.filter(
    (item) =>
      isValidObjectId(item.sessionId) &&
      isValidObjectId(item.matchedUserId) &&
      isValidObjectId(item.matchedSessionId)
  );
  return filteredmatches;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
