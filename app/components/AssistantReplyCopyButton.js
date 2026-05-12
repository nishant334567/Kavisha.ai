"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function singleLine(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromDescription(desc) {
  if (!desc || typeof desc !== "string") return "";
  const lines = desc.split(/\r?\n/).filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^(Title|Author|Published)\s*:/i.test(t)) return false;
    return true;
  });
  let s = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 200) return s;
  const cut = s.slice(0, 200);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 120 ? cut.slice(0, lastSpace) : cut}…`;
}

function labelForSourceCard(c) {
  const url = (c.url || "").trim();
  const rawTitle = typeof c.title === "string" ? c.title.trim() : "";
  if (rawTitle) return singleLine(rawTitle);
  const fromDesc = excerptFromDescription(
    typeof c.description === "string" ? c.description : ""
  );
  if (fromDesc) return singleLine(fromDesc);
  const host = hostFromUrl(url);
  return host || "Source";
}

function resolveReadMoreForCopy(
  readMoreUrl,
  brandSubdomain,
  sourceCards,
  sourceUrls
) {
  const explicit = typeof readMoreUrl === "string" ? readMoreUrl.trim() : "";
  if (explicit) return explicit;
  const slug = (brandSubdomain || "").trim().toLowerCase();
  if (slug === "entrackr") return "https://entrackr.com";

  const fromSources = [];
  if (Array.isArray(sourceCards)) {
    for (const c of sourceCards) {
      if (c && typeof c.url === "string" && c.url.trim()) {
        fromSources.push(c.url.trim());
      }
    }
  }
  if (Array.isArray(sourceUrls)) {
    for (const u of sourceUrls) {
      if (typeof u === "string" && u.trim()) fromSources.push(u.trim());
    }
  }
  for (const u of fromSources) {
    if (hostFromUrl(u) === "entrackr.com") return "https://entrackr.com";
  }
  return "";
}

export function buildAssistantReplyCopyText(
  message,
  sourceCards,
  sourceUrls,
  readMoreUrl = ""
) {
  const body = String(message ?? "").trim();
  const lines = [body || "(empty response)"];

  const cards = Array.isArray(sourceCards)
    ? sourceCards.filter((c) => c && typeof c.url === "string" && c.url.trim())
    : [];
  const urls = Array.isArray(sourceUrls)
    ? sourceUrls.filter((u) => typeof u === "string" && u.trim())
    : [];

  if (cards.length === 0 && urls.length === 0) {
    const core = lines.join("\n");
    const more = typeof readMoreUrl === "string" ? readMoreUrl.trim() : "";
    return more ? `To read more, visit ${more}\n\n${core}` : core;
  }

  lines.push("");
  lines.push("Sources");
  lines.push("");

  if (cards.length > 0) {
    cards.forEach((c, i) => {
      const u = c.url.trim();
      const label = labelForSourceCard(c);
      lines.push(`${i + 1}. ${label}`);
      lines.push(`   ${u}`);
      if (i < cards.length - 1) lines.push("");
    });
  } else {
    urls.forEach((u, i) => {
      const url = u.trim();
      const host = hostFromUrl(url);
      lines.push(`${i + 1}. ${host || "Link"}`);
      lines.push(`   ${url}`);
      if (i < urls.length - 1) lines.push("");
    });
  }

  const core = lines.join("\n");
  const more = typeof readMoreUrl === "string" ? readMoreUrl.trim() : "";
  return more ? `To read more, visit ${more}\n\n${core}` : core;
}

export default function AssistantReplyCopyButton({
  message,
  sourceCards,
  sourceUrls,
  readMoreUrl = "",
  brandSubdomain = "",
  logId = "",
  onRecorded,
  copied = false,
  className = "",
}) {
  const [showCopied, setShowCopied] = useState(false);
  const copiedHintTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copiedHintTimerRef.current != null) {
        clearTimeout(copiedHintTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const more = resolveReadMoreForCopy(
      readMoreUrl,
      brandSubdomain,
      sourceCards,
      sourceUrls
    );
    const text = buildAssistantReplyCopyText(
      message,
      sourceCards,
      sourceUrls,
      more
    );
    try {
      await navigator.clipboard.writeText(text);

      if (copiedHintTimerRef.current != null) {
        clearTimeout(copiedHintTimerRef.current);
      }
      setShowCopied(true);
      copiedHintTimerRef.current = window.setTimeout(() => {
        setShowCopied(false);
        copiedHintTimerRef.current = null;
      }, 2000);

      const id = String(logId || "").trim();
      if (id && typeof onRecorded === "function" && !copied) {
        try {
          const res = await fetch(`/api/logs/message/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "copy" }),
            credentials: "same-origin",
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            onRecorded({
              liked: Boolean(data.liked),
              copied: Boolean(data.copied),
            });
          }
        } catch {
          /* network — copy already succeeded */
        }
      }
    } catch {
      /* denied or unsupported */
    }
  }, [
    message,
    sourceCards,
    sourceUrls,
    readMoreUrl,
    brandSubdomain,
    logId,
    onRecorded,
    copied,
  ]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="Copy response"
        onClick={() => void handleCopy()}
        className={`inline-flex size-9 items-center justify-center text-foreground ${className}`.trim()}
      >
        <Copy
          className="h-4 w-4 shrink-0 fill-none text-foreground"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {showCopied ? (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-full top-1/2 z-10 ml-0.5 -translate-y-1/2 whitespace-nowrap rounded border border-black px-1.5 py-0.5 text-xs text-foreground dark:border-neutral-200"
        >
          Copied
        </span>
      ) : null}
    </div>
  );
}
