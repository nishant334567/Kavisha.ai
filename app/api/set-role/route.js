import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized access" });
  }
  const { role } = await req.json();
  if (!["job_seeker", "recruiter", "male", "female"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" });
  }
  await connectDB();
  await User.findByIdAndUpdate(token.id, { profileType: role });

  // Create session with default log after updating profile type
  await createSessionWithDefaultLog(token.id, role);

  return NextResponse.json({ success: true });
}
