import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function POST(request) {
  try {
    const { sessionId, assignedTo } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { assignedTo: assignedTo || "" },
      { new: true }
    );

    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Session assignment updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session assignment:", error);
    return NextResponse.json(
      { error: "Failed to update session assignment" },
      { status: 500 }
    );
  }
}
