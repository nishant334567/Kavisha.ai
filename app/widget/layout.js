"use client";

import { useLayoutEffect } from "react";

/**
 * /widget is embedded in a small iframe. globals.css sets `body { background: var(--background) }`
 * and `color-scheme`, which paints white. Reset before paint so the host page shows through.
 */
export default function WidgetLayout({ children }) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlBg: html.style.background,
      bodyBg: body.style.background,
      htmlCs: html.style.colorScheme,
      bodyCs: body.style.colorScheme,
    };

    html.style.setProperty("background", "transparent", "important");
    body.style.setProperty("background", "transparent", "important");
    html.style.colorScheme = "normal";
    body.style.colorScheme = "normal";

    const extra = [];
    for (const el of body.children) {
      if (el instanceof HTMLElement) {
        extra.push({
          el,
          bg: el.style.background,
        });
        el.style.setProperty("background", "transparent", "important");
      }
    }

    return () => {
      html.style.removeProperty("background");
      body.style.removeProperty("background");
      if (prev.htmlBg) html.style.background = prev.htmlBg;
      if (prev.bodyBg) body.style.background = prev.bodyBg;
      html.style.colorScheme = prev.htmlCs;
      body.style.colorScheme = prev.bodyCs;
      for (const { el, bg } of extra) {
        el.style.removeProperty("background");
        if (bg) el.style.background = bg;
      }
    };
  }, []);

  return children;
}
