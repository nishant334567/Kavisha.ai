import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function getMatches(sessionId) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  
  await connectDB();
  const session = await Session.findById({ _id: sessionId });

  const oppositeRole =
    session?.role === "job_seeker" ? "recruiter" : "job_seeker";
  const allProviders = await Session.find({
    role: oppositeRole,
    allDataCollected: true,
    chatSummary: { $exists: true, $ne: "" },
  });

  const allProvidersList = allProviders
    .map(
      (s, i) => `
[B${i + 1}]
"userId": "${s.userId}"
"sessionId": "${s._id}"
"title": "${s.title || "Job Posting"}"
"chatSummary": "${s.chatSummary}"`
    )
    .join("\n");

  const prompt = `
You are a smart job-matching assistant.

**CORE RULE: Only suggest matches where job roles/titles are compatible or closely related. Different job functions should NEVER be matched.**

Your task is to compare one user [A] (the user of this app) with multiple potential matches [B] based on their chat summaries.

[A] is a "${session?.role}" with the following requirements (chat summary):
---
${session?.chatSummary}
---

Each [B] is a "${oppositeRole}" session with their own offering (chat summary):
${allProvidersList}
---

Instructions:
- When writing matchingReason and mismatchReason, ALWAYS address [A] as 'you' or 'your' (never as 'A' or 'A\'s').
- For example, say: "You are looking for...", "Your requirements are...", "You have 5 years of experience...".
- NEVER use phrases like "A is looking for..." or "A's expectations...".
- Compare [A]'s requirements with each [B]'s chatSummary.
- **CRITICAL RULE: Job role/title MUST match or be closely related. DO NOT return any match if the job roles are different or incompatible. This is non-negotiable.**
- Examples of INCOMPATIBLE roles: Software Developer vs Sales Agent, Doctor vs Engineer, Teacher vs Marketing Manager.
- Examples of COMPATIBLE roles: Frontend Developer vs Full-Stack Developer, Sales Executive vs Sales Manager, Data Analyst vs Data Scientist.
- If job roles don't align, skip that candidate entirely - don't include them in results.
- For each selected match, return:

  {
    "sessionId": "${sessionId}"    // A's session 
    "matchedUserId": "...",             // Use the exact userId from the [B] above
    "matchedSessionId": "...",          // Use the exact sessionId from the [B] above
    "title":"...",                      // // Use the exact title from the [B] above
    "chatSummary":"...."                   // Use the exact chatSummary from the [B] above
    "matchingReason": "Explain briefly why this match is relevant, addressing the user as 'you' or 'your' only.",
    "matchPercentage": "50%" // if all data points match then 100%, if only half match then 50% and so on. NOTE: If job roles don't match, this should be 0% (but don't include 0% matches in results)
    "mismatchReason": "Explain mismatches, again addressing the user as 'you' or 'your'."
  }


Format:
- **BEFORE returning any match, verify that the job roles are compatible. If they're not, exclude that match completely.**
- Return ONLY a JSON array of matched objects (maximum 10).
- Use double quotes for all keys.
- **For each match, use the exact userId and sessionId as provided above for each [B]. Do not invent or change these values.**
- DO NOT include any explanation, intro, or text outside the JSON.
- **REMINDER: Only return matches where job roles are related/compatible. Different job functions = NO MATCH.**

Strictly follow the format below (using the real userId/sessionId from above):
[
  {
    "sessionId": "${sessionId}",
    "matchedUserId": "use from above",
    "matchedSessionId": "use from above",
    "title": "use from above",
    "chatSummary": "use from above", 
    "matchingReason": "This is what Kavisha found for you because the job roles align perfectly...",
    "matchPercentage": "40%", //don't hard code the value, this is just an example. Based on matching algo, calculate the matching percentage yourself
    "mismatchReason": "You are looking for onsite but the recruiter offers remote. Also, your expected salary is 200k but the offer is 100k-140k."
  }
]

**FINAL CHECK: Only include matches where the job titles/roles are compatible. If you can't find any compatible roles, return an empty array [].**
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
  const filteredmatches = Array.isArray(matches)
    ? matches.filter(
        (item) =>
          isValidObjectId(item.sessionId) &&
          isValidObjectId(item.matchedUserId) &&
          isValidObjectId(item.matchedSessionId)
      )
    : [];
  return filteredmatches;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
