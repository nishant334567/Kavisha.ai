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
 * `Authorization: Bearer <Firebase ID token>` — used by the embed widget
 * (cookie may be missing in third-party iframe). Returns decoded claims,
 * `null` if no header, `false` if invalid.
 */
async function tryBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;

  const idToken = header.slice("bearer ".length).trim();
  if (!idToken) return false;

  try {
    const { getAdminAuth } = await import("./admin-auth");
    return await getAdminAuth().verifyIdToken(idToken);
  } catch (e) {
    console.warn("[withAuth] bearer verifyIdToken failed:", e?.code || e?.message);
    return false;
  }
}

/**
 * API route auth: cookie session (main app) **or** bearer ID token (widget).
 */
export function withAuth(request, { onAuthenticated, onUnauthenticated }) {
  return (async () => {
    const bearer = await tryBearerToken(request);

    if (bearer && typeof bearer === "object") {
      return onAuthenticated
        ? await onAuthenticated({ decodedToken: bearer })
        : NextResponse.json({ error: "Handler required" }, { status: 500 });
    }

    if (bearer === false) {
      return onUnauthenticated
        ? await onUnauthenticated()
        : NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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
  })();
}
