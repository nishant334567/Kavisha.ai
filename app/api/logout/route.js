import { NextResponse } from "next/server";
import { serverConfig } from "@/app/lib/firebase/config";
import { getCookieOptions } from "@/app/lib/firebase/cookie-config";

export async function GET() {
  const response = NextResponse.json({ status: "success" });
  const cookieOptions = getCookieOptions();

  // Clear auth cookie
  response.cookies.set(serverConfig.cookieName, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  return response;
}
