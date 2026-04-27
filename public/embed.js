function mount() {
  var script = document.querySelector('script[src*="embed.js"]');
  if (!script || !script.src) return;

  var base = new URL(script.src).origin;
  var brand =
    script.getAttribute("data-brand") ||
    script.getAttribute("data-subdomain") ||
    "";
  var q = new URLSearchParams();
  if (brand) q.set("brand", brand);

  var iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Chat");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.src = base + "/widget" + (q.toString() ? "?" + q.toString() : "");
  iframe.style.cssText =
    "position:fixed;right:24px;bottom:24px;width:100px;height:100px;border:0;z-index:2147483647;background:transparent;";
  document.body.appendChild(iframe);

  var trusted = new URL(iframe.src).origin;

  /** Last size the iframe asked for (open vs closed); re-clamped on host resize. */
  var lastRequestedW = 100;
  var lastRequestedH = 100;
  var lastMaximized = false;

  /** Default open height from widget; above this ⇒ maximized — allow up to MAX_OPEN_H. */
  var DEFAULT_OPEN_H = 640;
  var MAX_OPEN_H = 1005;

  /**
   * Fit iframe to host window.
   * Closed: small launcher bottom-right (gutter).
   * Open + mobile: full width, flush bottom. If maximized, full viewport height (100%).
   * Open + desktop: width/height clamped as before, bottom-right with ~24px bottom gutter.
   */
  function applyIframeSize() {
    var inset = 28;
    var vw =
      window.innerWidth || document.documentElement.clientWidth || lastRequestedW;
    var vh =
      window.innerHeight || document.documentElement.clientHeight || lastRequestedH;
    var openPanel = lastRequestedW > 100 && lastRequestedH > 100;
    var mdUp = vw >= 768;

    var maxW = Math.max(240, vw - inset);
    var vhMinusInset = vh - inset;
    var maxH;
    if (!openPanel) {
      maxH = Math.max(280, vhMinusInset);
    } else if (lastRequestedH > DEFAULT_OPEN_H) {
      maxH = Math.max(280, Math.min(MAX_OPEN_H, vhMinusInset));
    } else {
      maxH = Math.max(
        280,
        Math.min(Math.floor(vh * 0.8), vhMinusInset)
      );
    }

    if (!openPanel) {
      iframe.style.width = Math.min(lastRequestedW, maxW) + "px";
      iframe.style.height = Math.min(lastRequestedH, maxH) + "px";
      iframe.style.left = "auto";
      iframe.style.right = "24px";
      iframe.style.top = "auto";
      iframe.style.bottom = "24px";
      iframe.style.transform = "none";
      iframe.style.borderRadius = "";
      iframe.style.overflow = "";
      return;
    }

    if (!mdUp) {
      iframe.style.width = vw + "px";
      if (lastMaximized) {
        iframe.style.height = vh + "px";
        iframe.style.top = "0";
        iframe.style.bottom = "auto";
      } else {
        iframe.style.height = Math.min(lastRequestedH, maxH) + "px";
        iframe.style.top = "auto";
        iframe.style.bottom = "0";
      }
      iframe.style.left = "0";
      iframe.style.right = "auto";
      iframe.style.transform = "none";
      iframe.style.borderRadius = "";
      iframe.style.overflow = "";
      return;
    }

    iframe.style.width = Math.min(lastRequestedW, maxW) + "px";
    iframe.style.height = Math.min(lastRequestedH, maxH) + "px";
    iframe.style.top = "auto";
    iframe.style.bottom = "24px";
    iframe.style.left = "auto";
    iframe.style.right = "24px";
    iframe.style.transform = "none";
    /** Match widget shell `md:rounded-2xl` so the host page sees a rounded card, not a square iframe. */
    iframe.style.borderRadius = "1rem";
    iframe.style.overflow = "hidden";
  }

  window.addEventListener("message", function (e) {
    if (e.source !== iframe.contentWindow || e.origin !== trusted) return;
    var d = e.data;
    if (!d || d.source !== "kavisha-widget") return;
    if (typeof d.width === "number" && typeof d.height === "number") {
      lastRequestedW = d.width;
      lastRequestedH = d.height;
      lastMaximized = Boolean(d.maximized);
      applyIframeSize();
    }
  });

  window.addEventListener("resize", applyIframeSize);
}

(function () {
  mount();
})();
