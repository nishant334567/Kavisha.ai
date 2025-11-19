import { NextResponse } from "next/server";
import { authMiddleware, redirectToLogin } from "next-firebase-auth-edge";
import { serverConfig } from "./app/lib/firebase/config";
import { getCookieOptions } from "./app/lib/firebase/cookie-config";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function middleware(request) {
  if (process.env.MAINTENANCE === "true") {
    if (request.nextUrl.pathname === "/maintenance") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/maintenance", request.url));
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
      // Redirect authenticated users from /login to home
      if (request.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async () => {
      if (!PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
        return redirectToLogin(request, {
          path: "/login",
          publicPaths: PUBLIC_PATHS,
        });
      }
      return NextResponse.next();
    },
    handleError: async (error) => {
      return redirectToLogin(request, {
        path: "/login",
        publicPaths: PUBLIC_PATHS,
      });
    },
  });
}

export const config = {
  matcher: ["/", "/((?!_next|favicon.ico|api/login|api/logout|.*\\.).*)"],
};
