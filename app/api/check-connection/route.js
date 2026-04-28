import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { NextResponse } from "next/server";
import User from "@/app/models/Users";

export async function POST(req) {
  try {
    const body = await req.json();
    const { userA, userB, connectionId, currentUserId, type, brand, endUserId } = body;

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
          ...(typeof type === "string" && type.trim()
            ? { type: type.trim() }
            : {}),
          ...(typeof brand === "string" && brand.trim()
            ? { brand: brand.trim().toLowerCase() }
            : {}),
          ...(endUserId ? { endUserId } : {}),
        },
      },
      { upsert: true, new: true }
    );

    const conv = await Conversations.findOne({
      connectionId: canonicalConnectionId,
    })
      .select("blockedUserId reopenRequestedAt")
      .lean();

    const blockedUserId = conv?.blockedUserId
      ? String(conv.blockedUserId)
      : null;
    const sendAllowed =
      !blockedUserId || String(currentUserId) !== blockedUserId;
    const reopenRequestedAt = conv?.reopenRequestedAt
      ? new Date(conv.reopenRequestedAt).toISOString()
      : null;

    // Get the other user's information
    const otherUserId = userA === currentUserId ? userB : userA;
    const otherUser = await User.findById(otherUserId).select("name email");

    return NextResponse.json({
      connectionId: canonicalConnectionId,
      status: true,
      otherUser: otherUser?.name || "Unknown User",
      otherUserEmail: otherUser?.email || "",
      blockedUserId,
      sendAllowed,
      reopenRequestedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { status: false, error: error.message },
      { status: 500 }
    );
  }
}
