import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";

export async function POST(req) {
  try {
    const body = await req.json();
    //
    const { sessionA, sessionB, userA, userB, connectionId, currentUserId } =
      body;
    if (
      !sessionA ||
      !sessionB ||
      !userA ||
      !userB ||
      !connectionId ||
      !currentUserId
      // !currentSessionId
    ) {
      return NextResponse.json(
        { status: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();
    // Use a canonical connection id (sorted) to avoid duplicates
    const canonicalConnectionId =
      connectionId || ""
        ? connectionId
        : [String(sessionA), String(sessionB)].sort().join("_");

    // Atomically ensure a single conversation using upsert
    await Conversations.findOneAndUpdate(
      { connectionId: canonicalConnectionId },
      {
        $setOnInsert: {
          sessionA,
          sessionB,
          userA,
          userB,
          connectionId: canonicalConnectionId,
        },
      },
      { upsert: true, new: true }
    );

    // const otherSessionId = connectionId
    //   .split("_")
    //   .find((id) => id !== currentSessionId);
    //
    const otherUserId = userA === currentUserId ? userB : userA;

    const otherSession = await Session.find({ userId: otherUserId })
      .populate("userId", "name email")
      .select("title");

    const otherUser = otherSession?.[0]?.userId?.name || "Unknown User";
    const jobTitle = otherSession?.[0]?.title || "Unknown Position";

    // Determine the other user and job title
    // let otherUser, jobTitle;
    // if (conversation.userA._id.toString() === currentUserId) {
    //   otherUser = conversation.userB.name;
    //   jobTitle = conversation.sessionB.title;
    // } else {
    //   otherUser = conversation.userA.name;
    //   jobTitle = conversation.sessionA.title;
    // }

    return NextResponse.json({
      connectionId: canonicalConnectionId,
      status: true,
      otherUser,
      jobTitle,
    });
  } catch (error) {
    return NextResponse.json(
      { status: false, error: error.message },
      { status: 500 }
    );
  }
}
