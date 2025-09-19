import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import Messages from "@/app/models/Messages";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { userId } = await params;

  try {
    await connectDB();
    const conversations = await Conversations.find({
      $or: [{ userA: userId }, { userB: userId }],
      sessionA: { $exists: true, $ne: null },
      sessionB: { $exists: true, $ne: null },
    })
      .lean()
      .populate("sessionA", "title")
      .populate("sessionB", "title")
      .populate("userA", "name")
      .populate("userB", "name")
      .exec();

    // Filter out conversations where sessions are null after populate
    const validConversations = conversations.filter(
      (conversation) => conversation.sessionA && conversation.sessionB
    );

    // let result = [];
    const result = await Promise.all(
      validConversations.map(async (conversation) => {
        let otherUser = "User A",
          jobTitle = "Job title not found";
        if (conversation.userA._id.toString() === userId) {
          otherUser = conversation.userB.name;
          jobTitle = conversation.sessionB.title;
        } else {
          otherUser = conversation.userA.name;
          jobTitle = conversation.sessionA.title;
        }

        const lastMessage = await Messages.findOne({
          conversationId: conversation.connectionId,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          _id: conversation._id,
          otherUser,
          jobTitle,
          lastMessage: lastMessage?.content,
          userA: conversation.userA._id,
          userB: conversation.userB._id,
          sessionA: conversation.sessionA._id,
          sessionB: conversation.sessionB._id,
        };
      })
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch active chats" },
      { status: 500 }
    );
  }
}
