import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import ChatSessions from "@/app/models/ChatSessions";
import ChatLogs from "@/app/models/ChatLogs";
import Matches from "@/app/models/Matches";
import Conversations from "@/app/models/Conversations";
import Messages from "@/app/models/Messages";
import Connection from "@/app/models/Connection";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { email } = params;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email parameter is required",
        },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found with the provided email",
        },
        { status: 404 }
      );
    }

    const userId = user._id;
    let totalDeleted = 0;

    console.log(
      `Starting deletion process for user: ${user.email} (${userId})`
    );

    // 1. Find all chat sessions for this user
    const userSessions = await ChatSessions.find({ userId });
    const sessionIds = userSessions.map((session) => session._id);

    // 2. Delete all chat logs for these sessions
    if (sessionIds.length > 0) {
      const logsResult = await ChatLogs.deleteMany({
        sessionId: { $in: sessionIds },
      });
      totalDeleted += logsResult.deletedCount;
    }

    // 3. Delete matches where this user is either the session owner or matched user
    const matchesAsUser = await Matches.find({
      sessionId: { $in: sessionIds },
    });
    const matchesAsMatchedUser = await Matches.find({ matchedUserId: userId });

    const allMatchIds = [
      ...matchesAsUser.map((m) => m._id),
      ...matchesAsMatchedUser.map((m) => m._id),
    ];

    if (allMatchIds.length > 0) {
      const matchesResult = await Matches.deleteMany({
        _id: { $in: allMatchIds },
      });
      totalDeleted += matchesResult.deletedCount;
    }

    // 4. Find conversations where this user is either userA or userB
    const conversationsAsUserA = await Conversations.find({ userA: userId });
    const conversationsAsUserB = await Conversations.find({ userB: userId });

    const allConversationIds = [
      ...conversationsAsUserA.map((c) => c._id),
      ...conversationsAsUserB.map((c) => c._id),
    ];

    const allConnectionIds = [
      ...conversationsAsUserA.map((c) => c.connectionId),
      ...conversationsAsUserB.map((c) => c.connectionId),
    ];

    // 5. Delete messages for these conversations
    if (allConnectionIds.length > 0) {
      const messagesResult = await Messages.deleteMany({
        conversationId: { $in: allConnectionIds },
      });
      totalDeleted += messagesResult.deletedCount;
    }

    // 6. Delete conversations
    if (allConversationIds.length > 0) {
      const conversationsResult = await Conversations.deleteMany({
        _id: { $in: allConversationIds },
      });
      totalDeleted += conversationsResult.deletedCount;
    }

    // 7. Delete connections where this user is sender or receiver
    const connectionsAsSender = await Connection.find({ senderId: userId });
    const connectionsAsReceiver = await Connection.find({ receiverId: userId });

    const allConnectionIds2 = [
      ...connectionsAsSender.map((c) => c._id),
      ...connectionsAsReceiver.map((c) => c._id),
    ];

    if (allConnectionIds2.length > 0) {
      const connectionsResult = await Connection.deleteMany({
        _id: { $in: allConnectionIds2 },
      });
      totalDeleted += connectionsResult.deletedCount;
    }

    // 8. Delete chat sessions
    if (sessionIds.length > 0) {
      const sessionsResult = await ChatSessions.deleteMany({
        _id: { $in: sessionIds },
      });
      totalDeleted += sessionsResult.deletedCount;
    }

    // 9. Finally, delete the user
    const userResult = await User.deleteOne({ _id: userId });
    totalDeleted += userResult.deletedCount;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted all data for user: ${email}`,
      totalRecordsDeleted: totalDeleted,
    });
  } catch (error) {
    console.error("Error during user deletion:", error);
    return NextResponse.json(
      {
        success: false,
        error: "User deletion failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
