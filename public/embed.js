function mount() {
  var script = document.querySelector('script[src*="embed.js"]');
  if (!script || !script.src) return;

  var base = new URL(script.src).origin;

  var iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Chat");
  iframe.src = base + "/widget";
  iframe.style.cssText =
    "position:fixed;right:24px;bottom:24px;width:72px;height:72px;border:0;z-index:2147483647;";
  document.body.appendChild(iframe);

  var trusted = new URL(iframe.src).origin;

  window.addEventListener("message", function (e) {
    if (e.source !== iframe.contentWindow || e.origin !== trusted) return;
    var d = e.data;
    if (!d || d.source !== "kavisha-widget") return;
    if (typeof d.width === "number" && typeof d.height === "number") {
      iframe.style.width = d.width + "px";
      iframe.style.height = d.height + "px";
    }
  });
}

(function () {
  mount();
})();
