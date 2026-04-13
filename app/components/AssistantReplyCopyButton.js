"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

/** One line, no internal newlines — better for pasted summaries. */
function singleLine(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short optional blurb when there is no title (strip KB metadata lines from chunk text).
 */
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

/**
 * Sanity `copyReadMoreUrl` wins; else Entrackr brand or entrackr.com sources → https://entrackr.com
 */
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

/**
 * Plain text for clipboard: answer + compact sources (title + URL per row).
 * Omits long Pinecone descriptions (Author/Published/body blobs) so paste is shareable.
 */
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
  /** e.g. https://entrackr.com — from Sanity widget launcher */
  readMoreUrl = "",
  /** Kavisha brand slug (e.g. entrackr) — used when readMoreUrl not set in CMS */
  brandSubdomain = "",
  className = "",
}) {
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* denied or unsupported — widget needs parent iframe allow="clipboard-write" */
    }
  }, [message, sourceCards, sourceUrls, readMoreUrl, brandSubdomain]);

  return (
    <button
      type="button"
      title="Copy this reply and its sources (links and titles) as plain text"
      onClick={() => void handleCopy()}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/90 px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-muted-bg hover:text-foreground dark:bg-card/80 ${className}`.trim()}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
