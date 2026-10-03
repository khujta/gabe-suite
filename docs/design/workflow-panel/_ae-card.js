  /* ══ D-088 · THE HOVER CARD (his: "the hover that we show there is much more beautiful, better structured, and more detailed. It
     communicates better with symbols and colors what we want to say there in the hover"). The endpoint lab's card, in the lab's own
     order — head: the kind's glyph in its colour, the bold name, the kind at the right · identity lines, each with its icon · a rule ·
     the channel as a pill · the count in a pill, then each mark with its count · the element's own facts in the three parts before ·
     checks · gives · a quiet footer that says what a click does here — drawn by ONE renderer, card(kind, subject), for every element
     chip of BY MOMENT and every element on the examples bench (D-085: the rules are checked as each card is made, not in passes).
     A card MIRRORS the element's block on the bench: its glyph, colours, chip and marks are the bench's own functions (XPART, xStrip,
     xGlyphCol, xChanCol) read from the kind's live look (XS.col[k].look), so a kind he sets on the bench is the card's look too. What
     the card carries beyond the block is the element's facts (ioParts · xTipParts, the generator's lines).
     The rules it keeps, each reported on the card (data-card-issues) and in window.__allep.card.log:
       P1.1 · what every item of a kind shares is a short label (the kind at the right, a part's heading), never a sentence — the kind's
              plain line stays on the row's legend and on heads and controls; most of a card is what differs between items;
       P2.1 · no words about the page or the map (the stop-list below); the one line it keeps about the page is the closing "counted in"
              of his L-20, marked data-page, and the footer his D-088 asked for;
       P4.1 · an element that joins two things names the other end — each join a kind declares is checked against the card's text;
       P8.1 · a count's label comes from the unit the count is made with, and what is not recorded reads "unknown", never 0. ══ */
  var CDW = W.mo.card, CDU = Object.assign({}, XW.unit, CDW.unit), CDLOG = [], CDPLAIN = [];
  (function () { function take(o) { if (!o || typeof o !== "object") return; Object.keys(o).forEach(function (k) { var v = o[k]; if (k === "plain" && typeof v === "string" && v.length > 24) CDPLAIN.push(v); else take(v); }); }
    take(W.mo.io.k); take(W.ex.kinds); take(W.ex.roles); take(W.kinds); take(EN.kind); take(EN.role); take(EN.ifk); take(EN.hrole); take(EN.dir); })();
  var CDSTOP = /\bas (the )?(table|page|code map|gabe universe|station|lab|map) (draws?|shows?|reads?)\b|\bas drawn\b|\bfound by\b|\bthe (code )?map (does|has|holds|reads|says|draws|names|carries|knows)\b|\bmy (pick|proposal)\b|\bgabe universe\b|\bthe station\b|\bhere\b|\bgraft\b|\bthe forms feed\b|\bthe generator\b/i;
  /* an io kind → [the card's kind, the bench kind it is bound to]. A kind not listed is drawn as "other" and counted: the batch of unknown kinds */
  var CDIK = { fn: ["fn", "fn"], handler: ["fn", "fn"], table: ["table", "table"], body: ["schema", "schema"], reply: ["schema", "schema"], schema: ["schema", "schema"], field: ["field", "schema"],
    guard: ["gate", "gate"], fork: ["gate", "gate"], "catch": ["gate", "gate"], limiter: ["gate", "gate"], login: ["gate", "gate"], "switch": ["gate", "gate"], rule: ["gate", "gate"],
    "case": ["test", "test"], journey: ["test", "test"], hook: ["hook", "hook"], inflight: ["inf", "inf"],
    cache: ["client", null], orch: ["client", null], screen: ["client", null], clfn: ["client", null], reason: ["client", null], rest: ["client", null], file: ["client", null],
    mw: ["mw", null], cors: ["sec", null], secret: ["sec", null], secmark: ["sec", null] };
  CDIK.step = ["step", null]; CDIK.piece = ["piece", null]; CDIK.built = ["fn", "fn"];
  var CDICON = { cache: "layers", orch: "hook", screen: "screen", clfn: "function", reason: "bubble", rest: "bubble", file: "file", step: "model", piece: "layers", other: "info" };
  function cdLook(bk) { var L = Object.assign({}, XS.col[bk].look); L.mode = Object.assign({}, L.mode, { ent: "both", model: "both", via: "both", file: "both", count: "badge" }); return L; }
  function cdTok(io, key, tok) { var f = null; ["b", "c", "g"].forEach(function (p) { (io[p] || []).forEach(function (q) { if (!f && q[0] === key) f = q[1] || {}; }); }); return f && tok ? f[tok] : f; }
  function cdLift(col) { return col && col.charAt(0) === "#" ? "color-mix(in srgb, " + col + " 68%, #fff)" : col; }   /* an entity's colour as TEXT on the card's dark panel; its glyph keeps the colour itself */
  function cdEntCol(ent) { if (!ent) return "var(--muted)"; if (!cdEntCol.m) { cdEntCol.m = {}; Object.keys(EX.cat).forEach(function (k) { var c = EX.cat[k]; if (c.ent && c.ec) cdEntCol.m[c.ent] = c.ec; }); } return cdEntCol.m[ent] || "var(--muted)"; }
  function cdPl(unit, n, extra) { var U = CDU[unit]; return U ? fill(n === 1 ? U.one : U.many, Object.assign({ n: n }, extra || {})) : null; }
  /* the bench item and catalogue entry an element key stands for on THIS endpoint (a gate's id carries its endpoint) */
  function cdItem(bk, id) { var r = BYID[S.open], e = r && id ? ((r.ex || {})[bk] || []).filter(function (x) { return x[0] === id; })[0] : null; return e ? { k: bk, id: id, role: e[1], ep: r.id, o: e[2] } : null; }
  function cdBind(bk, K, alt) { var ids = K ? [K, S.open + "|" + K].concat(alt || []) : [], seen = null;
    for (var i = 0; i < ids.length; i++) { var c = EX.cat[ids[i]]; if (c && c.k === bk) { var it = cdItem(bk, ids[i]); if (it) return { c: c, it: it }; seen = seen || { id: ids[i], c: c }; } }
    /* the catalogue knows it, this endpoint's list does not (a table a function behind touches, a class the code builds): its own facts, and no role or count that belongs to another endpoint */
    return seen ? { c: seen.c, it: { k: bk, id: seen.id, role: bk === "fn" ? seen.c.role || "none" : bk === "hook" ? seen.c.hrole || "none" : "", ep: S.open, syn: true,
      o: { ops: [], calls: [], chk: [], rz: [], here: [], ends: [], paths: [], react: [], refresh: [], screens: [], send: [], reads: [], after: [], tests: [] } } } : {}; }
  function cdAts(io) { var o = []; ["b", "c", "g"].forEach(function (p) { (io[p] || []).forEach(function (q) { var a = (q[1] || {}).at; if (typeof a === "string" && /:\d+/.test(a)) o.push(a); }); }); return o; }
  function cdEndBind(X, ik) { var r = BYID[S.open], st = parseInt(String(X.io.h[0]), 10), kd = ik.slice(4); if (!r || isNaN(st)) return {};
    var cand = (r.ex.end || []).map(function (e) { return { c: EX.cat[e[0]], it: cdItem("end", e[0]) }; }).filter(function (q) { return q.c && q.it && q.c.st === st && q.c.kd === kd; });
    if (cand.length > 1 && X.tw) { var by = cand.filter(function (q) { return [q.c.lim && q.c.lim[0], q.c.say, q.c.code, q.c.via].some(function (v) { return v && String(v).indexOf(X.tw) >= 0; }); }); if (by.length) cand = by; }
    if (cand.length > 1) { var ats = cdAts(X.io), by2 = cand.filter(function (q) { return q.c.at && ats.some(function (a) { return String(q.c.at).slice(-a.length) === a; }); }); if (by2.length) cand = by2; }
    if (cand.length !== 1) return { amb: cand.length };
    return { c: cand[0].c, it: cand[0].it }; }

  /* ══ the parts, small: a glyph, an identity line, a pill, a count, a mark, the three parts ══ */
  function cdSvg(name, col, z) { return xSvg(name, z || 14, col || "var(--cd-muted)"); }
  function cdLine(key, ico, text, col, tcol, tail) { var d = el("div", "cdl"), i = el("span", "cdi"), t = xWrap(el("span", "cdt"), text); d.setAttribute("data-ln", key);   /* a path breaks after its / and _ and ., never inside a word (xWrap, the bench's own) */
    if (ico) i.appendChild(typeof ico === "string" ? cdSvg(ico, col) : ico); if (tcol) t.style.color = tcol; d.appendChild(i); d.appendChild(t); if (tail) { var q = xWrap(el("span", "cdlt"), tail); d.appendChild(q); } return d; }
  function cdPill(text, col, L) { var i = el("i", "cdpill", text), a = L.rwA == null ? 100 : L.rwA, box = L.rwBox || "tag", clear = box === "outline" || box === "bare";
    i.style.setProperty("--rwc", col); i.style.color = clear || a < 50 ? col : "#0b0e13"; i.style.background = clear ? "transparent" : "color-mix(in srgb, " + col + " " + a + "%, transparent)";
    i.style.borderColor = box === "outline" ? col : "transparent"; i.style.borderRadius = { pill: "999px", tag: "3px", square: "0", outline: "3px", bare: "0" }[box]; if (box === "bare") i.style.padding = "0"; return i; }
  function cdStatusPill(st) { var s = String(st), p = el("i", "cdpill cdst", s); p.style.setProperty("--rwc", xStatusCol(s)); p.style.background = xStatusCol(s); p.style.color = "#0b0e13"; p.setAttribute("data-status", s); return p; }
  /* P8.1: a count is made with a unit, its label read from that unit; a count that is not recorded says so — never a 0 */
  function cdCount(n, unit, known, extra, col, L) { var ok = known !== false && n != null && !isNaN(n), s = el("span", "cdfp", ok ? (unit === "order" ? cdPl(unit, n, extra) : String(n)) : W.unknown), R = { pill: "999px", round: "7px", rect: "3px", square: "0" }[(L || {}).cntBox || "pill"];
    s.setAttribute("data-unit", unit); s.setAttribute("data-n", ok ? String(n) : ""); s.setAttribute("data-extra", JSON.stringify(extra || {})); s.setAttribute("aria-label", ok ? cdPl(unit, n, extra) : fill(CDW.unknown, { v: String((CDU[unit] || { many: unit }).many).replace(/\{n\}\s*/, "") }));
    s.style.borderColor = "color-mix(in srgb, " + (col || "var(--cd-muted)") + " 60%, transparent)"; s.style.borderRadius = R; return s; }
  /* the marks the bench draws for this kind (xStrip), counted by what each stands for, each as its own glyph and colour */
  function cdMarks(strip) { var g = {}, order = [], out = []; if (!strip) return out;
    [].forEach.call(strip.children, function (q) { var key = (q.getAttribute("data-mk") || "") + "|" + (q.getAttribute("data-mv") || "") + "|" + q.style.getPropertyValue("--fc"); if (!g[key]) { g[key] = { q: q, n: 0 }; order.push(key); } g[key].n++; });
    order.forEach(function (key) { var o = g[key], q = o.q.cloneNode(true), mk = q.getAttribute("data-mk") || "", mv = q.getAttribute("data-mv"), W0 = (CDW.mark || {})[mk], x = el("span", "mx");
      ["opt", "fk", "uq", "exmore", "exhere", "expass", "exnob", "off"].forEach(function (c0) { q.classList.remove(c0); }); q.removeAttribute("data-w"); x.setAttribute("data-mk", mk);
      x.setAttribute("data-n", String(o.n)); x.setAttribute("aria-label", W0 ? fill(o.n === 1 ? W0.one : W0.many, { n: o.n, v: mv || "" }) : "");
      x.appendChild(q); x.appendChild(el("b", null, String(o.n))); out.push(x); });
    return out; }
  /* a glyph the chip draws itself — for a kind the bench has no block for (a middleware, a client piece, a security item) */
  function cdChipGlyph(t, name, col) { var src = t && t.querySelector(".skg svg, .mifg svg, .bm svg, .mtg svg"), z = 16;
    if (src) { var c = src.cloneNode(true); c.setAttribute("width", z); c.setAttribute("height", z); c.style.color = getComputedStyle(src.parentNode).color || col || ""; c.style.display = "block"; c.removeAttribute("data-tip"); return c; }
    return xSvg(name || "info", z, col || "var(--cd-muted)"); }
  /* ══ THE FACT ROWS (his, through the lab's card: "it communicates better with symbols and colors", not with sentences). The lower part of a card is one short ROW
     per fact — led by its icon or, for an ending, its status pill in the colour of its kind; a function, a table (with its R or W mark), a class or a test drawn as a CHIP;
     the place (file:line) set quiet at the row's end. A row is made from the generator's own line — its words and tokens, the tokens typed by their names (a status → a pill, a
     function → a chip, an `at` → the quiet end) — so no fact is retyped. A part shows its first few rows and counts the rest ("+N more"); the rows it does not show stay on the
     card, hidden, each carrying its sentence in data-line (what a test reads, what a reader of the page's source finds). A line the generator gave only as a sentence is a row too. ══ */
  var CDMAX = { b: 1, c: 2, g: 3 }, CDMAXALL = 6, CDSEEN = [];
  var CDTT = { st: "st", status: "st", fn: "fn", hook: "fn", via: "fn", name: "fn", cls: "cls", at: "at", cat: "at", src: "at", ln: "ln", tbl: "tbl" };
  var CDV = { calledBy: "fn", underFn: "fn", calls: "fns", fitsTest: "tests", proven: "tests", screenRest: "names", screenReads: "names", usedBy: "names", errTo: "names", scrUses: "names",
    chk: "code", expr: "code", "if": "code", after: "code", asWritten: "code", arm: "code", onWhen: "code", rzWhen: "code", mwSkip: "code", flagOn: "code", ruleIs: "code", ruleIsBare: "code", inIf: "code",
    setting: "code", limSet: "code", causeIf: "code", causeMsg: "quote", doc: "quote", "x.does": "quote", "x.asserts": "stl", eitherCan: "stl", mwEnds: "stl", pickedBy: "fn", readAt: "at", readAt1: "at", by: "text", hdrRun: "code", fetchAt: "text", fields: "names2" };
  var CDST = { ans: 1, ansBare: 1, ends: 1, endsBare: 1, refuses: 1, okTo: 1, err422: 1, ansU: 1 };         /* a row whose status leads it, as a pill, in place of an icon */
  var CDLEAD = { calledBy: "link", depRun: "link", depRoot: "link", depIn: "layers", depIn1: "layers", depth: "layers", depth1: "layers", underCall: "target", calledAt: "target", underFn: "link", inFn: "link", inFnCond: "merge", hostIn: "link", inCall: "link",
    setBy: "link", readsInf: "show", gets: "down", sends: "up", sendsNone: "up", sendsFix: "up", doc: "doc", gives: "up", commitsAt: "model", defAt: "file", chk: "shield", chkExcept: "shield", "if": "merge", after: "merge", asWritten: "merge", arm: "merge", armElse: "merge", expr: "merge",
    "t:out": "model", "t:outNot": "model", "t:outRead": "show", "t:drift": "alert", "t:writers": "layers",
    setting: "cog", limSet: "cog", onWhen: "flag", limEps: "layers", limScope: "path", limAll: "path", limCheck: "shield", limIp: "wave", hdrRun: "up", "x.headers": "up", noTest: "test", noScreen: "screen", "x.declared": "flag", "x.undeclared": "flag", mwAt: "file", mwLib: "file",
    mwNone: "target", mwSets: "layers", mwSkip: "merge", mwSkipPath: "path", mwHdr: "up", mwEnds: "target", secRead: "show", secEnvdefault: "cog", markHolds: "layers", corsAllow: "globe", corsGuard: "link", corsEnv: "cog", corsEnvC: "cog", lasts: "show", sharedBy: "layers",
    readAt: "show", readAt1: "show", holdsA: "layers", tname: "doc", tcall: "up", "x.asserts": "target", state: "test", "x.assertsAttrs": "target", "x.assertsDetail": "target", "x.assertsCode": "target", svcFn: "function", proves: "test", provesAt: "test", provesBare: "test", provesAtBare: "test",
    fits: "test", fitsAt: "test", fitsBare: "test", fitsAtBare: "test", fitsOf: "test", fitsTest: "test", proven: "test", through: "hook", fetchAt: "up", wrapBranch: "shield", noRetry: "shield", refresh: "layers", seed: "layers", errTo: "alert", fetches: "up", refetch: "show", refetchReply: "down", refetchWrote: "model",
    refreshKey: "layers", seedKey: "layers", cacheAt: "file", scrIn: "file", scrUses: "hook", sendsBody: "up", okTo2: "target", fw: "external", code: "alert", ret: "target", unc: "alert", "x.cause": "alert", causeIf: "alert", causeMsg: "bubble", by: "link", xcatch: "shield", xcatch2: "shield", caughtBy: "shield",
    raisedAs: "alert", raisedAt: "alert", "x.raises": "alert", "x.raisesBuilt": "alert", pathsEnd: "target", eitherCan: "target", decides: "target", flagOn: "flag", bind: "link", pickedBy: "link", retVal: "up", fall: "merge", fieldOf: "schema", ann: "doc", opt: "flag", req: "flag", cons: "shield",
    rules422one: "target", rules422: "target", fields: "table", extra: "flag", val422Body: "target", val422oneBody: "target", val422: "target", valBody: "shield", val: "shield", replyTo: "up", builds: "schema", rare: "layers", reachedBy: "link", readsAt: "show", "x.does": "target", handedAt: "link", collapsed: "alert",
    restEnds: "bubble", restDoes: "bubble", restFw: "bubble", callsAt: "hook", errAt: "alert", param: "doc", "x.inside": "link", "x.file": "file", "x.stream": "wave", "x.raceStep": "alert", "x.race": "alert", prov: "model", calls: "function", "x.auth": "key", ends2: "target" };
  var CDRWOF = { read: "r", add: "w", update: "w", "delete": "w", insert: "w", merge: "w", upsert: "w", execute: "w", write: "w", bulk_insert: "w", flush: "w", commit: "w", rollback: "w", savepoint: "w" };
  function cdClip(v, n) { var t = String(v); n = n || 84; return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function cdIco(name, col) { var i = el("span", "cdwi"); i.appendChild(xSvg(name || "target", 13, col || "var(--cd-muted)")); return i; }
  function cdRw(rw) { var m = el("i", "cdrw", rw === "w" ? "W" : rw === "rw" ? "RW" : "R"), c = EX.col.rw[rw] || EX.col.rw.r; m.style.background = c; m.setAttribute("data-rw", rw); m.setAttribute("aria-label", xRoleName("table", rw)); return m; }
  function cdChFn(name) { var c = el("span", "cdch"), i = xSvg("function", 13, EX.col.kind["function"]); c.setAttribute("data-ch", "fn"); c.style.setProperty("--cdc", EX.col.kind["function"]); c.appendChild(i); c.appendChild(xWrap(el("span", "cdwn"), name)); return c; }
  function cdChTbl(name, rw) { var c = el("span", "cdch"); c.setAttribute("data-ch", "table"); c.style.setProperty("--cdc", EX.col.kind.model); c.appendChild(xSvg("model", 13, EX.col.kind.model)); c.appendChild(xWrap(el("span", "cdwn"), name)); if (rw) c.appendChild(cdRw(rw)); return c; }
  function cdChCls(name) { var c = el("span", "cdch"); c.setAttribute("data-ch", "class"); c.style.setProperty("--cdc", "var(--cd-red)"); c.appendChild(xSvg("alert", 13, "var(--cd-red)")); c.appendChild(xWrap(el("span", "cdwn"), name)); return c; }
  function cdChTest(id) { var c = el("span", "cdch"); c.setAttribute("data-ch", "test"); c.style.setProperty("--cdc", EX.col.opc.read); c.appendChild(xSvg("test", 13, EX.col.opc.read)); c.appendChild(el("span", "cdwn", id)); return c; }
  function cdChName(name, icon, col) { var c = el("span", "cdch"); c.setAttribute("data-ch", "name"); c.style.setProperty("--cdc", col || EX.col.kind.screen || "var(--cd-muted)"); c.appendChild(xSvg(icon || "screen", 13, col || EX.col.kind.screen || "var(--cd-muted)")); c.appendChild(xWrap(el("span", "cdwn"), name)); return c; }
  function cdVal(main, ty, v) { var s = String(v);
    if (ty === "fn") main.appendChild(cdChFn(s)); else if (ty === "cls") main.appendChild(cdChCls(s)); else if (ty === "tbl") main.appendChild(cdChTbl(s));
    else if (ty === "names2") s.split(/\s\u00b7\s/).forEach(function (n) { if (n) main.appendChild(el("span", "cdcode", n)); });
    else if (ty === "fns" || ty === "names") s.split(/\s·\s|,\s+/).forEach(function (n) { if (n) main.appendChild(ty === "fns" ? cdChFn(n) : cdChName(n)); });
    else if (ty === "tests") s.split(/\s·\s/).forEach(function (n) { main.appendChild(cdChTest(n)); });
    else if (ty === "code") main.appendChild(el("span", "cdcode", cdClip(s))); else if (ty === "quote") main.appendChild(el("span", "cdq", "“" + cdClip(s) + "”"));
    else main.appendChild(el("span", "cdwv", cdClip(s))); }
  function cdRowEl(key, line, lead, main, tail) { var r = el("div", "cdw"), l = el("span", "cdwl"), t = el("span", "cdwt"); r.setAttribute("data-k", key); r.setAttribute("data-line", line); if (lead) { l.appendChild(lead); r.appendChild(l); } if (main.childNodes.length) r.appendChild(main);
    if (tail) { t.appendChild(xWrap(el("span"), tail)); r.appendChild(t); } return r; }
  /* the rows of one generator line */
  function cdRowOf(L, part) { var k = L.k, tok = L.t || {}, main = el("span", "cdwm"), lead = null, tail = null;
    if (k === "@s") { main.appendChild(el("span", "cdwv", L.s)); return cdRowEl(k, L.s, cdIco(part === "g" ? "up" : part === "c" ? "target" : "link"), main, null); }
    var tpl = (CDW.row && CDW.row[k]) || (k.indexOf("t:") === 0 ? XW.tip.table[k.slice(2)] : ioTpl(k)); if (typeof tpl !== "string") { main.appendChild(el("span", "cdwv", L.s)); return cdRowEl(k, L.s, cdIco("target"), main, null); }
    if (k === "op") { var rw0 = CDRWOF[tok.op] || "r"; lead = cdRw(rw0); main.appendChild(el("span", "cdch", ""));                    /* a table op: its R or W, the model, the place */
      main.lastChild.setAttribute("data-ch", "class"); main.lastChild.appendChild(xSvg("doc", 13, EX.col.kind.schema)); main.lastChild.appendChild(xWrap(el("span", "cdwn"), tok.m || "")); return cdRowEl(k, L.s, lead, main, tok.at); }
    if ((tpl.match(/\{(\w+)\}/g) || []).filter(function (x) { return !/^\{(at|cat|src)\}$/.test(x); }).length) tpl = tpl.replace(/[,;]?\s*\b(?:at|from)\s*\{(at|cat|src)\}/g, "{$1}").replace(/\s*\(\{(at|cat|src)\}\)/g, "{$1}");
    var leadSt = !!CDST[k], pill = null;
    tpl.split(/(\{\w+\})/).forEach(function (seg) { var m = /^\{(\w+)\}$/.exec(seg);
      if (!m) { var w = seg.replace(/^[\s,;:·—-]+|[\s,;:·—-]+$/g, ""); if (w && !leadSt) main.appendChild(el("span", "cdwd", w)); return; }
      var nm = m[1], v = tok[nm]; if (v == null || v === "") return; var ty = nm === "v" ? CDV[k] || "text" : CDTT[nm] || "text";
      if (ty === "at") { tail = tail || String(v); return; } if (ty === "ln") { tail = tail || "line " + v; return; }
      if (ty === "stl") { var sl = String(v).match(/\b[1-5]\d\d\b/g) || []; if (sl.length) { sl.filter(function (x, i, a0) { return a0.indexOf(x) === i; }).forEach(function (x) { main.appendChild(cdStatusPill(x)); }); return; } }
      if (ty === "st") { var p0 = cdStatusPill(v); if (leadSt && !pill) pill = p0; else main.appendChild(p0); return; }
      cdVal(main, ty, v); });
    if (!tail && tok.at && !/\{at\}/.test(ioTpl(k))) tail = String(tok.at);
    if (!tail) Object.keys(tok).forEach(function (nm) { var ty = nm === "v" ? CDV[k] : CDTT[nm]; if (ty === "at" && !tail && tok[nm]) tail = String(tok[nm]); if (nm === "ln" && !tail && tok.ln != null) tail = "line " + tok.ln; });   /* a place the short words leave out is still the quiet end */
    if (tail && CDSEEN.some(function (t0) { return t0.indexOf(tail) >= 0; })) tail = null;            /* the identity lines hold it already */
    lead = pill || cdIco(CDLEAD[k] || (part === "g" ? "up" : part === "c" ? "target" : "link"));
    if (!main.childNodes.length && !pill) main.appendChild(el("span", "cdwv", L.s));
    return cdRowEl(k, L.s, lead, main, tail); }
  /* a table chip is one function's touch: its "in {fn}" and its "{op} {class}" are one row — the function, its R or W, the place */
  function cdPair(P, acc) { if (!P.L) return; var fnL = P.L.b.filter(function (l) { return l.k === "inFn" || l.k === "inFnCond"; }), opL = P.L.c.filter(function (l) { return l.k === "op"; });
    if (!fnL.length || !opL.length) return; var fn = fnL[0].t.fn, e = acc.by[fn]; if (!e) { e = acc.by[fn] = { k: "@fnops", n: fn, ops: [], s: "" }; acc.order.push(e); }
    opL.forEach(function (l) { e.ops.push({ rw: CDRWOF[l.t.op] || "r", at: l.t.at }); }); e.s += fnL[0].s + opL.map(function (l) { return l.s; }).join("");
    P.L.b = P.L.b.filter(function (l) { return fnL.indexOf(l) < 0; }); P.L.c = P.L.c.filter(function (l) { return opL.indexOf(l) < 0; }); }
  function cdPaired(P, acc) { P.L.c = acc.order.concat(P.L.c); ["b", "c", "g"].forEach(function (p) { P[p] = P.L[p].map(function (l) { return l.s; }); }); return P; }
  /* lines that are one fact in several: the tables a function touches, a raise and what catches it, a call and where it is made */
  function cdMerge(Ls) { var out = [], i = 0;
    while (i < Ls.length) { var q = Ls[i], n = Ls[i + 1];
      if (/^op_(read|add|update|delete)$|^opTables$/.test(q.k)) { var items = [], ss = [], j = i;
        while (j < Ls.length && /^op_(read|add|update|delete)$|^opTables$/.test(Ls[j].k)) { var x = Ls[j], op = x.k === "opTables" ? x.t.op : x.k.slice(3), rw = CDRWOF[op] || "w"; ss.push(x.s);
          String(x.t.v).split(/,\s+|\s+and\s+/).forEach(function (nm) { if (nm) items.push({ n: nm, rw: rw }); }); j++; }
        out.push({ k: "@tables", items: items, s: ss.join("") }); i = j; continue; }
      if (q.k === "calledBy" && n && n.k === "calledAt") { out.push({ k: "calledBy", t: Object.assign({}, q.t, { at: n.t.at }), s: q.s + n.s }); i += 2; continue; }
      if (/^(rzCaught|rzTo|rzLoose|x\.uncaught)$/.test(q.k)) { var r = { k: "@raise", q: q, s: q.s, t: Object.assign({}, q.t) }, j2 = i + 1;
        while (j2 < Ls.length && /^(rzWhen|causeMsg)$/.test(Ls[j2].k)) { r.t[Ls[j2].k] = Ls[j2].t.v; r.s += Ls[j2].s; j2++; } out.push(r); i = j2; continue; }
      if (q.k === "causeIf" && n && n.k === "causeMsg") { out.push({ k: "causeIf", t: Object.assign({}, q.t, { msg: n.t.v }), s: q.s + n.s }); i += 2; continue; }
      out.push(q); i++; }
    return out; }
  function cdRowsFor(Ls, part) { return cdMerge(Ls).map(function (L) { var r = cdRowFrom(L, part); r._L = L; return r; }); }
  function cdRowFrom(L, part) { return (function () {
    if (L.k === "@tables") { var main = el("span", "cdwm"), by = {}, ord = []; L.items.forEach(function (it) { if (!by[it.n]) { by[it.n] = []; ord.push(it.n); } if (by[it.n].indexOf(it.rw) < 0) by[it.n].push(it.rw); });
      ord.slice(0, 5).forEach(function (nm) { var ch = cdChTbl(nm, null); by[nm].sort().forEach(function (rw) { ch.appendChild(cdRw(rw)); }); main.appendChild(ch); }); L.items = ord.map(function (nm) { return { n: nm }; });
      if (ord.length > 5) main.appendChild(el("span", "cdwd", "+" + (ord.length - 5))); return cdRowEl("@tables", L.s, null, main, null); }
    if (L.k === "@fnops" || L.k === "@tblops") { var fo = L.k === "@fnops", lead3 = fo ? cdChFn(L.n) : cdChTbl(L.n), main3 = el("span", "cdwm"), seen = {}; L.ops.forEach(function (o) { var rw = CDRWOF[o.rw] || o.rw; if (!seen[rw]) { seen[rw] = 1; main3.appendChild(cdRw(rw)); } });
      return cdRowEl(L.k, L.s, lead3, main3, L.ops[0] && L.ops[0].at ? L.ops[0].at + (L.ops.length > 1 ? " +" + (L.ops.length - 1) : "") : null); }
    if (L.k === "@tick") { var main4 = el("span", "cdwm"); main4.appendChild(el("span", "cdwd", L.op)); return cdRowEl(L.k, L.s, cdIco("model", EX.col.opc.write), main4, L.at); }
    if (L.k === "@raise") { var q = L.q, t = L.t, main2 = el("span", "cdwm"), lead = q.t.st != null ? cdStatusPill(q.t.st) : q.k === "x.uncaught" ? cdStatusPill(500) : cdIco("alert", "var(--cd-red)");
      main2.appendChild(cdChCls(q.t.cls || "")); var say = q.t.v || t.causeMsg; if (say && String(say).length <= 34) main2.appendChild(el("span", "cdq", "\u201c" + say + "\u201d")); return cdRowEl("@raise", L.s, lead, main2, q.t.at || null); }
    return cdRowOf(L, part); })(); }
  /* one part: its first rows, the rest hidden and counted */
  function cdPart(p, Ls, strs, used, drop) { var g = el("span", "io"), i = el("i", null, IOW.parts[p]), rows = [], hid = 0, shown = 0;
    g.setAttribute("data-part", p); i.setAttribute("data-shared", "1"); g.appendChild(i);
    var all = Ls ? cdRowsFor(Ls, p) : (strs || []).map(function (s0) { return cdRowOf({ k: "@s", s: s0 }, p); });
    /* a row the card says elsewhere stays, hidden; the rest show up to the cap and the count of what is left */
    var live = all.filter(function (r) { return !(r._L && drop(r._L)); }), cap = Math.min(CDMAX[p], Math.max(0, CDMAXALL - used.n)); if (live.length - cap === 1) cap = live.length;
    all.forEach(function (r) { var isDup = live.indexOf(r) < 0; if (isDup) { r.hidden = true; r.className += " cdhid cdsaid"; } else { if (shown >= cap) { r.hidden = true; r.className += " cdhid"; hid++; } shown++; } g.appendChild(r); });
    used.n += Math.min(live.length, cap);
    if (hid) { var m = el("div", "cdw cdmore"), n = el("span", "cdfp", fill(CDU.more.many, { n: hid })); n.setAttribute("data-unit", "more"); n.setAttribute("data-n", String(hid)); n.setAttribute("data-extra", "{}"); n.setAttribute("aria-label", cdPl("more", hid));
      m.appendChild(n); g.appendChild(m); }
    if (!live.length) g.hidden = true;                                       /* a part that only holds lines the card says elsewhere is not drawn — its rows stay, hidden, with their sentences */
    return all.length ? g : null; }
  /* the three parts, in the form the page's hovers option picks (MS.ipo): rows, or one sentence */
  function cdDetail(P, drop) { var box = el("div", "cdd"), ps = ["b", "c", "g"].filter(function (p) { return (P[p] || []).length; }), used = { n: 0 }; drop = drop || function () { return false; };
    if (!ps.length) return null;
    if (MS.ipo === "sent") { box.appendChild(el("span", "ln iosent", ps.map(function (p) { return P[p].filter(function (s0, i) { return !(P.L && P.L[p] && drop(P.L[p][i])); }).join("; "); }).join(IOW.arrow))); return box; }
    ps.forEach(function (p) { var g = cdPart(p, P.L && P.L[p], P[p], used, drop); if (g) box.appendChild(g); });
    if (!box.childNodes.length) return null; if (![].some.call(box.children, function (c) { return !c.hidden; })) box.hidden = true; return box; }

  /* ══ the facts of each kind of card: F = { glyph, name, kind, ident[], chips[], count, marks[], joins[], foot } ══ */
  function cdBase(S0) { return { name: S0.P.name || (S0.c || {}).n || "", kind: S0.P.kind || "", ident: [], chips: [], count: null, marks: [], joins: [], foot: S0.foot, countIcon: "layers" }; }
  var CDSPEC = {
    table: function (S0) { var c = S0.c, it = S0.it, L = cdLook("table"), F = cdBase(S0), ec = c.ec || "var(--muted)", fns = {};
      F.glyph = XPART.table("icon", c, it, L, 16).firstChild; F.name = S0.P.name || c.n;
      F.ident = [cdLine("entity", "entity", c.ent || W.unknown, ec, cdLift(ec)), cdLine("class", "doc", c.model || W.unknown, EX.col.kind.schema), cdLine("file", "file", c.file || W.unknown)];
      if (it.role) F.chips = [cdPill(xRoleName("table", it.role), xChanCol("table", c, it), L)];
      F.count = cdCount(c.cols.length + (c.nmore || 0), "fields", c.cols.length > 0, null, xKindCol("table", c), L); F.countIcon = "table"; F.marks = cdMarks(xStrip("table", c, it, L));
      (it.o.ops || []).forEach(function (q) { if (q[2]) fns[q[2]] = 1; }); F.joins = [{ end: "function", want: S0.joinOwn || Object.keys(fns) }]; return F; },
    fn: function (S0) { var c = S0.c, it = S0.it, o = it.o, L = cdLook("fn"), F = cdBase(S0), via = c.nokey ? XW.face.noKey : o.h ? XW.face.handler : o.lv != null ? fill(XW.face.level, { i: o.lv, name: o.via }) : o.by ? fill(XW.face.calledBy, { name: xT(o.by[0]), at: xT(o.by[1]) }) : null;
      F.glyph = XPART.fn("icon", c, it, L, 16).firstChild; if (c.ent) F.ident.push(cdLine("entity", "entity", c.ent, cdEntCol(c.ent), cdLift(cdEntCol(c.ent))));
      if (c.file || c.at) F.ident.push(cdLine("file", "file", c.at || c.file));
      var site = S0.X && S0.X.io ? cdTok(S0.X.io, "calledAt", "at") || cdTok(S0.X.io, "underCall", "at") : null;
      F.ident.push(cdLine("via", "link", via || CDW.noCaller, null, null, site)); if (o.by) F.joins.push({ end: "caller", want: [xFnName(xT(o.by[0]))] });
      var role = EN.role[it.role] ? xRoleName("fn", it.role) : null; if (role) F.chips = [cdPill(role, EN.role[it.role].col, L)];
      F.count = cdCount(c.lines, "lines", c.lines != null, null, xKindCol("fn", c), L); F.countIcon = "doc"; F.marks = cdMarks(xStrip("fn", c, it, L)); return F; },
    schema: function (S0) { var c = S0.c, it = S0.it, o = it.o, L = cdLook("schema"), F = cdBase(S0);
      F.glyph = XPART.schema("icon", c, it, L, 16).firstChild; if (c.ent) F.ident.push(cdLine("entity", "entity", c.ent, c.ec, cdLift(c.ec)));
      var par = S0.X && S0.X.io ? cdTok(S0.X.io, "x.inside", "v") : o.parent;                      /* a chip names the schema it sits directly in (its own record); the bench, the one its block names */
      if (par) F.ident.push(cdLine("via", "link", fill(XW.face.inside, { name: par })));
      F.ident.push(cdLine("file", "file", c.file || c.at || W.unknown)); if (par) F.joins.push({ end: "parent", want: [par] });
      if (it.role) F.chips = [cdPill(xRoleName("schema", it.role), xChanCol("schema", c, it), L)];
      F.count = cdCount(c.cols.length, "fields", c.known !== false && c.cols.length > 0, null, xKindCol("schema", c), L); F.countIcon = "table"; F.marks = cdMarks(xStrip("schema", c, it, L)); return F; },
    field: function (S0) { var c = S0.c, F = cdBase(S0), nm = S0.P.name, f = (c.cols || []).filter(function (x) { return x[0] === nm; })[0], L = cdLook("schema"), tc = f ? XSQ[f[2]] || XSQ.other : XSQ.other;
      F.glyph = xSvg(tc.sym, 16, tc.col); F.ident.push(cdLine("parent", "schema", fill(IOW.l.fieldOf, { v: c.n }), EX.col.kind.schema)); F.joins.push({ end: "schema", want: [c.n] });
      if (f) { F.ident.push(cdLine("type", "doc", f[1] || W.unknown)); F.chips = [cdPill(f[4] ? CDW.required : CDW.optional, f[4] ? EX.col.opc.gate : EX.col.opc.pure, L)]; if (f[5]) F.ident.push(cdLine("rule", "shield", f[5])); }
      var mk = el("i", "sq e-symbol t-" + tc.key); mk.style.setProperty("--fc", tc.col); mk.appendChild(xSvg(tc.sym, 11, "currentColor")); mk.setAttribute("data-mk", "field"); mk.setAttribute("data-mv", tc.word);
      var st = el("div"); st.appendChild(mk); F.marks = cdMarks(st); return F; },
    end: function (S0) { var c = S0.c, it = S0.it, L = cdLook("end"), F = cdBase(S0), st = parseInt(String(S0.P.name), 10);
      F.glyph = c ? XPART.end("icon", c, it, L, 16).firstChild : cdChipGlyph(S0.t, (EN.kind[String(S0.ik).slice(4)] || {}).icon, "var(--cd-muted)");
      if (c) { F.ident.push(cdLine("stage", "target", c.sg)); if (c.at) F.ident.push(cdLine("file", "file", c.at)); if (c.via) F.ident.push(cdLine("via", "link", c.via));
        F.chips = [cdStatusPill(c.st)]; F.count = cdCount(c.paths.length, "ways", true, null, xStatusCol(c.st), L); F.countIcon = "path"; F.marks = cdMarks(xStrip("end", c, it, L)); if (c.at) F.joins.push({ end: "raiser", want: [String(c.at).split("/").pop()] }); }
      else { F.ident.push(cdLine("kind", "target", S0.P.kind || W.unknown)); if (!isNaN(st)) F.chips = [cdStatusPill(st)]; }
      return F; },
    test: function (S0) { var c = S0.c, it = S0.it, o = it.o, L = cdLook("test"), F = cdBase(S0), E = xTestEnds(it), here = o.here.map(function (i) { return c.calls[i]; });
      F.glyph = XPART.test("icon", c, it, L, 16).firstChild; F.name = c.cid; F.ident.push(cdLine("name", "doc", c.n)); F.ident.push(cdLine("file", "file", (c.file || W.unknown) + (c.line != null ? ":" + c.line : "")));
      var hs = {}; here.forEach(function (q) { q[5].forEach(function (h) { hs[h] = 1; }); }); if (Object.keys(hs).length) F.ident.push(cdLine("sends", "up", Object.keys(hs).join(" · ")));
      F.chips = [cdPill(c.state === "pass" ? XW.face.pass : XW.face.fail, c.state === "pass" ? EX.col.opc.read : "var(--alert)", L)].concat(it.role ? [cdPill(xRoleName("test", it.role), xChanCol("test", c, it), L)] : []);
      E.proves.concat(E.fits).forEach(function (s) { F.chips.push(cdStatusPill(s)); }); F.joins.push({ end: "ending", want: E.proves.concat(E.fits).map(String) });
      F.count = cdCount(c.calls.length, "requests", true, null, EX.col.opc.call, L); F.countIcon = "endpoint"; F.marks = cdMarks(xStrip("test", c, it, L)); return F; },
    gate: function (S0) { var c = S0.c, it = S0.it, o = it.o, L = cdLook("gate"), F = cdBase(S0), ef = xGateEff(it), host = o.fn != null ? xFnName(xT(o.fn)) : o.place || null;
      F.glyph = (XPART.gate("icon", c, it, L, 16) || el("span")).firstChild || cdSvg("shield", EX.col.opc.gate, 16);
      if (host) F.ident.push(cdLine("host", "function", host, EX.col.kind["function"])); var lv = o.gl && XF.gdl.vals[o.gl]; if (lv) F.ident.push(cdLine("level", "target", lv.name, null, null, S0.X && S0.X.io ? cdTok(S0.X.io, "inCall", "at") : null));
      if (o.at != null) F.ident.push(cdLine("file", "file", xT(o.at))); if (host) F.joins.push({ end: "host", want: [host] });
      if (!F.ident.length && S0.X && S0.X.io) { var pm = cdTok(S0.X.io, "param", "v"); if (pm) F.ident.push(cdLine("input", "doc", pm)); }   /* a framework rule: the input it checks */
      F.chips = [cdPill(xRoleName("gate", it.role), EX.col.opc.gate, L)]; ef.sts.forEach(function (s) { F.chips.push(cdStatusPill(s)); }); if (!ef.sts.length && ef.word) F.chips.push(cdPill(ef.word, EX.col.opc.pure, L));
      if (ef.sts.length) F.joins.push({ end: "ending", want: ef.sts.map(String) });
      F.count = cdCount(o.tests.length, "tests", !EX.absent.test, null, EX.col.opc.gate, L); F.countIcon = "test"; F.marks = cdMarks(xStrip("gate", c, it, L)); return F; },
    hook: function (S0) { var c = S0.c, it = S0.it, o = it.o, L = cdLook("hook"), F = cdBase(S0), sent = (o.send || []).map(function (s) { return s[0] + " " + s[1]; });
      F.glyph = XPART.hook("icon", c, it, L, 16).firstChild; if (c.file) F.ident.push(cdLine("file", "file", c.file)); if (c.fkind) F.ident.push(cdLine("kind", "hook", XW.face[c.fkind] || c.fkind, EX.col.kind.hook));
      sent.forEach(function (s) { F.ident.push(cdLine("sends", "up", s, EX.col.kind.endpoint)); }); if (sent.length) F.joins.push({ end: "endpoint", want: (o.send || []).map(function (s) { return s[1]; }) });
      if (it.role) F.chips = [cdPill(xRoleName("hook", it.role), EX.col.hrole[it.role] || "var(--muted)", L)];
      F.count = o.react.length ? cdCount(o.react.filter(function (x) { return x[2]; }).length, "answered", true, null, EX.col.kind.hook, L) : null; F.countIcon = "target"; F.marks = cdMarks(xStrip("hook", c, it, L)); return F; },
    inf: function (S0) { var c = S0.c, it = S0.it, L = cdLook("inf"), F = cdBase(S0), col = EN.life[c.dies] || "var(--muted)";
      F.glyph = XPART.inf("icon", c, it, L, 16).firstChild; F.ident.push(cdLine("kind", xInfIco(c), xRoleName("inf", c.ik), xKindCol("inf", c)));
      if (c.by || c.set) { F.ident.push(cdLine("set", "link", [c.by, c.set].filter(Boolean).join(" · "))); if (c.by) F.joins.push({ end: "setter", want: [c.by] }); } else F.ident.push(cdLine("set", "link", XW.tip.inf.inNone));
      F.chips = [cdPill(xLife(c.dies), col, L)]; F.count = cdCount(it.o.reads.length, "reads", !it.syn, null, col, L); F.countIcon = "show"; F.marks = cdMarks(xStrip("inf", c, it, L)); return F; },
    /* the kinds the bench has no block for: their glyph is the chip's own, their facts the generator's lines */
    mw: function (S0) { var X = S0.X, F = cdBase(S0), at = cdTok(X.io, "mwAt", "at") || cdTok(X.io, "mwLib", "at"), o = cdTok(X.io, "order"), ends = String(cdTok(X.io, "mwEnds", "v") || "").match(/\b[1-5]\d\d\b/g) || [];
      F.glyph = cdChipGlyph(S0.t, "middleware", "var(--cd-muted)"); F.ident.push(cdLine("file", "file", at || W.unknown));
      ends.filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (st) { F.chips.push(cdStatusPill(st)); }); if (ends.length) F.joins.push({ end: "ending", want: ends });
      if (o) { F.count = cdCount(o.n, "order", true, { of: o.of }, "var(--cd-muted)"); F.countIcon = "layers"; } return F; },
    sec: function (S0) { var X = S0.X, F = cdBase(S0), ik = S0.ik, st = cdTok(X.io, "setting");
      F.glyph = cdChipGlyph(S0.t, ik === "cors" ? "globe" : "key", "var(--cd-muted)");
      if (ik === "secmark") { var home = X.mk ? BLK[MO.fam[X.mk[1]]] : null; F.ident.push(cdLine("row", home ? markEl(MO.fam[X.mk[1]]) : "layers", home ? home.name : W.unknown)); if (home) F.joins.push({ end: "row", want: [home.name] });
        F.count = X.mk ? cdCount(X.mk[2], "items", true, null, "var(--cd-muted)") : null; F.countIcon = "layers"; }
      else if (ik === "cors") { F.ident.push(cdLine("setting", "cog", st ? st.v : W.unknown)); F.count = cdCount(X.con, "origins", X.con != null, null, "var(--cd-muted)"); F.countIcon = "globe"; }
      else { var rd = (X.io.c || []).filter(function (q) { return q[0] === "secRead"; }); F.ident.push(cdLine("setting", "cog", S0.P.name)); F.count = cdCount(rd.length, "reads", true, null, "var(--cd-muted)"); F.countIcon = "show"; }
      return F; },
    client: function (S0) { var X = S0.X, F = cdBase(S0), ik = S0.ik, K = EX.col.kind, at = cdTok(X.io, "scrIn", "at") || cdTok(X.io, "clCmp", "at") || cdTok(X.io, "cacheAt", "at"), inFn = cdTok(X.io, "inFn", "fn"),
        file = S0.key && S0.key.indexOf("fe:") === 0 ? S0.key.slice(3).split("#")[0] : null, sts = (X.rs || String(cdTok(X.io, "clCmp", "v") || "").match(/\b[1-5]\d\d\b/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
      F.glyph = cdChipGlyph(S0.t, CDICON[ik], K.hook); if (at || file) F.ident.push(cdLine("file", "file", at || file));
      if (inFn) { F.ident.push(cdLine("in", "function", inFn, K["function"])); F.joins.push({ end: "function", want: [inFn] }); }
      if (ik === "orch" && X.ox) { if (X.ox.scr) { F.ident.push(cdLine("usedBy", "screen", X.ox.scr, K.screen)); F.joins.push({ end: "screen", want: [X.ox.scr] }); }
        (X.ox.to || []).forEach(function (h) { F.ident.push(cdLine("calls", "hook", h, K.hook)); F.joins.push({ end: "hook", want: [h] }); });
        F.count = cdCount((X.ox.send || []).length, "calls", true, null, K.hook); F.countIcon = "hook"; }
      if (ik === "screen") { (X.uses || []).forEach(function (h) { F.ident.push(cdLine("calls", "hook", h, K.hook)); F.joins.push({ end: "hook", want: [h] }); }); F.count = cdCount((X.uses || []).length, "calls", true, null, K.hook); F.countIcon = "hook"; }
      if (ik === "cache") { if (S0.key) F.ident.push(cdLine("hook", "hook", S0.key.split("#").pop(), K.hook)); var rk = cdTok(X.io, "refreshKey", "v"); if (rk) F.ident.push(cdLine("key", "layers", rk));
        F.count = cdCount((X.rf || []).length, "reads", true, null, K.hook); F.countIcon = "show"; (X.rf || []).forEach(function (q) { F.joins.push({ end: "read", want: [q[1]] }); }); }
      if (ik === "hook") { var hr = ((SK.keys[S0.key] || [])[1] || []).filter(function (x) { return x[0] === "hrole"; })[0]; if (hr) F.chips.push(cdPill(xRoleName("hook", hr[1]), EX.col.hrole[hr[1]] || "var(--muted)", cdLook("hook"))); }   /* a hook the catalogue has no entry for: its role, as the station's key carries it */
      sts.slice(0, 6).forEach(function (st) { F.chips.push(cdStatusPill(st)); });
      if ((ik === "reason" || ik === "rest") && X.rx) { F.count = cdCount(X.rx.length, "endings", true, null, K.hook); F.countIcon = "target"; }
      return F; },
    lane: function (S0) { var ln = S0.ln, F = cdBase(S0), col = EN.life[{ req: "with the answer", srv: "with the server process" }[ln.lt] || "unknown"] || "var(--muted)";
      F.glyph = cdChipGlyph(S0.t, "layers", "var(--cd-muted)"); F.ident.push(cdLine("set", "target", fill(C2.il.set, { mom: S0.mom })));
      F.chips = [cdPill((TL[ln.lt] || TL.unk).name, col, cdLook("inf"))]; F.count = cdCount(ln.ms.length, "values", true, null, col, cdLook("inf")); F.countIcon = "layers"; return F; },
    step: function (S0) { var io = S0.X.io, op = cdTok(io, "opw", "op"), at = cdTok(io, "opw", "at"), fn = cdTok(io, "inFn", "fn") || cdTok(io, "inFnCond", "fn"), F = cdBase(S0), col = EX.col.opc.write;
      F.glyph = cdChipGlyph(S0.t, "model", col); if (fn) { F.ident.push(cdLine("host", "function", fn, EX.col.kind["function"])); F.joins.push({ end: "function", want: [fn] }); } if (at) F.ident.push(cdLine("file", "file", at));
      if (op) F.chips = [cdPill(op, col, cdLook("table"))]; var rc = S0.X.rc; if (rc) F.chips.push(cdStatusPill(rc[3])); return F; },
    other: function (S0) { var F = cdBase(S0); F.glyph = cdChipGlyph(S0.t, CDICON[S0.ik] || "info", "var(--cd-muted)"); return F; }
  };

  /* ══ the subject: what the pointer is on → its card kind, its bench binding, its three parts ══ */
  function cdFoot(t) { if (t.getAttribute("data-exk")) return t.classList.contains("open") ? CDW.foot.close : CDW.foot.open;
    if (t.hasAttribute("data-secmk")) return CDW.foot.go; return t.hasAttribute("data-key") ? CDW.foot.lit : null; }
  /* the generator's line keys a card says elsewhere — its head, identity lines or pills hold the fact — so its row is not drawn: it stays on the card, hidden, with its sentence */
  function cdDup(S0) { var dup = { markGo: 1 };                                    /* the footer says what a click does */
    if (S0.c && S0.ck === "fn" && S0.c.at) dup.defAt = 1;                              /* the identity line holds where it is defined */
    if (S0.c && S0.ck === "fn" && S0.it && (S0.it.o.h || S0.it.o.lv != null || S0.it.o.by)) { dup.calledAt = 1; dup.underCall = 1; dup.depth = 1; dup.depth1 = 1; dup.calledBy = 1; }   /* the identity line holds who calls it, how deep, and where */
    if (S0.ck === "client") dup.scrIn = 1;                                             /* the identity line holds the file */
    if (S0.ck === "test") dup.tname = 1;                                               /* the identity lines hold the test's name and its file */
    if (S0.ck === "inf" && S0.c && (S0.c.by || S0.c.set)) dup.setBy = 1;               /* the identity line holds who sets it and where */
    if (S0.ck === "hook" && S0.it && (S0.it.o.send || []).length) dup.fetchAt = 1;     /* the identity line holds what it sends */
    if (S0.ck === "gate" && S0.it && S0.it.o.gl && XF.gdl.vals[S0.it.o.gl]) dup.inCall = 1;   /* the level line holds the call it sits in, and where */
    if (S0.ck === "inf") dup.lasts = 1;                                                /* the pill holds how long it lives */
    if (S0.ck === "mw") dup.order = 1;                                                 /* the pill holds its place in the run order */
    if (S0.ck === "step") dup.opw = 1;                                                 /* the pill holds what it does, the identity lines where */
    if (S0.ck === "schema" && S0.c) dup["x.inside"] = 1;                               /* the identity line names the schema it sits in */
    if (S0.ck === "field") { dup.fieldOf = 1; dup.ann = 1; dup.req = 1; }              /* the identity lines hold its schema and its type, the pill whether it is required */
    if (S0.ck === "gate" && S0.it && (S0.it.o.fn != null || S0.it.o.place)) dup.hostIn = 1;   /* the identity line holds the function it runs in */
    return dup; }
  /* the bench's block has no chip under the pointer: its facts are the generator's lines for that element on its own endpoint — the same lines the chips of BY MOMENT carry — merged,
     and, for a table, what only the table knows; with none to be found, the block's own sentences */
  function cdBenchP(k, c, it, P0) { var r = BYID[it.ep], recs = []; if (!r || !r.mo || !c) return P0;
    r.mo.el.forEach(function (e) { var X = e[7] || {}; if (!X.io) return; var ik = X.io.h[1];
      if (k === "end") { if (ik === "end:" + c.kd && parseInt(String(X.io.h[0]), 10) === c.st) recs.push(X); return; }
      if (!c.key) return; var ks = e[2].map(function (i) { return MO.keys[i]; }); if (ks.indexOf(c.key) < 0) return; var M = CDIK[ik]; if (M && M[1] === k) recs.push(X); });
    if (k === "end" && recs.length > 1) { var by = recs.filter(function (X) { return c.at && cdAts(X.io).some(function (a) { return String(c.at).slice(-a.length) === a; }); }); recs = by.length === 1 ? by : []; }
    if (!recs.length) return P0;
    var L = { b: [], c: [], g: [] }, seen = {}, S1 = { ck: k, c: c, it: it };
    var ac = { order: [], by: {} };
    recs.forEach(function (X) { var Pi = ioParts(Object.assign({}, X, { mk: null }), null); if (k === "table") cdPair(Pi, ac); ["b", "c", "g"].forEach(function (p) { Pi.L[p].forEach(function (l) { if (!seen[p + l.s]) { seen[p + l.s] = 1; L[p].push(l); } }); }); });
    L.c = ac.order.concat(L.c); (P0.G || []).forEach(function (l) { L.g.push(l); });
    return { name: P0.name, kind: P0.kind, head: P0.head, n: "", L: L, dup: cdDup(S1), b: L.b.map(function (l) { return l.s; }), c: L.c.map(function (l) { return l.s; }), g: L.g.map(function (l) { return l.s; }) }; }
  function cdBare(t) { var ks = keysOf(t), nm = ks.length ? elName(ks[0]) : t.textContent.replace(/\s+/g, " ").trim(); if (!nm) return null;
    return { t: t, ik: null, key: ks[0] || null, ck: "other", bk: null, c: null, it: null, X: {}, P: { name: nm, kind: ks.length ? elKind(ks[0]) : "", b: [], c: [], g: [], n: "" }, foot: cdFoot(t), bare: true }; }
  function cdChip(t) { var X = t._x || {}; if (!X.io) return cdBare(t); var ik = X.io.h[1], K = keysOf(t)[0] || null, M = ik.indexOf("end:") === 0 ? ["end", "end"] : CDIK[ik] || ["other", null];
    if (ik === "built") { var pre = K ? K.split(":")[0] : ""; M = pre === "table" ? ["table", "table"] : pre === "schema" ? ["schema", "schema"] : ["fn", "fn"]; }
    var B = M[1] === "end" ? cdEndBind(X, ik) : M[1] ? cdBind(M[1], K || (M[1] === "fn" ? "fnname:" + X.io.h[0] : null), ik === "login" && K ? [S.open + "|login:" + K.replace(/^fn:/, "")] : null) : {}, S0 = { t: t, ik: ik, X: X, key: K, ck: M[0], bk: M[1], c: B.c || null, it: B.it || null, amb: B.amb };
    if (M[1] && !S0.c && M[0] !== "end") S0.ck = ik === "hook" ? "client" : "other";                                            /* a kind the bench has a block for, but no entry for this one: the facts the chip itself holds */
    if (S0.ck === "table" && S0.bk === "table") { var fnn = cdTok(X.io, "inFn", "fn"); S0.joinOwn = fnn ? [fnn] : []; }   /* a table chip is one function's touch: that function is the other end it names */
    S0.dup = cdDup(S0); S0.P = ioParts(Object.assign({}, X, { mk: null }), t);   /* a mark's row is its identity line */ if (S0.ck === "table" && S0.bk === "table") { var ac = { order: [], by: {} }; cdPair(S0.P, ac); cdPaired(S0.P, ac); } S0.foot = cdFoot(t); return S0; }
  function cdNode(t) { var d = cdDx(t); if (!d) return null; var tb = d.K.indexOf("table:") === 0, bk = tb ? "table" : "fn", B = cdBind(bk, d.K);
    var S0 = { t: t, ik: bk, key: d.K, ck: B.c ? bk : "other", bk: bk, c: B.c || null, it: B.it || null, X: {}, foot: cdFoot(t) };
    S0.P = { name: kName(d.K), kind: elKind(d.K), b: [], c: d.lines, g: [], n: "", L: { b: [], c: d.L, g: [] } }; S0.joinOwn = d.ends; return S0; }
  function cdBlock(t) { var k = t.getAttribute("data-exk"), id = t.getAttribute("data-exid"), ep = t.getAttribute("data-exep"), r = BYID[ep], e = ((r && r.ex[k]) || []).filter(function (x) { return x[0] === id; })[0]; if (!e) return null;
    var it = { k: k, id: id, role: e[1], ep: ep, o: e[2] }; return { t: t, ik: null, key: (EX.cat[id] || {}).key || null, ck: k, bk: k, c: EX.cat[id], it: it, X: {}, P: cdBenchP(k, EX.cat[id], it, xTipParts(k, it)), foot: cdFoot(t), bench: true }; }
  function cdJourney(t) { var J = t._jy; if (!J) return null; var P = jyParts(J), B = cdBind("test", "case:" + J.c);
    P.name = J.c; P.kind = ioKind("journey"); var S0 = { t: t, ik: "journey", key: "case:" + J.c, ck: B.c ? "test" : "other", bk: "test", c: B.c || null, it: B.it || null, X: {}, P: P, foot: cdFoot(t) }; return S0; }
  /* the lanes: an in-flight value's fold of values */
  function cdLane(t) { var ln = t._ln, r = BYID[S.open]; if (!ln || !r) return null; var M = r.mo;
    var P = { name: ilName(M, ln), kind: ioKind("inflight"), b: [], c: [fill(C2.il.members, { n: ln.ms.length, v: ln.ms.map(function (m) { return M.el[m[0]][3]; }).join(", ") })], g: ln.un.length ? [fill(C2.il.also, { v: ln.un.join(", ") })] : [], n: "" };
    return { t: t, ik: "inflight", key: null, ck: "lane", bk: null, c: null, it: null, X: {}, P: P, ln: ln, mom: moName(r, M.sp[ln.s0]),
      foot: t.getAttribute("aria-expanded") === "true" ? C2.il.close : fill(C2.il.open, { n: ln.ms.length }) }; }
  function cdDx(t) { var w0 = t.closest(".mdx"), Z0 = w0 && w0._dx, s0 = t.getAttribute("data-side"), i0 = +t.getAttribute("data-i"), r0 = BYID[S.open], K0 = keysOf(t)[0]; if (!Z0 || !r0 || !K0) return null;
    var ls0 = Z0.L.filter(function (q) { return q[s0] === i0; }), X0d = r0.mo.dx, lines = [], L = [], ends = [];
    ls0.forEach(function (q) { var o0 = MO.keys[s0 === "f" ? X0d.t[q.t] : X0d.f[q.f]], nm = kName(o0), sent = nm + ": " + q.ops.map(function (o) { return fill(C2.dx.op, { op: C2.dx[o[0]], at: o[2], mom: moName(r0, r0.mo.sp[o[1]]) }); }).join(" \u00b7 ");
      lines.push(sent); ends.push(nm); L.push({ k: s0 === "f" ? "@tblops" : "@fnops", n: nm, ops: q.ops.map(function (o) { return { rw: o[0], at: o[2] }; }), s: sent }); });
    if (s0 === "f") Z0.K.filter(function (o) { return o.q[0] === i0; }).forEach(function (o) { var sent = fill(C2.dx.tick, { op: o.q[2], at: o.q[4], mom: moName(r0, r0.mo.sp[o.q[3]]) }); lines.push(sent); L.push({ k: "@tick", op: o.q[2], at: o.q[4], s: sent }); });
    return { K: K0, lines: lines, L: L, ends: ends }; }

  /* ══ the guard: the four rules, checked on the card as it is made ══ */
  function cdGuard(root, F) { var is = [], txt = function (n) { return n.textContent.replace(/\s+/g, " ").trim(); }, foot = root.querySelector(".cdfoot");
    var shared = 0; [].forEach.call(root.querySelectorAll("[data-shared]"), function (n) { if (n.closest("[hidden]")) return; var s = txt(n); shared += s.length; if (s.length > 24) is.push("p1.1 label “" + s.slice(0, 30) + "” is longer than a short label"); });
    var all = txt(root).length - (foot ? txt(foot).length : 0); if (shared * 2 > all && root.querySelector(".cdd")) is.push("p1.1 the shared labels are more than half of the card");   /* a card that is only a name and its kind has no facts to repeat or to differ */
    if (foot && txt(foot).length > 48) is.push("p1.1 the footer is longer than a short line");
    var whole = txt(root); CDPLAIN.forEach(function (p) { if (whole.indexOf(p) >= 0) is.push("p1.1 a kind's plain line stands on the card: " + p.slice(0, 40)); });
    var own = root.cloneNode(true); [].forEach.call(own.querySelectorAll("[data-page], .cdfoot"), function (n) { n.remove(); }); var tw = document.createTreeWalker(own, NodeFilter.SHOW_TEXT), tn, words = []; while ((tn = tw.nextNode())) words.push(tn.nodeValue);   /* the words of each part, a space between parts: two parts never glue into one word */
    var m = CDSTOP.exec(words.join(" ")); if (m) is.push("p2.1 words about the page or the map: “" + m[0] + "”");
    (F.joins || []).forEach(function (j) { (j.want || []).forEach(function (w) { if (w != null && w !== "" && whole.indexOf(String(w)) < 0) is.push("p4.1 the " + j.end + " “" + String(w).slice(0, 40) + "” is not named"); }); });
    [].forEach.call(root.querySelectorAll("[data-unit]"), function (n) { var u = n.getAttribute("data-unit"), v = n.getAttribute("data-n"), ex = JSON.parse(n.getAttribute("data-extra") || "{}");
      if (!CDU[u]) is.push("p8.1 the unit \u201c" + u + "\u201d has no words");
      else if (v === "") { if (txt(n) !== W.unknown) is.push("p8.1 a count that is not recorded reads \u201c" + txt(n) + "\u201d"); }
      else if (txt(n) !== (u === "order" || u === "more" ? cdPl(u, +v, ex) : v) || n.getAttribute("aria-label") !== cdPl(u, +v, ex)) is.push("p8.1 the count \u201c" + txt(n) + "\u201d does not carry its unit\u2019s label"); });
    [].forEach.call(root.querySelectorAll(".mx"), function (n) { if (!n.getAttribute("aria-label")) is.push("p8.1 a mark that counts has no label: " + (n.getAttribute("data-mk") || "?")); });
    if (!root.querySelector(".cdh .cdg svg") || !root.querySelector(".cdh b")) is.push("form: no glyph or no name in the head");
    return is; }

  /* ══ ONE renderer ══ */
  function card(ck, S0) { var spec = CDSPEC[ck] || CDSPEC.other, F = spec(S0), root = el("div", "cdc"), h = el("div", "cdh"), g = el("span", "cdg");
    if (!F.ident.length && S0.X && S0.X.io) { var at = cdAts(S0.X.io)[0]; if (at) F.ident.push(cdLine("file", "file", at)); }               /* a kind with no host of its own: where it is, as its facts say */
    root.setAttribute("data-card", ck); if (S0.ik) root.setAttribute("data-ik", S0.ik); if (S0.c) root.setAttribute("data-bound", S0.bk); if (S0.bench) root.setAttribute("data-bench", S0.bk);
    g.appendChild(F.glyph); h.appendChild(g); h.appendChild(xWrap(el("b"), F.name));
    if (F.kind) { var v = el("span", "cdv", F.kind); v.setAttribute("data-shared", "1"); h.appendChild(v); } root.appendChild(h);
    F.ident.forEach(function (l) { root.appendChild(l); });
    F.chips = F.chips.filter(function (c) { return String(c.textContent).toLowerCase() !== String(F.kind).toLowerCase(); });   /* a pill that only repeats the kind at the right of the head says nothing new */
    var sep = el("div", "cdsep"); root.appendChild(sep);
    if (F.chips.length) { var r1 = el("div", "cdr"), i1 = el("span", "cdi"); r1.setAttribute("data-row", "channel"); i1.appendChild(cdSvg("role")); r1.appendChild(i1); F.chips.forEach(function (p) { r1.appendChild(p); }); root.appendChild(r1); }
    if (F.count || F.marks.length) { var r2 = el("div", "cdr"), i2 = el("span", "cdi"), mix = el("span", "cdmix"); r2.setAttribute("data-row", "count"); i2.appendChild(cdSvg(F.countIcon || "layers")); r2.appendChild(i2);
      if (F.count) r2.appendChild(F.count); F.marks.forEach(function (m) { mix.appendChild(m); }); if (F.marks.length) r2.appendChild(mix); root.appendChild(r2); }
    CDSEEN = F.ident.map(function (l) { return l.textContent; });
    var dups = S0.dup || S0.P.dup || {}, d = cdDetail(S0.P, function (L) { return !!dups[L.k] || (/^(chk|expr|if)$/.test(L.k) && L.t && L.t.v === F.name); }); if (d) root.appendChild(d);   /* a line the card says elsewhere (or the head's own condition) is kept hidden, not drawn */
    if (F.foot) { var ft = el("div", "cdfoot"), fi = el("span", "cdi"); fi.appendChild(cdSvg("info", "currentColor", 13)); ft.appendChild(fi); ft.appendChild(el("span", null, F.foot)); root.appendChild(ft); }
    var is = cdGuard(root, F); root.setAttribute("data-card-issues", String(is.length)); if (is.length) root.setAttribute("data-card-issue", is.join(" | "));
    if (is.length) CDLOG.push({ ck: ck, ik: S0.ik || null, name: F.name, issues: is });
    if (ck === "other") root.setAttribute(S0.ik && CDIK[S0.ik] || String(S0.ik).indexOf("end:") === 0 || !S0.ik ? "data-card-unbound" : "data-card-unknown-kind", S0.ik || "");   /* P3.2: a kind no table lists is kept, counted, and judged in a batch */
    return root.outerHTML; }

  /* the hover handler's one door: a card for what is hovered, or null (the page's other hovers stay as they are) */
  function cardFor(t) { var k = t.getAttribute("data-tip"), S0 = null;
    try { S0 = k === "mochip" ? cdChip(t) : k === "modxn" ? cdNode(t) : k === "exblk" ? cdBlock(t) : k === "mojy" ? cdJourney(t) : k === "moilf" ? cdLane(t) : null; } catch (e) { CDLOG.push({ ck: "error", ik: k, name: t.textContent.slice(0, 40), issues: ["error: " + e.message] }); if (window.console) console.warn("card:", e); return null; }
    return S0 ? card(S0.ck, S0) : null; }
  function hoverFor(t) { var h = cardFor(t); tip.classList.toggle("cd", !!h); return h || tipFor(t); }
  window.__allepCard = { make: card, spec: CDSPEC, subject: function (t) { var k = t.getAttribute("data-tip"); return k === "mochip" ? cdChip(t) : k === "modxn" ? cdNode(t) : k === "exblk" ? cdBlock(t) : k === "mojy" ? cdJourney(t) : k === "moilf" ? cdLane(t) : null; },
    guard: cdGuard, log: CDLOG, kinds: CDIK, words: CDW, stop: CDSTOP };
