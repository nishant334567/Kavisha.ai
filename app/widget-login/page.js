"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { getFirebaseAuth } from "@/app/lib/firebase/client";
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

async function buildAuthPayload(user) {
  const idToken = await user.getIdToken();
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

function postBackAndClose(payload, targetOrigin) {
  const origin = targetOrigin || window.location.origin;
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, origin);
    } else {
      console.warn("[widget-login] No window.opener.");
    }
  } catch (e) {
    console.warn("[widget-login] postMessage failed:", e?.message);
  }
  setTimeout(() => {
    try {
      window.close();
    } catch {}
  }, 300);
}

const POPUP_BLOCKED_CODES = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

function WidgetLoginShell() {
  const searchParams = useSearchParams();
  const targetOrigin =
    searchParams.get("origin") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const [phase, setPhase] = useState("checking");
  const [statusMsg, setStatusMsg] = useState("Checking…");
  const [error, setError] = useState("");
  const redirectHandled = useRef(false);

  useEffect(() => {
    if (redirectHandled.current) return;
    redirectHandled.current = true;
    (async () => {
      try {
        const auth = getFirebaseAuth();
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setPhase("done");
          setStatusMsg("Signed in. Returning…");
          postBackAndClose(await buildAuthPayload(result.user), targetOrigin);
          return;
        }
        setPhase("ready");
        setStatusMsg("");
      } catch (e) {
        setError(e?.message || "Could not complete sign-in.");
        setPhase("ready");
      }
    })();
  }, [targetOrigin]);

  const runSignIn = useCallback(async () => {
    setError("");
    setPhase("signing-in");
    setStatusMsg("Opening Google…");
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const cred = await signInWithPopup(auth, provider);
      setPhase("done");
      setStatusMsg("Signed in. Returning…");
      postBackAndClose(await buildAuthPayload(cred.user), targetOrigin);
    } catch (e) {
      const code = e?.code || "";
      if (POPUP_BLOCKED_CODES.has(code)) {
        try {
          setStatusMsg("Redirecting to Google…");
          await signInWithRedirect(auth, provider);
        } catch (e2) {
          setError(e2?.message || "Could not start sign-in.");
          setPhase("ready");
        }
        return;
      }
      setError(
        code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled."
          : e?.message || "Google sign-in failed."
      );
      setPhase("ready");
    }
  }, [targetOrigin]);

  const busy = phase === "checking" || phase === "signing-in";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6 shadow-xl">
        <h1 className="text-center text-base font-semibold tracking-tight">
          Sign in to chat
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Continue with Google. This window closes when you are done.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {statusMsg || "Working…"}
            </div>
          )}

          {phase === "ready" && (
            <button
              type="button"
              onClick={runSignIn}
              className="inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Continue with Google
            </button>
          )}

          {phase === "done" && (
            <p className="text-sm text-muted">{statusMsg}</p>
          )}

          {error && (
            <p
              className="text-center text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function WidgetLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden />
        </main>
      }
    >
      <WidgetLoginShell />
    </Suspense>
  );
}
