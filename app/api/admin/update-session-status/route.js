import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function POST(request) {
  try {
    const { sessionId, status } = await request.json();

    if (!sessionId || !status) {
      return NextResponse.json(
        { error: "Session ID and status are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { status },
      { new: true }
    );

    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json(
      { error: "Failed to update session status" },
      { status: 500 }
    );
  }
}
