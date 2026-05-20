/** Normalize admin input to *.myshopify.com (empty if invalid). */
export function normalizeShopifyShopDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) return "";
  return s;
}
