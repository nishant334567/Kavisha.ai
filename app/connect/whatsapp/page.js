"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const FB_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);
const LOG = "[whatsapp connect]";

export default function ConnectWhatsAppPage() {
  const searchParams = useSearchParams();
  const brand = String(searchParams.get("brand") || "").trim().toLowerCase();

  const initOnce = useRef(false);
  const savedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const saveConnection = useCallback(
    async (phoneNumberId, displayPhone) => {
      if (savedRef.current) return;
      if (!brand) {
        setErrorMsg("Missing brand in URL.");
        setStatus("save_error");
        return;
      }

      savedRef.current = true;
      setStatus("saving");
      setErrorMsg("");

      try {
        const res = await fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            brand,
            phoneNumberId,
            ...(displayPhone ? { displayPhone } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          savedRef.current = false;
          throw new Error(data.error || "Could not save connection");
        }
        setStatus("saved");
      } catch (e) {
        setErrorMsg(String(e?.message || e));
        setStatus("save_error");
      }
    },
    [brand]
  );

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

      const eventName = String(payload?.event || "").toUpperCase();
      console.log(LOG, "embedded_signup", { brand: brand || undefined, payload });

      if (eventName === "CANCEL") {
        setStatus((prev) =>
          prev === "opening" || prev === "idle" ? "cancelled" : prev
        );
        return;
      }
      if (eventName === "ERROR") {
        setErrorMsg("Meta signup failed. Please try again.");
        setStatus((prev) =>
          prev === "saved" || prev === "saving" ? prev : "save_error"
        );
        return;
      }
      if (eventName !== "FINISH") return;

      const phoneNumberId = String(payload?.data?.phone_number_id || "").replace(/\D/g, "");
      const displayPhone = String(
        payload?.data?.display_phone_number || payload?.data?.phone_number || ""
      ).replace(/\D/g, "");

      if (!phoneNumberId) {
        setErrorMsg("Meta did not return a phone number id.");
        setStatus("save_error");
        return;
      }

      void saveConnection(phoneNumberId, displayPhone);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [brand, saveConnection]);

  const launch = useCallback(() => {
    if (typeof window !== "undefined" && window.location.protocol !== "https:") {
      console.warn(LOG, "FB.login requires HTTPS");
      setErrorMsg("Use HTTPS to connect WhatsApp.");
      setStatus("error");
      return;
    }
    const configId = process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!window.FB || !configId) {
      setErrorMsg("Meta app configuration is missing.");
      setStatus("error");
      return;
    }
    savedRef.current = false;
    setErrorMsg("");
    setStatus("opening");
    window.FB.login(
      (response) => {
        console.log(LOG, "fb_login", {
          brand: brand || undefined,
          status: response?.status,
          hasCode: Boolean(response?.authResponse?.code),
        });
        if (!response?.authResponse) {
          setStatus((prev) =>
            prev === "opening" || prev === "idle" ? "cancelled" : prev
          );
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { version: "v3", sessionInfoVersion: "3" },
      }
    );
  }, [brand]);

  const missingEnv =
    !process.env.NEXT_PUBLIC_META_APP_ID ||
    !process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;

  const busy = status === "opening" || status === "saving";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">WhatsApp Business</h1>
        <p className="mt-2 text-sm text-muted">
          Connect your WhatsApp number via Meta. Finish the full signup flow to link it to
          Kavisha.
        </p>
        {brand ? (
          <p className="mt-2 text-sm text-foreground">
            Brand: <span className="font-medium">{brand}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Add <code className="text-xs">?brand=your-subdomain</code> to the URL.
          </p>
        )}

        {missingEnv && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Missing <code className="text-xs">NEXT_PUBLIC_META_APP_ID</code> or{" "}
            <code className="text-xs">NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID</code>.
          </p>
        )}

        <button
          type="button"
          disabled={!ready || missingEnv || !brand || busy || status === "saved"}
          onClick={launch}
          className="mt-6 w-full rounded-lg bg-[#1877f2] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!ready
            ? "Loading…"
            : status === "opening"
              ? "Opening Meta…"
              : status === "saving"
                ? "Saving…"
                : status === "saved"
                  ? "Connected"
                  : "Continue with Meta"}
        </button>

        {status === "cancelled" && (
          <p className="mt-3 text-center text-sm text-muted">Sign-in was cancelled.</p>
        )}
        {(status === "error" || status === "save_error") && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            {errorMsg || "Something went wrong. Please try again."}
          </p>
        )}
        {status === "saved" && (
          <p className="mt-3 text-center text-sm text-muted">
            WhatsApp is connected for this brand.
          </p>
        )}
      </div>
    </div>
  );
}
