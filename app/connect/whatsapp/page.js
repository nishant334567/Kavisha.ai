"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FB_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

function safeReturnPath(raw, brand) {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (t.startsWith("/") && !t.startsWith("//") && t.startsWith("/admin/")) return t;
  const b = typeof brand === "string" ? brand.trim() : "";
  if (b) return `/admin/${b}/my-services`;
  return "/";
}

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const initOnce = useRef(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const [waPayload, setWaPayload] = useState(null);
  const [query, setQuery] = useState({ brand: "", returnTo: "" });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setQuery({
      brand: q.get("brand") || "",
      returnTo: q.get("returnTo") || "",
    });
  }, []);

  const returnPath = useMemo(
    () => safeReturnPath(query.returnTo, query.brand),
    [query.returnTo, query.brand]
  );

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const version = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION || "v22.0";
    if (!appId || typeof window === "undefined" || initOnce.current) return;

    function initFb() {
      if (!window.FB || initOnce.current) return;
      initOnce.current = true;
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version,
      });
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
      let data;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type === "WA_EMBEDDED_SIGNUP") {
        setWaPayload(data);
        if (process.env.NODE_ENV === "development") {
          console.log("[WA_EMBEDDED_SIGNUP]", data);
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const launch = useCallback(() => {
    const configId = process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!window.FB || !configId) {
      setStatus("error");
      return;
    }
    setStatus("opening");
    window.FB.login(
      (response) => {
        const code = response?.authResponse?.code;
        if (code && process.env.NODE_ENV === "development") {
          console.log("[FB.login] code received — exchange server-side only");
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

  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => router.push(returnPath), 1200);
    return () => clearTimeout(t);
  }, [status, returnPath, router]);

  const missingEnv =
    !process.env.NEXT_PUBLIC_META_APP_ID ||
    !process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">WhatsApp Business</h1>
        <p className="mt-2 text-sm text-muted">
          Connect your WhatsApp Business account. You will sign in with Meta and grant
          access for this app.
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
            Could not start Meta login. Check config and try again.
          </p>
        )}
        {status === "done" && (
          <p className="mt-3 text-center text-sm text-muted">
            {waPayload?.event === "FINISH" ? "Setup finished. " : null}
            Redirecting…
          </p>
        )}
      </div>
    </div>
  );
}
