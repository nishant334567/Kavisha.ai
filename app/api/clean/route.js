import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import Session from "@/app/models/ChatSessions";
import Messages from "@/app/models/Messages";

export async function GET(req) {
  try {
    await connectDB();

    // Get all conversations
    const conversations = await Conversations.find({}).lean();

    let deletedConversationsCount = 0;
    let deletedMessagesCount = 0;
    const orphanedConversations = [];

    // Check each conversation for orphaned sessions
    for (const conversation of conversations) {
      const sessionAExists = await Session.findById(conversation.sessionA);
      const sessionBExists = await Session.findById(conversation.sessionB);

      // If either session doesn't exist, mark for deletion
      if (!sessionAExists || !sessionBExists) {
        orphanedConversations.push({
          _id: conversation._id,
          connectionId: conversation.connectionId,
          sessionA: conversation.sessionA,
          sessionB: conversation.sessionB,
          sessionAExists: !!sessionAExists,
          sessionBExists: !!sessionBExists,
        });
      }
    }

    // Delete orphaned conversations and their messages
    if (orphanedConversations.length > 0) {
      const orphanedIds = orphanedConversations.map((conv) => conv._id);
      const orphanedConnectionIds = orphanedConversations.map(
        (conv) => conv.connectionId
      );

      // Delete all messages associated with orphaned conversations
      const messagesDeleteResult = await Messages.deleteMany({
        conversationId: { $in: orphanedConnectionIds },
      });
      deletedMessagesCount = messagesDeleteResult.deletedCount;
      console.log(
        `Deleted ${deletedMessagesCount} messages from orphaned conversations`
      );

      // Delete orphaned conversations
      const conversationsDeleteResult = await Conversations.deleteMany({
        _id: { $in: orphanedIds },
      });
      deletedConversationsCount = conversationsDeleteResult.deletedCount;
      console.log(
        `Deleted ${deletedConversationsCount} orphaned conversations`
      );

      // Log details of deleted conversations
      orphanedConversations.forEach((conv) => {
        console.log(`Deleted conversation ${conv.connectionId}:`, {
          sessionA: conv.sessionA,
          sessionB: conv.sessionB,
          sessionAExists: conv.sessionAExists,
          sessionBExists: conv.sessionBExists,
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      totalConversations: conversations.length,
      orphanedFound: orphanedConversations.length,
      deletedConversations: deletedConversationsCount,
      deletedMessages: deletedMessagesCount,
      totalDeleted: deletedConversationsCount + deletedMessagesCount,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
