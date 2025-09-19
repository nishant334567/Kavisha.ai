import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function POST(request) {
  try {
    const { sessionId, comment } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { comment: comment || "" },
      { new: true }
    );

    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session comment:", error);
    return NextResponse.json(
      { error: "Failed to update session comment" },
      { status: 500 }
    );
  }
}
