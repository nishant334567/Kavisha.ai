import { NextResponse } from "next/server";
import Matches from "@/app/models/Matches";
import { connectDB } from "@/app/lib/db";

export async function GET(req, { params }) {
  const { currentChatId } = await params;
  await connectDB();
  try {
    const matches = await Matches.find({ sessionId: currentChatId }).lean();
    // Return all fields as per the Matches model
    console.log("matches", matches);
    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
