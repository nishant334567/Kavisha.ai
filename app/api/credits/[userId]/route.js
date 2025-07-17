import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    // without req, {params} wont deconstruct
    const resolvedParams = await params;
    const { userId } = resolvedParams;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { credits: user.remainingCredits },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
