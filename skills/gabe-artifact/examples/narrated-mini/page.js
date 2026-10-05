/* ══ the example's one moving stage: the meter under the "states" figure ══
   The contract every widget on a narrated page keeps (operator 2026-10-05):
   - at rest (no clip current) it shows its FINAL frame and holds still: never animates on load or on scroll;
   - when play starts, the engine puts the figure on step 0 and the stage drops to its FIRST frame;
   - each cue word (data-step = k) moves it on; stop or the clip's end removes data-step and it is final again;
   - window.FXREPLAY.meter replays it from zero (the cog's Motion toggle, the motion gate) — on a stepped figure it
     re-applies the step instead, so a replay never runs ahead of the voice;
   - reduced motion and Motion: Paused jump straight to each state, no transition. */
(function () {
  "use strict";
  var stage = document.querySelector('[data-fx="meter"]');
  if (!stage) return;
  var fill = stage.firstElementChild, fig = stage.closest(".fig");
  var N = fig.querySelectorAll("[data-k]").length || 1;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function still() { return reduced || document.documentElement.getAttribute("data-motion") === "off"; }
  function to(f, animate) {
    fill.style.transition = animate && !still() ? "width 1.2s cubic-bezier(.2,.7,.2,1)" : "none";
    fill.style.width = (f * 100).toFixed(2) + "%";
  }
  function rest() { to(1, false); }
  function run() { to(0, false); void fill.offsetWidth; to(1, true); }
  function sync() { var s = fig.getAttribute("data-step"); if (s === null) rest(); else to(+s / N, +s > 0); }
  window.FXREPLAY = window.FXREPLAY || {};
  window.FXREPLAY.meter = function () { if (fig.hasAttribute("data-step")) sync(); else run(); };
  window.__rebuildMotion = function () { for (var k in window.FXREPLAY) window.FXREPLAY[k](); };
  if (window.MutationObserver) new MutationObserver(sync).observe(fig, { attributes: true, attributeFilter: ["data-step"] });
  rest();   /* at rest: the finished frame */
})();
