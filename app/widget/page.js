"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Headphones, Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ChatBoxWidget from "./components/ChatBoxWidget";
import WidgetPostMessageAuth from "./components/WidgetPostMessageAuth";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";
import {
  trackWidgetImpressionOnce,
  trackWidgetOpen,
} from "@/app/lib/widgetAnalytics";

/** First launcher spin waits this long after theme loads (attention animation only). */
const LAUNCHER_NUDGE_DELAY_MS = 3000;

/** Closed widget embed / iframe size (matches AMP `embed-size` minimum height). */
const WIDGET_CLOSED_SIZE = 100;

/** Open panel width: normal vs expanded on desktop (embed parent clamps to viewport). */
const WIDGET_OPEN_WIDTH = 400;
/** Desktop width when maximized (taller + 600px wide). */
const WIDGET_OPEN_WIDTH_MAX = 600;

/** Open panel height: normal vs taller (embed tells parent via postMessage). */
const WIDGET_OPEN_HEIGHT = 640;
/** Must not use `window.innerHeight` here — inside an iframe that is the iframe height (~640), so the parent would never see a larger request. Embed clamps to the real viewport. */
const WIDGET_OPEN_HEIGHT_MAX = 1005;

function WhatsAppGlyph({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

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
  const [widgetWhatsAppNumberId, setWidgetWhatsAppNumberId] = useState(null);
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
    if (!brandTrimmed || !themeReady) return;
    trackWidgetImpressionOnce(brandTrimmed);
  }, [brandTrimmed, themeReady]);

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
      setWidgetWhatsAppNumberId(null);
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
        const wa =
          typeof data?.widgetWhatsAppNumberId === "string" &&
          data.widgetWhatsAppNumberId.trim()
            ? data.widgetWhatsAppNumberId.trim()
            : null;
        setWidgetWhatsAppNumberId(wa);
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
          setWidgetWhatsAppNumberId(null);
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
    const width = isOpen
      ? widgetMaximized
        ? WIDGET_OPEN_WIDTH_MAX
        : WIDGET_OPEN_WIDTH
      : WIDGET_CLOSED_SIZE;
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
        <div
          className={`flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border border-border/50 bg-card shadow-xl dark:border-border/40 dark:shadow-black/40 max-md:min-h-0 max-md:flex-1 max-md:rounded-b-none max-md:rounded-t-2xl md:rounded-2xl ${widgetMaximized ? "md:max-w-[600px]" : "md:max-w-[400px]"}`}
        >
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
                {widgetWhatsAppNumberId ? (
                  <a
                    href={`https://wa.me/${encodeURIComponent(widgetWhatsAppNumberId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open WhatsApp chat"
                    title="WhatsApp"
                    className={
                      primaryHex
                        ? "inline-flex shrink-0 items-center justify-center rounded-full border border-white/85 p-1.5 text-white/95 transition hover:bg-white/15 hover:text-white"
                        : "inline-flex shrink-0 items-center justify-center rounded-full border border-foreground/15 p-1.5 text-foreground transition hover:bg-muted-bg"
                    }
                  >
                    <WhatsAppGlyph className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setWidgetMaximized((m) => !m)}
                  aria-label={widgetMaximized ? "Restore chat size" : "Expand chat"}
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
          onClick={() => {
            trackWidgetOpen(brandTrimmed);
            setIsOpen(true);
          }}
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
