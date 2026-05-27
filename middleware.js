import { NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "./app/lib/firebase/config";
import { getCookieOptions } from "./app/lib/firebase/cookie-config";
import { isAdminBrandWelcomePath } from "./app/utils/subdomain";

const PUBLIC_PATHS = [
  "/",
  "/widget",
  "/api/login",
  "/api/whatsapp/webhook",
  "/api/shopify/auth",
  "/api/shopify/install",
  "/api/shopify/callback",
  "/api/shopify/webhooks",
  "/api/shopify/resolve-brand",
  "/shopify/welcome",
  "/shopify/claim",
  "/login",
  "/api/brands",
  "/api/tasks/enrich-derived-profile",
  "/api/tasks/compute-matches",
  "/api/tasks/summarize-session",
  "/api/tasks/scrape-website-job-page",
  "/tnc",
  "/privacy-policy",
  "/help",
  "/about",
  "/copyright",
  "/make-avatar",
  "/widget-intro",
  "/community",
  "/postings",
  "/unsubscribe",
  "/api/unsubscribe",
  "/api/unsubscribe/resolve",
  "/links",
  "/api/links",
  "/api/widget/sso-introspect",
  "/api/public/brand-theme",
  "/api/public/brand-context",
  "/widget-login",
  "/connect/whatsapp",
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.includes(pathname) || isAdminBrandWelcomePath(pathname);
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname || "";

  // ✅ CRON BYPASS – allow scheduler POST without Firebase auth
  if (pathname.startsWith("/api/admin/cron")) {
    return NextResponse.next();
  }

  // Bearer widget calls: let route `withAuth` verify the token (no cookie in iframe).
  if (
    pathname.startsWith("/api/") &&
    (request.headers.get("authorization") || "")
      .toLowerCase()
      .startsWith("bearer ")
  ) {
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
    handleValidToken: async (_ctx, headers) => {
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async () => {
      if (!isPublicPath(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    },
    handleError: async () => {
      if (isPublicPath(request.nextUrl.pathname)) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/", request.url));
    },
  });
}

export const config = {
  // Include /api/logout so auth middleware can clear all auth cookies (single + multiple)
  matcher: ["/", "/((?!_next|favicon.ico|api/login|.*\\.).*)"],
};
