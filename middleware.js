import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ROOT_DOMAIN = "kavisha.ai";

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token && pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];

  const isNonTenant = host === ROOT_DOMAIN || subdomain === "www";

  if (isNonTenant) {
    return NextResponse.next();
  }

  url.searchParams.set("brand", subdomain);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
