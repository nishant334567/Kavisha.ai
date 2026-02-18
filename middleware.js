import { NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "./app/lib/firebase/config";
import { getCookieOptions } from "./app/lib/firebase/cookie-config";

import { isBrandAdmin } from "./app/lib/firebase/check-admin";

const PUBLIC_PATHS = ["/", "/api/login", "/api/brands", "/tnc", "/privacy-policy", "/help", "/about", "/copyright", "/make-avatar"];

function getSubdomainFromRequest(hostname) {
  if (!hostname) return "kavisha";
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, "");
  if (cleanHostname === "localhost" || cleanHostname === "127.0.0.1") {
    return "kavisha";
  }

  const parts = cleanHostname.split(".");
  if (process.env.NODE_ENV === "staging") {
    const stagingIdx = parts.indexOf("staging");
    if (stagingIdx >= 0) return stagingIdx > 0 ? parts[0] : "kavisha";
  }
  if (parts.length >= 3) return parts[0];
  if (parts.length === 2 && parts[0] === "kavisha") return "kavisha";
  return "kavisha";
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname || "";

  // ✅ CRON BYPASS – allow scheduler POST without Firebase auth
  if (pathname.startsWith("/api/admin/cron")) {
    return NextResponse.next();
  }
  const hostname = request.nextUrl.hostname || "";
  if (hostname.toLowerCase().startsWith("www.")) {
    const targetHost = hostname.replace(/^www\./i, "");
    const url = request.nextUrl.clone();
    url.hostname = targetHost;
    if (url.port === "80" || url.port === "443") url.port = "";
    return NextResponse.redirect(url, 301);
  }

  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    apiKey: serverConfig.apiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    cookieSerializeOptions: getCookieOptions(),
    serviceAccount: serverConfig.serviceAccount,
    handleValidToken: async ({ token, decodedToken }, headers) => {
      const userEmail = decodedToken.email;
      const hostname = request.nextUrl.hostname;
      const brand = getSubdomainFromRequest(hostname);
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);

      if (request.nextUrl.pathname === "/" && isAdmin) {
        return NextResponse.redirect(
          new URL(`/admin/${brand}/v2`, request.url)
        );
      }
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async () => {
      if (!PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
        const pathname = request.nextUrl.pathname || "";
        const redirectUrl = new URL("/", request.url);
        redirectUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.next();
    },
    handleError: async (error) => {
      return NextResponse.redirect(new URL("/", request.url));
    },
  });
}

export const config = {
  matcher: ["/", "/((?!_next|favicon.ico|api/login|api/logout|.*\\.).*)"],
};
