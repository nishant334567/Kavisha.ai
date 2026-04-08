"use client";

import { Suspense, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ChatBoxWidget from "./components/ChatBoxWidget";
import { WIDGET_SESSION_STORAGE_KEY } from "./constants";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";

export { WIDGET_SESSION_STORAGE_KEY };

function WidgetShell() {
  const searchParams = useSearchParams();
  const brand =
    searchParams.get("brand") || searchParams.get("subdomain") || "";

  const [isOpen, setIsOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(null);
  const primaryHex = normalizeBrandHex(primaryColor);

  useEffect(() => {
    const b = brand.trim().toLowerCase();
    if (!b) {
      setPrimaryColor(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/brand-theme?brand=${encodeURIComponent(b)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.primaryBrandColor) {
          setPrimaryColor(data.primaryBrandColor);
        } else if (!cancelled) {
          setPrimaryColor(null);
        }
      })
      .catch(() => {
        if (!cancelled) setPrimaryColor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [brand]);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage(
      {
        source: "kavisha-widget",
        width: isOpen ? 400 : 72,
        height: isOpen ? 520 : 72,
      },
      "*"
    );
  }, [isOpen]);

  return (
    <div className="fixed inset-0 box-border flex flex-col items-end justify-end overflow-hidden bg-transparent p-2">
      {isOpen ? (
        <div className="flex h-full min-h-0 w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl dark:border-border/40 dark:shadow-black/40">
          <div
            className="relative flex w-full min-w-0 shrink-0 items-center rounded-t-2xl border-b border-border/40 bg-muted-bg/20 px-1 py-3 dark:border-border/30 dark:bg-muted-bg/15"
            style={
              primaryHex
                ? {
                    borderBottomColor: hexToRgba(primaryHex, 0.28) || undefined,
                    backgroundColor: hexToRgba(primaryHex, 0.06) || undefined,
                  }
                : undefined
            }
          >
            <span className="w-full text-center text-sm font-semibold tracking-tight text-foreground">
              Chat
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex min-h-[240px] min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
            <ChatBoxWidget brand={brand.trim()} primaryColor={primaryColor} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg ring-2 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-transparent ${!primaryHex ? "bg-highlight ring-highlight/30" : ""}`}
          style={
            primaryHex
              ? {
                  backgroundColor: primaryHex,
                  boxShadow: `0 10px 15px -3px rgb(0 0 0 / 0.12), 0 4px 6px -4px rgb(0 0 0 / 0.08), 0 0 0 2px ${hexToRgba(primaryHex, 0.38) || "transparent"}`,
                }
              : undefined
          }
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-transparent p-4 text-sm text-muted">
          Loading…
        </div>
      }
    >
      <WidgetShell />
    </Suspense>
  );
}
