import { NextResponse } from "next/server";
import { verifyWidgetSsoJwt } from "@/app/lib/widgetSsoJwt";
import {
  getAdminAuth,
  getOrCreateUserByEmail,
} from "@/app/lib/firebase/admin-auth";

/**
 * POST { token } — verify partner HS256 JWT, resolve/create Firebase user,
 * return claims + Firebase custom token (client: signInWithCustomToken → getIdToken → GET /api/login).
 * Public route; protect with strong WIDGET_SSO_JWT_SECRET rotation.
 */
export async function POST(request) {
  const secret = process.env.WIDGET_SSO_JWT_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server missing WIDGET_SSO_JWT_SECRET (must match partner / jwt-issuer-mock JWT_SHARED_SECRET)",
      },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const expectedIss =
    process.env.WIDGET_SSO_EXPECTED_ISS ?? "https://unsaidtalks.com";
  const expectedAud = process.env.WIDGET_SSO_EXPECTED_AUD ?? "kavisha";

  try {
    const claims = verifyWidgetSsoJwt(token, secret, {
      expectedIss,
      expectedAud,
    });

    const email =
      typeof claims.email === "string" ? claims.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Token missing a valid email claim",
          code: "missing_email",
        },
        { status: 400 }
      );
    }

    const displayName =
      typeof claims.name === "string"
        ? claims.name.trim()
        : typeof claims.displayName === "string"
          ? claims.displayName.trim()
          : undefined;

    let customToken;
    try {
      const user = await getOrCreateUserByEmail(
        email,
        displayName || undefined
      );
      const auth = getAdminAuth();
      customToken = await auth.createCustomToken(user.uid);
    } catch (e) {
      if (e?.code === "admin_not_configured") {
        return NextResponse.json(
          {
            ok: false,
            error: e.message,
            code: "admin_not_configured",
          },
          { status: 503 }
        );
      }
      console.error("[sso-introspect] Firebase Admin error:", e);
      return NextResponse.json(
        {
          ok: false,
          error: e?.message || "Firebase user or custom token failed",
          code: e?.code || "firebase_failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      claims,
      customToken,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e.message || "Verification failed",
        code: e.code || "verify_failed",
      },
      { status: 401 }
    );
  }
}
