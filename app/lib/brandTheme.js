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

function hexToRgb(hex) {
  const h = normalizeBrandHex(hex);
  if (!h) return null;
  const n = parseInt(h.slice(1), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r, g, b) {
  const to = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Darken a brand hex by reducing HSL lightness (~4% per tone). */
export function darkenBrandHex(hex, tones = 2) {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const step = 0.04;
  const l = Math.max(0.12, hsl.l - tones * step);
  return hslToHex(hsl.h, hsl.s, l);
}

/** Opaque mix of brand hex toward black (ratio 0 = black, 1 = full brand). */
function mixHexWithBlack(hex, ratio) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(rgb.r * t, rgb.g * t, rgb.b * t);
}

/** Radial send button: full brand at edge, 20% darker at center. */
function brandSendRadialGradient(base) {
  const center = mixHexWithBlack(base, 0.8);
  return `radial-gradient(circle at center, ${center} 0%, ${base} 100%)`;
}

const KC_CANVAS_LIGHT = "#ffffff";
const KC_CANVAS_DARK = "#12141a";
const MIN_ACCENT_LABEL_CONTRAST = 4.5;

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(rgb.r) +
    0.7152 * channel(rgb.g) +
    0.0722 * channel(rgb.b)
  );
}

function contrastBetween(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Brand accent tuned for legibility on chat canvas (e.g. Suggested label). */
function readableAccentLabel(hex, surfaceHex) {
  const base = normalizeBrandHex(hex);
  if (!base) return null;

  if (contrastBetween(base, surfaceHex) >= MIN_ACCENT_LABEL_CONTRAST) {
    return base;
  }

  const hsl = hexToHsl(base);
  if (!hsl) return base;

  const lightSurface = relativeLuminance(surfaceHex) > 0.5;
  const step = lightSurface ? -0.045 : 0.045;

  for (let i = 0; i < 28; i++) {
    hsl.l = Math.max(0.1, Math.min(0.88, hsl.l + step));
    const candidate = hslToHex(hsl.h, hsl.s, hsl.l);
    if (contrastBetween(candidate, surfaceHex) >= MIN_ACCENT_LABEL_CONTRAST) {
      return candidate;
    }
  }

  return lightSurface ? "#5c6370" : "#c4bdb2";
}

/** CSS custom properties for branded chat UI (user bubbles, suggestions, accents). */
export function brandUserBubbleCssVars(primaryHex) {
  const base = normalizeBrandHex(primaryHex);
  if (!base) return null;
  const dark = darkenBrandHex(base, 2) || base;
  return {
    "--kc-user": base,
    "--kc-user-dark": dark,
    "--kc-user-shadow": hexToRgba(dark, 0.42) || "rgba(26, 31, 46, 0.35)",
    "--kc-accent": base,
    "--kc-accent-label": readableAccentLabel(base, KC_CANVAS_LIGHT) || base,
    "--kc-accent-label-dark":
      readableAccentLabel(base, KC_CANVAS_DARK) || base,
    "--kc-accent-border": hexToRgba(base, 0.28) || "rgba(154, 132, 104, 0.28)",
    "--kc-accent-soft": hexToRgba(base, 0.07) || "rgba(154, 132, 104, 0.07)",
    "--kc-accent-shadow": hexToRgba(dark, 0.14) || "rgba(26, 31, 46, 0.14)",
    "--kc-send-gradient": brandSendRadialGradient(base),
  };
}
