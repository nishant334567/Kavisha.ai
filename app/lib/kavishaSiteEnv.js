const PROD_HOST = "kavisha.ai";
const STAGING_HOST = "staging.kavisha.ai";

/** Staging vs prod — set KAVISHA_SITE_ENV=staging on Cloud Run (keep NODE_ENV=production). */
export function isStagingDeployment() {
  if (process.env.KAVISHA_SITE_ENV === "staging") return true;
  if (process.env.NEXT_PUBLIC_KAVISHA_SITE_ENV === "staging") return true;
  const urls = [
    process.env.PUBLIC_BASE_URL,
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);
  for (const u of urls) {
    if (String(u).toLowerCase().includes("staging.kavisha.ai")) return true;
  }
  return false;
}

export function isStagingHost(host) {
  return String(host || "").toLowerCase().includes(".staging.");
}

export function isStagingSite(opts) {
  if (opts?.request) {
    const host = opts.request.headers?.get?.("host");
    if (isStagingHost(host)) return true;
  }
  return isStagingDeployment();
}

export function getKavishaRootHost(opts) {
  return isStagingSite(opts) ? STAGING_HOST : PROD_HOST;
}

export function getKavishaCloudRunService(opts) {
  return isStagingSite(opts) ? "kavisha-staging" : "kavisha-ai";
}

export function getDefaultKavishaBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    `https://${PROD_HOST}`;
  return String(raw).replace(/\/$/, "");
}

export function getBrandOrigin(subdomain, opts) {
  const sub = String(subdomain || "kavisha").trim().toLowerCase();
  if (isStagingSite(opts)) {
    if (sub === "kavisha") return `https://kavisha.${STAGING_HOST}`;
    return `https://${sub}.${STAGING_HOST}`;
  }
  if (sub === "kavisha") return getDefaultKavishaBaseUrl();
  return `https://${sub}.${PROD_HOST}`;
}

export function subdomainFromHost(host) {
  if (!host) return "kavisha";
  const clean = host.toLowerCase().replace(/^www\./, "");
  const parts = clean.split(".");
  const stagingIdx = parts.indexOf("staging");
  if (stagingIdx >= 0) return stagingIdx > 0 ? parts[0] : "kavisha";
  return parts.length > 2 ? parts[0] : "kavisha";
}
