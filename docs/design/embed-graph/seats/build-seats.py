#!/usr/bin/env python3
"""build-seats.py — the FOUR STARTING SEATS, shown on the twin's real pages.

Reads gustify's generated command-center pages (the twin, head d0904f57), injects a mini pane at each
seat the survey recommended, and writes the result HERE as a demo set — the twin's own files are never
edited. Every asset and feed is loaded from the twin by absolute path, every sidebar link is rewritten
to the twin, so the demo navigates like the real centre and only the injected seats differ.

  seat 1  feature-pantry.html  Overview tab   ENTITY pane  (panel)  — the page's subject as a picture
  seat 2  feature-pantry.html  Evidence tab   JOURNEY panes (card) — every curated workflow that names
                                                                       a pantry endpoint, walkable
  seat 3  ledger.html          under the KPIs COMMIT pane  (panel)  — the latest change's touched pieces
  seat 4  tests.html           under the KPIs TEST panes  (card)   — the three most-covering cases

THROWAWAY BY DESIGN: this is the look, for a yes/no. The board's two seats (10 · the changes, 11 · the
spine) and its done-card chips are wired for real (D-045 · D-048): build_center_a3.render_board fills
{{BOARD_SEATS}} from _a3_seats.board_seats, _a3_board.card_html emits each done card's .bc-sha chip,
and shell/assets/seats.js boots all three from commits.js + spine.js, over the pane runtime shipped in
templates/center/shell/assets/ (D-047). Seats 1-4 below stay a demo — no generator emits them.

  python3 build-seats.py            # writes seats/*.html
  GABE_TWIN_CENTER=<dir>            # default /home/khujta/projects/apps/gustify/docs/site/center
"""
import os, re, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
PANE = HERE.parent                                   # docs/design/embed-graph
TWIN = pathlib.Path(os.environ.get("GABE_TWIN_CENTER",
        "/home/khujta/projects/apps/gustify/docs/site/center"))
if not (TWIN / "c4-graph.js").exists():
    sys.exit("no twin centre at " + str(TWIN))

def abs_url(p):
    """RELATIVE to this folder, never absolute. The operator opens these pages from WINDOWS Chrome through
    wsl.localhost, where a file:///home/... URL resolves to nothing - the first render came up unstyled
    with every asset 404ing (2026-09-09). A relative path resolves against the document on both sides."""
    return os.path.relpath(str(p), str(HERE)).replace(os.sep, "/")

# ---- the pane's own CSS, scoped so it never touches the centre's skin --------------------------------
css = (PANE / "_pane.css").read_text(encoding="utf-8")
root = css[css.index(":root {"):css.index("}", css.index(":root {")) + 1]          # the token block
pane_css = css[css.index("/* ── the pane"):]                                       # only the .pn* zone
pane_css = re.sub(r"(^|\n)(\.pn)", r"\1.seat \2", pane_css)                        # every rule under .seat
# the CONSOLE skin (the default since 2026-09-09): every rule is .pnc-prefixed and carries its own
# tokens, so it ships whole — no body/:root rules to collide with the centre's skin
console_css = (PANE / "_pane-console.css").read_text(encoding="utf-8")
scoped = root.replace(":root {", ".seat {") + "\n" + pane_css + "\n" + console_css + """
/* the seat itself: a labelled strip inside the centre page */
.seat{ margin:14px 0 18px; padding:12px 14px 14px; border:1px dashed color-mix(in srgb, var(--accent, #4f46e5) 55%, transparent);
  border-radius:10px; background:color-mix(in srgb, var(--accent, #4f46e5) 5%, transparent); }
.seat .seat-hd{ display:flex; align-items:baseline; gap:10px; margin-bottom:10px; font:12px/1.3 ui-monospace, Menlo, monospace; }
.seat .seat-hd b{ font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--accent, #4f46e5); white-space:nowrap; }
.seat .seat-hd span{ opacity:.7; }
.seat .seat-row{ display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; }
.seat[data-seat="entity"] .seat-row, .seat[data-mode="pick"] .seat-row{ display:block; }   /* one pane, full width */
.seat .seat-hd select.seat-pick{ margin-left:auto; max-width:min(60%, 520px); font:12px/1.3 ui-monospace, Menlo, monospace;
  padding:4px 8px; border-radius:6px; border:1px solid color-mix(in srgb, var(--accent, #4f46e5) 45%, transparent);
  background:#fff; color:#141a24; cursor:pointer; }
.seat .seat-hd select.seat-pick:focus{ outline:2px solid var(--accent, #4f46e5); outline-offset:1px; }
.seat .seat-hd .seat-n{ font-size:11px; opacity:.6; white-space:nowrap; }
/* a card's COMMIT: the sha the resolved row recorded; live when commits.js carries it, dim when the feed stops before it */
.bc-sha{ display:inline-flex; align-items:center; gap:4px; font:600 10.5px/1 ui-monospace, Menlo, monospace; padding:3px 7px; border-radius:999px;
  border:1px solid color-mix(in srgb, var(--accent, #4f46e5) 50%, transparent); color:var(--accent, #4f46e5); background:#fff; cursor:pointer; }
.bc-sha:hover{ background:var(--accent, #4f46e5); color:#fff; }
.bc-sha[data-live="0"]{ color:#7a8595; border-style:dashed; border-color:#c9cfd8; }
.bc-sha[data-live="0"]:hover{ background:#eef0f4; color:#7a8595; }
.seat.flash{ box-shadow:0 0 0 3px color-mix(in srgb, var(--accent, #4f46e5) 55%, transparent); transition:box-shadow .2s; }
/* THE SPINE STRIP: Red · Execute · Review · Commit · Push — each column is that beat's ledger, newest first */
.seat[data-seat="spine"] .seat-row{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; }
.sp-col{ min-width:0; border:1px solid color-mix(in srgb, var(--bc, #4f46e5) 45%, transparent); border-radius:8px; background:#fff; padding:8px 10px 9px; display:flex; flex-direction:column; gap:6px; }
.sp-col .sp-hd{ display:flex; align-items:baseline; gap:6px; font:700 11px/1.2 ui-monospace, Menlo, monospace; letter-spacing:.08em; text-transform:uppercase; color:var(--bc, #4f46e5); }
.sp-col .sp-hd .n{ margin-left:auto; font-weight:600; font-size:10px; color:#7a8595; letter-spacing:0; text-transform:none; }
.sp-col select{ width:100%; font:11px/1.3 ui-monospace, Menlo, monospace; padding:4px 6px; border-radius:6px; border:1px solid #c9cfd8; background:#fff; color:#141a24; cursor:pointer; }
.sp-col .sp-fact{ font:11px/1.45 ui-sans-serif, system-ui, sans-serif; color:#3d4756; min-height:2.9em; }
.sp-col .sp-fact b{ font-family:ui-monospace, Menlo, monospace; color:#141a24; }
.sp-col .sp-fact i{ display:block; font-style:normal; color:#7a8595; font-size:10.5px; margin-top:2px; }
.sp-col .sp-live{ font:700 9.5px/1 ui-monospace, Menlo, monospace; letter-spacing:.06em; padding:2px 6px; border-radius:999px; align-self:flex-start; }
.sp-col .sp-live.on{ color:#1a7f4b; border:1px solid rgba(76,190,131,.6); } .sp-col .sp-live.off{ color:#7a8595; border:1px dashed #c9cfd8; }
.sp-col.empty{ opacity:.55; }
"""

# ---- the boot: index once, mount each seat --------------------------------------------------------
BOOT = r"""
<script>
(function(){
  if(!window.GABE_C4 || !window.ForceGraph3D || !window.GabePane){ return; }
  var IX = GabeSlice.index(window.GABE_C4, window.GABE_COMMITS || [], window.GABE_WORKFLOWS || []);
  var base = %(station)s;   /* the twin's station, for the pane's open-in-station link */
  var SIZE = { panel:"panel", card:"card" };
  /* THE PICKER (operator 2026-09-10): a section with many graphs shows ONE, full width like the entity
     seat, and a dropdown at the top — outside the graph — chooses which. Switching TEARS DOWN the
     previous pane (3d-force-graph's _destructor + the wrapper) so a seat holds one WebGL context
     however many times it is switched; the browser caps contexts at ~16 and a leak would end the
     page after a dozen picks. */
  function pick(host, row, list, label, mountOne) {
    var hd = host.querySelector(".seat-hd"), span = hd.querySelector("span");
    host.setAttribute("data-mode", "pick");
    if (!list.length) { row.textContent = "nothing to pick — " + label; span.textContent = "0 " + label; return; }
    var sel = document.createElement("select"); sel.className = "seat-pick"; sel.setAttribute("aria-label", "choose which " + label + " to draw");
    list.forEach(function (it, i) { var o = document.createElement("option"); o.value = String(i); o.textContent = it.label + (it.sub ? "  —  " + it.sub : ""); sel.appendChild(o); });
    span.textContent = list.length + " " + label + " — pick one";
    hd.appendChild(sel);
    var cur = null;
    function show(i) {
      if (cur) { try { if (cur.Graph && cur.Graph._destructor) cur.Graph._destructor(); } catch (e) {} try { if (cur.wrap) cur.wrap.remove(); } catch (e) {} cur = null; }
      row.innerHTML = "";
      cur = mountOne(list[i]);
      host.setAttribute("data-picked", list[i].id);
    }
    sel.onchange = function () { show(+sel.value); };
    show(0);
    host.__pick = { sel: sel, show: show, list: list };
  }
  /* CARD → COMMIT (operator 2026-09-10): a Done card carries the sha its resolved row recorded. Live when
     commits.js carries that commit — press it and the seat's picker selects it and scrolls into view.
     Dim when the feed stops before it; the press still lands on the seat and the head says so. */
  var HAVE = {}; (window.GABE_COMMITS || []).forEach(function (c, i) { HAVE[c.short] = i; });
  document.querySelectorAll(".bc-sha").forEach(function (b) {
    /* a row can record more than one sha (resolved @ X, verified @ Y): the chip shows the resolving one and
       goes live on whichever the feed carries — and says so when that is not the one it shows */
    var shown = b.getAttribute("data-sha"), all = (b.getAttribute("data-shas") || shown).split(" ");
    var sha = all.filter(function (x) { return HAVE[x] != null; })[0] || null, live = !!sha;
    b.setAttribute("data-live", live ? "1" : "0");
    var newest = (window.GABE_COMMITS || [])[0] || {};
    b.title = live ? ("resolved @ " + shown + (sha !== shown ? " · the feed carries " + sha + ", the earlier commit on this row" : "") + " — press to draw it in the seat above")
                   : ("resolved @ " + shown + " — commits.js stops at " + newest.short + " (" + (newest.date || "").slice(0, 10) + "); this commit is newer than the landed feed");
    b.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var host = document.querySelector('[data-seat="commits"]'); if (!host) return;
      var pk = host.__pick, span = host.querySelector(".seat-hd > span");
      if (pk && live) { var i = pk.list.map(function (x) { return x.id; }).indexOf(sha); if (i >= 0) { pk.sel.value = String(i); pk.show(i); } }
      else if (span) span.textContent = "commits.js does not carry " + shown + " — the feed stops at " + (((window.GABE_COMMITS || [])[0] || {}).short || "?") + " · the pane keeps " + (host.getAttribute("data-picked") || "the newest");
      host.scrollIntoView({ block: "start", behavior: "smooth" });
      host.classList.remove("flash"); void host.offsetWidth; host.classList.add("flash"); setTimeout(function () { host.classList.remove("flash"); }, 1400);
    };
  });
  /* THE SPINE STRIP (operator 2026-09-10): one column per spine beat — Red · Execute · Review · Commit · Push —
     each a picker over the commits that beat recorded in the ledger, newest first, the latest preselected.
     A pick that commits.js carries draws in the commit seat below; one it does not carry still shows the
     ledger's own facts (date · theme · gates) and says the feed stops early. The strip never invents a commit. */
  function spine(host, row) {
    var data = {}; try { data = JSON.parse(host.getAttribute("data-spine") || "{}"); } catch (e) {}
    var order = ["RED", "EXECUTE", "REVIEW", "COMMIT", "PUSH"], col = { RED:"#b3403a", EXECUTE:"#0d6e78", REVIEW:"#b45309", COMMIT:"#4f46e5", PUSH:"#1a7f4b" };
    var seat10 = document.querySelector('[data-seat="commits"]');
    var newest = (window.GABE_COMMITS || [])[0] || {};
    var total = 0;
    order.forEach(function (beat) {
      var rows = data[beat] || [], live = rows.filter(function (r) { return HAVE[r.sha] != null; }).length; total += rows.length;
      var c = document.createElement("div"); c.className = "sp-col" + (rows.length ? "" : " empty"); c.style.setProperty("--bc", col[beat]); c.setAttribute("data-beat", beat);
      c.innerHTML = '<div class="sp-hd"><span>' + beat.toLowerCase() + '</span><span class="n">' + rows.length + ' · ' + live + ' drawable</span></div>';
      if (!rows.length) { c.innerHTML += '<div class="sp-fact">— no ledger row of this beat carries a commit</div>'; row.appendChild(c); return; }
      var sel = document.createElement("select"); sel.setAttribute("aria-label", beat + " commits, newest first");
      rows.forEach(function (r, i) { var o = document.createElement("option"); o.value = String(i); o.textContent = (HAVE[r.sha] != null ? "\u25cf " : "\u25cb ") + r.sha + " \u00b7 " + r.date.slice(5) + " \u00b7 " + r.theme.slice(0, 40); sel.appendChild(o); });
      var fact = document.createElement("div"); fact.className = "sp-fact";
      var pill = document.createElement("span"); pill.className = "sp-live";
      function show(i, drive) {
        var r = rows[i], isLive = HAVE[r.sha] != null;
        fact.innerHTML = "<b>" + r.sha + "</b> \u00b7 " + r.date + "<i>" + (r.theme || "").slice(0, 90) + "</i>"; fact.title = (r.theme || "") + (r.gates ? "\n\ngates: " + r.gates : "");
        pill.className = "sp-live " + (isLive ? "on" : "off"); pill.textContent = isLive ? "drawn below" : "feed stops at " + (newest.short || "?");
        c.setAttribute("data-sha", r.sha); c.setAttribute("data-live", isLive ? "1" : "0");
        if (!drive || !seat10) return;
        var pk = seat10.__pick, span = seat10.querySelector(".seat-hd > span");
        if (pk && isLive) { var k = pk.list.map(function (x) { return x.id; }).indexOf(r.sha); if (k >= 0) { pk.sel.value = String(k); pk.show(k); } }
        else if (span) span.textContent = "commits.js does not carry " + r.sha + " (" + beat.toLowerCase() + ", " + r.date + ") \u2014 the feed stops at " + (newest.short || "?") + " \u00b7 the pane keeps " + (seat10.getAttribute("data-picked") || "the newest");
        seat10.scrollIntoView({ block: "start", behavior: "smooth" });
        seat10.classList.remove("flash"); void seat10.offsetWidth; seat10.classList.add("flash"); setTimeout(function () { seat10.classList.remove("flash"); }, 1400);
      }
      sel.onchange = function () { show(+sel.value, true); };
      c.appendChild(sel); c.appendChild(pill); c.appendChild(fact); row.appendChild(c);
      show(0, false);
      c.__show = show;
    });
    host.querySelector(".seat-hd span").textContent = total + " ledger rows with a commit across the five beats \u2014 pick one to draw it below";
  }
  document.querySelectorAll("[data-seat]").forEach(function (host) {
    var kind = host.getAttribute("data-seat"), row = host.querySelector(".seat-row");
    if (kind === "spine") { try { spine(host, row); } catch (e) { row.textContent = "seat failed: " + (e && e.message); } return; }
    try {
      if (kind === "entity") {
        GabePane.embed(row, { ix: IX, scope: "entity", id: host.getAttribute("data-id"), size: "fill", stationBase: base });   /* the entity seat takes the page's width (operator) */
      } else if (kind === "journeys") {
        /* the curated workflows that name an endpoint this entity owns */
        var ent = host.getAttribute("data-id");
        var own = {}; ((window.GABE_C4.l2[ent] || {}).nodes || []).forEach(function (n) { if (n.kind === "endpoint") own[n.label] = 1; });
        var hits = (window.GABE_WORKFLOWS || []).filter(function (w) { return w.steps.some(function (s) { return own[s]; }); });
        if (!hits.length) {   /* an honest empty: the seat stays, says why, and names the beat that fills it */
          row.textContent = "no curated walk names an endpoint of " + ent + " — curate-workflows drafts one from the graph";
          host.querySelector(".seat-hd span").textContent = "0 curated workflows reach this entity"; return; }
        pick(host, row, hits.map(function (w) { return { id: w.name, label: w.name, sub: w.steps.length + " steps" }; }), "curated walks reaching " + ent,
             function (it) { return GabePane.embed(row, { ix: IX, scope: "journey", id: it.id, hops: 2, size: "fill", stationBase: base }); });
      } else if (kind === "commit") {
        var sha = host.getAttribute("data-id");
        var have = (window.GABE_COMMITS || []).some(function (c) { return c.short === sha; });
        if (!have) { var c0 = (window.GABE_COMMITS || [])[0]; host.querySelector(".seat-hd span").textContent =
          "commits.js does not carry " + sha + " — showing the newest it has, " + (c0 ? c0.short : "none"); sha = c0 ? c0.short : null; }
        if (sha) GabePane.embed(row, { ix: IX, scope: "commit", id: sha, size: "fill", stationBase: base });
      } else if (kind === "tests") {
        var top = GabeSlice.subjects(IX).test.slice(0, +(host.getAttribute("data-cap") || 12));
        pick(host, row, top.map(function (t) { return { id: t.id, label: t.id, sub: t.sub }; }), "cases, most-covering first",
             function (it) { return GabePane.embed(row, { ix: IX, scope: "test", id: it.id, size: "fill", stationBase: base }); });
      } else if (kind === "entities") {
        /* every claimed entity, one card each, largest first — the entity page as a shelf of pictures */
        var all = GabeSlice.subjects(IX).entity.slice().sort(function (a, b) { return IX.ents[b.id].nodes.length - IX.ents[a.id].nodes.length; });
        var ents = all.filter(function (e) { return e.id !== "__unclaimed__"; }), res = all.filter(function (e) { return e.id === "__unclaimed__"; })[0];
        pick(host, row, ents.map(function (e) { return { id: e.id, label: e.id, sub: IX.ents[e.id].nodes.length + " pieces" }; }),
             "entities, largest first" + (res ? " (" + IX.ents[res.id].nodes.length + " unclaimed pieces held out)" : ""),
             function (it) { return GabePane.embed(row, { ix: IX, scope: "entity", id: it.id, size: "fill", stationBase: base }); });
      } else if (kind === "journeys-all") {
        /* the curated walks, orientation first (level 1 → 3), capped so a page never holds more than twelve panes */
        var lv = function (w) { return w.level || 9; };
        var ws = (window.GABE_WORKFLOWS || []).slice().sort(function (a, b) { return lv(a) - lv(b) || (a.name < b.name ? -1 : 1); });
        /* a picker holds them ALL — the cap only ever existed to keep a page under twelve panes */
        var LV = { 1: "orientation", 2: "core", 3: "specialized" };
        pick(host, row, ws.map(function (w) { return { id: w.name, label: w.name, sub: (LV[w.level] || "other") + " · " + w.steps.length + " steps" }; }), "curated walks, orientation first",
             function (it) { return GabePane.embed(row, { ix: IX, scope: "journey", id: it.id, hops: 2, size: "fill", stationBase: base }); });
      } else if (kind === "commits") {
        /* the newest N commits as cards — the ledger's spine, drawn */
        var capC = +(host.getAttribute("data-cap") || 3), cs = (window.GABE_COMMITS || []).slice(0, capC);
        if (!cs.length) { row.textContent = "commits.js carries no commits"; return; }
        if (cs.length === 1) {
          GabePane.embed(row, { ix: IX, scope: "commit", id: cs[0].short, size: "fill", stationBase: base });
          host.querySelector(".seat-hd span").textContent = "the newest commit in commits.js — " + cs[0].short; return;
        }
        pick(host, row, cs.map(function (c) { return { id: c.short, label: c.short, sub: String(c.subject || "").slice(0, 60) }; }), "newest commits",
             function (it) { return GabePane.embed(row, { ix: IX, scope: "commit", id: it.id, size: "fill", stationBase: base }); });
      }
    } catch (e) { row.textContent = "seat failed: " + (e && e.message); }
  });
})();
</script>
"""

def seat(kind, id_, title, sub, cap=None, more=None):
    return ('<div class="seat" data-seat="%s" data-id="%s"%s%s><div class="seat-hd"><b>%s</b><span>%s</span></div>'
            '<div class="seat-row"></div></div>' % (kind, id_, (' data-cap="%d"' % cap) if cap else "", (' data-more="%s"' % more) if more else "", title, sub))

def inject_at(h, anchor, strip, label):
    """the strip goes right INSIDE the anchor tag — the first thing in that section"""
    assert anchor in h, label + ": anchor " + anchor[:40]
    return h.replace(anchor, anchor + "\n" + strip, 1)

def rehome(html):
    """assets, feeds and sidebar links point back at the twin; the demo only owns its seats"""
    html = re.sub(r'(href|src)="(assets/[^"]+)"', lambda m: '%s="%s"' % (m.group(1), abs_url(TWIN / m.group(2))), html)
    html = re.sub(r'href="([a-z0-9\-]+\.html(?:[#?][^"]*)?)"', lambda m: 'href="%s"' % abs_url(TWIN / m.group(1)), html)
    return html

def inject_tail(html):
    tail = ('<style>%s</style>\n' % scoped
            + '\n'.join('<script src="%s"></script>' % abs_url(TWIN / f) for f in ("c4-graph.js", "commits.js", "workflows.js"))
            + '\n<script src="%s"></script>' % abs_url(TWIN / "assets" / "3d-bundle.js")
            + '\n' + '\n'.join('<script src="%s"></script>' % abs_url(PANE / f)
                               for f in ("_grammar.js", "_slice.js", "_uni-grammar.js", "_pane.js", "_pane-console.js"))
            + BOOT % {"station": '"' + abs_url(TWIN / "gabe-universe.html") + '"'})
    i = html.rindex("</body>")
    return html[:i] + tail + html[i:]

out = []

# ---- seat 1 + 2 : feature-pantry ------------------------------------------------------------------
src = (TWIN / "feature-pantry.html").read_text(encoding="utf-8")
h = rehome(src)
a = '<section class="tabpane" id="tab-overview">'
assert a in h, "overview tab anchor"
h = h.replace(a, a + "\n" + seat("entity", "pantry", "seat 1 · entity pane",
             "the page's subject as a picture — orbit, click a piece, walk its steps"), 1)
b = '<section class="tabpane" id="tab-evidence">'
assert b in h, "evidence tab anchor"
h = h.replace(b, b + "\n" + seat("journeys", "pantry", "seat 2 · journey panes", "…"), 1)
h = inject_tail(h)
(HERE / "feature-pantry.html").write_text(h, encoding="utf-8"); out.append("feature-pantry.html")

# ---- seat 3 : ledger ------------------------------------------------------------------------------
src = (TWIN / "ledger.html").read_text(encoding="utf-8")
m = re.search(r"<h1>Latest change · ([0-9a-f]{7,})</h1>", src)
sha = m.group(1)[:8] if m else None
h = rehome(src)
# after the KPI strip: the first <section after the h1
hi = h.index("<h1>")
si = h.index("<section", hi)
h = h[:si] + seat("commit", sha or "", "seat 3 · commit pane", "the latest change's touched pieces — 58% of a typical commit is frontend") + "\n" + h[si:]
h = inject_tail(h)
(HERE / "ledger.html").write_text(h, encoding="utf-8"); out.append("ledger.html")

# ---- seat 4 : tests -------------------------------------------------------------------------------
src = (TWIN / "tests.html").read_text(encoding="utf-8")
h = rehome(src)
hi = h.index("<h1>")
si = h.index('<div class="sechead"', hi)
h = h[:si] + seat("tests", "", "seat 4 · test panes", "…") + "\n" + h[si:]
h = inject_tail(h)
(HERE / "tests.html").write_text(h, encoding="utf-8"); out.append("tests.html")

# ---- the OTHER feature pages: entity pane + journey panes, exactly as pantry -----------------------
for slug in ("recipe", "cooking", "allergen", "auth", "progression", "legal-consent"):
    fp = TWIN / ("feature-%s.html" % slug)
    if not fp.exists(): print("skip", fp.name, "(no such page on the twin)"); continue
    h = rehome(fp.read_text(encoding="utf-8"))
    h = inject_at(h, '<section class="tabpane" id="tab-overview">', seat("entity", slug, "seat 1 · entity pane",
                  "the page's subject as a picture — orbit, click a piece, walk its steps"), slug)
    h = inject_at(h, '<section class="tabpane" id="tab-evidence">', seat("journeys", slug, "seat 2 · journey panes", "…"), slug)
    (HERE / fp.name).write_text(inject_tail(h), encoding="utf-8"); out.append(fp.name)

# ---- entity-index: every entity as a card — the shelf -----------------------------------------------
h = rehome((TWIN / "entity-index.html").read_text(encoding="utf-8"))
h = inject_at(h, '<section class="tabpane" id="entities" style="display:block">',
              seat("entities", "", "seat 5 · the entity shelf", "…"), "entity-index")
(HERE / "entity-index.html").write_text(inject_tail(h), encoding="utf-8"); out.append("entity-index.html")

# ---- index (overview): the latest change + the orientation walks ------------------------------------
h = rehome((TWIN / "index.html").read_text(encoding="utf-8"))
h = inject_at(h, '<section class="tabpane" id="tab-overview">',
              seat("commits", "", "seat 6 · the latest change", "…", cap=1) + "\n"
              + seat("journeys-all", "", "seat 7 · the walks", "…"), "index")
(HERE / "index.html").write_text(inject_tail(h), encoding="utf-8"); out.append("index.html")

# ---- architecture: the walks across entities, twelve at most ----------------------------------------
h = rehome((TWIN / "architecture.html").read_text(encoding="utf-8"))
h = inject_at(h, '<section class="tabpane" id="architecture" style="display:block">',
              seat("journeys-all", "", "seat 8 · the walks, all of them", "…"), "architecture")
(HERE / "architecture.html").write_text(inject_tail(h), encoding="utf-8"); out.append("architecture.html")

# ---- releases: the newest three commits as cards ---------------------------------------------------
h = rehome((TWIN / "releases.html").read_text(encoding="utf-8"))
h = inject_at(h, '<section class="tabpane" id="releases" style="display:block">',
              seat("commits", "", "seat 9 · the newest changes", "…", cap=12), "releases")
(HERE / "releases.html").write_text(inject_tail(h), encoding="utf-8"); out.append("releases.html")

# ---- board: every commit as a picker, and each Done card wears the sha its resolved row recorded --------
def resolved_shas():
    """#id -> [sha…] from the twin's resolved PENDING rows (Verified first, then Status). The board never
    emits the sha; the row it was built from has it, so the join is by the #id the card title carries."""
    import glob
    out = {}
    for f in glob.glob(str(TWIN.parent.parent.parent / ".kdbp" / "archive" / "PENDING-resolved_*.md")) + [str(TWIN.parent.parent.parent / ".kdbp" / "PENDING.md")]:
        try: lines = open(f, encoding="utf-8").read().split("\n")
        except OSError: continue
        for ln in lines:
            m = re.match(r"\|\s*#?(\d+)\s*\|", ln)
            if not m: continue
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            status = cells[9] if len(cells) > 9 else ""; verified = cells[10] if len(cells) > 10 else ""
            shas = [x for x in re.findall(r"\b[0-9a-f]{7,8}\b", verified + " " + status) if re.search(r"[a-f]", x)]
            date = (re.search(r"20\d\d-\d\d-\d\d", verified + " " + status) or [None])
            if shas: out["#" + m.group(1)] = { "sha": shas[0], "shas": list(dict.fromkeys(shas)), "date": date.group(0) if hasattr(date, "group") else None }
    return out

def ledger_spine():
    """beat -> [{date, sha, theme, gates}] newest first, from the twin's LEDGER.md (Entry + Commits columns).
    EXEC and EXECUTE are one beat; a row without a sha is not a commit and is left out."""
    import json as _json
    LED = TWIN.parent.parent.parent / ".kdbp" / "LEDGER.md"
    NAMES = { "RED": "RED", "EXEC": "EXECUTE", "EXECUTE": "EXECUTE", "REVIEW": "REVIEW", "COMMIT": "COMMIT", "PUSH": "PUSH" }
    out = { "RED": [], "EXECUTE": [], "REVIEW": [], "COMMIT": [], "PUSH": [] }
    try: lines = LED.read_text(encoding="utf-8").split("\n")
    except OSError: return out
    for ln in lines:
        if not ln.startswith("| 20"): continue
        c = [x.strip() for x in ln.strip().strip("|").split("|")]
        if len(c) < 5: continue
        beat = NAMES.get(c[1].upper())
        if not beat: continue
        shas = re.findall(r"\b[0-9a-f]{7,8}\b", c[3])   # an all-digit sha (14394538) is still a sha
        if not shas: continue
        out[beat].append({ "date": c[0], "sha": shas[0], "theme": re.sub(r"\s+", " ", c[2])[:120], "gates": re.sub(r"\s+", " ", c[4])[:120] })
    return out

src = (TWIN / "board.html").read_text(encoding="utf-8")
h = rehome(src)
SPINE = ledger_spine()
RS = resolved_shas(); chipped = 0
def chip_card(m):
    global chipped
    card = m.group(0)
    t = re.search(r"<h4>(.*?)</h4>", card, re.S); tid = re.match(r"(#\d+)", re.sub(r"<[^>]+>", "", t.group(1))) if t else None
    r = RS.get(tid.group(1)) if tid else None
    if not r: return card
    chipped += 1
    chip = '<button type="button" class="bc-sha" data-sha="%s" data-shas="%s" data-id="%s">%s%s</button>' % (r["sha"], " ".join(r["shas"]), tid.group(1), r["sha"], (" · " + r["date"]) if r["date"] else "")
    return card.replace('</div><h4>', chip + '</div><h4>', 1)
h = re.sub(r'<article class="bcard"[^>]*data-state="done"[^>]*>.*?</article>', chip_card, h, flags=re.S)
mi = h.index('<main class="main">') + len('<main class="main">')
si = h.find("<section", mi); hi = h.find("</h1>", mi)
at = (hi + len("</h1>")) if (hi >= 0 and (si < 0 or hi < si)) else (si if si >= 0 else mi)
import json as _json, html as _html
spine_seat = ('<div class="seat" data-seat="spine" data-spine="%s"><div class="seat-hd"><b>seat 11 · the spine</b><span>…</span></div>'
              '<div class="seat-row"></div></div>' % _html.escape(_json.dumps(SPINE, ensure_ascii=False), quote=True))
h = h[:at] + "\n" + spine_seat + "\n" + seat("commits", "", "seat 10 · the changes", "…", cap=30) + "\n" + h[at:]
print("board: spine rows with a commit — " + " · ".join("%s %d" % (k.lower(), len(v)) for k, v in SPINE.items()))
(HERE / "board.html").write_text(inject_tail(h), encoding="utf-8"); out.append("board.html")
print("board: %d Done cards wear a resolved sha (of %d resolved rows with one)" % (chipped, len(RS)))

for f in out:
    print("wrote", HERE / f)
print("twin:", TWIN, "· ledger sha:", sha)
