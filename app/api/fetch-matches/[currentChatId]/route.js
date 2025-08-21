import { NextResponse } from "next/server";
import Matches from "@/app/models/Matches";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function GET(req, { params }) {
  try {
    const { currentChatId } = await params;
    if (!currentChatId || currentChatId === "undefined") {
      return NextResponse.json(
        { error: "Missing or invalid currentChatId" },
        { status: 400 }
      );
    }
    await connectDB();
    // Get matches in both directions
    let matches = await Matches.find({
      $or: [{ sessionId: currentChatId }, { matchedSessionId: currentChatId }],
    }).lean();

    // Remove any self-matches (by id or email)
    const chatSession = await Session.findById(currentChatId).populate(
      "userId",
      "email"
    );
    const uid = String(chatSession?.userId?._id || "");
    const email = (chatSession?.userId?.email || "").toLowerCase();
    matches = matches.filter(
      (m) =>
        String(m.matchedUserId || "") !== uid &&
        (m.matchedUserEmail || "").toLowerCase() !== email
    );
    let allDataCollected = false;
    if (chatSession) {
      allDataCollected = chatSession.allDataCollected;
    }
    return NextResponse.json({ matches, allDataCollected });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
