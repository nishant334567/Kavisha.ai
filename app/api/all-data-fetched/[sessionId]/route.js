import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";

export async function GET(req, { params }) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  await connectDB();
  const session = await Session.findOne({ _id: sessionId });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ allDataCollected: !!session.allDataCollected });
}
