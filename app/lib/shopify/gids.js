/** @param {string|number|null|undefined} id */
export function gidToNumericId(id) {
  const s = String(id ?? "").trim();
  if (!s) return "";
  const m = s.match(/\/(\d+)$/);
  return m ? m[1] : s.replace(/\D/g, "");
}

/** @param {string|number} productId */
export function productGid(productId) {
  const id = gidToNumericId(productId);
  return id ? `gid://shopify/Product/${id}` : "";
}
