import { NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "./config";
import { getCookieOptions } from "./cookie-config";

function serializeError(error) {
  if (!error) return null;

  return {
    name: error.name || "Error",
    message: error.message || "Unknown error",
    ...(error.reason ? { reason: error.reason } : {}),
    ...(error.code ? { code: error.code } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

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
      console.error("[withAuth] Authentication middleware error:", error);
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: serializeError(error),
        },
        { status: 500 }
      );
    },
  });
}
