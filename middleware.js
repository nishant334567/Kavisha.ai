import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const host = req.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const url = new URL(req.url);
    const newHost = host.slice(4);
    url.host = newHost;
    return NextResponse.redirect(url, 308);
  }

  if (req.nextUrl.pathname.startsWith("/landing")) {
    return NextResponse.next();
  }
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
