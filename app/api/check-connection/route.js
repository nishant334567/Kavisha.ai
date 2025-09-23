import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { NextResponse } from "next/server";
import User from "@/app/models/Users";

export async function POST(req) {
  try {
    const body = await req.json();
    const { userA, userB, connectionId, currentUserId } = body;

    if (!userA || !userB || !currentUserId) {
      return NextResponse.json(
        { status: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    // Use a canonical connection id (sorted) to avoid duplicates
    const canonicalConnectionId =
      connectionId || [String(userA), String(userB)].sort().join("_");

    // Atomically ensure a single conversation using upsert
    await Conversations.findOneAndUpdate(
      { connectionId: canonicalConnectionId },
      {
        $setOnInsert: {
          userA,
          userB,
          connectionId: canonicalConnectionId,
        },
      },
      { upsert: true, new: true }
    );

    // Get the other user's information
    const otherUserId = userA === currentUserId ? userB : userA;
    const otherUser = await User.findById(otherUserId).select("name email");

    return NextResponse.json({
      connectionId: canonicalConnectionId,
      status: true,
      otherUser: otherUser?.name || "Unknown User",
      otherUserEmail: otherUser?.email || "",
    });
  } catch (error) {
    return NextResponse.json(
      { status: false, error: error.message },
      { status: 500 }
    );
  }
}
