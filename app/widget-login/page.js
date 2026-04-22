"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { getFirebaseAuth } from "@/app/lib/firebase/client";
import { completeRedirectSignInIfPresent } from "@/app/lib/firebase/sign-in";

/** Shared with `ChatBoxWidget` — bridge from this 1st-party popup to the (possibly 3rd-party) widget iframe. */
const WIDGET_LOGIN_CHANNEL = "kavisha-widget-login";
const LOGIN_COMPLETE_MESSAGE = "kavisha-widget-login-complete";

/**
 * Notify the widget iframe that sign-in is complete. We fire on three
 * redundant transports so at least one gets through regardless of
 * browser popup/COOP behavior: BroadcastChannel (preferred),
 * window.opener.postMessage, and the `storage` event.
 */
function notifyLoginComplete() {
  if (typeof window === "undefined") return;
  const payload = { type: LOGIN_COMPLETE_MESSAGE, ts: Date.now() };

  try {
    if (typeof BroadcastChannel === "function") {
      const ch = new BroadcastChannel(WIDGET_LOGIN_CHANNEL);
      ch.postMessage(payload);
      setTimeout(() => ch.close(), 50);
    }
  } catch {}

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
    }
  } catch {}

  try {
    localStorage.setItem(
      `${WIDGET_LOGIN_CHANNEL}:last`,
      JSON.stringify(payload)
    );
  } catch {}
}

async function exchangeIdTokenForSession(idToken) {
  const res = await fetch("/api/login", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "include",
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.reason || "";
    } catch {}
    throw new Error(
      detail
        ? `Session create failed (${res.status}: ${detail})`
        : `Session create failed (${res.status})`
    );
  }
  // Tiny pause so the Set-Cookie header commits before any follow-up.
  await new Promise((r) => setTimeout(r, 100));
  return res.json();
}

function WidgetLoginShell() {
  const [phase, setPhase] = useState("checking");
  const [statusMsg, setStatusMsg] = useState("Checking your sign-in…");
  const [error, setError] = useState("");
  const handledRedirectRef = useRef(false);

  const finishAndClose = useCallback(() => {
    notifyLoginComplete();
    setPhase("done");
    setStatusMsg("Signed in! Returning to chat…");
    setTimeout(() => {
      try {
        window.close();
      } catch { }
    }, 600);
  }, []);

  // Handle the case where we're returning from signInWithRedirect (the
  // popup-blocked fallback path). If no redirect is in flight, this is
  // a no-op and we land on the "ready" state.
  useEffect(() => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;
    (async () => {
      try {
        const session = await completeRedirectSignInIfPresent();
        if (session) {
          finishAndClose();
        } else {
          setPhase("ready");
          setStatusMsg("");
        }
      } catch (e) {
        setError(e?.message || "Sign-in failed after redirect.");
        setPhase("ready");
      }
    })();
  }, [finishAndClose]);

  const runSignIn = useCallback(async () => {
    setError("");
    setPhase("signing-in");
    setStatusMsg("Opening Google…");
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    // Force account chooser so users can switch accounts cleanly.
    provider.setCustomParameters({ prompt: "select_account" });

    // Try popup first. /widget-login is a top-level page on kavisha.ai,
    // so Safari ITP does NOT partition its auth.kavisha.ai storage —
    // popup is reliable here. We only fall back to redirect if the
    // popup is blocked or aborted.
    try {
      const cred = await signInWithPopup(auth, provider);
      setStatusMsg("Creating your session…");
      const idToken = await cred.user.getIdToken();
      await exchangeIdTokenForSession(idToken);
      finishAndClose();
      return;
    } catch (e) {
      const code = e?.code || "";
      const popupBlocked =
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment";
      if (!popupBlocked) {
        if (code === "auth/popup-closed-by-user") {
          setError("You closed the Google window before signing in.");
          setPhase("ready");
          return;
        }
        setError(e?.message || "Google sign-in failed.");
        setPhase("ready");
        return;
      }
    }

    // Popup-blocked fallback: full redirect of THIS popup window. When
    // we come back, the useEffect above finalizes the session.
    try {
      setStatusMsg("Redirecting you to Google…");
      await signInWithRedirect(auth, provider);
    } catch (e) {
      setError(e?.message || "Could not start Google sign-in.");
      setPhase("ready");
    }
  }, [finishAndClose]);

  const showButton = phase === "ready" || phase === "error";
  const showSpinner = phase === "checking" || phase === "signing-in";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border/50 bg-card p-6 text-center shadow-lg">
        <h1 className="text-lg font-semibold text-foreground">
          Sign in to continue
        </h1>
        <p className="text-sm text-muted">
          Use your Google account to access the chat. This window will close
          automatically once you&apos;re signed in.
        </p>

        {phase === "done" && (
          <div className="space-y-2">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-highlight" />
            <p className="text-sm font-medium text-foreground">
              {statusMsg || "You're signed in. You can close this window."}
            </p>
          </div>
        )}

        {showSpinner && (
          <div className="space-y-2">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-highlight" />
            <p className="text-xs text-muted">{statusMsg}</p>
          </div>
        )}

        {showButton && (
          <button
            type="button"
            onClick={runSignIn}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-highlight px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            {error ? "Try again" : "Continue with Google"}
          </button>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {phase === "done" && (
          <button
            type="button"
            onClick={() => {
              try {
                window.close();
              } catch { }
            }}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            Close window
          </button>
        )}
      </div>
    </div>
  );
}

export default function WidgetLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      }
    >
      <WidgetLoginShell />
    </Suspense>
  );
}
