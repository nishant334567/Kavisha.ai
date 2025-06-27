import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

export async function GET(req) {
  try {
    await connectDB();
    const newUser = new User({
      name: "Nishant Kumar",
      email: "niishant@example.com",
      image: "https://example.com/profile.jpg",
      profileType: "job_seeker",
    });
    const saveUser = await newUser.save();
    return NextResponse.json({
      success: true,
      data: saveUser,
    });
  } catch (error) {
    console.error("User insert failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
