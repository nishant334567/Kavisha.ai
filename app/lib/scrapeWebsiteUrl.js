export function parseAndValidateScrapeUrl(input) {
  if (!input || typeof input !== "string") {
    return { ok: false, error: "URL is required" };
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http or https URLs are allowed" };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return { ok: false, error: "This URL is not allowed" };
  }
  return { ok: true, href: parsed.href };
}
