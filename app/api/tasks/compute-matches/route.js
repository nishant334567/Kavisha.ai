import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function POST(request) {
  try {
    const secret = process.env.TASKS_SECRET;
    if (secret) {
      const got = request.headers.get("x-tasks-secret");
      if (got !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    await connectDB();
    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Placeholder: compute and persist matches here.
    // Intentionally left blank per current rollout plan.
    return NextResponse.json({ ok: true, queued: false, placeholder: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Task failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

