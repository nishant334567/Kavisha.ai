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
import User from "@/app/models/Users";
import { getMatches } from "../matches/[sessionId]/route";
import Matches from "@/app/models/Matches";
import mongoose from "mongoose";
import { Resend } from "resend";
import NewMatchEmailTemplate from "@/app/components/NewMatchEmailTemplate";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

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

    await connectDB();
    // const session = await Session.findById(sessionId);
    const resumeText = resume || "";

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
        content:
          jobseeker === "recruiter"
            ? SYSTEM_PROMPT_RECRUITER
            : SYSTEM_PROMPT_JOB_SEEKER,
      },
      ...(resumeText
        ? [
            {
              role: "user",
              content:
                jobseeker === "recruiter"
                  ? `USER HAS PROVIDED JD: ${resumeText}\n\nIMPORTANT: The user has already uploaded their JD. Process this JD content and ask contextual questions based on it. DO NOT ask for JD again. Acknowledge that you can read the JD.`
                  : `USER HAS PROVIDED RESUME: ${resumeText}\n\nIMPORTANT: The user has already uploaded their resume. Process this resume content and ask contextual questions based on it. DO NOT ask for resume again. Acknowledge that you can read the resume.`,
            },
          ]
        : []),
      ...history.map((m) => ({
        role: m.role,
        content: m.message,
      })),
      { role: "user", content: userMessage },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7, // Reduced from 1 for more consistent responses
      max_completion_tokens: 800, // Updated parameter name for OpenAI API
    });

    let replyAi = chatCompletion.choices[0].message.content;
    let reply = "";
    let summary = "";
    let title = "";
    let allDataCollected = "false";

    // Simplified format parsing - avoid re-prompting loops
    const parts = replyAi.split("////").map((item) => item.trim());
    ("Parts", parts);
    if (parts.length === 4) {
      reply = parts[0];
      summary = parts[1];
      title = parts[2];
      allDataCollected = parts[3]; // Keep as string
    } else {
      const originalReply = parts[0] || replyAi; // Use parts[0] if available, otherwise full response

      const rePromptMessages = [
        {
          role: "system",
          content:
            jobseeker === "recruiter"
              ? SYSTEM_PROMPT_RECRUITER
              : SYSTEM_PROMPT_JOB_SEEKER,
        },
        ...(resumeText
          ? [
              {
                role: "user",
                content:
                  jobseeker === "recruiter"
                    ? `USER HAS PROVIDED JD: ${resumeText}\n\nIMPORTANT: The user has already uploaded their JD. Process this JD content and ask contextual questions based on it. DO NOT ask for JD again. Acknowledge that you can read the JD.`
                    : `USER HAS PROVIDED RESUME: ${resumeText}\n\nIMPORTANT: The user has already uploaded their resume. Process this resume content and ask contextual questions based on it. DO NOT ask for resume again. Acknowledge that you can read the resume.`,
              },
            ]
          : []),
        ...history.map((m) => ({
          role: m.role,
          content: m.message,
        })),
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content: originalReply,
        },
        {
          role: "system",
          content: `FORMATTING TASK: The assistant's last response has the correct content but wrong format. 

Please reformat it as:
${originalReply}
////
[Create a summary of the conversation based on all the context above]
////
[Create a short title (max 20 chars)]
////
[true or false based on whether all required data points have been collected]

Do NOT change the reply content ("${originalReply}") - keep it exactly as is. Only add the missing format parts based on the conversation context.`,
        },
      ];
      //
      const reChatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: rePromptMessages,
        temperature: 0.1,
      });
      const reReplyAi = reChatCompletion.choices[0].message.content;
      const reParts = reReplyAi.split("////").map((item) => item.trim());
      ("Reparts", reParts);
      if (reParts.length === 4) {
        reply = reParts[0];
        summary = reParts[1];
        title = reParts[2];
        allDataCollected = reParts[3];
      } else {
        return NextResponse.json(
          { error: "something went wrong" },
          { status: 500 }
        );
      }
    }
    let matchesLatest = [];
    if (allDataCollected === "true") {
      await Matches.deleteMany({ sessionId: sessionId });
      matchesLatest = await getMatches(sessionId);

      if (matchesLatest.length > 0) {
        const matchesCount = matchesLatest.length;

        const verb = matchesCount === 1 ? "" : "have";

        const message = `Based on your search, I ${verb} found ${
          matchesCount === 1 ? "a match" : `${matchesCount} matches`
        }.
Click on the "find matches" button to see if ${
          matchesCount === 1 ? "it's" : "they're"
        } relevant. Let me know if ${
          matchesCount === 1 ? "it's" : "they're"
        } good, I'll keep looking out for more in the meantime. Cheers!`;
        reply = message;

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
      {
        $set: {
          chatSummary: summary,
          title: title,
          allDataCollected: allDataCollected === "true",
        },
      },
      { upsert: true }
    );

    // maintain a matches ka table //check if its a valid mongoose id
    const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
    let matchesWithObjectIds = [];
    if (Array.isArray(matchesLatest)) {
      const filteredMatches = matchesLatest.filter(
        (m) =>
          isValidObjectId(m.sessionId) &&
          isValidObjectId(m.matchedUserId) &&
          isValidObjectId(m.matchedSessionId)
      );

      // Fetch user details for each match
      matchesWithObjectIds = await Promise.all(
        filteredMatches.map(async (m) => {
          try {
            const matchedUser = await User.findById(m.matchedUserId).select(
              "name email"
            );
            return {
              ...m,
              sessionId: new mongoose.Types.ObjectId(m.sessionId),
              matchedUserId: new mongoose.Types.ObjectId(m.matchedUserId),
              matchedSessionId: new mongoose.Types.ObjectId(m.matchedSessionId),
              matchedUserName: matchedUser?.name || "Unknown",
              matchedUserEmail: matchedUser?.email || "Unknown",
            };
          } catch (error) {
            console.error("Error fetching matched user:", error);
            return {
              ...m,
              sessionId: new mongoose.Types.ObjectId(m.sessionId),
              matchedUserId: new mongoose.Types.ObjectId(m.matchedUserId),
              matchedSessionId: new mongoose.Types.ObjectId(m.matchedSessionId),
              matchedUserName: "Unknown",
              matchedUserEmail: "Unknown",
            };
          }
        })
      );

      await Matches.insertMany(matchesWithObjectIds);

      // 📧 Send match notification emails AFTER user details are fetched
      const uniqueEmails = [
        ...new Set(
          matchesWithObjectIds
            .map((m) => m.matchedUserEmail)
            .filter((email) => email && email !== "Unknown")
        ),
      ];
      console.log("Email to be sent!!", uniqueEmails);
      if (uniqueEmails.length > 0 && process.env.SEND_MATCH_EMAIL === "1") {
        console.log(
          `📧 Sending match notifications to ${uniqueEmails.length} unique users`
        );

        try {
          // Create email batch for unique users
          const emailBatch = uniqueEmails.map((email) => ({
            from: "team@kavisha.ai",
            to: [email],
            subject:
              "You got Matches! Review these people and opportunities and get connecting: Team Kavisha",
            react: NewMatchEmailTemplate({ receiverEmail: email }),
          }));

          // Send batch emails (max 100 per batch)
          const BATCH_SIZE = 100;
          let totalEmailsSent = 0;

          for (let i = 0; i < emailBatch.length; i += BATCH_SIZE) {
            const batch = emailBatch.slice(i, i + BATCH_SIZE);

            const { data, error } = await resend.batch.send(batch);

            if (error) {
              console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, error);
            } else {
              totalEmailsSent += batch.length;
              console.log(
                `✅ Batch ${i / BATCH_SIZE + 1} sent successfully: ${batch.length} emails`
              );
            }

            // Small delay between batches to avoid rate limits
            if (i + BATCH_SIZE < emailBatch.length) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          console.log(
            `📧 Total match notification emails sent: ${totalEmailsSent}/${uniqueEmails.length}`
          );
        } catch (emailError) {
          console.error(
            "❌ Error sending match notification emails:",
            emailError
          );
        }
      }
    }

    return NextResponse.json({
      reply,
      summary,
      title,
      allDataCollected,
      matchesWithObjectIds,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "something went wrong", details: error.message },
      { status: 500 }
    );
  }
}
