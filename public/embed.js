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
    "position:fixed;right:24px;bottom:24px;width:72px;height:72px;border:0;z-index:2147483647;background:transparent;";
  document.body.appendChild(iframe);

  var trusted = new URL(iframe.src).origin;

  /** Last size the iframe asked for (open vs closed); re-clamped on host resize. */
  var lastRequestedW = 72;
  var lastRequestedH = 72;

  /** Fit iframe to host window: use requested size, or smaller if viewport is tight. */
  function applyIframeSize() {
    var inset = 28; // ~fixed right/bottom 24px + buffer
    var vw =
      window.innerWidth || document.documentElement.clientWidth || lastRequestedW;
    var vh =
      window.innerHeight || document.documentElement.clientHeight || lastRequestedH;
    iframe.style.width =
      Math.min(lastRequestedW, Math.max(240, vw - inset)) + "px";
    iframe.style.height =
      Math.min(lastRequestedH, Math.max(280, vh - inset)) + "px";
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
