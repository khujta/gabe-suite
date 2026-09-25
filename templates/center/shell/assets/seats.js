/* seats.js — the board's SEATS, booted (D-043 · D-046): the spine strip and the commit picker.
 *
 * The LAST deferred script on board.html: when it runs, every feed and runtime file before it has run — or
 * 404ed, which leaves its global undefined; this file names the file instead of going quiet.
 *
 *   the changes  [data-seat="commits"]  the newest GABE_COMMITS (at most data-cap) as ONE pane, a picker in
 *                the head. A switch DESTROYS the old pane (GabePane.destroy loses its WebGL context) before
 *                the next mounts, so a seat holds one context however often it is switched — the browser
 *                keeps about sixteen and then drops the oldest, a pane still on screen.
 *   the spine    [data-seat="spine"]  GABE_SPINE's five beats as columns, each a picker over the commits that
 *                beat recorded, newest first. A pick commits.js carries selects it in the changes seat; one it
 *                does not carry keeps the ledger's own facts and says 'not in the feed'. It draws nothing.
 *   the chips    .bc-sha on a DONE card: the commit a closed PENDING row names (_a3_board, Status first). The
 *                boot marks each ● (the picker lists one of its data-shas) or ○, its title saying why ('not in
 *                the feed', or in the feed past the picker's data-cap); a click on a ● selects it in the changes
 *                seat as a spine pick does, and never reaches the card.
 *
 * THE JOIN. A LEDGER writes a sha at 7 or 8 characters, and commits.js `short` is git's %h, which grows with
 * the repo (7 in the suite, 8 in the twins) — so nothing joins on `short`. `feedIdx` matches a token (7 or
 * more characters, lowercased) as a PREFIX of each commit's full 40-character `sha`; two hits is ambiguous
 * and reads as none, never a guess. The pane is still drawn by `short`: the slice keys its commits by it.
 *
 * Hooks tests/embed-pane/seats.mjs keys on: [data-seat] · data-mode="pick" · select.seat-pick · .seat-row ·
 * .seat-hd > span · the host's data-picked · .sp-col[data-beat][data-sha][data-live] · .sp-live ·
 * .bc-sha[data-shas][data-live]. A seat that
 * throws writes 'seat failed: <message>' into its row; a pane whose embed throws says it in the head too, and
 * holds no data-picked, so picking it again retries.
 */
(function () {
  var W = window;
  var STATION = "gabe-universe.html";   /* where a pane's open-in-station link goes (a sibling page) */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function say(host, text) { var s = host.querySelector(".seat-hd > span"); if (s) s.textContent = text; }
  function flash(host) {
    host.classList.remove("flash"); void host.offsetWidth; host.classList.add("flash");
    setTimeout(function () { host.classList.remove("flash"); }, 1400);
  }

  /* what the changes seat needs to draw, in load order; a global a 404 left undefined names its file */
  var NEED = [["GABE_C4", "c4-graph.js"], ["GABE_COMMITS", "commits.js"], ["ForceGraph3D", "assets/3d-bundle.js"],
              ["GabeGrammar", "assets/_grammar.js"], ["GabeSlice", "assets/_slice.js"],
              ["GabeUniGrammar", "assets/_uni-grammar.js"], ["GabePane", "assets/_pane.js"]];
  var missing = NEED.filter(function (n) { return !W[n[0]]; }).map(function (n) { return n[1]; });

  var C = W.GABE_COMMITS || [];
  var seat10 = document.querySelector('[data-seat="commits"]');
  var cs = C.slice(0, seat10 ? +(seat10.getAttribute("data-cap") || 30) : 0);   /* the picker's list, in feed order */

  /* the feed index a ledger token names, or -1 (too short · no commit · two commits) */
  function feedIdx(tok) {
    var s = String(tok || "").toLowerCase(), hit = -1;
    if (s.length < 7) return -1;
    for (var i = 0; i < C.length; i++) {
      if (String(C[i].sha || "").toLowerCase().lastIndexOf(s, 0) !== 0) continue;
      if (hit >= 0) return -1;
      hit = i;
    }
    return hit;
  }
  /* the picker index a spine entry draws at: its first commit the picker lists, or -1 */
  function pickOf(r) {
    var shas = r.shas && r.shas.length ? r.shas : [r.sha];
    for (var j = 0; j < shas.length; j++) { var k = feedIdx(shas[j]); if (k >= 0 && k < cs.length) return k; }
    return -1;
  }

  /* a spine pick or a chip click, in the changes seat: picker index k drawn, or 'not in the feed' said while
     the pane keeps what it holds. `what` names where the pick came from */
  function toChanges(k, sha, what) {
    if (!seat10) return;
    var pk = seat10.__pick;
    if (k >= 0 && pk) { if (pk.sel) pk.sel.value = String(k); pk.show(k); }
    else if (k < 0 && pk) say(seat10, "commits.js does not carry " + sha + " (" + what + ") — not in the feed · "
                                + (seat10.getAttribute("data-picked") ? "the pane keeps " + seat10.getAttribute("data-picked") : "no pane is drawn"));
    seat10.scrollIntoView({ block: "nearest", behavior: "smooth" });
    flash(seat10);
  }

  /* ── the changes: one pane, a picker in the head ── */
  function changes(host, row) {
    if (missing.length) {
      row.textContent = "the pane cannot draw — not loaded: " + missing.join(", ");
      say(host, row.textContent);
      return;
    }
    if (!cs.length) {
      row.textContent = "commits.js carries no commits";
      say(host, row.textContent);
      return;
    }
    var IX = GabeSlice.index(W.GABE_C4, C, W.GABE_WORKFLOWS || []);
    var base = cs.length === 1 ? "the newest commit in commits.js — " + cs[0].short : cs.length + " newest commits — pick one";
    var cur = null, at = -1;
    /* `at` and data-picked name what is DRAWN, so they move only once the embed returned: a pick whose embed
       threw leaves the seat on nothing — a re-pick retries it, and the spine never says the pane keeps it */
    function show(i) {
      say(host, base);
      if (i === at) return;
      try {
        if (cur) GabePane.destroy(cur);
        cur = null; at = -1; row.innerHTML = ""; host.removeAttribute("data-picked");
        cur = GabePane.embed(row, { ix: IX, scope: "commit", id: cs[i].short, size: "fill", stationBase: STATION });
        at = i; host.setAttribute("data-picked", cs[i].short);
      } catch (e) {
        cur = null; at = -1; host.removeAttribute("data-picked");
        row.textContent = "seat failed: " + (e && e.message);
        say(host, row.textContent);
      }
    }
    var sel = null;
    if (cs.length > 1) {
      host.setAttribute("data-mode", "pick");
      sel = el("select", "seat-pick");
      sel.setAttribute("aria-label", "choose which commit to draw");
      cs.forEach(function (c, i) {
        var o = el("option", "", c.short + " — " + String(c.subject || "").slice(0, 60));
        o.value = String(i);
        sel.appendChild(o);
      });
      host.querySelector(".seat-hd").appendChild(sel);
      sel.onchange = function () { show(+sel.value); };
    }
    host.__pick = { sel: sel, show: show, list: cs, pane: function () { return cur; } };
    show(0);
  }

  /* ── the spine: five columns, each a picker over one beat's commits ── */
  function spine(host, row) {
    var S = W.GABE_SPINE;
    if (!S || !S.beats) {
      row.textContent = "the spine cannot read the ledger — not loaded: spine.js";
      say(host, row.textContent);
      return;
    }
    var order = S.order || ["RED", "EXECUTE", "REVIEW", "COMMIT", "PUSH"], total = 0, none = 0, live = 0;
    order.forEach(function (beat) {
      var rows = S.beats[beat] || [], word = beat.toLowerCase();
      var n = rows.filter(function (r) { return pickOf(r) >= 0; }).length;
      total += rows.length; live += n; none += (S.no_sha || {})[beat] || 0;
      var col = el("div", "sp-col" + (rows.length ? "" : " empty"));
      col.setAttribute("data-beat", beat);
      var hd = el("div", "sp-hd");
      hd.appendChild(el("span", "", word));
      /* with the runtime missing, the join still holds (the feed carries them) but nothing draws: say which */
      hd.appendChild(el("span", "n", rows.length + " · " + n + (missing.length ? " in the feed" : " drawable")));
      col.appendChild(hd);
      if (!rows.length) {
        col.setAttribute("data-sha", ""); col.setAttribute("data-live", "0");
        col.appendChild(el("div", "sp-fact", "— no ledger row of this beat carries a commit"));
        row.appendChild(col);
        return;
      }
      var sel = el("select");
      sel.setAttribute("aria-label", word + " commits, newest first");
      rows.forEach(function (r, i) {
        var o = el("option", "", (pickOf(r) >= 0 ? "● " : "○ ") + r.sha + " · " + String(r.date || "").slice(5) + " · " + String(r.label || "").slice(0, 40));
        o.value = String(i);
        sel.appendChild(o);
      });
      var pill = el("span", "sp-live"), fact = el("div", "sp-fact");
      function pick(i, drive) {
        var r = rows[i], k = pickOf(r);
        fact.textContent = "";
        fact.appendChild(el("b", "", r.sha));
        fact.appendChild(document.createTextNode(" · " + r.date));
        fact.appendChild(el("i", "", String(r.label || "").slice(0, 90)));
        fact.title = (r.label || "") + (r.gates ? "\n\ngates: " + r.gates : "") + (r.rows > 1 ? "\n" + r.rows + " ledger rows name it" : "") + (r.src ? "\n" + r.src : "");
        pill.className = "sp-live " + (k >= 0 ? "on" : "off");
        pill.textContent = k >= 0 ? "in the feed" : "not in the feed";
        col.setAttribute("data-sha", r.sha); col.setAttribute("data-live", k >= 0 ? "1" : "0");
        if (drive) toChanges(k, r.sha, word + ", " + r.date);
      }
      sel.onchange = function () { try { pick(+sel.value, true); } catch (e) { say(host, "seat failed: " + (e && e.message)); } };
      col.appendChild(sel); col.appendChild(pill); col.appendChild(fact);
      row.appendChild(col);
      pick(0, false);
    });
    /* the head invites a pick only when one can draw; else it says why, in the changes seat's own words */
    var why = missing.length ? "the pane cannot draw — not loaded: " + missing.join(", ")
            : cs.length ? "commits.js carries none of them" : "commits.js carries no commits";
    say(host, !total ? "no ledger row of the five beats carries a commit" + (S.reason ? " — " + S.reason : "")
                     : total + " ledger entries with a commit across the five beats · "
                       + (live && !missing.length ? live + " drawable — pick a ● to draw it below" : "none drawable — " + why)
                       + (none ? " · " + none + " ledger rows name no commit" : ""));
  }

  /* ── the chips: every done card's commit, ●/○ by the same join as the spine ── */
  function chips() {
    [].forEach.call(document.querySelectorAll(".bc-sha"), function (b) {
      var shas = String(b.getAttribute("data-shas") || b.getAttribute("data-sha") || "").split(/\s+/).filter(Boolean);
      var k = pickOf({ sha: shas[0], shas: shas });
      /* a ○ has two reasons: commits.js does not carry the commit, or carries it past the picker's data-cap */
      var fed = k >= 0 || shas.some(function (s) { return feedIdx(s) >= 0; });
      b.setAttribute("data-live", k >= 0 ? "1" : "0");
      b.textContent = (k >= 0 ? "● " : "○ ") + shas[0];
      b.title = "resolved @ " + shas.join(" · ") + (k < 0 ? (fed ? " — in the feed, past the " + cs.length + " commits the picker lists"
                                                                  : " — not in the feed")
        : (cs[k].sha.toLowerCase().lastIndexOf(shas[0].toLowerCase(), 0) === 0 ? "" : " — draws " + cs[k].short)
          + (missing.length ? " — in the feed, but the pane cannot draw: not loaded: " + missing.join(", ") : " — click to draw it in the changes seat"));
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();   /* a chip is not the card: no board filter, no row toggle */
        if (k >= 0) toChanges(k, shas[0], "done card");   /* a ○ stays put: its title already says why */
      });
    });
  }

  function boot(host, fn) {
    var row = host.querySelector(".seat-row");
    try { fn(host, row); } catch (e) { row.textContent = "seat failed: " + (e && e.message); }
  }
  if (seat10) boot(seat10, changes);   /* first: the spine drives its picker */
  var sp = document.querySelector('[data-seat="spine"]');
  if (sp) boot(sp, spine);
  try { chips(); } catch (e) { if (seat10) say(seat10, "seat failed: chips: " + (e && e.message)); }
})();
