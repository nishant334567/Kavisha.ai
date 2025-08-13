import { connectDB } from "@/app/lib/db";
import ChatMessages from "@/app/models/ChatMessages";

export async function GET(req, { params }) {
  try {
    const { currentChatId } = params;

    if (!currentChatId) {
      return Response.json(
        { error: "Current chat ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find messages where currentChatId is involved, but exclude self-messages
    const relevantChats = await ChatMessages.find({
      $or: [
        { senderSessionId: currentChatId },
        { receiverSessionId: currentChatId },
      ],
      // Exclude messages where sender and receiver are the same
      $expr: { $ne: ["$senderSessionId", "$receiverSessionId"] },
    });

    // Bundle chats by unique users and count messages
    const chatBundles = {};

    relevantChats.forEach((chat) => {
      // Determine the other user's sessionId (not currentChatId)

      let otherUserId;
      if (chat.senderSessionId.toString() === currentChatId) {
        otherUserId = chat.receiverSessionId;
      } else if (chat.receiverSessionId.toString() === currentChatId) {
        otherUserId = chat.senderSessionId;
      } else {
        // Skip this message if currentChatId is not involved
        return;
      }

      // Skip if the other user is the same as current user
      if (otherUserId.toString() === currentChatId) {
        return;
      }

      // Create bundle for this user if it doesn't exist
      if (!chatBundles[otherUserId.toString()]) {
        chatBundles[otherUserId.toString()] = {
          userId: otherUserId.toString(),
          connectionId: chat.connectionId,
          messageCount: 0,
          lastMessage: chat.text,
          lastMessageTime: chat.createdAt,
        };
      }

      // Increment message count
      chatBundles[otherUserId.toString()].messageCount++;

      // Update last message if this is more recent
      if (
        new Date(chat.createdAt) >
        new Date(chatBundles[otherUserId.toString()].lastMessageTime)
      ) {
        chatBundles[otherUserId.toString()].lastMessage = chat.text;
        chatBundles[otherUserId.toString()].lastMessageTime = chat.createdAt;
      }
    });

    // Convert to array and sort by last message time
    const bundledChats = Object.values(chatBundles).sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    return Response.json({
      success: true,
      chats: bundledChats,
      bundles: chatBundles,
    });
  } catch (error) {
    console.error("Inbox API error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch inbox chats",
        chats: [],
        bundles: {},
      },
      { status: 500 }
    );
  }
}
