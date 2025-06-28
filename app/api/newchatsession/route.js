import { NextResponse } from "next/server";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { getToken } from "next-auth/jwt";
export async function POST(request) {
  const { userId, role } = await request.json();
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sid = await createSessionWithDefaultLog(userId, role);
  return NextResponse.json({ success: true, sessionId: sid });
}
