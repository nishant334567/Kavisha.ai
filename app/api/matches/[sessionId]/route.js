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
You are a job matching assistant.

[A] is a ${session?.role} with the following requirements (chat summary):
---
${session?.chatSummary}
---

[B] is an array of ${oppositeRole} sessions, each with a chat summary describing their offering:
${allProviders
  .map(
    (s, i) => `
[${i + 1}]
userId: ${s.userId}
sessionId: ${s._id}
chatSummary: ${s.chatSummary}
`
  )
  .join("\n")}
---

Your task:
- Treat A as the consumer and each B as a provider.
- Compare A's requirements with each B's offering (from their chatSummary).
- Recommend up to 10 best matches (most relevant providers for A).
- For each match, provide:
  - "userId": userId of the matched provider,
  - "sessionId": sessionId of the matched provider,
  - "matchingReason": a concise reason for the match,
  - "chatSummary": chat summary of the matched provider

Return your answer as a JSON array, with each object using double quotes for keys, like:
[
  {
    "userId": "...",
    "sessionId": "...",
    "matchingReason": "...",
    "chatSummary": "..."
  }
]
Return only the JSON array, nothing else.
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
  const users = await User.find({ _id: { $in: userIds } }, { _id: 1, name: 1 });
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const matchesWithNames = matches.map((m) => ({
    ...m,
    name: userMap[m.userId]?.name || "",
  }));
  return matchesWithNames;
}
export async function GET(req, { params }) {
  const { sessionId } = await params;
  const response = await getMatches(sessionId);

  return NextResponse.json({ matches: response });
}
