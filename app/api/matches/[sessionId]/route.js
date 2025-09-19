import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import Matches from "@/app/models/Matches";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";
import { createChatCompletion } from "@/app/utils/getAiResponse";
import generateMatchingPrompt from "@/app/utils/matchingPromptGenerator";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function getMatches(sessionId, role) {
  if (role === "lead_journey") {
    return [];
  }
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  await connectDB();
  const session = await Session.findById({ _id: sessionId });

  let oppositeRole =
    role === "dating"
      ? "dating"
      : role === "job_seeker"
        ? "recruiter"
        : "job_seeker";

  const allProviders = await Session.find({
    role: oppositeRole,
    allDataCollected: true,
    chatSummary: { $exists: true, $ne: "" },
    ...(session.brand !== "kavisha" && { brand: session.brand }),
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
"chatSummary": "${s.chatSummary}"
"brand": "${s.brand}"`
    )
    .join("\n");

  const prompt = generateMatchingPrompt({
    sessionId,
    oppositeRole,
    sessionSummary: session.chatSummary,
    allProvidersList,
  });

  const completion = await createChatCompletion(
    "gpt-4o-mini",
    [
      { role: "system", content: "You are a smart job-matching assistant." },
      { role: "user", content: prompt },
    ],
    0.7,
    800
  );
  const responseText = completion.choices[0].message.content;

  // Extract JSON from markdown code blocks if present
  let jsonText = responseText;
  if (responseText.includes("```json")) {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
  }

  // Parse the JSON response and return the array
  try {
    const matches = JSON.parse(jsonText);
    if (!Array.isArray(matches)) {
      return [];
    }

    // Delete all existing matches for this session
    await Matches.deleteMany({ sessionId: sessionId });

    // Insert new matches into the database
    if (matches.length > 0) {
      const matchesToInsert = matches.map((match) => ({
        sessionId: sessionId,
        matchedUserId: match.matchedUserId,
        matchedSessionId: match.matchedSessionId,
        title: match.title,
        chatSummary: match.chatSummary,
        matchingReason: match.matchingReason,
        matchPercentage: match.matchPercentage,
        mismatchReason: match.mismatchReason,
        matchedUserName: match.matchedUserName || "",
        matchedUserEmail: match.matchedUserEmail || "",
      }));

      await Matches.insertMany(matchesToInsert);
    }

    return matches;
  } catch (error) {
    console.error("Error parsing matches JSON:", error);
    return [];
  }
}

// export async function GET(req, { params }) {
//   const { sessionId } = await params;
//   const response = await getMatches(sessionId);

//   return NextResponse.json({ matches: response });
// }
