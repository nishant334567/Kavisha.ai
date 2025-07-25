import { NextResponse } from "next/server";
import Matches from "@/app/models/Matches";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function GET(req, { params }) {
  const { currentChatId } = await params;
  await connectDB();
  try {
    const matches = await Matches.find({ sessionId: currentChatId }).lean();
    const chatSession = await Session.findOne({ _id: currentChatId });
    let allDataCollected = false;
    if (chatSession) {
      allDataCollected = chatSession.allDataCollected;
    }
    return NextResponse.json({ matches, allDataCollected });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
