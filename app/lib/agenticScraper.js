export const DEFAULT_SCRAPE_INSTRUCTION = `Scrape this website thoroughly for brand training.

Save every useful page with formatted sections: Navigation (navbar/header), Main content, and Footer — include nav and footer, do not strip them.

Navigation and footer alone are NOT sufficient. You MUST visit and save inner same-domain pages (About, Services, FAQ, blog, product pages, etc.) that have real paragraphs in Main content.

Use get_links and goto to discover pages. Do not call done until at least one saved page has substantive Main content (not only link menus).

Skip login, cart, and checkout unless clearly needed. Stay on the same domain as the starting URL.`;

const DEFAULT_INSTRUCTION = DEFAULT_SCRAPE_INSTRUCTION;

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

function resolveScrapeEndpoint() {
  return resolveScraperPath("/api/scrape");
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

/**
 * POST to agentic-scraper and collect saved pages from the SSE stream.
 * @param {string} url
 * @param {string} [instruction]
 * @returns {Promise<{ pages: Array<{ url: string, title: string, summary?: string, content: string }> }>}
 */
export async function runAgenticScrape(url, instruction = DEFAULT_INSTRUCTION) {
  const endpoint = resolveScrapeEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      instruction: instruction?.trim() || DEFAULT_INSTRUCTION,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Scraper request failed (${res.status})`);
  }

  if (!res.body) {
    throw new Error("Scraper returned an empty response");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const pages = [];
  let streamError = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = null;
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "step" && data.type === "saved" && data.data) {
            pages.push(data.data);
          } else if (currentEvent === "complete" && Array.isArray(data.results)) {
            for (const item of data.results) {
              if (
                item?.content &&
                !pages.some((p) => p.url === item.url && p.title === item.title)
              ) {
                pages.push(item);
              }
            }
          } else if (currentEvent === "error") {
            streamError = data.message || "Scraper failed";
          }
        } catch {
          // ignore malformed SSE JSON
        }
        currentEvent = null;
      }
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  const deduped = [];
  const seen = new Set();
  for (const page of pages) {
    const content = (page.content || "").trim();
    if (!content) continue;
    const key = `${page.url || ""}::${page.title || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      url: page.url || url,
      title: (page.title || "Untitled").trim(),
      summary: page.summary || "",
      content,
    });
  }

  return { pages: deduped };
}
