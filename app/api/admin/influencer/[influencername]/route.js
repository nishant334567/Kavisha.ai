import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import ChatSessions from "@/app/models/ChatSessions";

export async function GET(request, { params }) {
  const { influencername } = params;

  try {
    await connectDB();
    const relevantSessions = await ChatSessions.find({ brand: influencername });

    return NextResponse.json({ relevantSessions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
