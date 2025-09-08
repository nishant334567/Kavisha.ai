import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import ChatSessions from "@/app/models/ChatSessions";

export async function GET(request, { params }) {
  const { userId } = params;

  try {
    await connectDB();

    const influencer = await User.findById(userId);

    if (!influencer) {
      return NextResponse.json(
        { error: "Influencer not found" },
        { status: 404 }
      );
    }

    const brand = influencer.name.toLowerCase().replace(/\s+/g, "");
    const relevantSessions = await ChatSessions.find({ brand: brand });

    return NextResponse.json({ relevantSessions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
