import { connectDB } from "@/app/lib/db";
import Requirement from "@/app/models/Requirement";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB(); // Connect to MongoDB

  try {
    const dummy = await Requirement.create({
      userId: "566123abc123def456789012", // replace with real ObjectId from User
      sessionId: "606123abc123def456789013", // replace with real ObjectId from Session
      profile_type: "job_seeker",

      current_role: "Frontend Developer",
      desired_role: "SDE 2",
      experience: 2,
      current_ctc: "12 LPA",
      expected_ctc: "18 LPA",
      location_preference: "Remote",
      notice_period: "Immediate",
      work_mode: "Remote",
    });

    return NextResponse.json({ success: true, data: dummy });
  } catch (error) {
    console.error("Insert error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
