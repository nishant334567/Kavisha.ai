export function getSubdomain() {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;

  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const testSubdomain = urlParams.get("subdomain");
    if (testSubdomain) return testSubdomain;
  }

  // Handle localhost case
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "kavisha"; // Default brand for local development
  }

  const parts = hostname.toLowerCase().replace(/^www\./, "").split(".");
  const stagingIdx = parts.indexOf("staging");
  if (stagingIdx >= 0) return stagingIdx > 0 ? parts[0] : "kavisha";
  return parts[0] || "kavisha";
}
