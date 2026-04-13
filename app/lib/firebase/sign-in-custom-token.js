"use client";

import { getFirebaseAuth } from "./client";
import { signInWithCustomToken } from "firebase/auth";

/**
 * Partner SSO: Firebase custom token → ID token → same session cookie as Google sign-in.
 * Used by /widget only; does not change the main Google sign-in flow.
 */
export async function signInWithPartnerCustomToken(customToken) {
  const t = String(customToken || "").trim();
  if (!t) throw new Error("Missing custom token");

  const auth = getFirebaseAuth();
  const userCredential = await signInWithCustomToken(auth, t);
  const idToken = await userCredential.user.getIdToken();

  const res = await fetch("/api/login", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to create session");
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  return res.json();
}
