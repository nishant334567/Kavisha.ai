import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import Matches from "@/app/models/Matches";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";
import { createChatCompletion } from "@/app/utils/getAiResponse";
import generateMatchingPrompt from "@/app/utils/matchingPromptGenerator";
import { matchmakingPromptGenerator } from "@/app/utils/matchingPromptGenerator";
import getGeminiModel from "@/app/lib/getAiModel";

export async function getMatches(userId, sessionId, role) {
  await connectDB();
  const session = await Session.findById(sessionId);
  const model = getGeminiModel("gemini-2.5-flash");
  //
  let oppositeRole =
    role === "friends"
      ? "friends"
      : role === "job_seeker"
        ? "recruiter"
        : "job_seeker";

  const allProviders = await Session.find({
    role: oppositeRole,
    allDataCollected: true,
    chatSummary: { $exists: true, $ne: "" },
    _id: { $ne: sessionId },
    userId: { $ne: userId },
    ...(session.brand !== "kavisha" && { brand: session.brand }),
  }).populate("userId", "name email");

  //
  const allProvidersList = allProviders
    .map(
      (s, i) =>
        `[B${i + 1}]"sessionId": "${s._id}""chatSummary": "${s.chatSummary}"`
    )
    .join("\n");
  let prompt = "";

  if (role === "friends") {
    prompt = matchmakingPromptGenerator({
      sessionSummary: session.chatSummary,
      allProvidersList,
    });
  } else {
    prompt = generateMatchingPrompt({
      sessionSummary: session.chatSummary,
      allProvidersList,
    });
  }

  let responseGemini = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  let responseText =
    responseGemini.response.candidates[0].content.parts[0].text;

  let jsonText = responseText;
  if (responseText.includes("```json")) {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim();
    }
  }

  //

  // Parse the JSON response and return the array
  try {
    const matches = JSON.parse(jsonText);
    if (!Array.isArray(matches)) {
      return [];
    }

    // Delete all existing matches for this session
    await Matches.deleteMany({
      sessionId: new mongoose.Types.ObjectId(sessionId),
    });

    // Populate matched sessions with user data
    const populatedSessions = await Promise.all(
      matches.map(async (item) => {
        const sessionDetail = await Session.findById(
          item.matchedSessionId
        ).populate("userId", "name email");
        return { match: item, session: sessionDetail };
      })
    );

    // Insert new matches into the database with populated data
    if (populatedSessions.length > 0) {
      const matchesToInsert = populatedSessions
        .filter(({ session }) => session !== null)
        .map(({ match, session }) => ({
          sessionId: new mongoose.Types.ObjectId(sessionId),
          matchedUserId: session.userId?._id,
          matchedSessionId: new mongoose.Types.ObjectId(match.matchedSessionId),
          title: session.title || "",
          chatSummary: session.chatSummary || "",
          matchingReason: match.matchingReason || "",
          matchPercentage: match.matchPercentage || "",
          mismatchReason: match.mismatchReason || "",
          matchedUserName: session.userId?.name || "",
          matchedUserEmail: session.userId?.email || "",
        }));

      if (matchesToInsert.length > 0) {
        await Matches.insertMany(matchesToInsert);
      }
    }

    // Return populated matches with all data
    return populatedSessions
      .filter(({ session }) => session !== null)
      .map(({ match, session }) => ({
        matchedSessionId: match.matchedSessionId,
        matchedUserId: session.userId?._id,
        matchedUserName: session.userId?.name || "",
        matchedUserEmail: session.userId?.email || "",
        title: session.title || "",
        chatSummary: session.chatSummary || "",
        matchingReason: match.matchingReason || "",
        matchPercentage: match.matchPercentage || "",
        mismatchReason: match.mismatchReason || "",
      }));
  } catch (error) {
    return [];
  }
}

// export async function GET(req, { params }) {
//   const { sessionId } = await params;
//   const response = await getMatches(sessionId);

//   return NextResponse.json({ matches: response });
// }
