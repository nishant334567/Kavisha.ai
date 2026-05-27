/** Max pages per website scrape or save batch (API + UI). */
export const MAX_WEBSITE_BATCH_PAGES = 100;

export function websiteBatchLimitMessage(action = "scrape") {
  const verb = action === "save" ? "save" : "scrape";
  return `You can ${verb} at most ${MAX_WEBSITE_BATCH_PAGES} pages per batch`;
}
