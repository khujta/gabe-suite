/* ══ gabe-artifact · recorded narration (H7, engine "recorded") ═══════════════
   The dock (one bar: the sections menu, the player, the cog), scrollspy, the seek bars
   and the reading wave — and (script v2) the figures between the paragraphs:
   the one under the voice goes live, its clip restarts, and the page follows the voice
   unless the reader has just scrolled; (script v3) a cue word steps a figure, so a diagram
   lights the part the voice is naming. Spec: references/narration.md. tools/narrate-build.py
   fills the four placeholders below; the file travels alone, so the clips ride inline. */
(function () {
  "use strict";
  var SECS = {{SECS}};
  var DURS = {{DURS}};
  var TIMES = {{TIMES}};
  var CLIPS = {
{{CLIPS}}
  };
  var ORDER = SECS.map(function (s) { return s.clip; });
  var ids = SECS.map(function (s) { return s.id; });
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var audio = new Audio();
  audio.preload = "none";
  var current = null, chain = false, here = null, pendingSeek = null;
  var dock = document.getElementById("dock"), allBtn = document.getElementById("playall");
  var pl = {
    box: document.getElementById("player"), play: document.getElementById("pl-play"), title: document.getElementById("pl-title"),
    seek: document.getElementById("pl-seek"), time: document.getElementById("pl-time"),
    rate: document.getElementById("pl-rate"), ico: document.getElementById("pl-ico")
  };
  var IDLE_ICO = pl.ico ? pl.ico.innerHTML : "";
  function ti(id) { return document.querySelector('.ti[data-target="' + id + '"]'); }
  function row(clip) { return document.querySelector('.listen[data-clip="' + clip + '"]'); }
  function secOf(clip) { return SECS[ORDER.indexOf(clip)]; }
  function mmss(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function go(id) {
    if (id === "top") { window.scrollTo({ top: 0 }); return; }
    var s = document.getElementById(id); if (s) s.scrollIntoView({ block: "start" });
  }
  function nextOf(id) { var k = ids.indexOf(id); return k < 0 ? ids[0] : ids[k + 1] || null; }
  function inView() { return here ? SECS[ids.indexOf(here)].clip : ORDER[0]; }

  /* ── speed: playbackRate, so the wave follows it with no other change; remembered per viewer ── */
  var RATES = [1, 1.15, 1.3, 0.85], RKEY = "gabe:narration:rate";
  var rate = (function () { try { var v = parseFloat(window.localStorage.getItem(RKEY)); return RATES.indexOf(v) >= 0 ? v : 1; } catch (e) { return 1; } })();
  function applyRate() {
    audio.defaultPlaybackRate = rate; audio.playbackRate = rate;   /* a new src resets playbackRate to the default */
    if (pl.rate) { pl.rate.textContent = rate + "×"; pl.rate.setAttribute("aria-label", "Speed " + rate + "×, press for the next speed"); }
  }
  applyRate();
  if (pl.rate) pl.rate.addEventListener("click", function () {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; applyRate();
    try { window.localStorage.setItem(RKEY, String(rate)); } catch (e) { /* storage can throw in a sandboxed frame */ }
  });

  /* ── the reading wave: each word thickens and lifts as the voice passes, with its neighbours ──
     c = a fractional word index (onset ≤ now, plus the fraction of the gap to the next onset), so the
     crest glides through pauses instead of stepping. Reduced motion or Motion: Paused → the current word only. */
  var words = {}, lit = [], raf = 0;
  ORDER.forEach(function (clip) { words[clip] = [].slice.call(document.querySelectorAll('.tx[data-clip="' + clip + '"] .w')); });
  function unlight() { lit.forEach(function (w) { w.style.removeProperty("--w"); }); lit = []; }
  function centre(clip, ms) {
    var t = TIMES[clip] || [], lo = 0, hi = t.length - 1;
    if (!t.length || ms < t[0]) return -1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (t[mid] <= ms) lo = mid; else hi = mid - 1; }
    var next = lo + 1 < t.length ? t[lo + 1] : t[lo] + 450;
    return lo + Math.min(1, (ms - t[lo]) / Math.max(1, next - t[lo]));
  }
  function still() { return reduced || root.getAttribute("data-motion") === "off"; }

  /* ── cues (script v3): the builder put data-cue="fig:k" on the word after each [[fig:k]] token. While a clip is
     current, every figure it cues starts on its FIRST frame — step 0, every part "next" — and then shows the step of
     the last cue the voice has passed: data-step on the figure, data-at = past · now · next on every child naming its
     step(s) in data-k. With no clip current (never played, stopped, ended) a figure carries no data-step and shows its
     FINAL frame, whole (operator 2026-10-05: "when we are not reproducing transcriptions, they should go to the final
     state … when we play the transcription, it should reset to the original state"). A paused clip holds its step.
     Steps are state, not motion: they hold under reduced motion and Motion: Paused, because they are what the voice
     is pointing at. A moving stage inside a cued figure follows data-step itself (step 0 → first frame). ── */
  var CUES = {}, shown = {};
  ORDER.forEach(function (clip) {
    CUES[clip] = [];
    words[clip].forEach(function (w, i) {
      (w.getAttribute("data-cue") || "").split(" ").forEach(function (c) {
        if (!c) return;
        var q = c.split(":"); CUES[clip].push({ i: i, fig: q[0], k: +q[1] });
      });
    });
  });
  function stepFig(id, k) {
    if (shown[id] === k) return;
    if (k == null) delete shown[id]; else shown[id] = k;
    document.querySelectorAll('.fig[data-fig="' + id + '"]').forEach(function (f) {
      if (k == null) f.removeAttribute("data-step"); else f.setAttribute("data-step", String(k));
      f.querySelectorAll("[data-k]").forEach(function (e) {
        if (k == null) { e.removeAttribute("data-at"); return; }
        var ks = e.getAttribute("data-k").split(/\s+/).map(Number);
        e.setAttribute("data-at", ks.indexOf(k) >= 0 ? "now" : Math.min.apply(null, ks) < k ? "past" : "next");
      });
    });
  }
  var cueAt = null;
  function cue(clip, wi) {
    var key = clip == null ? null : clip + ":" + wi;
    if (key === cueAt) return;
    cueAt = key;
    var want = {};
    if (clip != null) (CUES[clip] || []).forEach(function (q) { if (!(q.fig in want)) want[q.fig] = 0; if (q.i <= wi) want[q.fig] = q.k; });
    Object.keys(shown).forEach(function (id) { if (!(id in want)) stepFig(id, null); });
    Object.keys(want).forEach(function (id) { stepFig(id, want[id]); });
  }

  /* ── the figure under the voice: the paragraph holding the crest marks the figures tied to it live (data-p),
     a clip among them restarts, and the page brings paragraph + figure into view — unless the reader scrolled
     in the last few seconds; the reader's hand always outranks the follow ── */
  var liveKey = null, userAt = 0, FOLLOW_QUIET = 5000;
  ["wheel", "touchmove"].forEach(function (ev) { window.addEventListener(ev, function () { userAt = Date.now(); }, { passive: true }); });
  window.addEventListener("keydown", function (e) {
    if (["PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(e.key) >= 0) userAt = Date.now();
  });
  function figsOf(clip, p) { return [].slice.call(document.querySelectorAll('.tx[data-clip="' + clip + '"] > .fig[data-p="' + p + '"]')); }
  function follow(para, figs) {
    if (Date.now() - userAt < FOLLOW_QUIET) return;
    var dh = dock.offsetHeight + 12, top = para.getBoundingClientRect().top;
    var bottom = figs.length ? figs[figs.length - 1].getBoundingClientRect().bottom : para.getBoundingClientRect().bottom;
    if (top >= dh && bottom <= window.innerHeight - 8) return;
    if (top >= dh && bottom - top > window.innerHeight - dh && top < window.innerHeight * 0.45) return;   /* too tall to fit: keep the paragraph high */
    window.scrollTo({ top: window.scrollY + top - dh, behavior: reduced ? "auto" : "smooth" });
  }
  function setLive(clip, p, para) {
    var key = clip == null ? null : clip + ":" + p;
    if (key === liveKey) return;
    liveKey = key;
    document.querySelectorAll('.fig[data-live="true"]').forEach(function (f) { f.removeAttribute("data-live"); });
    if (key == null) return;
    var figs = figsOf(clip, p);
    figs.forEach(function (f) {
      f.setAttribute("data-live", "true");
      if (still()) return;
      var v = f.querySelector("video"); if (v) { v.currentTime = 0; playVid(v); }
      /* a widget figure replays its own stage, the way a clip starts over — unless the voice cues it, and then
         the cue words step it instead, so it never runs its own line beside the narration */
      if (f.hasAttribute("data-cued")) return;
      f.querySelectorAll("[data-fx]").forEach(function (s) {
        var fn = window.FXREPLAY && window.FXREPLAY[s.getAttribute("data-fx")]; if (fn) fn();
      });
    });
    if (para && !audio.paused) follow(para, figs);
  }
  function wave() {
    raf = 0;
    if (!current) { unlight(); setLive(null); cue(null); return; }
    var list = words[current], c = centre(current, audio.currentTime * 1000), one = still();
    unlight();
    cue(current, c >= 0 ? Math.floor(c) : -1);
    if (c >= 0 && list.length) {
      var para = list[Math.min(list.length - 1, Math.floor(c))].closest("p");
      if (para) setLive(current, para.getAttribute("data-p"), para);
      var from = Math.max(0, Math.floor(c) - 4), to = Math.min(list.length - 1, Math.ceil(c) + 4);
      for (var j = from; j <= to; j++) {
        var d = j - c, w = one ? (j === Math.floor(c) ? 1 : 0) : Math.exp(-(d * d) / (2 * 0.9 * 0.9));
        if (w > 0.02) { list[j].style.setProperty("--w", w.toFixed(3)); lit.push(list[j]); }
      }
    }
    if (!audio.paused) { paint(); raf = requestAnimationFrame(wave); }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(wave); }

  /* ── one Audio, many views: the section rows and the dock player ── */
  function paint() {
    var dur = current ? (audio.duration || DURS[current]) : 0, now = current ? audio.currentTime : 0;
    ORDER.forEach(function (clip) {
      var r = row(clip); if (!r) return;
      var on = clip === current, playing = on && !audio.paused;
      r.querySelector(".play").setAttribute("data-playing", String(playing));
      var sk = r.querySelector(".seek"), p = on ? now / (dur || 1) : 0;
      if (!sk.matches(":active")) sk.value = Math.round(p * 1000);
      sk.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      r.querySelector(".dur").textContent = on ? mmss(now) + " / " + mmss(dur) : mmss(DURS[clip]);
      var item = ti(secOf(clip).id);
      if (item) {
        item.setAttribute("data-playing", String(playing));
        var b = item.querySelector(".ti-play"), name = secOf(clip).title + ", " + mmss(DURS[clip]);
        b.setAttribute("aria-label", (playing ? "Pause " : "Play ") + name);
      }
    });
    var playing = !!current && !audio.paused;
    pl.play.setAttribute("data-playing", String(playing));
    pl.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    allBtn.setAttribute("data-playing", String(playing && chain));
    var t = current ? secOf(current).title : "Nothing playing · press play";
    if (pl.title.textContent !== t) {
      pl.title.textContent = t;
      /* what is playing wears its section's icon and tone, the same key as the menu and the section pill */
      var src = current && ti(secOf(current).id);
      pl.ico.innerHTML = src ? src.querySelector(".ti-ico").innerHTML : IDLE_ICO;
      if (src) { pl.ico.style.setProperty("--pc", src.style.getPropertyValue("--c")); pl.ico.style.setProperty("--pc-ink", "var(--sec-ink)"); }
      else { pl.ico.style.removeProperty("--pc"); pl.ico.style.removeProperty("--pc-ink"); }
      pl.box.setAttribute("data-idle", String(!current));
    }
    var p = current ? now / (dur || 1) : 0;
    if (!pl.seek.matches(":active")) pl.seek.value = Math.round(p * 1000);
    pl.seek.style.setProperty("--p", (p * 100).toFixed(2) + "%");
    pl.seek.disabled = !current;
    pl.time.textContent = mmss(now) + " / " + mmss(current ? dur : DURS[inView()]);
  }
  function load(clip) {
    if (current === clip) return;
    unlight(); current = clip; audio.src = CLIPS[clip]; applyRate();
  }
  function play(clip, at) {
    load(clip);
    if (at != null) seekTo(at);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { paint(); });
    paint(); kick();
  }
  function seekTo(frac) {
    if (audio.readyState >= 1 && audio.duration) audio.currentTime = frac * audio.duration;
    else pendingSeek = frac;
    paint(); kick();
  }
  function pause() { audio.pause(); paint(); }
  function stop() { audio.pause(); if (current) audio.currentTime = 0; chain = false; unlight(); setLive(null); cue(null); current = null; paint(); }
  function toggle(clip) {
    if (current === clip && !audio.paused) { pause(); return; }
    play(clip);
  }
  audio.addEventListener("loadedmetadata", function () {
    if (pendingSeek != null) { audio.currentTime = pendingSeek * audio.duration; pendingSeek = null; }
    paint();
  });
  audio.addEventListener("timeupdate", paint);
  audio.addEventListener("play", kick);
  audio.addEventListener("pause", paint);
  audio.addEventListener("seeked", function () { paint(); kick(); });
  audio.addEventListener("ended", function () {
    var done = current;
    if (chain) {
      var nx = ORDER[ORDER.indexOf(done) + 1];
      if (nx) { go(secOf(nx).id); play(nx, 0); return; }
    }
    chain = false; unlight(); setLive(null); cue(null); current = null; paint();
  });

  /* section rows: play/pause + a seekable bar; dragging another section's bar plays it from there */
  ORDER.forEach(function (clip) {
    var r = row(clip); if (!r) return;
    r.querySelector(".play").addEventListener("click", function () { chain = false; toggle(clip); });
    r.querySelector(".seek").addEventListener("input", function (e) {
      var f = +e.target.value / 1000;
      if (current !== clip) { chain = false; play(clip, f); } else seekTo(f);
    });
  });

  /* the dock player */
  pl.play.addEventListener("click", function () {
    if (current) { if (audio.paused) play(current); else pause(); return; }
    play(inView());
  });
  pl.seek.addEventListener("input", function () { if (current) seekTo(+pl.seek.value / 1000); });
  document.getElementById("pl-stop").addEventListener("click", stop);
  document.getElementById("pl-restart").addEventListener("click", function () { play(current || inView(), 0); });
  document.getElementById("pl-top").addEventListener("click", function () { chain = true; go(secOf(ORDER[0]).id); play(ORDER[0], 0); });
  document.getElementById("pl-prev").addEventListener("click", function () {
    var k = ORDER.indexOf(current || inView());
    if (current && audio.currentTime > 3) { play(current, 0); return; }
    var c = ORDER[Math.max(0, k - 1)]; go(secOf(c).id); play(c, 0);
  });
  document.getElementById("pl-next").addEventListener("click", function () {
    var k = ORDER.indexOf(current || inView()), c = ORDER[k + 1];
    if (c) { go(secOf(c).id); play(c, 0); }
  });
  allBtn.addEventListener("click", function () {
    if (chain && !audio.paused) { pause(); return; }
    chain = true;
    var start = current || inView();
    go(secOf(start).id); play(start);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === " " && e.target === document.body && current) { e.preventDefault(); audio.paused ? play(current) : pause(); }
  });

  /* the sections menu: one button opens the list of every section; a row goes there, its play button plays it.
     Escape and an outside click close it and focus returns to the button. The cog shares the bar: opening one
     closes the other (the cog stops its own click, so it is told directly). */
  var tocBtn = document.getElementById("toc-btn"), toc = document.getElementById("toc"), tocWrap = toc.parentElement;
  var cogBtn = document.getElementById("af-cog");
  function tocOpen(on, back) {
    if (on === !toc.hidden) return;
    toc.hidden = !on; tocBtn.setAttribute("aria-expanded", String(on));
    if (on) {
      var cur = toc.querySelector('.ti[data-current="true"] .ti-go') || toc.querySelector(".ti-go");
      if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: "nearest" }); }
    } else if (back) tocBtn.focus();
  }
  tocBtn.addEventListener("click", function () { tocOpen(toc.hidden); });
  document.querySelectorAll(".ti").forEach(function (item) {
    var id = item.getAttribute("data-target"), sec = SECS[ids.indexOf(id)];
    item.querySelector(".ti-go").addEventListener("click", function () { tocOpen(false); go(id); });
    item.querySelector(".ti-play").addEventListener("click", function () {
      tocOpen(false);
      if (current === sec.clip && !audio.paused) { pause(); return; }
      chain = false; go(id); play(sec.clip, current === sec.clip ? null : 0);
    });
  });
  document.addEventListener("click", function (e) { if (!toc.hidden && !tocWrap.contains(e.target)) tocOpen(false); });
  if (cogBtn) cogBtn.addEventListener("click", function () { tocOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !toc.hidden) tocOpen(false, true);
    if (!toc.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {   /* arrows walk the rows */
      var rows = [].slice.call(toc.querySelectorAll(".ti-go")), k = rows.indexOf(document.activeElement);
      if (k < 0) return;
      e.preventDefault();
      rows[(k + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length].focus();
    }
  });

  /* where the reader is: the section whose top last crossed under the dock */
  function spy() {
    var dh = dock.offsetHeight + 20, best = null;
    ids.forEach(function (id) { var s = document.getElementById(id); if (s && s.getBoundingClientRect().top - dh <= 0) best = id; });
    if (best === here) return;
    here = best;
    document.querySelectorAll(".ti").forEach(function (item) {
      var on = item.getAttribute("data-target") === here, b = item.querySelector(".ti-go");
      item.setAttribute("data-current", String(on));
      if (on) b.setAttribute("aria-current", "location"); else b.removeAttribute("aria-current");
    });
    /* the menu button carries the reader's place: "3 / 7", named in full on hover */
    var k = here ? ids.indexOf(here) : -1, cur = document.getElementById("toc-cur");
    if (cur) cur.textContent = (k < 0 ? "–" : k + 1) + " / " + ids.length;
    tocBtn.title = k < 0 ? "Sections" : "Sections · you are in " + (k + 1) + " of " + ids.length + ": " + SECS[k].title;
    if (!current) paint();
  }
  /* --dock-h keeps a jump from parking a section's title pill under the dock; a font switch in the cog
     changes the dock's height, so watch the dock itself, not only the window */
  function dockH() { root.style.setProperty("--dock-h", dock.offsetHeight + "px"); tail(); }
  /* a jump must park EVERY section under the dock — the last one too. When the page ends too soon below the last
     section to scroll it up there, the page end grows by exactly what is missing (--tail on .artifact-page::after);
     a short last section otherwise landed mid-screen, the counter said "2 / 3", and Play started the wrong clip */
  var pageEl = document.querySelector(".artifact-page"), tailRaf = 0;
  /* measured a frame later: resizing the page inside its own ResizeObserver callback is a loop error */
  function tail() { if (window.cancelAnimationFrame) cancelAnimationFrame(tailRaf); tailRaf = (window.requestAnimationFrame || setTimeout)(measureTail); }
  function measureTail() {
    var last = document.getElementById(ids[ids.length - 1]);
    if (!last || !pageEl) return;
    var had = parseFloat(root.style.getPropertyValue("--tail")) || 0;
    var lastTop = last.getBoundingClientRect().top + window.scrollY;
    var bare = document.documentElement.scrollHeight - had;   /* the page's height without the tail */
    var need = Math.max(0, Math.ceil(lastTop - (dock.offsetHeight + 14) + window.innerHeight - bare));
    if (need !== had) root.style.setProperty("--tail", need + "px");
  }
  window.addEventListener("resize", dockH); dockH();
  if (window.ResizeObserver) { new ResizeObserver(dockH).observe(dock); if (pageEl) new ResizeObserver(tail).observe(pageEl); }
  window.addEventListener("scroll", spy, { passive: true }); spy(); paint();
  document.getElementById("gonext").addEventListener("click", function () { go((here ? nextOf(here) : ids[0]) || "top"); });
  document.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { go(b.getAttribute("data-goto")); });
  });

  /* screenshots enlarge in place on click (a .shots grid, v1 pages) */
  document.querySelectorAll(".shots figure > button").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.parentElement, wide = f.getAttribute("data-wide") === "true";
      f.setAttribute("data-wide", String(!wide)); b.setAttribute("aria-expanded", String(!wide));
    });
  });

  /* a still or a clip opens full size in a modal dialog: a click anywhere or Escape closes it, focus returns */
  var zoom = document.getElementById("zoom"), zoomFrom = null;
  if (zoom && zoom.showModal) {
    var zimg = zoom.querySelector("img"), zvid = zoom.querySelector("video");
    function enlarge(from, media) {
      var isVid = media.tagName === "VIDEO";
      zimg.hidden = isVid; zvid.hidden = !isVid;
      if (isVid) { zvid.src = media.currentSrc || media.src; zvid.setAttribute("aria-label", media.getAttribute("aria-label") || ""); if (!still()) playVid(zvid); }
      else { zimg.src = media.src; zimg.alt = media.alt; }
      zoomFrom = from; from.setAttribute("aria-expanded", "true"); zoom.showModal();
    }
    document.querySelectorAll("[data-zoom]").forEach(function (b) {
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () { enlarge(b, b.querySelector("img")); });
    });
    document.querySelectorAll(".fig > video").forEach(function (v) {
      v.tabIndex = 0; v.setAttribute("role", "button"); v.setAttribute("aria-expanded", "false");
      v.addEventListener("click", function () { enlarge(v, v); });
      v.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enlarge(v, v); } });
    });
    zoom.addEventListener("click", function () { zoom.close(); });
    zoom.addEventListener("close", function () {
      zimg.removeAttribute("src"); zvid.pause(); zvid.removeAttribute("src"); zvid.load();
      if (zoomFrom) { zoomFrom.setAttribute("aria-expanded", "false"); zoomFrom.focus(); zoomFrom = null; }
    });
  }

  /* ── the clips (H4): a clip loops while half of it is on screen and Motion is Playing; Motion: Paused stops
     every clip where it stands; reduced motion never plays one — it rests on its finished frame with controls,
     so the reader starts it by hand. A click enlarges it (above). ── */
  var vids = [].slice.call(document.querySelectorAll(".fig video")), onScreen = [];
  function playVid(v) { var q = v.play(); if (q && q.catch) q.catch(function () { /* autoplay refused: the frame rests */ }); }
  function rest(v) { v.controls = true; v.pause(); if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05); }
  vids.forEach(function (v) {
    if (reduced) { if (v.readyState >= 1) rest(v); else v.addEventListener("loadedmetadata", function () { rest(v); }, { once: true }); }
  });
  function syncVids() {
    vids.forEach(function (v) { if (!reduced && !still() && onScreen.indexOf(v) >= 0) playVid(v); else if (!reduced) v.pause(); });
  }
  if (vids.length && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = onScreen.indexOf(e.target);
        if (e.isIntersecting && k < 0) onScreen.push(e.target);
        if (!e.isIntersecting && k >= 0) onScreen.splice(k, 1);
      });
      syncVids();
    }, { threshold: 0.5 });
    vids.forEach(function (v) { vio.observe(v); });
  }
  if (vids.length && window.MutationObserver) new MutationObserver(syncVids).observe(root, { attributes: true, attributeFilter: ["data-motion"] });

  /* read-only handle for tools/verify-narration.mjs — the gate reads state, it never drives through this */
  window.__narration = {
    audio: audio, TIMES: TIMES, DURS: DURS, ORDER: ORDER,
    state: function () { return { clip: current, chain: chain, here: here, rate: rate, live: liveKey, steps: JSON.parse(JSON.stringify(shown)) }; },
    CUES: CUES
  };
})();
