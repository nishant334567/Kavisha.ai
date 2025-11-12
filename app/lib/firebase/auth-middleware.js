import { NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "./config";
import { getCookieOptions } from "./cookie-config";

/**
 * Simplified auth wrapper for API routes
 */
export function withAuth(request, { onAuthenticated, onUnauthenticated }) {
  return authMiddleware(request, {
    apiKey: serverConfig.apiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    cookieSerializeOptions: getCookieOptions(),
    serviceAccount: serverConfig.serviceAccount,
    handleValidToken: async ({ decodedToken }) => {
      return onAuthenticated
        ? await onAuthenticated({ decodedToken })
        : NextResponse.json({ error: "Handler required" }, { status: 500 });
    },
    handleInvalidToken: async () => {
      return onUnauthenticated
        ? await onUnauthenticated()
        : NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
    handleError: async (error) => {
      console.error("Auth error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      );
    },
  });
}
