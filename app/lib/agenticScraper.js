export function resolveScraperBase() {
  const raw = (process.env.AGENTIC_SCRAPER_URL || "").trim();
  if (!raw) {
    throw new Error(
      "AGENTIC_SCRAPER_URL is not set. Add your Cloud Run scrape URL to .env.local"
    );
  }
  let base = raw.replace(/\/$/, "");
  if (base.endsWith("/api/scrape")) {
    base = base.slice(0, -"/api/scrape".length);
  }
  if (base.endsWith("/api/discover")) {
    base = base.slice(0, -"/api/discover".length);
  }
  if (base.endsWith("/api/scrape-page")) {
    base = base.slice(0, -"/api/scrape-page".length);
  }
  return base;
}

function resolveScraperPath(pathSuffix) {
  const base = resolveScraperBase();
  return `${base}${pathSuffix}`;
}

async function postScraperJson(pathSuffix, body) {
  const endpoint = resolveScraperPath(pathSuffix);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Scraper request failed (${res.status})`);
  }
  return data;
}

/**
 * List same-domain links for a seed URL (agentic-scraper /api/discover).
 * @param {string} url
 */
export async function discoverSiteLinks(url) {
  const data = await postScraperJson("/api/discover", { url });
  return {
    seedUrl: data.seedUrl || url,
    links: Array.isArray(data.links) ? data.links : [],
    source: data.source || "",
    total: data.total ?? (data.links?.length || 0),
    postCount: data.postCount ?? 0,
    feedUrlCount: data.feedUrlCount ?? 0,
  };
}

/**
 * Scrape one page (agentic-scraper /api/scrape-page).
 * @param {string} url
 */
export async function scrapeSinglePage(url) {
  const data = await postScraperJson("/api/scrape-page", { url });
  const page = data.page;
  if (!page?.content?.trim()) {
    throw new Error("No content returned for this page");
  }
  return {
    url: page.url || url,
    title: (page.title || "Untitled").trim(),
    summary: page.summary || "",
    content: page.content.trim(),
    substantive: page.substantive === true,
  };
}
