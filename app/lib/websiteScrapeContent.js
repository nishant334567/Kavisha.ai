/**
 * Prepare agentic-scraper output for KB training (no LLM).
 */

export function normalizeWebsiteUrl(url = "") {
  try {
    const u = new URL(String(url).trim());
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "") || "";
    if (!path) path = "/";
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return String(url).trim().toLowerCase();
  }
}

export function dedupeDiscoveredLinks(links = []) {
  const byKey = new Map();
  for (const link of links) {
    if (!link?.url) continue;
    const key = normalizeWebsiteUrl(link.url);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, link);
      continue;
    }
    const labelA = (link.label || "").trim();
    const labelB = (existing.label || "").trim();
    if (labelA.length > labelB.length) {
      byKey.set(key, link);
    }
  }
  return [...byKey.values()];
}

function isGenericSiteTitle(value = "") {
  const v = String(value).trim().toLowerCase();
  if (!v) return true;
  if (v === "home" || v === "untitled") return false;
  if (/^[\w.-]+\.(ai|com|org|net|io|co|in)$/i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  return false;
}

export function titleFromUrlPath(url = "") {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    const segment = path.split("/").filter(Boolean).pop();
    if (!segment) return "Home";
    return segment
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

/**
 * Prefer discover label, then URL path, then browser title.
 */
export function resolveDocumentTitle({ label, url, pageTitle }) {
  const cleanLabel = (label || "").trim();
  if (cleanLabel && !isGenericSiteTitle(cleanLabel)) {
    return cleanLabel;
  }
  const fromPath = titleFromUrlPath(url);
  if (fromPath) return fromPath;
  const pt = (pageTitle || "").trim();
  if (pt && !isGenericSiteTitle(pt)) return pt;
  return cleanLabel || fromPath || "Untitled";
}

export function fixRunOnSpacing(text = "") {
  return String(text)
    .split("\n")
    .map((line) =>
      line
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([.!?])([A-Za-z])/g, "$1 $2")
        .replace(/([a-z])(\d)/g, "$1 $2")
        .replace(/(\d)([A-Za-z])/g, "$1 $2")
    )
    .join("\n");
}

export function extractMarkdownSection(content = "", heading) {
  const re = new RegExp(
    `## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |\\s*$)`,
    "i"
  );
  const match = String(content).match(re);
  return match?.[1]?.trim() || "";
}

export function isHomePage(url = "", seedUrl = "") {
  if (!seedUrl) return false;
  try {
    const a = new URL(url);
    const b = new URL(seedUrl);
    if (a.origin !== b.origin) return false;
    const path = a.pathname.replace(/\/+$/, "") || "/";
    return path === "/" || path === "";
  } catch {
    return false;
  }
}

/**
 * Train on main content for inner pages; keep sections on homepage only.
 */
export function prepareContentForTraining(rawContent = "", options = {}) {
  const { sourceUrl = "", seedUrl = "" } = options;
  const fixed = fixRunOnSpacing(rawContent);
  const main = extractMarkdownSection(fixed, "Main content");
  const mainBody = fixRunOnSpacing(main || fixed);

  if (isHomePage(sourceUrl, seedUrl)) {
    const parts = [];
    const nav = extractMarkdownSection(fixed, "Navigation");
    const footer = extractMarkdownSection(fixed, "Footer");
    if (nav) parts.push(`## Navigation\n\n${fixRunOnSpacing(nav)}`);
    parts.push(`## Main content\n\n${mainBody}`);
    if (footer) parts.push(`## Footer\n\n${fixRunOnSpacing(footer)}`);
    const body = parts.join("\n\n");
    return sourceUrl
      ? `${body}\n\n## Source URL\n${sourceUrl}`
      : body;
  }

  return sourceUrl
    ? `## Main content\n\n${mainBody}\n\n## Source URL\n${sourceUrl}`
    : `## Main content\n\n${mainBody}`;
}

/**
 * Use scrape-prepared text as-is; otherwise run prepareContentForTraining.
 * Falls back to raw content if preparation yields nothing.
 */
export function resolveTrainingText(rawContent = "", options = {}) {
  const { prepared = false, sourceUrl = "", seedUrl = "" } = options;
  const raw = String(rawContent || "").trim();
  if (!raw) return "";

  if (prepared) {
    return raw;
  }

  const fromPrepare = prepareContentForTraining(raw, {
    sourceUrl,
    seedUrl,
  }).trim();
  return fromPrepare || raw;
}

export function websiteFolderNameFromUrl(seedUrl = "") {
  try {
    const host = new URL(seedUrl).hostname.replace(/^www\./i, "");
    const parts = host.split(".");
    const base =
      parts.length > 2 ? parts[parts.length - 2] : parts[0] || "website";
    const name = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    return `${name} website`;
  } catch {
    return "Website import";
  }
}
