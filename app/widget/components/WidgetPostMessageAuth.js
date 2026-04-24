"use client";

import { useEffect, useRef } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  commitWidgetAuth,
  WIDGET_AUTH_POSTMESSAGE_SOURCE,
} from "@/app/lib/widget-session";
import { WIDGET_SSO_MESSAGE_TYPE } from "../constants";
import { signInWithPartnerCustomToken } from "@/app/lib/firebase/sign-in-custom-token";

/**
 * Parent → iframe auth (`postMessage`). Mounted from `WidgetShell` in `app/widget/page.js`
 * so it stays active while the chat panel is closed (`ChatBoxWidget` only mounts when open).
 */
export default function WidgetPostMessageAuth({ brand }) {
  const { refresh } = useFirebaseSession();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (e) => {
      const d = e.data;
      if (!d || d.source !== WIDGET_AUTH_POSTMESSAGE_SOURCE) return;

      if (d.type === "auth-success") {
        commitWidgetAuth(d);
        void refreshRef.current();
        return;
      }

      if (d.type !== WIDGET_SSO_MESSAGE_TYPE) return;

      const SSO_LOG = "[kavisha-widget][sso]";
      const rawPartnerToken = d.token;
      const partnerToken =
        typeof rawPartnerToken === "string" ? rawPartnerToken.trim() : "";
      if (!partnerToken) {
        console.warn(`${SSO_LOG} ignored: missing or empty token`, {
          brand,
          tokenType: typeof rawPartnerToken,
          rawLength:
            typeof rawPartnerToken === "string"
              ? rawPartnerToken.length
              : undefined,
        });
        return;
      }

      console.info(`${SSO_LOG} handoff received; calling introspect`, {
        brand,
        partnerJwtLength: partnerToken.length,
      });

      void (async () => {
        try {
          const res = await fetch("/api/widget/sso-introspect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: partnerToken }),
            credentials: "omit",
          });
          const data = await res.json().catch(() => ({}));
          console.info(`${SSO_LOG} introspect finished`, {
            brand,
            httpStatus: res.status,
            ok: Boolean(data?.ok),
            error:
              typeof data?.error === "string" ? data.error : undefined,
          });
          if (!res.ok || !data?.ok) {
            throw new Error(
              typeof data?.error === "string"
                ? data.error
                : "Partner sign-in failed"
            );
          }
          if (!data.customToken) {
            throw new Error("Partner sign-in did not return a session token");
          }
          const payload = await signInWithPartnerCustomToken(data.customToken);
          commitWidgetAuth(payload);
          void refreshRef.current();
          console.info(`${SSO_LOG} firebase session committed`, { brand });
        } catch (err) {
          const message = err?.message || "Partner sign-in failed";
          console.warn(`${SSO_LOG} failed`, { brand, message });
        }
      })();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [brand]);

  return null;
}
