function normalizeBrand(brand) {
  return String(brand || "").trim().toLowerCase();
}

function widgetPageUrl() {
  if (typeof document === "undefined") return "";
  return document.referrer || "";
}

function trackWidgetEvent(event, brand) {
  const b = normalizeBrand(brand);
  if (!b || typeof window === "undefined") return;

  fetch("/api/widget/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand: b, event, pageUrl: widgetPageUrl() }),
    keepalive: true,
  }).catch(() => {});
}

/** Once per browser tab session. */
export function trackWidgetImpressionOnce(brand) {
  const b = normalizeBrand(brand);
  if (!b) return;

  const storageKey = `kavisha-widget-impression-${b}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch (_) {
    /* sessionStorage unavailable */
  }

  trackWidgetEvent("widget_impression", b);
}

export function trackWidgetOpen(brand) {
  trackWidgetEvent("widget_open", brand);
}
