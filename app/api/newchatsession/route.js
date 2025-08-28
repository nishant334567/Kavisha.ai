import { NextResponse } from "next/server";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { getToken } from "next-auth/jwt";
export async function POST(request) {
  const { userId, role, brand } = await request.json();
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sid = await createSessionWithDefaultLog(userId, role, brand);
  return NextResponse.json({ success: true, sessionId: sid._id });
}
