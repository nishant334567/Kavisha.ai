/**
 * E-commerce import: JSON-LD Product extraction + aggressive markdown cleanup.
 */

import {
  extractMarkdownSection,
  fixRunOnSpacing,
  prepareTextForTrainingChunks,
} from "@/app/lib/websiteScrapeContent";

const ECOMMERCE_MAX_WORDS = 2500;
const FETCH_TIMEOUT_MS = 15000;

const BLOCK_NOISE =
  /^(related products?|you may also like|customers also (bought|viewed)|recently viewed|similar items?|recommended for you|product reviews?|customer reviews?|write a review|add your review|people also bought|frequently bought together|compare products?|more from this (brand|category)|shop (the|by) category|browse all)/i;

const LINE_NOISE =
  /^(skip to|add to cart|buy now|in stock|out of stock|free shipping|share on|pin it|tweet|quantity:|qty:|sku:|item #|model #:)/i;

/**
 * Folder label for e-commerce imports (e.g. "Rajmusical products").
 */
export function ecommerceFolderNameFromUrl(seedUrl = "") {
  try {
    const host = new URL(seedUrl).hostname.replace(/^www\./i, "");
    const parts = host.split(".");
    const base =
      parts.length > 2 ? parts[parts.length - 2] : parts[0] || "store";
    const name = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    return `${name} products`;
  } catch {
    return "Product catalog";
  }
}

/**
 * Fetch HTML for JSON-LD when the scraper does not return it.
 */
export async function fetchProductPageHtml(url, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "KavishaBot/1.0 (+https://kavisha.ai; product-catalog-import)",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return typeof html === "string" ? html : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} html
 * @returns {unknown[]}
 */
export function extractJsonLdFromHtml(html = "") {
  const blocks = [];
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      /* skip invalid JSON-LD */
    }
  }
  return blocks;
}

function normalizeType(type) {
  if (!type) return "";
  if (Array.isArray(type)) {
    return type.map((t) => String(t).toLowerCase()).join(" ");
  }
  return String(type).toLowerCase();
}

function isProductType(typeStr) {
  return /\bproduct\b/.test(typeStr);
}

/**
 * @param {unknown} node
 * @returns {Record<string, unknown>[]}
 */
function collectProductNodes(node) {
  if (!node || typeof node !== "object") return [];

  const obj = /** @type {Record<string, unknown>} */ (node);
  const typeStr = normalizeType(obj["@type"]);

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    return obj["@graph"].flatMap((child) => collectProductNodes(child));
  }

  if (isProductType(typeStr)) {
    return [obj];
  }

  if (Array.isArray(node)) {
    return node.flatMap((item) => collectProductNodes(item));
  }

  return [];
}

/**
 * @param {unknown[]} blocks
 * @param {string} [pageUrl]
 */
export function findBestProductJsonLd(blocks = [], pageUrl = "") {
  const products = blocks.flatMap((b) => collectProductNodes(b));
  if (!products.length) return null;

  if (pageUrl) {
    try {
      const page = new URL(pageUrl);
      const match = products.find((p) => {
        const u = p.url || p["@id"];
        if (!u || typeof u !== "string") return false;
        try {
          const pu = new URL(u, page.origin);
          return (
            pu.pathname.replace(/\/+$/, "") ===
            page.pathname.replace(/\/+$/, "")
          );
        } catch {
          return false;
        }
      });
      if (match) return match;
    } catch {
      /* ignore */
    }
  }

  return products[0];
}

function textFromJsonLd(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map(textFromJsonLd).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const o = /** @type {Record<string, unknown>} */ (value);
    if (o.name) return textFromJsonLd(o.name);
    if (o["@value"]) return textFromJsonLd(o["@value"]);
    if (o.description) return textFromJsonLd(o.description);
  }
  return "";
}

function formatOffers(offers) {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const lines = [];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (offer);
    const price = o.price ?? o.lowPrice ?? o.highPrice;
    const currency = o.priceCurrency || "";
    const availability = textFromJsonLd(o.availability);
    const parts = [];
    if (price != null && price !== "") {
      parts.push(`${currency ? `${currency} ` : ""}${price}`.trim());
    }
    if (availability) {
      const short = availability.replace(/^https?:\/\/schema\.org\//i, "");
      parts.push(short);
    }
    if (parts.length) lines.push(parts.join(" — "));
  }
  return lines;
}

function formatAdditionalProperties(props) {
  const list = Array.isArray(props) ? props : props ? [props] : [];
  const lines = [];
  for (const prop of list) {
    if (!prop || typeof prop !== "object") continue;
    const p = /** @type {Record<string, unknown>} */ (prop);
    const name = textFromJsonLd(p.name);
    const value = textFromJsonLd(p.value);
    if (name && value) lines.push(`- ${name}: ${value}`);
  }
  return lines;
}

/**
 * @param {Record<string, unknown>} product
 * @param {string} [sourceUrl]
 */
export function productJsonLdToMarkdown(product, sourceUrl = "") {
  if (!product) return "";

  const parts = [];
  const name = textFromJsonLd(product.name);
  if (name) parts.push(`## Product\n\n${name}`);

  const brand = textFromJsonLd(product.brand);
  if (brand) parts.push(`## Brand\n\n${brand}`);

  const sku = textFromJsonLd(product.sku || product.mpn || product.gtin13);
  if (sku) parts.push(`## SKU\n\n${sku}`);

  const description = textFromJsonLd(product.description);
  if (description) parts.push(`## Description\n\n${description}`);

  const offerLines = formatOffers(product.offers);
  if (offerLines.length) {
    parts.push(`## Price & availability\n\n${offerLines.join("\n")}`);
  }

  const specLines = formatAdditionalProperties(product.additionalProperty);
  if (specLines.length) {
    parts.push(`## Specifications\n\n${specLines.join("\n")}`);
  }

  const category = textFromJsonLd(product.category);
  if (category) parts.push(`## Category\n\n${category}`);

  if (sourceUrl) parts.push(`## Source URL\n${sourceUrl}`);

  return parts.join("\n\n").trim();
}

function countWords(text = "") {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function capTrainingWords(text = "", maxWords = ECOMMERCE_MAX_WORDS) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text).trim();
  return `${words.slice(0, maxWords).join(" ")}\n\n[Content truncated for training.]`;
}

export function stripEcommerceMarkdownNoise(text = "") {
  const blocks = String(text)
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const kept = [];
  for (const block of blocks) {
    const firstLine = block.split("\n")[0]?.trim() || "";
    const heading = firstLine.replace(/^#+\s*/, "");

    if (BLOCK_NOISE.test(heading) || BLOCK_NOISE.test(block.slice(0, 120))) {
      continue;
    }

    const lines = block
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        if (!t) return true;
        if (LINE_NOISE.test(t)) return false;
        if (/^\[.+\]\(.+\)$/.test(t) && t.length < 120) return false;
        return true;
      });

    const cleaned = lines.join("\n").trim();
    if (!cleaned) continue;

    const linkLines = cleaned
      .split("\n")
      .filter((l) => l.trim())
      .filter((l) => /\[.+\]\(.+\)/.test(l.trim()));
    const totalLines = cleaned.split("\n").filter((l) => l.trim()).length;
    if (totalLines >= 4 && linkLines.length / totalLines > 0.75) {
      continue;
    }

    kept.push(cleaned);
  }

  return kept.join("\n\n");
}

function extractEcommerceMainMarkdown(rawContent = "") {
  const fixed = fixRunOnSpacing(rawContent);
  const main = extractMarkdownSection(fixed, "Main content");
  const body = (main || "").trim();
  if (body) {
    return stripEcommerceMarkdownNoise(
      prepareTextForTrainingChunks(body),
    );
  }
  return stripEcommerceMarkdownNoise(
    prepareTextForTrainingChunks(fixed),
  );
}

function mergeJsonLdAndMain(jsonLdMd, mainMd, sourceUrl) {
  const jdWords = countWords(jsonLdMd);
  const mainWords = countWords(mainMd);

  if (!jsonLdMd && mainMd) {
    return sourceUrl && !mainMd.includes(sourceUrl)
      ? `${mainMd}\n\n## Source URL\n${sourceUrl}`
      : mainMd;
  }

  if (jsonLdMd && !mainMd) return jsonLdMd;

  if (jsonLdMd && mainMd) {
    if (jdWords >= 80 || mainWords < 60) {
      return jsonLdMd;
    }
    const withoutSource = jsonLdMd.replace(/\n## Source URL\n[\s\S]*$/i, "").trim();
    return capTrainingWords(
      `${withoutSource}\n\n## Additional details\n\n${mainMd}\n\n## Source URL\n${sourceUrl}`,
    );
  }

  return "";
}

/**
 * Prepare scraped page text for e-commerce KB training.
 * @param {{ rawContent?: string, html?: string, sourceUrl?: string }} opts
 */
export function prepareContentForEcommerce({
  rawContent = "",
  html = "",
  sourceUrl = "",
} = {}) {
  const source = (sourceUrl || "").trim();
  let productMd = "";

  const htmlStr = (html || "").trim();
  if (htmlStr) {
    const blocks = extractJsonLdFromHtml(htmlStr);
    const product = findBestProductJsonLd(blocks, source);
    if (product) {
      productMd = productJsonLdToMarkdown(product, source);
    }
  }

  const mainMd = extractEcommerceMainMarkdown(rawContent);
  let combined = mergeJsonLdAndMain(productMd, mainMd, source);

  if (!combined.trim()) {
    return "";
  }

  combined = prepareTextForTrainingChunks(combined);
  combined = capTrainingWords(combined, ECOMMERCE_MAX_WORDS);

  return combined;
}
