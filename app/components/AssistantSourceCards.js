"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function normalizeSpace(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

/** Snippet for card body — skips metadata lines and text that repeats the title. */
function sourceCardSnippet(title, description) {
  const t = normalizeSpace(title);
  if (!description || typeof description !== "string") return "";

  const lines = description.split(/\r?\n/).filter((line) => {
    const lineTrim = line.trim();
    if (!lineTrim) return false;
    if (/^(Title|Author|Published|URL|Source)\s*:/i.test(lineTrim)) {
      return false;
    }
    return true;
  });

  let snippet = normalizeSpace(lines.join(" "));
  if (!snippet) return "";

  const titleMatch = snippet.match(/^Title:\s*(.+)$/i);
  if (titleMatch) snippet = normalizeSpace(titleMatch[1]);
  if (!snippet) return "";

  const tLower = t.toLowerCase();
  const sLower = snippet.toLowerCase();

  if (sLower === tLower) return "";
  if (t.length >= 20 && sLower.startsWith(tLower.slice(0, 20))) return "";
  if (sLower.startsWith(tLower) && snippet.length - t.length < 40) return "";

  if (snippet.length > 100) {
    const cut = snippet.slice(0, 100);
    const lastSpace = cut.lastIndexOf(" ");
    snippet = `${lastSpace > 60 ? cut.slice(0, lastSpace) : cut}…`;
  }

  return snippet;
}

/**
 * Horizontally scrollable source cards (KB title/description). Whole card is the link.
 */
export default function AssistantSourceCards({ items, primaryHex = null }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const list = Array.isArray(items)
    ? items.filter((c) => c && typeof c.url === "string" && c.url.trim())
    : [];

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [list.length, updateScrollState]);

  const scrollBy = (delta) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (list.length === 0) return null;

  return (
    <div className="mt-2 w-full min-w-0 border-t border-[var(--kc-line)] pt-2.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--kc-ink-muted)]">
        Sources
      </p>
      <div className="chat-source-scroll-row flex items-center gap-1.5">
        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Scroll sources left"
            onClick={() => scrollBy(-260)}
            className="chat-source-scroll-btn shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
        <div
          ref={scrollRef}
          className="chat-source-scroll-viewport flex min-w-0 flex-1 gap-2.5 overflow-x-auto scroll-smooth scrollbar-none"
        >
          {list.map((c, idx) => {
            const url = c.url.trim();
            const title =
              (typeof c.title === "string" && c.title.trim()) ||
              hostFromUrl(url) ||
              "Source";
            const snippet = sourceCardSnippet(
              title,
              typeof c.description === "string" ? c.description : ""
            );
            const host = hostFromUrl(url);
            return (
              <a
                key={`${url}-${idx}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`chat-source-card${primaryHex ? " chat-source-card--accent" : ""}`}
                style={
                  primaryHex
                    ? { "--kc-source-accent": primaryHex }
                    : undefined
                }
              >
                <span className="chat-source-card-title">{title}</span>
                {snippet ? (
                  <span className="chat-source-card-snippet">{snippet}</span>
                ) : null}
                {host ? (
                  <span className="chat-source-card-host">{host}</span>
                ) : null}
              </a>
            );
          })}
        </div>
        {canScrollRight ? (
          <button
            type="button"
            aria-label="Scroll sources right"
            onClick={() => scrollBy(260)}
            className="chat-source-scroll-btn shrink-0"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
