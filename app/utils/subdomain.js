/** Static `/admin/{segment}/…` routes — not brand subdomains. */
const STATIC_ADMIN_SEGMENTS = new Set([
  "jobs",
  "blogs",
  "quiz",
  "links",
  "products",
  "services",
  "analytics",
  "platform",
]);

export function isClientStagingSite() {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_KAVISHA_SITE_ENV === "staging") return true;
  return window.location.hostname.toLowerCase().includes(".staging.");
}

export function getBrandPublicDomain(subdomain) {
  const sub = String(subdomain || "").trim().toLowerCase();
  if (!sub) return "";
  const root = isClientStagingSite() ? "staging.kavisha.ai" : "kavisha.ai";
  return `${sub}.${root}`;
}

export function getBrandPublicOrigin(subdomain) {
  const domain = getBrandPublicDomain(subdomain);
  return domain ? `https://${domain}` : "";
}

export function getBrandHomeUrl(subdomain) {
  if (typeof window === "undefined") return "/";
  const sub = String(subdomain || "").trim();
  if (!sub) return "/";
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${origin}/?subdomain=${encodeURIComponent(sub)}`;
  }
  return getBrandPublicOrigin(sub) || "/";
}

export function getSubdomain() {
  if (typeof window === "undefined") {
    return null;
  }

  const pathname = window.location.pathname || "";
  const adminMatch = pathname.match(/^\/admin\/([^/]+)(?:\/|$)/);
  if (adminMatch) {
    const segment = adminMatch[1].toLowerCase();
    if (!STATIC_ADMIN_SEGMENTS.has(segment)) {
      return segment;
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get("subdomain");
  if (fromQuery) return fromQuery;

  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "kavisha";
  }

  const parts = hostname.split(".");
  const stagingIdx = parts.indexOf("staging");
  if (stagingIdx >= 0) return stagingIdx > 0 ? parts[0] : "kavisha";
  return parts.length > 2 ? parts[0] : "kavisha";
}
