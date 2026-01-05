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
      .populate("userA", "name email")
      .populate("userB", "name email")
      .exec();

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        let otherUser = "Unknown User",
          otherUserEmail = "";

        if (conversation.userA._id.toString() === userId) {
          otherUser = conversation.userB.name;
          otherUserEmail = conversation.userB.email;
        } else {
          otherUser = conversation.userA.name;
          otherUserEmail = conversation.userA.email;
        }

        const lastMessage = await Messages.findOne({
          conversationId: conversation.connectionId,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          _id: conversation._id,
          otherUser,
          otherUserEmail,
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage?.createdAt,
          userA: conversation.userA._id,
          userB: conversation.userB._id,
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
