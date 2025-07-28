import User from "@/app/models/Users";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const users = await User.find({}).select("name email profileType");
    return NextResponse.json({ success: true, users: users });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "Failed to fetch all users",
    });
  }
}
