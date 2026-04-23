"use client";

import { getFirebaseAuth } from "./client";
import { signInWithCustomToken } from "firebase/auth";
import { WIDGET_AUTH_POSTMESSAGE_SOURCE } from "@/app/lib/widget-session";

function jwtExpMs(idToken) {
  try {
    const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Partner SSO: Firebase custom token → ID token → GET /api/login (Mongo user + cookie),
 * then return the same payload shape as `/widget-login` postMessage for `commitWidgetAuth`.
 * Used by /widget embed only.
 */
export async function signInWithPartnerCustomToken(customToken) {
  const t = String(customToken || "").trim();
  if (!t) throw new Error("Missing custom token");

  const auth = getFirebaseAuth();
  const userCredential = await signInWithCustomToken(auth, t);
  const user = userCredential.user;
  const idToken = await user.getIdToken();

  const res = await fetch("/api/login", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to create session");
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  await res.json().catch(() => ({}));

  if (!user.refreshToken) {
    throw new Error(
      "Missing refresh token after sign-in; check Firebase Auth / authorized domains."
    );
  }

  return {
    source: WIDGET_AUTH_POSTMESSAGE_SOURCE,
    type: "auth-success",
    idToken,
    refreshToken: user.refreshToken,
    expiresAt: jwtExpMs(idToken) || Date.now() + 55 * 60 * 1000,
    user: {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
    },
  };
}
