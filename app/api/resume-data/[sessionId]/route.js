import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { sessionId } = await params;
  try {
    await connectDB();
    const session = await Session.findById(sessionId, {
      resumeFilename: 1,
      resumeSummary: 1,
      _id: 0,
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({
      resumeFilename: session.resumeFilename || "",
      resumeSummary: session.resumeSummary || "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
