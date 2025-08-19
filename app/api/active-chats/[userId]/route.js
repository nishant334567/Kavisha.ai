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
    })
      .lean()
      .populate("sessionA", "title")
      .populate("sessionB", "title")
      .populate("userA", "name")
      .populate("userB", "name")
      .exec();

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        let otherUser, jobTitle;
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
