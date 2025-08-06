import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";

export async function GET(req, { params }) {
  try {
    const { sessionId } = await params;
    if (!sessionId || sessionId === "undefined") {
      return NextResponse.json(
        { error: "Missing or invalid sessionId" },
        { status: 400 }
      );
    }
    await connectDB();
    const session = await Session.findOne({ _id: sessionId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ allDataCollected: !!session.allDataCollected });
  } catch (error) {
    console.error("Error in all-data-fetched API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
