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

  /** Default open height from widget; above this ⇒ maximized — allow up to MAX_OPEN_H. */
  var DEFAULT_OPEN_H = 640;
  var MAX_OPEN_H = 1005;

  /**
   * Fit iframe to host window. Closed: nearly full viewport minus inset.
   * Open default: cap at ~80vh. Open maximized: honor requested height up to MAX_OPEN_H (still ≤ vh − inset).
   * Open iframe: centered on narrow viewports, right-aligned from md (768px) up — matches widget layout.
   */
  function applyIframeSize() {
    var inset = 28; // ~fixed bottom/right 24px + buffer
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

    iframe.style.width = Math.min(lastRequestedW, maxW) + "px";
    iframe.style.height = Math.min(lastRequestedH, maxH) + "px";

    if (openPanel) {
      iframe.style.top = "auto";
      iframe.style.bottom = "24px";
      if (mdUp) {
        iframe.style.left = "auto";
        iframe.style.right = "24px";
        iframe.style.transform = "none";
      } else {
        iframe.style.left = "50%";
        iframe.style.right = "auto";
        iframe.style.transform = "translateX(-50%)";
      }
    } else {
      iframe.style.left = "auto";
      iframe.style.right = "24px";
      iframe.style.top = "auto";
      iframe.style.bottom = "24px";
      iframe.style.transform = "none";
    }
  }

  window.addEventListener("message", function (e) {
    if (e.source !== iframe.contentWindow || e.origin !== trusted) return;
    var d = e.data;
    if (!d || d.source !== "kavisha-widget") return;
    if (typeof d.width === "number" && typeof d.height === "number") {
      lastRequestedW = d.width;
      lastRequestedH = d.height;
      applyIframeSize();
    }
  });

  window.addEventListener("resize", applyIframeSize);
}

(function () {
  mount();
})();
