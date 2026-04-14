"use client";

import { Suspense, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ChatBoxWidget from "./components/ChatBoxWidget";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";

/** First launcher spin waits this long after theme loads (attention animation only). */
const LAUNCHER_NUDGE_DELAY_MS = 3000;

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
  const [primaryColor, setPrimaryColor] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [launcherImageUrl, setLauncherImageUrl] = useState(null);
  const [launcherAnimation, setLauncherAnimation] = useState(false);
  const [widgetChatbotHeader, setWidgetChatbotHeader] = useState(null);
  const [widgetCopyReadMoreUrl, setWidgetCopyReadMoreUrl] = useState("");
  const [launcherNudgeReady, setLauncherNudgeReady] = useState(false);
  const brandTrimmed = brand.trim();
  const needsBrandTheme = brandTrimmed.length > 0;
  /** Start false: with `?brand=` we show an empty slot until theme fetch finishes (no default teal flash). */
  const [themeReady, setThemeReady] = useState(false);
  const primaryHex = normalizeBrandHex(primaryColor);

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
      })
      .catch(() => {
        if (!cancelled) {
          setPrimaryColor(null);
          setSecondaryColor(null);
          setLauncherImageUrl(null);
          setLauncherAnimation(false);
          setWidgetChatbotHeader(null);
          setWidgetCopyReadMoreUrl("");
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
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage(
      {
        source: "kavisha-widget",
        width: isOpen ? 400 : 72,
        height: isOpen ? 640 : 72,
      },
      "*"
    );
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 box-border flex flex-col justify-end overflow-hidden bg-transparent p-2 ${isOpen ? "items-center md:items-end" : "items-end"}`}
    >
      {isOpen ? (
        <div className="flex h-full min-h-0 w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl dark:border-border/40 dark:shadow-black/40">
          <div
            className={
              primaryHex
                ? "relative flex w-full min-w-0 shrink-0 items-center rounded-t-2xl border-b border-black/15 px-1 py-3"
                : "relative flex w-full min-w-0 shrink-0 items-center rounded-t-2xl border-b border-border/40 bg-muted-bg/20 px-1 py-3 dark:border-border/30 dark:bg-muted-bg/15"
            }
            style={primaryHex ? { backgroundColor: primaryHex } : undefined}
          >
            <span
              className={
                primaryHex
                  ? "w-full text-center text-sm font-semibold tracking-tight text-white"
                  : "w-full text-center text-sm font-semibold tracking-tight text-foreground"
              }
            >
              {headerTitle}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className={
                primaryHex
                  ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                  : "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
              }
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
            <ChatBoxWidget
              brand={brand.trim()}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              readMoreCopyUrl={widgetCopyReadMoreUrl}
            />
          </div>
        </div>
      ) : needsBrandTheme && !themeReady ? (
        <div className="h-12 w-12 shrink-0" aria-hidden />
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
          <div className="h-12 w-12 shrink-0" />
        </div>
      }
    >
      <WidgetShell />
    </Suspense>
  );
}
