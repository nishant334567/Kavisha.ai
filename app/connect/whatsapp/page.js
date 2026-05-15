"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FB_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

export default function ConnectWhatsAppPage() {
  const initOnce = useRef(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const version = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION || "v22.0";
    if (!appId || initOnce.current) return;

    function initFb() {
      if (!window.FB || initOnce.current) return;
      initOnce.current = true;
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      setReady(true);
    }

    window.fbAsyncInit = initFb;

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      if (window.FB) initFb();
      else existing.addEventListener("load", initFb, { once: true });
      return;
    }

    const js = document.createElement("script");
    js.id = "facebook-jssdk";
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(js);
  }, []);

  useEffect(() => {
    function onMessage(event) {
      if (!FB_ORIGINS.has(event.origin)) return;
      let payload;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      console.log("[whatsapp connect] postMessage payload", payload);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const launch = useCallback(() => {
    if (typeof window !== "undefined" && window.location.protocol !== "https:") {
      console.warn("[whatsapp connect] FB.login requires HTTPS");
      setStatus("error");
      return;
    }
    const configId = process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!window.FB || !configId) {
      setStatus("error");
      return;
    }
    setStatus("opening");
    window.FB.login(
      (response) => {
        console.log("[whatsapp connect] FB.login response", response);
        const code = response?.authResponse?.code;
        if (code) {
          console.log("[whatsapp connect] OAuth code (exchange server-side only)", code);
        }
        setStatus(response?.authResponse ? "done" : "cancelled");
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { version: "v3", sessionInfoVersion: "3" },
      }
    );
  }, []);

  const missingEnv =
    !process.env.NEXT_PUBLIC_META_APP_ID ||
    !process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">WhatsApp Business</h1>
        <p className="mt-2 text-sm text-muted">
          Connect via Meta. Open the browser console to inspect the OAuth code and Embedded
          Signup payloads.
        </p>

        {missingEnv && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Missing <code className="text-xs">NEXT_PUBLIC_META_APP_ID</code> or{" "}
            <code className="text-xs">NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID</code>.
          </p>
        )}

        <button
          type="button"
          disabled={!ready || missingEnv || status === "opening"}
          onClick={launch}
          className="mt-6 w-full rounded-lg bg-[#1877f2] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!ready ? "Loading…" : status === "opening" ? "Opening Meta…" : "Continue with Meta"}
        </button>

        {status === "cancelled" && (
          <p className="mt-3 text-center text-sm text-muted">Sign-in was cancelled.</p>
        )}
        {status === "error" && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            Could not start (use HTTPS and check env).
          </p>
        )}
        {status === "done" && (
          <p className="mt-3 text-center text-sm text-muted">
            Login finished — check the console for code and postMessage data.
          </p>
        )}
      </div>
    </div>
  );
}
