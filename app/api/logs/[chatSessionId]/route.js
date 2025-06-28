import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";

export async function GET(req, { params }) {
  const { chatSessionId } = await params;
  try {
    await connectDB();
    const logs = await Logs.find({ sessionId: chatSessionId });
    return NextResponse.json(logs);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
