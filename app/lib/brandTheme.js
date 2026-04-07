/**
 * Optional per-brand colors for Community + embed widget only.
 * When normalized hex is null, callers should use default Tailwind / CSS tokens.
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
