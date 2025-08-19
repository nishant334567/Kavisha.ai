import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";

export async function POST(req) {
  try {
    const body = await req.json();
    //
    const {
      sessionA,
      sessionB,
      userA,
      userB,
      connectionId,
      currentUserId,
      // currentSessionId,
    } = body;
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
    let conversation = await Conversations.find({
      connectionId: connectionId,
    });

    // const otherSessionId = connectionId
    //   .split("_")
    //   .find((id) => id !== currentSessionId);
    //
    const otherUserId = userA === currentUserId ? userB : userA;

    const otherSession = await Session.find({ userId: otherUserId })
      .populate("userId", "name email")
      .select("title");

    const otherUser = otherSession[0].userId.name;
    const jobTitle = otherSession[0].title;

    if (conversation.length === 0) {
      await Conversations.create({
        sessionA,
        sessionB,
        userA,
        userB,
        connectionId,
      });
      // Re-populate after creation
      // conversation = await Conversations.findOne({ connectionId })
      //   .populate("userA", "name")
      //   .populate("userB", "name")
      //   .populate("sessionA", "title")
      //   .populate("sessionB", "title");
    }

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
      connectionId,
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
