/*!
 * Klickenya Embed Loader — embed.js
 * ---------------------------------------------------------------------------
 * Proof of concept for the script-driven integration framework.
 *
 * Usage on any external site (Squarespace, Wix, Webflow, WordPress, plain HTML):
 *
 *   <script src="https://klickenya.com/embed.js" async></script>
 *   <div data-klickenya-tool="reservation" data-slug="napule"></div>
 *
 * This loader is a thin client over the existing /embed/<tool>/<slug> routes.
 * It does NOT reimplement any widget — it injects the right iframe and wires up
 * the auto-resize bridge that the embed pages already broadcast via
 * postMessage({ type: "klickenya:resize", height }).
 *
 * No dependencies. Safe to load multiple times (guards against double-init).
 * ---------------------------------------------------------------------------
 */
(function () {
  "use strict";

  if (window.__klickenyaEmbedLoaded) return; // idempotent
  window.__klickenyaEmbedLoaded = true;

  // Resolve our own origin from the <script src> so embeds point at the same
  // deployment that served this file (prod, dev preview, or localhost).
  var ORIGIN = (function () {
    var s = document.currentScript;
    if (s && s.src) {
      try {
        return new URL(s.src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    return "https://klickenya.com";
  })();

  // tool alias -> /embed/<route> segment. Reservation/booking accept both
  // singular and plural so the brief's `data-klickenya-tool="reservation"`
  // works alongside the route name `reservations`.
  var TOOL_ROUTES = {
    menu: "menu",
    reservation: "reservations",
    reservations: "reservations",
    restaurant: "restaurant", // menu + booking combo
    combo: "restaurant",
    booking: "booking", // property/PMS widget (route ships in Phase 3)
    property: "booking",
  };

  // Sensible first-paint heights per tool, used until the first resize message
  // arrives. Keeps layout from jumping for embedders who don't set data-height.
  var DEFAULT_HEIGHTS = {
    menu: 900,
    reservations: 680,
    restaurant: 900,
    booking: 760,
  };

  // Track mounted nodes so a re-scan (SPA navigation) doesn't double-mount.
  var ATTR = "data-klickenya-tool";
  var MOUNTED = "data-klickenya-mounted";

  /** Build the /embed URL with the themable query params the routes accept. */
  function buildUrl(route, el) {
    var slug = el.getAttribute("data-slug") || el.getAttribute("data-business-id");
    if (!slug) return null;

    var url = ORIGIN + "/embed/" + route + "/" + encodeURIComponent(slug);
    var params = [];

    var theme = el.getAttribute("data-theme");
    var accent = el.getAttribute("data-accent");
    var bg = el.getAttribute("data-bg");
    var ref = el.getAttribute("data-ref");

    if (theme === "dark") params.push("theme=dark");
    if (accent) params.push("accent=" + encodeURIComponent(accent.replace(/[^0-9a-fA-F]/g, "")));
    if (bg) params.push("bg=" + encodeURIComponent(bg));
    if (ref) params.push("ref=" + encodeURIComponent(ref.slice(0, 64)));

    return params.length ? url + "?" + params.join("&") : url;
  }

  /** Create and insert the iframe for one widget node. */
  function mount(el) {
    if (el.getAttribute(MOUNTED) === "1") return;

    var tool = (el.getAttribute(ATTR) || "").toLowerCase().trim();
    var route = TOOL_ROUTES[tool];
    if (!route) {
      // Unknown tool — make the failure visible rather than silent.
      el.setAttribute(MOUNTED, "1");
      el.textContent = "Klickenya: unknown tool \"" + tool + "\"";
      return;
    }

    var src = buildUrl(route, el);
    if (!src) {
      el.setAttribute(MOUNTED, "1");
      el.textContent = "Klickenya: missing data-slug";
      return;
    }

    var initialHeight =
      parseInt(el.getAttribute("data-height"), 10) ||
      DEFAULT_HEIGHTS[route] ||
      700;

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Klickenya " + tool;
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.height = initialHeight + "px";
    iframe.style.display = "block";
    // Tag the iframe so the message listener can match it to its source window.
    iframe.setAttribute("data-klickenya-frame", "1");

    el.setAttribute(MOUNTED, "1");
    el.appendChild(iframe);
  }

  /** Scan the document (or a subtree) for un-mounted widget nodes. */
  function scan(root) {
    var nodes = (root || document).querySelectorAll("[" + ATTR + "]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  // ── Auto-resize bridge ────────────────────────────────────────────────────
  // The embed pages broadcast { type: "klickenya:resize", height } whenever
  // their content reflows (ResizeObserver). We match the message to its iframe
  // by event.source === iframe.contentWindow — we deliberately do NOT trust the
  // message's claimed origin for anything but height, and we only act on frames
  // we created. Debounced to one rAF to avoid layout thrash on the host page.
  var pending = false;
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "klickenya:resize") return;
    var height = parseInt(data.height, 10);
    if (!height || height < 0 || height > 20000) return; // sanity bounds

    var frames = document.querySelectorAll("iframe[data-klickenya-frame]");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) {
        var f = frames[i];
        if (!pending) {
          pending = true;
          requestAnimationFrame(function () {
            pending = false;
            f.style.height = height + "px";
          });
        }
        break;
      }
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    scan(document);
    // Re-scan on DOM mutations so widgets added by SPA frameworks get mounted.
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () {
        scan(document);
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Expose a tiny programmatic API for advanced/SPA embedders.
  window.Klickenya = window.Klickenya || {};
  window.Klickenya.refresh = function () {
    scan(document);
  };
  window.Klickenya.origin = ORIGIN;
})();
