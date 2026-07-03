/* Gabe-suite docs — shared interactivity.
   Sidebar drawer (narrow) + collapse (wide) + section accordion + bionic reading
   + active-nav highlight. Adapted from the Gustify/Cifra docs house script.
   No framework, no build step — plain ES5-safe DOM. */
(function () {
  var body = document.body;

  // ── Active nav: highlight the sidebar link whose href matches this file ──
  var here = location.pathname.split("/").pop() || "index.html";
  Array.prototype.forEach.call(document.querySelectorAll(".side-link"), function (a) {
    var href = (a.getAttribute("href") || "").split("/").pop();
    if (href === here) a.classList.add("active");
  });

  // ── Drawer (narrow viewports) ──
  var toggle = document.getElementById("nav-toggle");
  var overlay = document.getElementById("nav-overlay");
  function closeNav() { body.classList.remove("nav-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); }
  if (toggle) toggle.addEventListener("click", function () {
    var open = body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  if (overlay) overlay.addEventListener("click", closeNav);

  // ── Sidebar collapse (wide viewports) ──
  var collapse = document.getElementById("side-collapse");
  var CKEY = "gabe.docs.nav-collapsed";
  function applyCollapse(on) {
    body.classList.toggle("nav-collapsed", on);
    if (collapse) {
      collapse.setAttribute("aria-pressed", on ? "true" : "false");
      collapse.setAttribute("title", on ? "Expand navigation" : "Collapse navigation");
      var glyph = collapse.querySelector(".side-collapse-glyph");
      if (glyph) glyph.textContent = on ? "»" : "«";
    }
  }
  var savedCollapse = false;
  try { savedCollapse = localStorage.getItem(CKEY) === "1"; } catch (e) {}
  applyCollapse(savedCollapse);
  if (collapse) collapse.addEventListener("click", function () {
    var on = !body.classList.contains("nav-collapsed");
    applyCollapse(on);
    try { localStorage.setItem(CKEY, on ? "1" : "0"); } catch (e) {}
  });

  // ── Bionic reading (opt-in prose bolding for faster scanning) ──
  var SKIP = { CODE: 1, PRE: 1, SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 };
  var processed = false;
  function inSkipped(node) {
    for (var el = node.parentNode; el && el !== document.body; el = el.parentNode) {
      if (el.nodeType !== 1) continue;
      if (SKIP[el.tagName]) return true;
      if (el.classList && (el.classList.contains("mermaid") || el.classList.contains("pill") ||
          el.classList.contains("chip") || el.classList.contains("tag") || el.classList.contains("k"))) return true;
    }
    return false;
  }
  function bionicWord(w) {
    var n = Math.max(1, Math.round(w.length * 0.4));
    return '<b class="br">' + w.slice(0, n) + "</b>" + w.slice(n);
  }
  function process() {
    if (processed) return;
    var m = document.querySelector(".wrap main");
    if (!m) return;
    var nodes = [], n, walker = document.createTreeWalker(m, NodeFilter.SHOW_TEXT, null);
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !/\S/.test(n.nodeValue)) continue;
      if (inSkipped(n)) continue;
      nodes.push(n);
    }
    nodes.forEach(function (node) {
      var html = node.nodeValue.replace(/[^\s]+/g, function (w) {
        return /[A-Za-zÀ-ɏ]/.test(w) ? bionicWord(w) : w;
      });
      if (html === node.nodeValue) return;
      var span = document.createElement("span");
      span.className = "br-wrap";
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    });
    processed = true;
  }
  var adhd = document.getElementById("adhd-toggle");
  var KEY = "gabe.docs.bionic";
  function apply(on) {
    if (on) { process(); body.classList.add("bionic"); } else { body.classList.remove("bionic"); }
    if (adhd) adhd.setAttribute("aria-pressed", on ? "true" : "false");
  }
  var saved = false;
  try { saved = localStorage.getItem(KEY) === "1"; } catch (e) {}
  apply(saved);
  if (adhd) adhd.addEventListener("click", function () {
    var on = !body.classList.contains("bionic");
    apply(on);
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
  });
})();
