/**
 * Widget uses `primaryBrandColor` only. Community can override with its own
 * primary/secondary when `communityColorsMatchWidget` is false; when true,
 * both community colors follow widget primary. When normalized hex is null,
 * callers should use default Tailwind / CSS tokens.
 */

export function normalizeBrandHex(input) {
  if (input == null || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toLowerCase();
  if (/^#([0-9a-fA-F]{3})$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function hexToRgba(hex, alpha) {
  const h = normalizeBrandHex(hex);
  if (!h) return null;
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** When true (default), community primary and secondary both use widget primary. */
export function brandCommunityColorsMatchWidget(brand) {
  return brand?.communityColorsMatchWidget !== false;
}

/** Raw hex string for community primary before normalizeBrandHex. */
export function getEffectiveCommunityPrimaryColorStr(brand) {
  if (brandCommunityColorsMatchWidget(brand)) {
    return brand?.primaryBrandColor ?? "";
  }
  const override = brand?.communityPrimaryBrandColor;
  if (typeof override === "string" && override.trim() !== "") return override;
  return brand?.primaryBrandColor ?? "";
}

/** Raw hex string for community secondary before normalizeBrandHex. */
export function getEffectiveCommunitySecondaryColorStr(brand) {
  if (brandCommunityColorsMatchWidget(brand)) {
    return brand?.primaryBrandColor ?? "";
  }
  const override = brand?.communitySecondaryBrandColor;
  if (typeof override === "string" && override.trim() !== "") return override;
  const primaryOverride = brand?.communityPrimaryBrandColor;
  if (typeof primaryOverride === "string" && primaryOverride.trim() !== "") {
    return primaryOverride;
  }
  return brand?.primaryBrandColor ?? "";
}
