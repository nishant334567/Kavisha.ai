const USER_AGENT = "KavishaBlogDiscovery/1.0 (+https://kavisha.ai)";
const FETCH_MS = 35_000;

function stripCdata(s) {
  return String(s || "")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .trim();
}

function articleUrlFromRssItem(block) {
  const linkRe = /<link\b[^>]*>([\s\S]*?)<\/link>/gi;
  let m;
  while ((m = linkRe.exec(block)) !== null) {
    const u = stripCdata(m[1]);
    if (/^https?:\/\//i.test(u)) return u;
  }
  const guidM = /<guid\b[^>]*>([\s\S]*?)<\/guid>/i.exec(block);
  if (guidM) {
    const u = stripCdata(guidM[1]);
    if (/^https?:\/\//i.test(u)) return u;
  }
  return "";
}

function extractUrlsFromRss(xml) {
  const seen = new Set();
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const u = articleUrlFromRssItem(m[1]);
    if (u && /^https?:\/\//i.test(u)) seen.add(u.trim());
  }
  return [...seen];
}

function extractLocsFromXml(xml) {
  const out = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const s = (m[1] || "").trim();
    if (s) out.push(s);
  }
  return out;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function isHttpUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sameHost(a, b) {
  try {
    return new URL(a).hostname === new URL(b).hostname;
  } catch {
    return false;
  }
}

function normalizeAbs(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function looksLikeBlogPostUrl(seedUrl, url) {
  try {
    const seed = new URL(seedUrl);
    const u = new URL(url);
    if (u.hostname !== seed.hostname) return false;
    const p = u.pathname || "";
    // Exclude sitemap/xml and obvious non-content endpoints
    if (/\.xml$/i.test(p)) return false;
    if (/\/(wp-admin|wp-login|login|logout|cart|checkout)(\/|$)/i.test(p)) {
      return false;
    }
    // Exclude common non-article pages (nav/footer)
    if (
      /\/(about|contact|privacy|privacy-policy|terms|terms-and-conditions|tnc|cookies|cookie-policy|disclaimer|refund|returns|shipping)(\/|$)/i.test(
        p
      )
    ) {
      return false;
    }
    if (/\/(tag|category|author)(\/|$)/i.test(p)) return false;

    // Strong signal: /blog/slug or /blogs/slug
    if (/\/blog(s)?\/[^/]/i.test(p)) return true;

    // If seed path contains /blog, treat other deeper paths under it as candidates.
    const seedPath = seed.pathname || "/";
    if (/\/blog(s)?(\/|$)/i.test(seedPath)) {
      const seg = seedPath.match(/\/blog(s)?/i)?.[0] || "/blog";
      const segLower = seg.toLowerCase();
      const pLower = p.toLowerCase();
      if (pLower.startsWith(segLower) && pLower !== segLower && !/\/page\/\d+\/?$/i.test(pLower)) {
        // Avoid the listing itself (/blog, /blog/)
        if (!/\/blog(s)?\/?$/i.test(pLower)) return true;
      }

      // Many sites list posts under /blog/ but articles live at the site root
      // (e.g. /my-article-title/). Accept sluggy root paths as a fallback.
      const parts = pLower.split("/").filter(Boolean);
      if (parts.length === 1) {
        const slug = parts[0];
        // Heuristic: slug-like (contains dashes) and not too short.
        if (slug.length >= 18 && slug.includes("-")) return true;
      }
    }

    // Date-based permalink patterns: /2026/05/slug or /2026/slug
    if (/\/\d{4}\/\d{1,2}\//.test(p) || /\/\d{4}\/[^/]/.test(p)) return true;
    return false;
  } catch {
    return false;
  }
}

function extractFeedLinksFromHtml(html, baseUrl) {
  const out = [];
  const re =
    /<link\b[^>]*rel=["']alternate["'][^>]*type=["']application\/(rss\+xml|atom\+xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[2];
    const abs = normalizeAbs(baseUrl, href);
    if (abs && isHttpUrl(abs)) out.push(abs);
  }
  return out;
}

function buildFeedCandidates(seedUrl) {
  const candidates = [];
  try {
    const u = new URL(seedUrl);
    const origin = u.origin;
    const path = u.pathname.replace(/\/+$/, "");
    candidates.push(`${origin}/feed`);
    candidates.push(`${origin}/rss`);
    candidates.push(`${origin}/rss.xml`);
    candidates.push(`${origin}/feed.xml`);
    candidates.push(`${origin}/atom.xml`);
    if (/\/blog(s)?(\/|$)/i.test(path || "")) {
      candidates.push(`${origin}${path}/feed`);
      candidates.push(`${origin}${path}/rss`);
    }
    candidates.push(`${origin}${path}/feed`);
  } catch {
    // ignore
  }
  return [...new Set(candidates)].filter(isHttpUrl);
}

async function discoverViaRss(seedUrl) {
  // Try HTML alternate links first (more accurate for non-standard feed paths).
  let html = "";
  try {
    html = await fetchText(seedUrl);
  } catch {
    html = "";
  }
  const candidates = [
    ...extractFeedLinksFromHtml(html, seedUrl),
    ...buildFeedCandidates(seedUrl),
  ];

  for (const feedUrl of candidates) {
    try {
      const xml = await fetchText(feedUrl);
      const urls = extractUrlsFromRss(xml).filter((u) => sameHost(seedUrl, u));
      if (urls.length > 0) {
        return { feedUrl, urls };
      }
    } catch {
      // try next candidate
    }
  }
  return { feedUrl: "", urls: [] };
}

async function discoverViaSitemap(seedUrl) {
  let origin = "";
  try {
    origin = new URL(seedUrl).origin;
  } catch {
    return { sitemapUrl: "", urls: [] };
  }

  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  for (const sitemapUrl of candidates) {
    try {
      const xml = await fetchText(sitemapUrl);
      const locs = extractLocsFromXml(xml).filter(isHttpUrl);

      // If it's an index, child sitemaps will also be .xml; fetch a limited number.
      const childSitemaps = locs.filter((u) => /\.xml(\?|$)/i.test(u)).slice(0, 25);
      if (childSitemaps.length > 0) {
        const all = [];
        for (const child of childSitemaps) {
          try {
            const childXml = await fetchText(child);
            all.push(...extractLocsFromXml(childXml));
          } catch {
            // ignore child errors
          }
        }
        const urls = [...new Set(all)]
          .filter((u) => isHttpUrl(u) && sameHost(seedUrl, u))
          .filter((u) => !/\.xml(\?|$)/i.test(new URL(u).pathname));
        if (urls.length > 0) return { sitemapUrl, urls };
      } else {
        const urls = [...new Set(locs)]
          .filter((u) => isHttpUrl(u) && sameHost(seedUrl, u))
          .filter((u) => !/\.xml(\?|$)/i.test(new URL(u).pathname));
        if (urls.length > 0) return { sitemapUrl, urls };
      }
    } catch {
      // try next
    }
  }
  return { sitemapUrl: "", urls: [] };
}

function extractAnchorsFromHtml(html, baseUrl) {
  const hrefRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const out = [];
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const abs = normalizeAbs(baseUrl, m[1]);
    if (abs && isHttpUrl(abs)) out.push(abs);
  }
  return out;
}

function findNextPageUrl(html, baseUrl) {
  // rel="next" link tag
  const linkNext = /<link\b[^>]*rel=["']next["'][^>]*href=["']([^"']+)["'][^>]*>/i.exec(
    html
  );
  if (linkNext?.[1]) return normalizeAbs(baseUrl, linkNext[1]);

  // anchor rel=next
  const aRelNext = /<a\b[^>]*rel=["']next["'][^>]*href=["']([^"']+)["'][^>]*>/i.exec(
    html
  );
  if (aRelNext?.[1]) return normalizeAbs(baseUrl, aRelNext[1]);

  // text-based "Next"
  const aNextText =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*(next|older|›|→)\s*<\/a>/i.exec(
      html
    );
  if (aNextText?.[1]) return normalizeAbs(baseUrl, aNextText[1]);

  return "";
}

function incrementPageUrl(currentUrl) {
  try {
    const u = new URL(currentUrl);
    const sp = u.searchParams;
    if (sp.has("page")) {
      const n = Number.parseInt(sp.get("page") || "1", 10);
      sp.set("page", String(Number.isFinite(n) ? n + 1 : 2));
      u.search = sp.toString() ? `?${sp.toString()}` : "";
      return u.toString();
    }
    if (sp.has("paged")) {
      const n = Number.parseInt(sp.get("paged") || "1", 10);
      sp.set("paged", String(Number.isFinite(n) ? n + 1 : 2));
      u.search = sp.toString() ? `?${sp.toString()}` : "";
      return u.toString();
    }
    const m = u.pathname.match(/\/page\/(\d+)\/?$/i);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      const next = Number.isFinite(n) ? n + 1 : 2;
      u.pathname = u.pathname.replace(/\/page\/(\d+)\/?$/i, `/page/${next}/`);
      return u.toString();
    }
    return "";
  } catch {
    return "";
  }
}

async function discoverViaPagination(seedUrl, opts = {}) {
  const maxPages = Math.min(Math.max(1, opts.maxPages || 60), 200);
  const all = new Set();
  const seenPages = new Set();

  let current = seedUrl;
  let stalled = 0;

  for (let i = 0; i < maxPages; i++) {
    if (!current || seenPages.has(current)) break;
    seenPages.add(current);

    let html = "";
    try {
      html = await fetchText(current);
    } catch {
      break;
    }

    const anchors = extractAnchorsFromHtml(html, current);
    let added = 0;
    for (const u of anchors) {
      if (!looksLikeBlogPostUrl(seedUrl, u)) continue;
      if (!all.has(u)) {
        all.add(u);
        added += 1;
      }
    }

    if (added === 0) stalled += 1;
    else stalled = 0;
    if (stalled >= 2) break;

    const nextFromHtml = findNextPageUrl(html, current);
    const next = nextFromHtml || incrementPageUrl(current);
    if (!next) break;
    current = next;
  }

  return [...all];
}

function toLinkRows(urls) {
  return urls.map((u) => ({ url: u, label: "", category: "" }));
}

/**
 * Discover blog post URLs for a blog listing URL.
 * Strategy: RSS → sitemap → pagination crawl.
 */
export async function discoverBlogLinks(seedUrl) {
  // Many RSS feeds return only the latest ~10 items. We use RSS as a fast
  // starting point but still attempt sitemap/pagination if RSS is small.
  const rss = await discoverViaRss(seedUrl);
  const rssUrls = rss.urls || [];

  const sm = await discoverViaSitemap(seedUrl);
  const smUrls = sm.urls || [];

  const needPagination =
    rssUrls.length + smUrls.length < 80 && /\/blog(s)?(\/|$)/i.test(new URL(seedUrl).pathname || "");
  const paged = needPagination
    ? await discoverViaPagination(seedUrl, { maxPages: 120 })
    : [];

  const combined = [];
  const seen = new Set();
  for (const u of [...rssUrls, ...smUrls, ...paged]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    combined.push(u);
  }

  const postishCount = combined.filter((u) => looksLikeBlogPostUrl(seedUrl, u)).length;

  const sourceParts = [];
  if (rss.feedUrl && rssUrls.length) sourceParts.push(`rss:${rss.feedUrl}`);
  else if (rssUrls.length) sourceParts.push("rss");
  if (sm.sitemapUrl && smUrls.length) sourceParts.push(`sitemap:${sm.sitemapUrl}`);
  else if (smUrls.length) sourceParts.push("sitemap");
  if (paged.length) sourceParts.push("pagination");

  return {
    seedUrl,
    source: sourceParts.join("|") || "blog",
    links: toLinkRows(combined),
    total: combined.length,
    postCount: postishCount,
    feedUrlCount: rss.feedUrl ? 1 : 0,
  };
}

