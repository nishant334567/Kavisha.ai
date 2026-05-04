"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Headphones, Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ChatBoxWidget from "./components/ChatBoxWidget";
import WidgetPostMessageAuth from "./components/WidgetPostMessageAuth";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";

/** First launcher spin waits this long after theme loads (attention animation only). */
const LAUNCHER_NUDGE_DELAY_MS = 3000;

/** Closed widget embed / iframe size (matches AMP `embed-size` minimum height). */
const WIDGET_CLOSED_SIZE = 100;

/** Open panel height: normal vs taller (embed tells parent via postMessage). */
const WIDGET_OPEN_HEIGHT = 640;
/** Must not use `window.innerHeight` here — inside an iframe that is the iframe height (~640), so the parent would never see a larger request. Embed clamps to the real viewport. */
const WIDGET_OPEN_HEIGHT_MAX = 1005;

/** e.g. `entrackr` → `Entrackr's AI Chat`; empty → `AI Chat`. */
function widgetHeadingFromBrand(brandSlug) {
  const s = String(brandSlug || "").trim();
  if (!s) return "AI Chat";
  const label = s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `${label}'s AI Chat`;
}

function WidgetShell() {
  const searchParams = useSearchParams();
  const brand =
    searchParams.get("brand") || searchParams.get("subdomain") || "";

  const [isOpen, setIsOpen] = useState(false);
  const [widgetMaximized, setWidgetMaximized] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [launcherImageUrl, setLauncherImageUrl] = useState(null);
  const [launcherAnimation, setLauncherAnimation] = useState(false);
  const [widgetChatbotHeader, setWidgetChatbotHeader] = useState(null);
  const [widgetCopyReadMoreUrl, setWidgetCopyReadMoreUrl] = useState("");
  const [enableAdminMessages, setEnableAdminMessages] = useState(false);
  const [supportHasUnreadAdmin, setSupportHasUnreadAdmin] = useState(false);
  const [communityEnabled, setCommunityEnabled] = useState(false);
  const [launcherNudgeReady, setLauncherNudgeReady] = useState(false);
  const brandTrimmed = brand.trim();
  const needsBrandTheme = brandTrimmed.length > 0;
  /** Start false: with `?brand=` we show an empty slot until theme fetch finishes (no default teal flash). */
  const [themeReady, setThemeReady] = useState(false);
  const primaryHex = normalizeBrandHex(primaryColor);

  const onAdminUnreadCount = useCallback((count) => {
    setSupportHasUnreadAdmin(typeof count === "number" && count > 0);
  }, []);

  const headerTitle =
    (typeof widgetChatbotHeader === "string" && widgetChatbotHeader.trim()
      ? widgetChatbotHeader.trim()
      : null) || widgetHeadingFromBrand(brand);

  useEffect(() => {
    const b = brandTrimmed.toLowerCase();
    if (!b) {
      setThemeReady(true);
      setPrimaryColor(null);
      setSecondaryColor(null);
      setLauncherImageUrl(null);
      setLauncherAnimation(false);
      setWidgetChatbotHeader(null);
      setWidgetCopyReadMoreUrl("");
      setEnableAdminMessages(false);
      setSupportHasUnreadAdmin(false);
      setCommunityEnabled(false);
      return;
    }
    setThemeReady(false);
    let cancelled = false;
    fetch(`/api/public/brand-theme?brand=${encodeURIComponent(b)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.primaryBrandColor) {
          setPrimaryColor(data.primaryBrandColor);
        } else {
          setPrimaryColor(null);
        }
        if (data?.secondaryBrandColor) {
          setSecondaryColor(data.secondaryBrandColor);
        } else {
          setSecondaryColor(null);
        }
        const url =
          typeof data?.widgetLauncherImageUrl === "string" &&
            data.widgetLauncherImageUrl.trim()
            ? data.widgetLauncherImageUrl.trim()
            : null;
        setLauncherImageUrl(url);
        setLauncherAnimation(Boolean(data?.widgetLauncherAnimation));
        const h =
          typeof data?.widgetChatbotHeader === "string" &&
            data.widgetChatbotHeader.trim()
            ? data.widgetChatbotHeader.trim()
            : null;
        setWidgetChatbotHeader(h);
        const rm =
          typeof data?.widgetCopyReadMoreUrl === "string" &&
            data.widgetCopyReadMoreUrl.trim()
            ? data.widgetCopyReadMoreUrl.trim()
            : "";
        setWidgetCopyReadMoreUrl(rm);
        const adminOn = Boolean(data?.enableAdminMessages);
        setEnableAdminMessages(adminOn);
        if (!adminOn) setSupportHasUnreadAdmin(false);
        setCommunityEnabled(
          Boolean(data?.enableFriendConnect) ||
            Boolean(data?.enableProfessionalConnect)
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPrimaryColor(null);
          setSecondaryColor(null);
          setLauncherImageUrl(null);
          setLauncherAnimation(false);
          setWidgetChatbotHeader(null);
          setWidgetCopyReadMoreUrl("");
          setEnableAdminMessages(false);
          setSupportHasUnreadAdmin(false);
          setCommunityEnabled(false);
        }
      })
      .finally(() => {
        if (!cancelled) setThemeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [brandTrimmed]);

  useEffect(() => {
    if (!launcherAnimation || !themeReady) {
      setLauncherNudgeReady(false);
      return;
    }
    const id = window.setTimeout(
      () => setLauncherNudgeReady(true),
      LAUNCHER_NUDGE_DELAY_MS
    );
    return () => clearTimeout(id);
  }, [launcherAnimation, themeReady]);

  useEffect(() => {
    if (!isOpen) setWidgetMaximized(false);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const width = isOpen ? 400 : WIDGET_CLOSED_SIZE;
    const height = isOpen
      ? widgetMaximized
        ? WIDGET_OPEN_HEIGHT_MAX
        : WIDGET_OPEN_HEIGHT
      : WIDGET_CLOSED_SIZE;
    const maximized = Boolean(isOpen && widgetMaximized);
    window.parent.postMessage(
      { source: "kavisha-widget", width, height, maximized },
      "*"
    );
    // AMP `amp-iframe` + `resizable`: https://amp.dev/documentation/components/amp-iframe/#iframe-resizing
    window.parent.postMessage(
      { sentinel: "amp", type: "embed-size", width, height, maximized },
      "*"
    );
  }, [isOpen, widgetMaximized]);

  return (
    <div
      className={`fixed inset-0 box-border flex flex-col overflow-hidden bg-transparent ${isOpen
        ? widgetMaximized
          ? "max-md:p-0 max-md:items-stretch max-md:justify-stretch max-md:min-h-0 md:items-end md:justify-end md:p-2"
          : "max-md:p-0 max-md:items-stretch max-md:justify-end md:items-end md:justify-end md:p-2"
        : "items-end justify-end p-2"
        }`}
    >
      <WidgetPostMessageAuth brand={brandTrimmed} />
      {isOpen ? (
        <div className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl dark:border-border/40 dark:shadow-black/40 max-md:min-h-0 max-md:flex-1 md:max-w-[400px]">
          <div
            className={
              primaryHex
                ? "relative flex w-full min-w-0 shrink-0 items-center border-b border-black/15 px-1 py-3 max-md:rounded-t-2xl md:rounded-none"
                : "relative flex w-full min-w-0 shrink-0 items-center border-b border-border/40 bg-muted-bg/20 px-1 py-3 dark:border-border/30 dark:bg-muted-bg/15 max-md:rounded-t-2xl md:rounded-none"
            }
            style={primaryHex ? { backgroundColor: primaryHex } : undefined}
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-2 px-2">
              <span
                className={
                  primaryHex
                    ? "min-w-0 truncate text-sm font-semibold tracking-tight text-white"
                    : "min-w-0 truncate text-sm font-semibold tracking-tight text-foreground"
                }
              >
                {headerTitle}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {enableAdminMessages ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("kavisha:widget:openSupport", {
                          detail: { brand: brandTrimmed },
                        })
                      );
                    }}
                    aria-label={
                      supportHasUnreadAdmin
                        ? "Open support, unread messages"
                        : "Open support"
                    }
                    className={
                      primaryHex
                        ? "relative inline-flex items-center gap-1 rounded-full border border-white/85 px-2.5 py-1 text-xs font-semibold text-white/95 transition hover:bg-white/15 hover:text-white"
                        : "relative inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted-bg"
                    }
                    title="Support"
                  >
                    {supportHasUnreadAdmin ? (
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ${primaryHex ? "ring-white" : "ring-background"}`}
                        aria-hidden
                      />
                    ) : null}
                    <span>Support</span>
                    <Headphones className="h-2.5 w-3" strokeWidth={2} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setWidgetMaximized((m) => !m)}
                  aria-label={widgetMaximized ? "Restore chat size" : "Expand chat height"}
                  className={
                    primaryHex
                      ? "rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                      : "rounded-full p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                  }
                >
                  {widgetMaximized ? (
                    <Minimize2 className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <Maximize2 className="h-5 w-5" strokeWidth={2} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  className={
                    primaryHex
                      ? "rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                      : "rounded-full p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                  }
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden rounded-b-2xl px-3 pb-4 pt-2">
            {/* Sign-in + bearer tokens: `ChatBoxWidget` + `app/lib/widget-session.js` (not this shell). */}
            <ChatBoxWidget
              brand={brand.trim()}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              readMoreCopyUrl={widgetCopyReadMoreUrl}
              adminMessagesEnabled={enableAdminMessages}
              onAdminUnreadCount={onAdminUnreadCount}
              communityEnabled={communityEnabled}
            />
          </div>
        </div>
      ) : needsBrandTheme && !themeReady ? (
        <div
          className="shrink-0"
          style={{ width: WIDGET_CLOSED_SIZE, height: WIDGET_CLOSED_SIZE }}
          aria-hidden
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg ring-2 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-transparent ${launcherAnimation && launcherNudgeReady ? "animate-widget-launcher-nudge will-change-transform" : ""} ${!primaryHex ? "bg-highlight ring-highlight/30" : ""} ${launcherImageUrl ? "p-1" : ""}`}
          style={
            primaryHex
              ? {
                backgroundColor: primaryHex,
                boxShadow: `0 10px 15px -3px rgb(0 0 0 / 0.12), 0 4px 6px -4px rgb(0 0 0 / 0.08), 0 0 0 2px ${hexToRgba(primaryHex, 0.38) || "transparent"}`,
              }
              : undefined
          }
        >
          {launcherImageUrl ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-black/10"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN; avoids remotePatterns setup */}
              <img
                src={launcherImageUrl}
                alt=""
                className="h-[1.35rem] w-[1.35rem] object-contain drop-shadow-sm"
                width={22}
                height={22}
                decoding="async"
              />
            </span>
          ) : (
            <MessageCircle className="h-6 w-6" strokeWidth={2} />
          )}
        </button>
      )}
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div
          className="fixed inset-0 box-border flex flex-col items-end justify-end overflow-hidden bg-transparent p-2"
          aria-hidden
        >
          <div
            className="shrink-0"
            style={{
              width: WIDGET_CLOSED_SIZE,
              height: WIDGET_CLOSED_SIZE,
            }}
          />
        </div>
      }
    >
      <WidgetShell />
    </Suspense>
  );
}
