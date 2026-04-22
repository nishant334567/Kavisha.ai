"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/**
 * "This browser is Safari / iOS WebKit" — we use redirect instead of
 * popup here because Safari's ITP partitions auth-domain storage during
 * the popup handshake and makes signInWithPopup unreliable on top-level
 * pages hosted under a different eTLD+1 than auth.kavisha.ai.
 */
function isSafariLikeBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const vendor = navigator.vendor || "";
  const isAppleWebKit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
  const isSafariUa = /Safari/.test(ua) && /Apple/i.test(vendor);
  // Any browser on iOS is WebKit and shares Safari's ITP behavior.
  const isIos = /iPad|iPhone|iPod/.test(ua);
  return isAppleWebKit || isSafariUa || isIos;
}

/** True when the current script is running inside an iframe. */
export function isRunningInIframe() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** POST the Firebase ID token to /api/login and wait for the Set-Cookie to commit. */
async function exchangeIdTokenForSession(idToken) {
  const res = await fetch("/api/login", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create session");
  // Tiny gap so the Set-Cookie header is fully committed before any
  // immediate /api/user follow-up.
  await new Promise((r) => setTimeout(r, 100));
  return res.json();
}

/**
 * Top-level page sign-in. Picks the Firebase flow best suited to the
 * browser:
 *   • Safari / iOS / WebKit  → signInWithRedirect
 *   • Everything else        → signInWithPopup
 *
 * On Safari the page navigates away to Google, so this resolves to
 * `null` and the caller must keep its spinner up until the page reloads.
 * `completeRedirectSignInIfPresent` finalizes the session after return.
 */
export async function signIn() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  if (isSafariLikeBrowser()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return exchangeIdTokenForSession(idToken);
}

/**
 * Call once on mount of any page that may be receiving a Firebase
 * redirect callback (the main /login page, /widget-login, etc.). If a
 * redirect result is present, creates the server session and returns
 * its body. Returns `null` when no redirect is in progress.
 */
export async function completeRedirectSignInIfPresent() {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  const idToken = await result.user.getIdToken();
  return exchangeIdTokenForSession(idToken);
}
