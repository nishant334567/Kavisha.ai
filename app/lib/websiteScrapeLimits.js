/** Max pages trained or scraped per batch (not applied to link discovery). */
export const MAX_WEBSITE_BATCH_PAGES = 100;

export function websiteBatchLimitMessage() {
  return `You can scrape at most ${MAX_WEBSITE_BATCH_PAGES} pages per batch`;
}

export function friendlyScrapeReason(message = "") {
  const m = String(message).toLowerCase();
  if (m.includes("timeout")) return "Page didn't load in time";
  if (m.includes("network") || m.includes("econnreset")) {
    return "Connection problem";
  }
  return message || "Training failed";
}
