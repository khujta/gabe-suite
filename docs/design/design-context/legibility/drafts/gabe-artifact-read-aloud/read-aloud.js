/* gabe-artifact · read-aloud module (DRAFT, D-076/D-077/D-078) — a spoken summary per section and per item, a copy button on each, and a player bar
   that is in view all the time. Dependency-free; the page's own words, icons and ruled voice come in as arguments. Pair with read-aloud.css.

   ReadAloud.mount({
     sections: [{ id, title, say, items: [{ id, title, say, example, impact, plain }] }],   // every id names an element that is already in the page, in page order
                                                                                // example, impact (optional, an item with a say): ONE sentence each, read after say — a concrete case, and what each option changes
     voice:    { voice, lang, rate, pitch, volume, pauseSentence, pauseSection, readTitles },   // the project's ruled voice; inlined (an Artifact cannot fetch)
     words:    { … }, icons: { name: "inner svg markup" },   // partial overrides of WORDS / ICONS below
     storageKey: "gabe:artifact:readaloud",   // this page-kit's own prefs: speed, follow
     voiceKey:   "gabe:voice:v1",             // the saved voice setting the voice lab writes; read again at every sentence
     bar: "always" | "playing",               // D-076: always (default) · only while a voice plays
     host, topHost                            // optional elements or selectors; the module makes them when absent
   }) → { play(id), pause(), stop(), skipTo(id), state() }

   A "unit" is one thing the reading can stand on: a section's summary, then each of its items' summaries, in page order. An item's summary is its
   say, then its example, then its impact (D-078); with no say it is read by its plain line, and an item with neither is a menu entry that only
   moves the page. */
(function (root) {
  "use strict";

  var WORDS = {
    head: "To read aloud", copy: "copy to read aloud", copied: "Copied. Paste it into the chat that reads aloud.",
    failed: "Copy was blocked here: select the summary and copy it.", listen: "listen", stop: "stop", copyAll: "copy every summary", example: "Example", impact: "Impact",
    noSpeech: "This browser cannot speak, so nothing can be read aloud here. You can still copy the summaries.",
    bar: "contents and player", contents: "contents", play: "Play the reading", pause: "Pause the reading", stopReading: "Stop the reading",
    prev: "Previous summary", next: "Next summary", follow: "follow", followTip: "Follow the reading",
    rateLabel: "reading speed", rateTip: "Pick the reading speed", rates: ["slower", "normal", "faster"], itemsOf: "Open this section's items",
    voiceSaved: "Reading with {{name}}, the voice you saved.",
    voiceRuled: "Reading with {{name}}, the voice this page was built with.",
    voiceMissing: "The voice {{want}} is not in this browser, so {{name}} reads instead.",
    voiceMissingNone: "The voice {{want}} is not in this browser, so this browser's default voice reads instead.",
    voicePiper: "The voice you saved, {{want}}, is a local Piper voice and cannot play on this page, so {{name}} reads instead.",
    voiceBritish: "Reading with {{name}}, a British voice from this browser.",
    voiceEnglish: "Reading with {{name}}, an English voice from this browser.",
    voiceNone: "Reading with this browser's default voice.", defaultName: "default voice"
  };
  /* Lucide geometry, inlined (the CSP blocks icon CDNs); plain shapes only */
  var ICONS = {
    speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    stop: '<rect width="14" height="14" x="5" y="5" rx="2"/>',
    prev: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
    next: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    follow: '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    down: '<path d="m6 9 6 6 6-6"/>'
  };
  var RATES = [0.8, 1, 1.25];   /* slower · normal · faster — each a multiple of the voice's own rate, so "normal" is the pace of the voice the reader chose */

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(s, o) { return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) { return o && o[k] != null ? String(o[k]) : m; }); }
  function num(v, d, lo, hi) { var n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN; return isFinite(n) && n >= lo && n <= hi ? n : d; }
  function sentences(t) { return String(t || "").split(/(?<=[.!?])\s+/).filter(function (x) { return x; }); }
  function one(x) { return typeof x === "string" ? document.querySelector(x) : x || null; }
  function assign(a) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) Object.keys(s).forEach(function (k) { a[k] = s[k]; }); } return a; }

  var last = null;

  function mount(opts) {
    opts = opts || {};
    var W = assign({}, WORDS, opts.words), IC = assign({}, ICONS, opts.icons), RV = opts.voice || {};
    var PKEY = opts.storageKey || "gabe:artifact:readaloud", VKEY = opts.voiceKey || "gabe:voice:v1", MODE = opts.bar === "playing" ? "playing" : "always";
    var SS = null; try { SS = root.speechSynthesis || null; } catch (e) { SS = null; }
    var ok = !!(SS && root.SpeechSynthesisUtterance);

    function ico(name) { var t = document.createElement("span"); t.innerHTML = '<svg class="ra-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || "") + "</svg>"; return t.firstChild; }
    function store(get, set) { try { return get(root.localStorage); } catch (e) { return set; } }   /* a sandboxed frame can throw on every storage call */
    var prefs = (function () { var p = store(function (s) { return JSON.parse(s.getItem(PKEY) || "null"); }, null), o = { speed: 1, follow: "on" };
      if (p && typeof p === "object") { if (/^[0-2]$/.test(String(p.speed))) o.speed = Number(p.speed); if (p.follow === "on" || p.follow === "off") o.follow = p.follow; } return o; })();
    function savePrefs() { store(function (s) { s.setItem(PKEY, JSON.stringify(prefs)); }); }
    function saved() { var s = store(function (st) { return JSON.parse(st.getItem(VKEY) || "null"); }, null); return s && typeof s === "object" && !Array.isArray(s) ? s : null; }

    /* ── the units: a section, then its items, in page order ── */
    var units = [], order = [], navs = [], missing = [], blocks = [], lastCopy = null;
    function entry(D, node, kind, nav) {
      var say = D.say ? String(D.say).trim() : "", plain = kind === "item" && D.plain ? String(D.plain).trim() : "";
      var example = kind === "item" && say && D.example ? String(D.example).trim() : "", impact = kind === "item" && say && D.impact ? String(D.impact).trim() : "";   /* D-078: they ride on an item that has a say */
      var text = [say, example, impact].filter(Boolean).join(" ") || plain;   /* what is read, copied and shown: say, then example, then impact */
      var en = { id: D.id, title: String(D.title || D.id), el: node, kind: kind, nav: nav, say: say, example: example, impact: impact, plain: plain, text: text, unit: null, own: !!text };
      node.setAttribute("data-ra-unit", D.id);
      if (text) { en.unit = units.length; units.push(en); }
      order.push(en); return en;
    }
    (opts.sections || []).forEach(function (S) {
      var se = document.getElementById(S.id); if (!se) { missing.push(S.id); return; }
      var nv = { id: S.id, title: String(S.title || S.id), el: se, entry: null, items: [] };
      nv.entry = entry(S, se, "section", nv);
      (S.items || []).forEach(function (X) { var xe = document.getElementById(X.id); if (!xe) { missing.push(X.id); return; } nv.items.push(entry(X, xe, "item", nv)); });
      navs.push(nv);
    });
    for (var k = order.length - 1, nextU = null; k >= 0; k--) { if (order[k].own) nextU = order[k].unit; else order[k].unit = nextU; }   /* a menu entry with no text stands on the next unit */
    var orderOk = order.every(function (e, i) { return i === 0 || !!(order[i - 1].el.compareDocumentPosition(e.el) & 4); });
    var N = units.length;
    if (missing.length && root.console) root.console.warn("ReadAloud: no element for " + missing.join(", "));
    if (!navs.length) return null;

    /* ── copy ── */
    function copyText(text, said) { lastCopy = text;
      var done = function () { said.textContent = W.copied; }, fail = function () { said.textContent = W.failed; };
      function legacy() { try { var t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
          var good = document.execCommand("copy"); document.body.removeChild(t); good ? done() : fail(); } catch (e) { fail(); } }
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy); else legacy(); } catch (e) { legacy(); } }

    /* ── the voice: the saved setting, else the project's ruled voice, else a British Google voice, else an English Natural or Google voice, else the browser's own ── */
    function voices() { try { return SS.getVoices() || []; } catch (e) { return []; } }
    function resolve() {
      if (!ok) return { voice: null, source: "none", name: W.defaultName, note: W.noSpeech, lang: "" };
      var s = saved(), vs = voices(), mine = !!(s && typeof s.voice === "string" && s.voice), piper = !!s && /piper/i.test(String(s.engine || "")), want = mine ? s.voice : (RV.voice || ""), found = null;
      if (want && !piper) found = vs.filter(function (x) { return x.name === want; })[0] || vs.filter(function (x) { return x.name.toLowerCase() === want.toLowerCase(); })[0] || null;
      var en = vs.filter(function (x) { return /^en\b/i.test(x.lang); }), gb = en.filter(function (x) { return /^en[-_]GB/i.test(x.lang); }), v = found, src = found ? (mine ? "saved" : "ruled") : "default";
      if (!v) { v = gb.filter(function (x) { return /Google/i.test(x.name); })[0] || null; if (v) src = "british"; }
      if (!v) { v = en.filter(function (x) { return /Natural/i.test(x.name); })[0] || en.filter(function (x) { return /Google/i.test(x.name); })[0] || null; if (v) src = "english"; }
      var name = v ? v.name : W.defaultName, note;
      if (piper) note = fmt(W.voicePiper, { want: want || "Piper", name: name });
      else if (found) note = fmt(mine ? W.voiceSaved : W.voiceRuled, { name: name });
      else if (want) note = v ? fmt(W.voiceMissing, { want: want, name: name }) : fmt(W.voiceMissingNone, { want: want });
      else if (src === "british") note = fmt(W.voiceBritish, { name: name });
      else if (src === "english") note = fmt(W.voiceEnglish, { name: name });
      else note = W.voiceNone;
      return { voice: v, source: src, name: name, note: note, lang: s && typeof s.lang === "string" ? s.lang : (RV.lang || "") };
    }
    function titlesOn() { var s = saved(); if (s && typeof s.readTitles === "boolean") return s.readTitles; if (typeof RV.readTitles === "boolean") return RV.readTitles; return R.all; }
    function partsOf(i) { var u = units[i], p = sentences(u.text); return titlesOn() ? [u.title.replace(/[.!?]+$/, "") + "."].concat(p) : p; }
    function pauseMs(kind) { var s = saved() || {}; return kind === "unit" ? num(s.pauseSection, num(RV.pauseSection, 0, 0, 10000), 0, 10000) : num(s.pauseSentence, num(RV.pauseSentence, 0, 0, 10000), 0, 10000); }

    /* ── the reading: a unit and a sentence in it. Every sentence is its own utterance, so a pause, a skip and a stop each land on a sentence. ── */
    var R = { on: false, paused: false, i: 0, s: 0, all: false, gen: 0, timer: 0, parts: [] }, bar = null, c = {}, chips = [], tcs = null, vox = null, voxName = null, noteEl = null, menu = null, menuFor = null;
    function followOn() { return prefs.follow === "on"; }
    function stuck() { var r = bar.getBoundingClientRect(); return r.top <= 1; }
    function barBottom() { return bar && bar.getAttribute("data-frozen") === "true" && stuck() ? bar.getBoundingClientRect().bottom : 0; }
    function viewUnit() { var y = barBottom() + 80, k = 0; units.forEach(function (u, i) { if (u.el.getBoundingClientRect().top <= y) k = i; }); return k; }
    function reveal(node, i, force) {
      if (!force) { var b = document.querySelector('[data-ra-say="' + units[i].id + '"]'); if (b) { var r = b.getBoundingClientRect(); if (r.bottom > barBottom() && r.top < root.innerHeight) return; } }
      try { node.scrollIntoView({ block: "start" }); } catch (e) { node.scrollIntoView(); } }
    function cancelTalk() { if (ok) { try { SS.cancel(); } catch (e) {} } }
    function clearTimer() { if (R.timer) { clearTimeout(R.timer); R.timer = 0; } }
    function setBarH() { var f = bar.getAttribute("data-frozen") === "true"; document.documentElement.style.setProperty("--ra-bar-h", f ? Math.ceil(bar.getBoundingClientRect().height) + "px" : "0px"); }
    function closeMenu(focusBack) { if (!menu || menu.hidden) return; menu.hidden = true; var f = menuFor; menuFor = null; if (f) { f.caret.setAttribute("aria-expanded", "false"); if (focusBack) f.caret.focus(); } }
    function paint() { var on = R.on, playing = on && !R.paused, rs = resolve(), cur = N ? units[R.i] : null;
      blocks.forEach(function (b) { var lit = on && R.i === b.unit; b.box.setAttribute("data-reading", String(lit)); b.btn.setAttribute("data-on", String(lit)); b.btn.setAttribute("aria-pressed", String(lit));
        b.lab.textContent = lit ? W.stop : W.listen; b.slot.textContent = ""; b.slot.appendChild(ico(lit ? "stop" : "play")); if (!ok) b.btn.hidden = true; });
      var frozen = on || MODE === "always";   /* D-076: in view all the time, even where this browser cannot speak (the chips still move the page) */
      bar.setAttribute("data-frozen", String(frozen)); bar.setAttribute("data-player", String(ok));
      if (ok) { var pw = playing ? W.pause : W.play;
        c.pp.setAttribute("aria-label", pw); c.pp.title = pw; c.pp.setAttribute("data-state", playing ? "playing" : on ? "paused" : "idle"); c.pp.textContent = ""; c.pp.appendChild(ico(playing ? "pause" : "play"));
        c.stop.disabled = !on; c.prev.disabled = !on || R.i <= 0; c.next.disabled = !on || R.i >= N - 1; c.follow.setAttribute("aria-pressed", String(followOn()));
        voxName.textContent = rs.name; vox.title = rs.note; vox.setAttribute("aria-label", rs.note); vox.setAttribute("data-source", rs.source); }
      if (noteEl) { noteEl.textContent = rs.note; noteEl.setAttribute("data-source", rs.source); }
      navs.forEach(function (nv, k) { var inSec = on && cur && cur.nav === nv, a = chips[k]; a.chip.setAttribute("data-lit", String(inSec)); a.tc.setAttribute("data-lit", String(inSec));
        if (inSec) a.chip.setAttribute("aria-current", "true"); else a.chip.removeAttribute("aria-current"); });
      if (menu && !menu.hidden) [].forEach.call(menu.querySelectorAll("[data-ra-item]"), function (a) { var u = on && cur && cur.id === a.getAttribute("data-ra-item"); a.setAttribute("data-lit", String(!!u)); });
      if (on && tcs && tcs.scrollWidth > tcs.clientWidth + 1 && cur) { var t = chips[navs.indexOf(cur.nav)].tc; tcs.scrollLeft = Math.max(0, t.offsetLeft - (tcs.clientWidth - t.offsetWidth) / 2); }
      setBarH(); }
    function enter(i, how, node) { R.i = i; R.s = 0; R.parts = partsOf(i); paint();
      if (how === "skip" || (how === "auto" && followOn())) reveal(node || units[i].el, i, true); }
    function later(g, ms) { if (ms > 0) R.timer = setTimeout(function () { R.timer = 0; speakNow(g); }, ms); else speakNow(g); }
    function stop() { clearTimer(); R.gen++; cancelTalk(); R.on = false; R.paused = false; paint(); }
    function speakNow(g) { if (R.gen !== g || !R.on || R.paused) return; var t = R.parts[R.s]; if (t === undefined) { stop(); return; }
      var s = saved() || {}, rs = resolve(), u = new root.SpeechSynthesisUtterance(t);
      u.rate = Math.min(10, Math.max(0.1, num(s.rate, num(RV.rate, 1, 0.1, 10), 0.1, 10) * RATES[prefs.speed])); u.pitch = num(s.pitch, num(RV.pitch, 1, 0, 2), 0, 2); u.volume = num(s.volume, num(RV.volume, 1, 0, 1), 0, 1);
      if (rs.voice) { u.voice = rs.voice; u.lang = rs.voice.lang; } else if (rs.lang) u.lang = rs.lang;
      u.onend = function () { if (R.gen === g) step(g); };
      u.onerror = function (e) { if (R.gen === g && e && e.error !== "interrupted" && e.error !== "canceled") stop(); };
      try { SS.speak(u); } catch (e) { stop(); } }
    /* a sentence ended: the next one after its pause; at the end of a unit the next unit after its pause (when the reading runs on); at the end of the last, stop */
    function step(g) { if (R.gen !== g || !R.on) return;
      if (R.s + 1 < R.parts.length) { R.s++; later(g, pauseMs("sentence")); return; }
      if (R.all && R.i < N - 1) { enter(R.i + 1, "auto"); later(g, pauseMs("unit")); return; }
      stop(); }
    function begin(i, all, how) { clearTimer(); R.gen++; cancelTalk(); R.on = true; R.paused = false; R.all = all; enter(i, how); later(R.gen, 80); }   /* a beat after a cancel: some engines drop what they are given at once */
    function pause() { if (!R.on || R.paused) return; R.paused = true; clearTimer(); R.gen++; cancelTalk(); paint(); }   /* never speechSynthesis.pause(): it hangs on Chrome's online voices */
    function resume() { if (!R.on || !R.paused) return; R.paused = false; R.gen++; paint(); later(R.gen, 80); }   /* the sentence starts again from its first word */
    /* a skip moves the reading to a unit's summary AND the page to its element; from then on the reading goes on through the rest */
    function skipTo(i, node) { if (!R.on || i == null) return; i = Math.max(0, Math.min(N - 1, i)); clearTimer(); R.gen++; cancelTalk(); R.all = true; enter(i, "skip", node); if (!R.paused) later(R.gen, 80); }
    function unitOf(id) { for (var j = 0; j < order.length; j++) if (order[j].id === id) return order[j]; return null; }

    /* ── the summary blocks: one under each section's head, one (indented) in each item that has something to say ── */
    function place(host, box) { var kids = host.children, h = null;
      for (var i = 0; i < kids.length && i < 2; i++) { var n = kids[i]; if (/^H[1-6]$/.test(n.tagName) || n.classList.contains("sec-head") || n.hasAttribute("data-ra-head")) { h = n; break; } }
      if (h) h.insertAdjacentElement("afterend", box); else host.insertBefore(box, host.firstChild); }
    order.forEach(function (en) { if (!en.own) return;
      var box = el("div", "ra-say" + (en.kind === "item" ? " ra-sub" : "")), hd = el("p", "ra-lab"), acts = el("div", "ra-acts"), cp = el("button", "ra-btn"), ls = el("button", "ra-btn"), said = el("span", "ra-said"), slot = el("span"), lab = el("span", null, W.listen);
      box.setAttribute("data-ra-say", en.id); hd.appendChild(ico("speaker")); hd.appendChild(el("span", null, W.head)); box.appendChild(hd);
      if (en.say && en.plain) { var pl = el("p", "ra-plain", en.plain); pl.setAttribute("data-ra-plain", en.id); box.appendChild(pl); }
      var tx = el("p", "ra-text", en.say || en.text); tx.setAttribute("data-ra-text", en.id); box.appendChild(tx);
      [["example", W.example, "ra-ex"], ["impact", W.impact, "ra-im"]].forEach(function (f) { if (!en[f[0]]) return; var q = el("p", f[2]); q.setAttribute("data-ra-" + f[0], en.id); q.appendChild(el("b", null, f[1])); q.appendChild(document.createTextNode(" " + en[f[0]])); box.appendChild(q); });
      cp.type = "button"; cp.setAttribute("data-ra-copy", en.id); cp.appendChild(ico("copy")); cp.appendChild(el("span", null, W.copy)); cp.addEventListener("click", function () { copyText(en.text, said); });
      ls.type = "button"; ls.setAttribute("data-ra-listen", en.id); slot.appendChild(ico("play")); ls.appendChild(slot); ls.appendChild(lab); if (!ok) ls.hidden = true;
      ls.addEventListener("click", function () { if (R.on && R.i === en.unit) stop(); else begin(en.unit, false, "start"); });
      said.setAttribute("aria-live", "polite"); acts.appendChild(cp); acts.appendChild(ls); acts.appendChild(said); box.appendChild(acts);
      place(en.el, box); blocks.push({ box: box, btn: ls, lab: lab, slot: slot, unit: en.unit }); });

    /* ── the top row (copy every summary · the voice, named) and the bar (the player, then the contents) ── */
    var first = navs[0].el, parent = first.parentNode, top = one(opts.topHost);
    if (!top) { top = el("div", "ra-top"); parent.insertBefore(top, first); }
    var ca = el("button", "ra-btn ra-pri"), saidAll = el("span", "ra-said");
    ca.type = "button"; ca.setAttribute("data-ra-copyall", ""); ca.appendChild(ico("copy")); ca.appendChild(el("span", null, W.copyAll)); saidAll.setAttribute("aria-live", "polite");
    ca.addEventListener("click", function () { copyText(units.map(function (u) { return u.title + "\n" + u.text; }).join("\n\n"), saidAll); });
    noteEl = el("p", "ra-note"); noteEl.setAttribute("data-ra-note", "");
    top.appendChild(ca); top.appendChild(saidAll); top.appendChild(noteEl);

    bar = one(opts.host) || el("nav");
    bar.classList.add("ra-bar"); bar.setAttribute("aria-label", W.bar); bar.setAttribute("data-mode", MODE); bar.setAttribute("data-frozen", String(MODE === "always")); bar.setAttribute("data-player", String(ok));
    if (!bar.parentNode) parent.insertBefore(bar, first);
    function pbtn(act, icon, word, fn) { var b = el("button", "ra-pb"); b.type = "button"; b.setAttribute("data-act", act); b.setAttribute("aria-label", word); b.title = word; b.appendChild(ico(icon)); b.addEventListener("click", fn); return b; }
    if (ok) { var pl = el("div", "ra-row ra-player"); pl.setAttribute("data-ra-player", "");
      c.pp = pbtn("playpause", "play", W.play, function () { if (!R.on) begin(viewUnit(), true, "bar"); else if (R.paused) resume(); else pause(); }); c.pp.classList.add("ra-go");
      c.stop = pbtn("stop", "stop", W.stopReading, stop); c.prev = pbtn("prev", "prev", W.prev, function () { skipTo(R.i - 1); }); c.next = pbtn("next", "next", W.next, function () { skipTo(R.i + 1); });
      vox = el("span", "ra-vox"); vox.setAttribute("role", "img"); vox.appendChild(ico("speaker")); voxName = el("span", "ra-vn"); vox.appendChild(voxName);
      var rw = el("label", "ra-rate"), sel = el("select", "ra-sel"); sel.setAttribute("aria-label", W.rateLabel); sel.title = W.rateTip; sel.setAttribute("data-act", "rate");
      W.rates.forEach(function (t, i) { var o = el("option", null, t); o.value = String(i); sel.appendChild(o); }); sel.value = String(prefs.speed);
      sel.addEventListener("change", function () { prefs.speed = Number(sel.value); savePrefs(); }); rw.appendChild(sel);
      c.follow = pbtn("follow", "follow", W.followTip, function () { prefs.follow = followOn() ? "off" : "on"; savePrefs(); paint(); }); c.follow.appendChild(el("span", "ra-fw", W.follow));
      [c.pp, c.stop, c.prev, c.next, vox, rw, c.follow].forEach(function (x) { pl.appendChild(x); }); bar.appendChild(pl); }
    tcs = el("div", "ra-row ra-tcs"); tcs.appendChild(el("span", "ra-lab", W.contents));
    navs.forEach(function (nv) { var tc = el("span", "ra-tc"), a = el("a", "ra-chip", nv.title), rec = { tc: tc, chip: a, caret: null, nv: nv }; a.href = "#" + nv.id; a.setAttribute("data-ra-chip", nv.id);
      a.addEventListener("click", function (e) { closeMenu(false); if (R.on && nv.entry.unit != null) { e.preventDefault(); skipTo(nv.entry.unit, nv.el); } }); tc.appendChild(a);
      if (nv.items.length) { var cr = el("button", "ra-caret"); cr.type = "button"; cr.setAttribute("aria-expanded", "false"); cr.setAttribute("aria-label", fmt(W.itemsOf, { title: nv.title }) + ", " + nv.title); cr.title = fmt(W.itemsOf, { title: nv.title });   /* the hover is a verb and its object; a reader's label names the section too */
        cr.setAttribute("data-ra-caret", nv.id); cr.appendChild(ico("down")); rec.caret = cr; tc.setAttribute("data-items", "true"); tc.appendChild(cr);
        cr.addEventListener("click", function (e) { e.stopPropagation(); if (menuFor === rec) { closeMenu(false); return; } closeMenu(false); openMenu(rec); if (e.detail === 0) { var f = menu.querySelector("a"); if (f) f.focus(); } }); }   /* a keyboard open lands on the first item */
      chips.push(rec); tcs.appendChild(tc); });
    bar.appendChild(tcs);
    menu = el("div", "ra-menu"); menu.hidden = true; menu.setAttribute("data-ra-menu", ""); bar.appendChild(menu);
    function openMenu(rec) { menu.textContent = ""; var ul = el("ul", "ra-list"), cur = R.on ? units[R.i] : null;
      rec.nv.items.forEach(function (it) { var li = el("li"), a = el("a", "ra-mi"); a.href = "#" + it.id; a.setAttribute("data-ra-item", it.id); a.appendChild(el("span", "ra-mt", it.title)); if (it.plain) { var p = el("span", "ra-plain", it.plain); p.setAttribute("data-ra-menu-plain", it.id); a.appendChild(p); }
        a.setAttribute("data-lit", String(!!(cur && cur.id === it.id)));
        a.addEventListener("click", function (e) { closeMenu(false); if (R.on && it.unit != null) { e.preventDefault(); skipTo(it.unit, it.el); } });   /* reading: the reading AND the page move; not reading: the link's own jump */
        li.appendChild(a); ul.appendChild(li); });
      menu.appendChild(ul); menu.hidden = false; menuFor = rec; rec.caret.setAttribute("aria-expanded", "true");
      var br = bar.getBoundingClientRect(), tr = rec.tc.getBoundingClientRect(); menu.style.left = Math.max(0, Math.min(tr.left - br.left, br.width - menu.offsetWidth)) + "px"; }
    document.addEventListener("click", function (e) { if (menu && !menu.hidden && !menu.contains(e.target)) closeMenu(false); });
    bar.addEventListener("focusout", function (e) { if (menu && !menu.hidden && e.relatedTarget && !bar.contains(e.relatedTarget)) closeMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && !menu.hidden) { e.preventDefault(); closeMenu(true); } });
    if (typeof ResizeObserver === "function") { try { new ResizeObserver(setBarH).observe(bar); } catch (e) {} }
    if (ok) { try { SS.addEventListener("voiceschanged", paint); } catch (e) { SS.onvoiceschanged = paint; } root.addEventListener("pagehide", cancelTalk); }
    paint();

    var api = { play: function (id) { var en = unitOf(id); if (en && en.unit != null) begin(en.unit, true, "start"); }, pause: pause, stop: stop, skipTo: function (id) { var en = unitOf(id); if (en) skipTo(en.unit, en.el); },
      state: function () { var rs = resolve(); return { ok: ok, on: R.on, paused: R.paused, i: R.i, s: R.s, all: R.all, id: N ? units[R.i].id : null, source: rs.source, voice: rs.voice ? rs.voice.name : null, note: rs.note,
        missing: missing.slice(), orderOk: orderOk, mode: MODE, ruled: RV.voice || null, ruledTitles: typeof RV.readTitles === "boolean" ? RV.readTitles : null, speed: prefs.speed, follow: prefs.follow, lastCopy: lastCopy,
        units: units.map(function (u) { return { id: u.id, title: u.title, kind: u.kind, text: u.text, say: u.say, example: u.example, impact: u.impact, plain: u.plain }; }), sections: navs.map(function (n) { return { id: n.id, items: n.items.map(function (x) { return x.id; }) }; }) }; } };
    last = api; return api;
  }

  root.ReadAloud = { mount: mount, sentences: sentences, state: function () { return last ? last.state() : null; }, version: "0.3-draft" };
})(window);
