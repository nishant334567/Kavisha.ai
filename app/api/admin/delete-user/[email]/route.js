import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import Session from "@/app/models/ChatSessions";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";
import Conversations from "@/app/models/Conversations";
import Messages from "@/app/models/Messages";
import Logs from "@/app/models/ChatLogs";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req, { params }) {
  try {
    await connectDB();

    const rawEmail = decodeURIComponent(params.email || "").trim();
    if (!rawEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await User.findOne({
      email: new RegExp(`^${escapeRegex(rawEmail)}$`, "i"),
    });
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "User not found; nothing to delete",
      });
    }

    const sessions = await Session.find({ userId: user._id }).select("_id");
    const sessionIds = sessions.map((s) => s._id);

    // Find related conversations and derive conversationIds for Messages
    const conversations = await Conversations.find({
      $or: [
        { userA: user._id },
        { userB: user._id },
        { sessionA: { $in: sessionIds } },
        { sessionB: { $in: sessionIds } },
      ],
    }).select("_id connectionId");
    const conversationIds = conversations.map((c) => c.connectionId);

    const results = {};

    results.matches = await Matches.deleteMany({
      $or: [
        { sessionId: { $in: sessionIds } },
        { matchedSessionId: { $in: sessionIds } },
      ],
    });

    results.connections = await Connection.deleteMany({
      $or: [
        { senderId: user._id },
        { receiverId: user._id },
        { senderSession: { $in: sessionIds } },
        { receiverSession: { $in: sessionIds } },
      ],
    });

    results.messages = await Messages.deleteMany({
      conversationId: { $in: conversationIds },
    });

    results.conversations = await Conversations.deleteMany({
      _id: { $in: conversations.map((c) => c._id) },
    });

    results.logs = await Logs.deleteMany({ sessionId: { $in: sessionIds } });
    results.sessions = await Session.deleteMany({ _id: { $in: sessionIds } });
    results.user = await User.deleteOne({ _id: user._id });

    return NextResponse.json({
      success: true,
      deletedCounts: {
        users: results.user?.deletedCount ?? 0,
        sessions: results.sessions?.deletedCount ?? 0,
        logs: results.logs?.deletedCount ?? 0,
        matches: results.matches?.deletedCount ?? 0,
        connections: results.connections?.deletedCount ?? 0,
        conversations: results.conversations?.deletedCount ?? 0,
        messages: results.messages?.deletedCount ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete user data" },
      { status: 500 }
    );
  }
}
