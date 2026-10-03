  /* ══ D-071 · THE EXAMPLES BENCH (his L-23 · L-08 · L-13 · L-11). One column per kind of element, in his order, each an example
     drawn as a BLOCK in the endpoint lab's anatomy — its title lines (parts on a left and a right side), a strip of marks, a list that
     opens on a click, and ONE hover in BY MOMENT's before · checks · gives, in the form its hovers option picks (L-22) — with its
     controls BELOW it: the parts dragged between the lines or into "not drawn", their sizes, the colours, and a copy line. The table
     boots on his DATA line (D-027), the schema and the function on the lab's looks (my choice, dashed), the other five on my picks
     (dashed). D.ex is the generator's (_ae_bench.py): the lifted looks, the parts, the field kinds and one record per element; r.ex holds
     each endpoint's elements with their role there. Where BY MOMENT has words for a thing, the bench reads them: an in-flight value's
     kind (enc.fam.ifk) and lifetime (mo.x.c2.il), a gate's icon by kind (enc.fam.gdk, following its gate icons option) and where it
     decides (enc.fam.gdl), the race (mo.x.race), the reply (mo.io.k), the hover's three parts (mo.io.parts). This file is inlined
     by the generator inside the page's script, so it draws with the page's own helpers. ══ */
  var EX = D.ex, XW = W.ex, XKEY = "gabe:allep:bench:v3", XK = EX.kinds, XF = W.enc.fam, XIO = W.mo.io, XC2 = W.mo.x.c2;
  var XS = { lay: XW.opt.lay.pick, follow: XW.opt.follow.pick, col: {} };
  function xClone(o) { return JSON.parse(JSON.stringify(o)); }
  XK.forEach(function (k) { XS.col[k] = { scope: XW.opt.scope.pick, role: null, id: null, look: xClone(EX.look[k]), sel: null, open: false, width: XW.width.pick }; });
  try { window.localStorage.removeItem("gabe:allep:bench:v2"); } catch (e) {}   /* D-081: the looks he ruled are the defaults — a bench remembered before his ruling must not override them */
  try { var xr = JSON.parse(window.localStorage.getItem(XKEY) || "null");
    if (xr) { if (XW.opt.lay.opts[xr.lay]) XS.lay = xr.lay; if (XW.opt.follow.opts[xr.follow]) XS.follow = xr.follow;
      XK.forEach(function (k) { var c = (xr.col || {})[k]; if (!c) return; var st = XS.col[k];
        if (XW.opt.scope.opts[c.scope]) st.scope = c.scope; if (typeof c.id === "string") st.id = c.id; if (typeof c.role === "string") st.role = c.role; if (XW.width.opts[c.width]) st.width = c.width;
        if (c.look && Array.isArray(c.look.rows) && c.look.rows.length === 3) st.look = Object.assign(xClone(EX.look[k]), c.look); }); } } catch (e) {}
  function xSave() { try { var o = { lay: XS.lay, follow: XS.follow, col: {} }; XK.forEach(function (k) { var st = XS.col[k]; o.col[k] = { scope: st.scope, role: st.role, id: st.id, look: st.look, width: st.width }; });
    window.localStorage.setItem(XKEY, JSON.stringify(o)); } catch (e) {} }
  /* L-36 · the controls' icons (24px, drawn by the same rule as BY MOMENT's option squares): the columns' layouts, follow or stay, the
     elements shown, the steps, the element's widths (D-087: the default and three narrower), copy, back to the default */
  var XICON = { lay: { row: '<rect x="3" y="7" width="5" height="10" rx="1"/><rect x="10" y="7" width="5" height="10" rx="1"/><rect x="17" y="7" width="4" height="10" rx="1"/>',
        wrap: '<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/>',
        half: '<rect x="3" y="4" width="5" height="6" rx="1"/><rect x="10" y="4" width="5" height="6" rx="1"/><rect x="17" y="4" width="4" height="6" rx="1"/><rect x="3" y="14" width="5" height="6" rx="1"/><rect x="10" y="14" width="5" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>' },
      follow: { on: '<path d="M3 12h10"/><path d="M9 8l4 4-4 4"/><rect x="16" y="5" width="5" height="14" rx="1"/>', off: '<path d="M12 17v5"/><path d="M8 3h8"/><path d="M9 3v6l-3 4h12l-3-4V3"/>' },
      scope: { here: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>', all: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>' },
      width: { dynamic: '<path d="M3 4v16M21 4v16"/><rect x="5.5" y="8" width="13" height="8" rx="1"/>',   /* D-087: the default fills its column's walls, the other three narrow inside them */
        shorter: '<path d="M3 4v16M21 4v16"/><rect x="5.5" y="8" width="9" height="8" rx="1"/>',
        compact: '<path d="M3 4v16M21 4v16"/><rect x="5.5" y="8" width="6" height="8" rx="1"/>', tight: '<path d="M3 4v16M21 4v16"/><rect x="5.5" y="8" width="3.5" height="8" rx="1"/>' },
      prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
      reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>' };
  var XSTR = EX.str; function xT(i) { return i == null ? null : XSTR[i]; }   /* the generator's one table of repeated strings */
  function xFnRole(K) { var c = EX.cat[K]; if (c && c.role) return c.role; var s = SK.keys[K]; return s ? ((s[1] || []).filter(function (x) { return x[0] === "role"; })[0] || [])[1] : null; }
  /* every element's home: the first endpoint that has it, and the roles it has anywhere (the "every endpoint" scope's role filter); a
     function the walk gives no role wears the station's (N3-24: the members BY MOMENT places beyond the walk) */
  var XHOME = {}, XROLES = {}, XALL = {};
  XK.forEach(function (k) { XALL[k] = []; });
  ROWS.forEach(function (r) { XK.forEach(function (k) { ((r.ex || {})[k] || []).forEach(function (e) { if (k === "fn" && e[1] === "none") e[1] = xFnRole(e[0]) || "none";
    if (!XHOME[e[0]]) { XHOME[e[0]] = [r.id, e]; XALL[k].push(e[0]); } (XROLES[e[0]] = XROLES[e[0]] || {})[e[1]] = 1; }); }); });
  var XSQ = {}; EX.sq.forEach(function (x) { XSQ[x.key] = x; });
  var XPARTS = {}; XK.forEach(function (k) { XPARTS[k] = EX.parts[k] ? EX.parts[k].map(function (p) { return p.key; }) : Object.keys(XW.parts[k]); });
  var XGLYPH = { icon: 1, commit: 1 };                         /* S4-24: the parts that draw no text; every other part keeps the floor */
  /* a kind's own colour (the station's colour for that kind), read from the lifted tokens */
  function xKindCol(k, c) { var C = EX.col; return k === "table" ? C.kind.model : k === "schema" ? C.kind.schema : k === "fn" ? C.kind["function"] : k === "hook" ? C.kind.hook
    : k === "end" ? "var(--k-" + c.kd + ")" : k === "test" ? C.opc.read : k === "gate" ? C.opc.gate : C.kind.store; }
  function xStatusCol(st) { return EN.status[String(st || "").charAt(0)] || "var(--muted)"; }
  function xChanCol(k, c, it) { var C = EX.col; if (k === "table") return C.rw[it.role] || C.opc.pure; if (k === "schema") return (EN.dir[it.role.split("-")[0]] || {}).col || C.opc.pure;
    if (k === "fn") return C.role[it.role] || C.opc.pure; if (k === "end") return xStatusCol(c.st); if (k === "hook") return C.hrole[it.role] || C.opc.pure;
    if (k === "inf") return EN.life[c.dies] || "var(--muted)"; if (k === "test") return it.role === "act" ? C.opc.call : it.role === "service" ? C.kind["function"] : C.opc.pure; return C.opc.gate; }
  function xGlyphCol(k, c, it, L) { var ic = L.iconCol; return ic === "ink" ? "var(--ink)" : ic === "muted" ? "var(--muted)" : ic === "entity" ? (c.ec || "var(--muted)")
    : ic === "channel" ? xChanCol(k, c, it) : xKindCol(k, c); }
  function xSvg(name, z, col) { var s = svgOf(name); if (s && s.setAttribute) { s.setAttribute("width", z); s.setAttribute("height", z); s.style.color = col || ""; s.style.display = "block"; } return s; }
  function xStation(K, z, col) { var s = SK.keys[K], U = D.ulook.inline; if (!s || !s[0] || !SK.kinds[s[0]]) return null; var t = document.createElement("span");
    t.innerHTML = U[0] + z + '" height="' + z + U[1] + "currentColor" + U[2] + SK.kinds[s[0]].g + "</svg>"; t.firstChild.style.color = col; t.firstChild.style.display = "block"; return t.firstChild; }
  /* CR-26 (his F28): a name never cut — it breaks after its _ . / and at a camel hump (a <wbr>, so the text a probe or a copy reads is unchanged) */
  function xWrap(s, t) { String(t == null ? "" : t).split(/(?<=[_/])|(?<=\.)(?![a-z]{1,4}(?::\d+)?(?:$|[\s·]))|(?<=[a-z0-9])(?=[A-Z])/).forEach(function (p, i) { if (i) s.appendChild(document.createElement("wbr")); s.appendChild(document.createTextNode(p)); }); return s; }
  function xB(text, z) { var b = xWrap(el("b"), text == null ? XW.face.none : String(text)); b.style.fontSize = z + "px"; return b; }
  function xChip(text, col, z, cls) { var s = el("span", "bkrw"), i = el("i", "jdrw" + (cls ? " " + cls : ""), String(text)); i.style.setProperty("--rwc", col); i.style.fontSize = z + "px"; s.appendChild(i); return s; }
  function xMeta(icon, text, z, mode, cls) { if (mode === "off") return null; var m = el("span", "bkm" + (cls ? " " + cls : "")); m.style.fontSize = z + "px";
    if (mode !== "word" && icon) m.appendChild(typeof icon === "string" ? xSvg(icon, z, "var(--muted)") : icon); if (mode !== "icon" && text != null && text !== "") m.appendChild(xWrap(el("span"), text)); return m; }
  /* CR-25: every number names its unit — the badge says "17 fields", "53 lines", "0 tests" as the words form does */
  function xPl(u, n) { var U = XW.unit[u]; return fill(n === 1 ? U.one : U.many, { n: n }); }
  function xCount(n, z, mode, words, unit) { if (mode === "off" || n == null) return null; var c = el("span", "bkn" + (mode === "badge" ? " badge" : ""), mode === "badge" ? xPl(unit, n) : words); c.style.fontSize = z + "px"; return c; }
  function xShort(f) { return String(f || "").split("/").slice(-EX.dirs).join("/"); }
  /* a role's name: an in-flight value's kind in BY MOMENT's words (CR-27 · S4-17), a schema's side as BY MOMENT's body and reply (S4-27) */
  function xRoleName(k, r) { if (k === "end") return (W.kinds[r] || {}).name || r;
    if (k === "inf" && (XF.ifk.vals || {})[r]) return XF.ifk.vals[r].name;
    if (k === "schema") { var d = String(r).split("-"), base = d[0] === "in" ? XIO.k.body.name : XIO.k.reply.name; return d[1] ? fill(XW.face.inside, { name: base }) : base; }
    var R = (XW.roles[k] || {})[r]; return R && R.name ? R.name : r; }
  function xRolePlain(k, r) { if (k === "inf" && (XF.ifk.vals || {})[r]) return XF.ifk.vals[r].plain; if (k === "end") return (W.kinds[r] || {}).plain; return ((XW.roles[k] || {})[r] || {}).plain; }
  function xFnName(K) { return K ? String(K).split("::").pop() : null; }
  /* a function named inside another element: the function glyph, its name, its role word (L-09 · L-14 · D-052) */
  function xFnRef(K, z) { var m = el("span", "bkm exfn"); m.style.fontSize = z + "px"; if (!K) { m.appendChild(el("span", null, XW.face.noFn)); return m; }
    m.appendChild(xStation(K, z, EX.col.kind["function"]) || xSvg("function", z, EX.col.kind["function"])); m.appendChild(xWrap(el("span"), xFnName(K)));
    var r = xFnRole(K); if (r && EN.role[r]) { var i = el("i", "jdrw exmini", xRoleName("fn", r)); i.style.setProperty("--rwc", EN.role[r].col); m.appendChild(i); } return m; }
  /* a table named inside another element: the station's glyph for it (S4-31) */
  function xTblRef(t, z) { var m = el("span", "bkm exfn"); m.style.fontSize = z + "px"; m.appendChild(xStation("table:" + t, z, EX.col.kind.model) || xSvg("model", z, EX.col.kind.model)); m.appendChild(xWrap(el("span"), t)); return m; }
  function xStatusChip(st, z) { return xChip(st, xStatusCol(st), z); }
  function xTw(it) { return it.o && it.o.tw ? " · " + it.o.tw : ""; }
  /* an ending's words: a success names its reply; a limiter's ending names its limit (F26 · CR-16) */
  function xEndWords(c) { if (c.kd === "success") return fill(XW.face.answer, { v: XIO.k.reply.name, n: c.fields });
    return (c.lim ? fill(XW.face.lim, { name: c.lim[0], n: c.lim[1], w: c.lim[2] }) + " · " : "") + (c.say || c.code || (W.kinds[c.kd] || {}).name || XW.face.noWords); }
  /* a gate's icon, by its kind, as BY MOMENT draws it and following its gate icons option (S4-16): a field rule wears its rule's icon;
     the login check is its function (the station's glyph); "one gate icon" gives every gate the diamond; "no icon" none */
  function xGateIco(it, z, col) { var o = it.o;
    if (it.role === "rule") { var g = XF.rule.groups[EN.rule[o.rt] || "other"] || XF.rule.groups.other; return xSvg(g.icon, z, col); }
    if (MS.gic === "none") return null;
    if (MS.gic !== "one" && o.gk === "a" && o.fn != null) { var st = xStation(xT(o.fn), z, col); if (st) return st; }
    var x = XF.gdk.vals[MS.gic === "one" ? "one" : o.gk] || XF.gdk.vals.one; return xSvg(x.icon, z, col); }
  function xLife(d) { var t = (W.terms || {}).life || {}; return ((d === "with the answer" ? t.req : d === "with the server process" ? t.srv : t.unk) || {}).name || d; }   /* terms.life: one lifetime pair on every surface */
  function xInfIco(c) { return ((XF.ifk.vals || {})[c.ik] || {}).icon || (EN.ifk[c.ik] || {}).icon || W.marks.own.inf; }

  /* ── the parts, per kind: part → a node on the title line, or null when the element has nothing for it ── */
  var XPART = {
    table: function (p, c, it, L, z) { var md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg("model", z, xGlyphCol("table", c, it, L))); return s; }
      if (p === "rw") return xChip(it.role === "rw" ? "RW" : String(it.role).toUpperCase(), EX.col.rw[it.role], z);
      if (p === "name") return xB(c.n, z);
      if (p === "ent") { var e = el("span", "bke"); e.style.color = c.ec || "var(--muted)"; e.style.fontSize = z + "px"; if (md.ent !== "word") e.appendChild(xSvg("entity", z, c.ec));
        if (md.ent !== "icon") e.appendChild(el("span", null, c.ent || XW.face.none)); return e; }
      if (p === "count") { var n = c.cols.length + (c.nmore || 0); return xCount(n, z, md.count, xPl("fields", n), "fields"); }
      if (p === "model") return xMeta("doc", c.model, z, md.model);
      return null; },
    schema: function (p, c, it, L, z) { var md = L.mode || {}, d = it.role.split("-")[0];
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xStation(c.key, z, xGlyphCol("schema", c, it, L)) || xSvg("schema", z, xGlyphCol("schema", c, it, L))); return s; }
      if (p === "dir") return xChip((EN.dir[d] || {}).chip || d, (EN.dir[d] || {}).col, z, "sdir");
      if (p === "name") return xB(c.n, z);
      if (p === "ent") { if (!c.ent) return null; var e = el("span", "bke"); e.style.color = c.ec || "var(--muted)"; e.style.fontSize = z + "px"; if (md.ent !== "word") e.appendChild(xSvg("entity", z, c.ec));
        if (md.ent !== "icon") e.appendChild(el("span", null, c.ent)); return e; }
      if (p === "count") return xCount(c.cols.length, z, md.count, xPl("fields", c.cols.length), "fields");
      if (p === "via") return xMeta(it.o.parent ? "link" : (EN.dir[d] || {}).icon, it.o.parent ? fill(XW.face.inside, { name: it.o.parent }) : xRoleName("schema", d), z, md.via);
      return null; },
    fn: function (p, c, it, L, z) { var md = L.mode || {}, o = it.o;
      if (p === "icon") { var s = el("span", "bki"), gc = c.nokey ? "var(--muted)" : xGlyphCol("fn", c, it, L); s.appendChild((c.key && xStation(c.key, z, gc)) || xSvg("function", z, gc)); return s; }
      if (p === "role") return EN.role[it.role] ? xChip(xRoleName("fn", it.role), EN.role[it.role].col, z, "frole") : (c.nokey ? null : xChip(xRoleName("fn", "none"), "var(--muted)", z));
      if (p === "name") return xB(c.n + xTw(it), z);
      if (p === "commit") return c.commits ? el("i", "cdot excdot") : null;
      if (p === "file") return c.file ? xMeta("file", xShort(c.file), z, md.file || "both") : null;
      if (p === "count") { if (c.lines == null) return null; var q = xCount(c.lines, z, md.count, fill(XW.tip.fn.lines, { n: c.lines }), "lines"); if (q && c.god) q.classList.add("god"); return q; }
      if (p === "via") return c.nokey ? xMeta(null, XW.face.noKey, z, "word") : o.h ? xMeta("target", XW.face.handler, z, md.via) : o.lv != null ? xMeta("link", fill(XW.face.level, { i: o.lv, name: o.via }), z, md.via)
        : o.by ? xMeta("link", fill(XW.face.calledBy, { name: xT(o.by[0]), at: xT(o.by[1]) }), z, md.via) : null;
      return null; },
    end: function (p, c, it, L, z) { var md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg((EN.kind[c.kd] || {}).icon || XW.icons.end, z, xGlyphCol("end", c, it, L))); return s; }
      if (p === "status") return xStatusChip(c.st, z);
      if (p === "name") return xB(xEndWords(c) + xTw(it), z);
      if (p === "stage") { var t = el("span", "bkm exstg", c.sg); t.style.fontSize = z + "px"; return t; }
      if (p === "count") return xCount(c.paths.length, z, md.count, fill(XW.tip.end.ways, { n: c.paths.length }), "ways");
      if (p === "via") return c.at ? xMeta("file", xShort(c.at), z, md.via) : null;
      return null; },
    test: function (p, c, it, L, z) { var md = L.mode || {}, o = it.o, here = o.here.map(function (i) { return c.calls[i]; });
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg("test", z, xGlyphCol("test", c, it, L))); return s; }
      if (p === "cid") return xB(c.cid, z);
      if (p === "state") return xChip(c.state === "pass" ? XW.face.pass : XW.face.fail, c.state === "pass" ? EX.col.opc.read : "var(--alert)", z);
      /* N3-14: only an ending the test proves by what it reads — one it fits among others, or checks while setting up, is not proved */
      if (p === "proves") { var pr = xTestEnds(it).proves; if (!pr.length) return null; var w = el("span", "bkm exends"); pr.forEach(function (st) { w.appendChild(xStatusChip(st, z)); }); return w; }
      if (p === "role") return xChip(xRoleName("test", it.role), xChanCol("test", c, it), z);
      if (p === "name") { var n = xWrap(el("span", "bkm exname"), c.n); n.style.fontSize = z + "px"; return n; }
      if (p === "file") return xMeta("file", xShort(c.file) + ":" + c.line, z, md.file || "word");
      if (p === "sends") { var hs = {}; here.forEach(function (q) { q[5].forEach(function (h) { hs[h] = 1; }); }); var ks = Object.keys(hs); if (!ks.length) return null;
        var w2 = el("span", "bkm exhdr"); w2.style.fontSize = z + "px"; ks.forEach(function (h) { w2.appendChild(el("span", "exh", h)); }); return w2; }
      if (p === "asserts") { var a = xAsserts(here), a2 = a.st.concat(a.f); return a2.length ? xMeta(null, a2.join(" · "), z, "word", "exasr") : null; }
      return null; },
    gate: function (p, c, it, L, z) { var o = it.o, md = L.mode || {};
      if (p === "icon") { var g = xGateIco(it, z, xGlyphCol("gate", c, it, L)); if (!g) return null; var s = el("span", "bki"); s.appendChild(g); return s; }
      if (p === "role") return xChip(xRoleName("gate", it.role), EX.col.opc.gate, z);
      if (p === "cond") { var b = xB(c.n + xTw(it), z); b.classList.add("excond"); return b; }
      if (p === "fn") return o.fn == null && o.place ? xMeta(null, o.place, z, "word") : xFnRef(xT(o.fn), z);
      if (p === "level") { var lv = o.gl && XF.gdl.vals[o.gl]; return lv ? xMeta(null, lv.name, z, "word", "exlvl") : null; }
      if (p === "effect") { var ef = xGateEff(it); if (ef.sts.length) { var w = el("span", "bkm exends"); ef.sts.forEach(function (st) { w.appendChild(xStatusChip(st, z)); }); return w; }
        return ef.word ? xMeta(it.role === "branch" ? "target" : null, ef.word, z, "word") : null; }
      if (p === "via") return o.at != null ? xMeta("file", xShort(xT(o.at)), z, md.via) : null;
      if (p === "count") return xCount(o.tests.length, z, md.count, fill(XW.tip.gate.tests, { n: o.tests.length }), "tests");
      return null; },
    hook: function (p, c, it, L, z) { var o = it.o, md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xStation(c.key, z, xGlyphCol("hook", c, it, L)) || xSvg("hook", z, xGlyphCol("hook", c, it, L))); return s; }
      if (p === "role") return xChip(xRoleName("hook", it.role), EX.col.hrole[it.role] || "var(--muted)", z);
      if (p === "name") return xB(c.n + xTw(it), z);
      if (p === "fkind") return c.fkind ? xMeta(null, XW.face[c.fkind] || c.fkind, z, "word") : null;
      /* S4-31: the endpoint it sends to is a station element — its glyph, then its method and its path */
      if (p === "sends") { if (!o.send.length) return null; var m = el("span", "bkm exsend"); m.style.fontSize = z + "px";
        m.appendChild(xStation(o.epk, z, EX.col.kind.endpoint || "var(--muted)") || xSvg("up", z, "var(--muted)"));
        o.send.forEach(function (s2, i) { if (i) m.appendChild(el("span", "exs", "·")); m.appendChild(el("b", "exmth", s2[0])); m.appendChild(xWrap(el("span"), s2[1])); }); return m; }
      if (p === "file") return xMeta("file", xShort(c.file), z, md.file || "word");
      if (p === "count") { var n = o.react.filter(function (x) { return x[2]; }).length; return o.react.length ? xCount(n, z, md.count, fill(XW.tip.hook.out, { n: n }), "answered") : null; }
      return null; },
    inf: function (p, c, it, L, z) { var md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg(xInfIco(c), z, xGlyphCol("inf", c, it, L))); return s; }
      if (p === "life") return xChip(xLife(c.dies), EN.life[c.dies] || "var(--muted)", z);            /* the lifetime in the one pair BY MOMENT uses (terms.life) */
      if (p === "name") return xB(c.n + xTw(it), z);
      if (p === "ikind") return xMeta(null, xRoleName("inf", c.ik), z, "word");
      if (p === "set") { if (!c.by && !c.set) return null; var g0 = (c.byk || []).map(function (K) { return xStation(K, z, "var(--muted)"); }).filter(Boolean)[0];
        return xMeta(g0 || "link", [c.by, c.set].filter(Boolean).join(" · "), z, "both"); }
      if (p === "count") return xCount(it.o.reads.length, z, md.count, xPl("reads", it.o.reads.length), "reads");
      return null; }
  };
  /* a test's endings here, by how it reaches them (N3-14): proved by what it reads · fits among others · checked while setting up */
  function xTestEnds(it) { var P = { proves: [], fits: [], checks: [], service: [] }, seen = {};
    it.o.ends.forEach(function (e) { var ec = EX.cat[it.ep + "|" + e[0]]; if (!ec) return; var b = e[1] === "refs" ? "proves" : e[1] === "amb" ? "fits" : e[1] === "service" ? "service" : "checks";
      P[b + "N"] = (P[b + "N"] || 0) + 1; if (!seen[b + ec.st]) { seen[b + ec.st] = 1; P[b].push(ec.st); } }); return P; }
  /* what a test checks on the answer, as field names (never the code): its statuses, then each field its asserts read, once */
  function xAsserts(here) { var a = [], f = {};
    here.forEach(function (q) { if (q[6].length) a.push(q[6].length > 1 ? fill(XW.face.accepts, { v: q[6].join(" · ") }) : String(q[6][0]));
      q[7].forEach(function (x) { (String(x).match(/\['(\w+)'\]/g) || []).forEach(function (m) { f[m.slice(2, -2)] = 1; }); }); });
    return { st: a, f: Object.keys(f) }; }
  /* what a gate does when it decides: its endings' statuses, or a word (S4-01: a catch that passes the error on or swallows it says so) */
  function xGateEff(it) { var o = it.o, sts = [];
    if (o.effs) o.effs.forEach(function (x) { var ec = EX.cat[it.ep + "|" + x]; if (ec && sts.indexOf(ec.st) < 0) sts.push(ec.st); });
    else if (o.st != null) sts.push(o.st); else if (o.st0 != null) sts.push(o.st0);
    if (sts.length) return { sts: sts };
    if (it.role === "catch" && o.outcome && o.outcome !== "translate") return { sts: [], word: (XF.gef.vals[o.outcome === "swallow" ? "goes" : "pass"] || {}).name };
    if (o.answers && o.answers.length) return { sts: o.answers };
    if (it.role === "branch") return { sts: [], word: XW.face.returns };
    if (it.role === "switch" && o.impl && o.impl.length) return { sts: [], word: fill(XW.face.impl, { n: o.impl.length }) };
    return { sts: [] }; }

  /* ── the strip of marks: one per field (a table, a schema — the lab's field marks, lifted), per table touched (a function), per
     request (a test), per check on the way (an ending), per condition waited for (a gate), per ending answered (a hook), per read ── */
  function xMark(cls, col, sym, ch, title) { var q = el("i", "sq " + cls); q.style.setProperty("--fc", col); if (/e-symbol/.test(cls) && sym) q.appendChild(xSvg(sym, 11, "currentColor"));
    else if (/e-char/.test(cls)) q.textContent = ch || ""; if (title) q.setAttribute("data-w", title); return q; }
  function xField(f, L, c, it, extra) { var tc = XSQ[f[2]] || XSQ.other, pal = L.sqPal, col = pal === "mono" ? "var(--muted)" : pal === "entity" ? (c.ec || "var(--muted)")
      : pal === "channel" ? xChanCol(it.k, c, it) : tc.col;
    return xMark("e-" + L.sqEnc + " t-" + tc.key + (f[3] ? " opt" : "") + (extra ? " " + extra : ""), col, tc.sym, tc.ch, f[0]); }
  function xStrip(k, c, it, L) { var s = el("div", "sqs"), o = it.o, enc = L.sqEnc === "symbol" || L.sqEnc === "char" ? L.sqEnc : "colour", E = EX.col;
    function m(col, sym, ch, cls) { s.appendChild(xMark("e-" + enc + (cls ? " " + cls : ""), col, sym, ch)); }
    if (k === "table") { var fk = {}, uq = {}; (c.fks || []).forEach(function (f) { fk[f[0]] = 1; }); (c.uqs || []).forEach(function (u) { uq[u] = 1; });
      c.cols.forEach(function (f) { s.appendChild(xField(f, L, c, it, (fk[f[0]] ? "fk" : "") + (uq[f[0]] ? " uq" : ""))); });
      (c.more || []).forEach(function (f) { s.appendChild(xMark("e-colour exmore", "var(--muted)", null, null, f[0])); }); }
    else if (k === "schema") c.cols.forEach(function (f) { s.appendChild(xField([f[0], f[1], f[2], f[4] ? 0 : 1], L, c, it)); });
    else if (k === "fn") o.ops.forEach(function (q) { m(E.rw[q[0]] || E.opc.pure, "model", q[0] === "w" ? "W" : "R"); });
    else if (k === "end") { var P = BYID[c.ep].ex.paths[c.paths[0]]; (P ? P.ch : []).forEach(function (q) { if (q[0] === "step") return;
        m(q[0] === "gate" ? (q[2] ? xStatusCol(c.st) : E.opc.gate) : q[0] === "call" ? E.kind["function"] : q[0] === "branch" ? E.opc.call : q[0] === "switch" ? E.opc.pure : xStatusCol(c.st),
          q[0] === "gate" ? "shield" : q[0] === "call" ? "function" : q[0] === "branch" ? "merge" : q[0] === "switch" ? "role" : "target", q[0] === "call" ? "ƒ" : q[0].charAt(0).toUpperCase(),
          (q[0] === "gate" && q[2] === 0 ? "expass" : "") + (q[0] === "exit" ? " exhere" : "")); }); }
    else if (k === "test") { if (c.calls.length) c.calls.forEach(function (q, i) { m(q[2] === "act" ? E.opc.call : q[2] === "arrange-checked" ? E.opc.gate : E.opc.pure, "endpoint", q[0] ? q[0].charAt(0) : "?", o.here.indexOf(i) >= 0 ? "exhere" : ""); });
      else c.raises.forEach(function () { m(E.kind["function"], "function", "ƒ", "exhere"); }); }
    else if (k === "gate") { o.after.forEach(function () { m(E.opc.pure, "shield", "·", "expass"); }); m(E.opc.gate, "shield", "!", "exhere"); }
    else if (k === "hook") o.react.forEach(function (x) { m(xStatusCol(x[1]), "target", String(x[1]).charAt(0), x[2] ? "" : "exnob"); });
    else if (k === "inf") it.o.reads.forEach(function (x) { m(EN.life[c.dies] || "var(--muted)", x[2] === "middleware" ? "shield" : "function", "r"); });
    return s.childNodes.length ? s : null; }

  /* ── the list a click opens: every field, the ways through the code, the ordered chain a test runs through ── */
  function xRow(box, cells, cls) { var r = el("div", "exr" + (cls ? " " + cls : "")); cells.forEach(function (x) { if (x == null) return; r.appendChild(typeof x === "string" ? xWrap(el("span"), x) : x); }); box.appendChild(r); return r; }
  function xHead(box, t, n) { var h = el("div", "exlh", t); if (n != null) h.appendChild(el("span", "excnt", String(n))); box.appendChild(h); }
  /* CR-08 · CR-28: what a gate on a way CHECKS, in plain words (a limiter's limit, the body read, a check's meaning and host); the
     refusal it would give, and the code as written, come after it, quieter */
  function xGuardWord(st) { var v = XF.gdc.vals; return (v[String(st)] || v._other).name; }
  function xChk(q) { var k = q[7] || ["x"], t = k[0], C = XW.chain;
    if (t === "lim") return [fill(C.lim, { name: xT(k[1]), n: k[2], w: k[3] }), null];
    if (t === "mw") return [fill(C.mw, { v: xT(k[1]) }), null];
    if (t === "parse") return [C.parse[xT(k[1])] || C.parse._other, null];
    if (t === "scheme") return [fill(C.scheme, { header: xT(k[1]) }), xT(k[2])];
    if (t === "login") return [C.login, xT(k[2])];
    if (t === "body") return [fill(C.body, { v: xT(k[1]) || XW.face.theBody }), null];
    if (t === "guard") return [fill(C.guard, { what: xGuardWord(q[6]), fn: xT(k[1]) || XW.face.noFn }), xT(k[2])];
    if (t === "catch") return [fill(C.catch, { v: xT(k[1]) }), null];
    return [C.x, xT(q[5])]; }
  function xChkRow(box, q, cls) { var w = xChk(q), hit = q[2];
    xRow(box, [el("span", "exk", hit ? "✕" : "✓"), w[0], el("span", "exs", fill(hit ? XW.chain.fails : XW.chain["else"], { v: xT(q[1]) || String(q[6] || "") })),
      w[1] ? el("span", "exs exraw", fill(XW.tip.asWritten, { v: w[1] })) : null], "ex-gate" + (hit ? " exhit" : "") + (cls ? " " + cls : "")); }
  function xChainRows(box, P) { P.ch.forEach(function (q) { if (q[0] === "step") return xRow(box, [el("span", "exk", "·"), xT(q[1])], "exq");
      if (q[0] === "gate") return xChkRow(box, q);
      var tag = q[0] === "branch" ? (q[2] ? "→" : "·") : q[0] === "call" ? "ƒ" : q[0] === "switch" ? "⇄" : "■";
      xRow(box, [el("span", "exk", tag), q[0] === "call" && q[3] != null ? xFnRef(xT(q[3]), 12) : (xT(q[1]) || ""), q[5] != null ? el("span", "exs", xT(q[5])) : null,
        q[4] != null ? el("span", "exs", xT(q[4])) : null], "ex-" + q[0] + (q[2] ? " exhit" : "")); }); }
  function xTables(box, P) { P.tb.forEach(function (t) { xRow(box, [xChip(t[1] === "rw" ? "RW" : t[1].toUpperCase(), EX.col.rw[t[1]], 12), xTblRef(xT(t[0]), 12),
    t[1].indexOf("w") >= 0 ? el("span", "exs", t[2] ? XW.chain.saved : XW.chain.notSaved) : null]); }); }
  /* CR-29: what a function DOES, from its facts — the checks its own code makes (the refusal's words, then the code as written), the
     calls it makes (the handler's with the refusals they can lead to), the tables it touches, whether it commits */
  function xFnDoes(c, o) { var K = XW.tip.fn, out = [];
    if (c.nokey) return [XW.face.noKey];
    (o.chk || []).forEach(function (g) { out.push((xT(g[1]) ? fill(K.check, { st: g[0], v: xT(g[1]) }) : fill(K.checkRaw, { st: g[0] })) + (xT(g[2]) ? " · " + fill(XW.tip.asWritten, { v: xT(g[2]) }) : "")); });
    if ((o.calls || []).length) out.push(fill(K.calls, { v: o.calls.map(function (q) { var n = xFnName(xT(q[0])); return q[1] && q[1].length ? fill(K.callSt, { name: n, v: q[1].join(" · ") }) : n; }).join(" · ") }));
    o.ops.forEach(function (q) { out.push(fill(K.ops, { op: xRoleName("table", q[0]), tbl: q[1] })); });
    if (c.commits) out.push(K.commit);
    return out; }
  function xList(k, c, it) { var b = el("div", "bkfl exfl"), o = it.o, L = XW.list; b.setAttribute("data-tip", "exnone");
    if (k === "table") { xHead(b, L.fields); var fk = {}; (c.fks || []).forEach(function (f) { fk[f[0]] = f[1]; });
      c.cols.forEach(function (f) { xRow(b, [xMark("e-colour t-" + f[2], (XSQ[f[2]] || XSQ.other).col), f[0], el("span", "exs", f[1]), fk[f[0]] ? el("span", "exs", "→ " + fk[f[0]]) : null]); });
      if (c.more.length) { xHead(b, fill(L.more, { n: c.more.length })); c.more.forEach(function (f) { xRow(b, [xMark("e-colour exmore", "var(--muted)"), f[0], el("span", "exs", f[1])]); }); }
      if (o.ops.length) { xHead(b, L.ops); o.ops.forEach(function (q) { xRow(b, [el("span", "exk", q[0]), q[2] ? xFnRef(xKeyOf(q[2]), 12) : null, el("span", "exs", q[1]), q[3] && q[0] !== "read" ? el("span", "exs", L.saved) : null]); }); } }
    else if (k === "schema") { xHead(b, L.fields); c.cols.forEach(function (f) { xRow(b, [xMark("e-colour t-" + f[2], (XSQ[f[2]] || XSQ.other).col), f[0], el("span", "exs", f[1]), f[5] ? el("span", "exs", f[5]) : null]); }); }
    else if (k === "fn") { var dz = xFnDoes(c, o); if (dz.length) { xHead(b, L.does); dz.forEach(function (t) { xRow(b, [el("span", "exk", "·"), t]); }); }
      if (c.raises.length) { xHead(b, L.raises); c.raises.forEach(function (z, i) { var to = (o.rz || [])[i] || []; xRow(b, [el("span", "exk", "!"), z[0], el("span", "exs", z[1]), to.length ? xStatusChip(to.join("|"), 12) : null]); }); }
      if (o.ops.length) { xHead(b, L.tables); o.ops.forEach(function (q) { xRow(b, [xChip(q[0].toUpperCase(), EX.col.rw[q[0]], 12), xTblRef(q[1], 12)]); }); }
      if ((o.calls || []).length) { xHead(b, L.calls, o.calls.length); o.calls.forEach(function (q) { xRow(b, [el("span", "exk", "ƒ"), xFnRef(xT(q[0]), 12), q[1] && q[1].length ? xStatusChip(q[1].join("|"), 12) : null]); }); } }
    else if (k === "end") { var R = BYID[c.ep]; c.paths.forEach(function (pid, i) { xHead(b, c.paths.length > 1 ? fill(L.way, { i: i + 1 }) : L.paths); xChainRows(b, R.ex.paths[pid]); });
      xHead(b, L.answer); xRow(b, [c.media || XW.face.none, c.hd.length ? el("span", "exs", c.hd.map(function (h) { return h[0]; }).join(" · ")) : null]); }
    else if (k === "test") xTestChain(b, c, it);
    else if (k === "gate") { if (o.after.length) { xHead(b, L.after, o.after.length); o.after.forEach(function (a) { xRow(b, [el("span", "exk", "✓"), xT(a)]); }); }
      if (o.impl && o.impl.length) { xHead(b, L.impls, o.impl.length); o.impl.forEach(function (a) { xRow(b, [el("span", "exk", "⇄"), a]); }); }
      if (o.tests.length) { xHead(b, L.tests, o.tests.length); xRow(b, [o.tests.join(" · ")]); } }
    else if (k === "hook") { if (o.react.length) { xHead(b, L.reactions); o.react.forEach(function (x) { xRow(b, [xStatusChip(x[1], 12), x[2] ? (x[3] || XW.face.none) : el("span", "exs", L.noBranch), x[4] ? el("span", "exs", x[4]) : null]); }); }
      if (o.refresh.length) { xHead(b, L.refresh); o.refresh.forEach(function (x) { xRow(b, ["[" + x[0] + "]", el("span", "exs", x[1])]); }); }
      if (o.screens.length) { xHead(b, L.screens); xRow(b, [o.screens.join(" · ")]); } }
    else if (k === "inf") { xHead(b, L.reads, it.o.reads.length); it.o.reads.forEach(function (x) { xRow(b, [el("span", "exk", "·"), xT(x[1]), el("span", "exs", xT(x[0]))]); }); }
    return b; }
  /* a function named by its short name inside a table's operation: its key when the station holds one function of that name */
  function xKeyOf(nm) { var hit = Object.keys(EX.cat).filter(function (K) { return K.indexOf("fn:") === 0 && xFnName(K) === nm; }); return hit.length === 1 ? hit[0] : "fn:?::" + nm; }
  /* EX-3 (L-08): what a test runs through here, in order — its requests, then per way to the ending it proves: the checks it passes
     (inside calls too, N3-13), the branch it takes, the functions it runs, the tables it touches (saved or not), the in-flight values it
     meets, the ending. Every step wears a symbol, its count a badge of its own (S4-23) */
  function xTestChain(b, c, it) { var o = it.o, CH = XW.chain, R = BYID[it.ep], NK = XW.notKnown;
    xHead(b, XW.list.req); c.calls.forEach(function (q, i) { xRow(b, [el("span", "exk", String(i + 1)), q[1], el("span", "exs", xRoleName("test", q[2] === "act" ? "act" : q[2] === "arrange-checked" ? "check" : "arrange")),
      q[6].length ? xStatusChip(q[6].join("|"), 12) : null], o.here.indexOf(i) >= 0 ? "exhit" : ""); });
    if (!c.calls.length && c.raises.length) { xHead(b, CH.raise); c.raises.forEach(function (z) { xRow(b, [el("span", "exk", "!"), z[0] + " → " + z[1]]); });
      xRow(b, [fill(CH.service, { v: c.raises.map(function (z) { return z[0]; }).join(" · ") })], "exnote"); }
    xHead(b, CH.title);
    function sec(sym, word, n) { var r = xRow(b, [el("span", "exk", sym), word], "exsec"); if (n != null) r.appendChild(el("span", "excnt", String(n))); return r; }
    o.paths.forEach(function (pid, i) { var P = R.ex.paths[pid]; if (!P) return; if (o.paths.length > 1) xHead(b, fill(CH.which, { i: i + 1, n: o.paths.length }) + " · " + P.st);
      var gates = P.ch.filter(function (q) { return q[0] === "gate" && !q[2]; }), br = P.ch.filter(function (q) { return q[0] === "branch" && q[2]; });
      if (!c.calls.length) { P.ch.filter(function (q) { return q[0] === "gate" && q[2]; }).forEach(function (q) { xChkRow(b, q); }); return; }
      var q0 = c.calls[o.here[0]] || [];
      var rq = sec("⇢", CH.request); if (q0[1]) rq.appendChild(el("span", "exs", q0[1])); if (q0[5] && q0[5].length) rq.appendChild(el("span", "exs", q0[5].join(" · ")));
      sec("✓", CH.checks, gates.length); var gb = el("div", "exin"); gates.forEach(function (q) { xChkRow(gb, q); }); b.appendChild(gb);
      if (br.length) { sec("→", CH.branch, br.length); br.forEach(function (q) { xRow(b, [el("span", "exk", "→"), xT(q[1])], "exin"); }); }
      sec("ƒ", CH.fns, P.fn.length); var fr = el("div", "exr exin exwrap"); P.fn.forEach(function (i2) { fr.appendChild(xFnRef(xT(i2), 12)); }); b.appendChild(fr);
      sec("▤", CH.tables, P.tb.length); var tb = el("div", "exin"); xTables(tb, P); b.appendChild(tb);
      if (P.inf.length && R.ex.inf) { sec("~", CH.inf, P.inf.length); var inf = R.ex.inf; xRow(b, [P.inf.map(function (j) { var e = inf[j]; return e ? EX.cat[e[0]].n : ""; }).join(" · ")], "exin"); }
      var en = sec("■", CH.ending); en.appendChild(xStatusChip(P.st, 12)); });
    var nk = [NK.body]; if (!o.here.some(function (i) { return c.calls[i][5].length; }) && c.calls.length) nk.push(NK.fixture);
    o.ends.forEach(function (e) { var ec = EX.cat[it.ep + "|" + e[0]]; if (ec && ec.paths.length > 1) nk.push(fill(NK.which, { n: ec.paths.length, status: ec.st })); });
    if (c.calls.length > 1) nk.push(NK.step); nk.push(NK.loop);
    xHead(b, NK.title); nk.forEach(function (t) { xRow(b, [el("span", "exk", "?"), t], "exnk"); }); }

  /* ── ONE hover per block (L-02 · L-22): what comes before it, what it checks, what it gives — this element's own facts, in BY MOMENT's
     three parts and in the form its hovers option picks (S4-20: the page's own builder, ioHtml). A plain line first, the code as written
     last (CR-28) ── */
  function xEndIn(c) { var K = XW.tip.end, A = XW.tip.asWritten, pl;
    if (c.lim) pl = fill(K.inLim, { name: c.lim[0], n: c.lim[1], w: c.lim[2] });
    else if (c.ph === "middleware") pl = fill(K.inMw, { v: c.via || "" });
    else if (c.ph === "security") pl = fill(K.inScheme, { header: c.hdr || "" });
    else if (c.ph === "dependency") pl = K.inLogin;
    else if (c.ph === "body-parse") pl = K.inParse[c.code] || K.inParse._other;
    else if (c.kd === "validation") pl = fill(K.inBody, { v: c.sch || XW.face.theBody });
    else if (c.guard) pl = fill(K.inGuard, { what: xGuardWord(c.st), fn: c.guard[0] || XW.face.noFn });
    else if (String(c.via || "").indexOf("except ") === 0) pl = fill(K.inCatch, { v: String(c.via).slice(7) });
    else if (c.kd === "uncaught") pl = K.inUncaught;
    else pl = fill(K.inNone, { v: c.sg });
    var raw = c.guard ? c.guard[1] : c.pred || (c.ph === "security" || c.ph === "dependency" ? c.via : null);
    return [pl].concat(raw ? [fill(A, { v: raw })] : []); }
  function xTipBlock(k, it) { var c = EX.cat[it.id], o = it.o, T = XW.tip, K = T[k], A = T.asWritten, P = { b: [], c: [], g: [], n: "" }, ln = function (i, s) { if (s) P["bcg".charAt(i)].push(s); };
    P.head = (k === "test" ? c.cid + " · " + c.n : k === "end" ? c.st + " · " + xEndWords(c) : c.n) + xTw(it) + " · " + XW.kinds[k].name + " · " + xRoleName(k, it.role);
    if (k === "end") { xEndIn(c).forEach(function (s) { ln(0, s); });
      ln(1, c.at ? fill(c.via ? K.doVia : K.do, { at: c.at, v: c.via }) : K.doNone); ln(1, c.skip != null ? fill(K.skip, { v: c.skip }) : fill(K.ways, { n: c.paths.length }));
      ln(2, fill(K.out, { status: c.st, v: xEndWords(c) }));
      ln(2, c.decl == null ? null : c.decl ? K.decl : K.undecl); c.hd.forEach(function (h) { ln(2, fill(K.hdr, { v: h[0] })); });
      ln(2, c.tests.length ? fill(K.tests, { n: c.tests.length }) : K.noTests); }
    else if (k === "table") { var fns = {}; o.ops.forEach(function (q) { fns[q[2]] = 1; });
      ln(0, Object.keys(fns).length ? fill(K.in, { v: Object.keys(fns).join(" · ") }) : K.inNone);
      ln(1, o.ops.length ? fill(K.do, { v: o.ops.map(function (q) { return q[0] + " " + q[1]; }).join(" · ") }) : xRoleName("table", it.role));
      var w = o.ops.filter(function (q) { return q[0] !== "read"; }); ln(2, !w.length ? K.outRead : w.some(function (q) { return q[3]; }) ? K.out : K.outNot);
      if (o.rc) ln(2, fill(W.mo.x.race, { cols: o.rc[2].join(", "), cons: o.rc[0], at: o.rc[4], st: o.rc[3] }));            /* S4-21: BY MOMENT's race sentence (mo.x.race, the one key since the 1b merge) */
      c.drift.forEach(function (d) { ln(2, fill(K.drift, { v: d[0] + " " + d[1] })); }); if (c.writers) ln(2, fill(K.writers, { n: c.writers })); }
    else if (k === "schema") { ln(0, fill(K.in, { v: xRoleName("schema", it.role) + (o.parent ? " · " + fill(XW.face.inside, { name: o.parent }) : "") }));
      ln(1, fill(K.do, { n: c.cols.length, k: c.cols.filter(function (f) { return f[4]; }).length, w: c.cols.filter(function (f) { return f[5]; }).length }));
      if (o.c422) ln(1, fill(K.c422, { n: o.c422 })); if (c.extra) ln(2, fill(K.extra, { v: c.extra })); if (c.cons) ln(2, fill(K.cons, { n: c.cons })); }
    else if (k === "fn") { ln(0, c.nokey ? null : o.h ? K.inHandler : o.lv != null ? fill(K.in, { v: o.via }) : o.by ? fill(XW.face.calledBy, { name: xT(o.by[0]), at: xT(o.by[1]) }) : null);
      xFnDoes(c, o).forEach(function (s) { ln(1, s); });
      if (c.ret) ln(2, fill(K.out, { v: c.ret })); c.raises.forEach(function (z, i) { var to = (o.rz || [])[i] || []; ln(2, fill(K.raise, { cls: z[0], at: z[1], st: to.length ? fill(K.raiseTo, { v: to.join(" · ") }) : "" })); }); }
    else if (k === "test") { var hs = {}; o.here.forEach(function (i) { c.calls[i][5].forEach(function (h) { hs[h] = 1; }); });
      ln(0, c.calls.length ? (Object.keys(hs).length ? fill(K.in, { v: Object.keys(hs).join(" · ") }) : K.inNone) : null);
      ln(1, c.calls.length ? fill(K.do, { n: c.calls.length, v: xRoleName("test", it.role) }) : fill(K.doService, { v: c.raises.map(function (z) { return z[0]; }).join(" · ") }));
      var E = xTestEnds(it);
      if (E.proves.length) ln(2, fill(K.proves, { v: E.proves.join(" · ") }));
      if (E.fits.length) ln(2, fill(K.fits, { n: E.fitsN, v: E.fits.join(" · ") }));
      if (E.checks.length) ln(2, fill(it.role === "check" || it.role === "arrange" ? K.checksSetup : K.checksOnly, { v: E.checks.join(" · ") }));
      if (E.service.length) ln(2, fill(K.proves, { v: E.service.join(" · ") }));
      if (!E.proves.length && !E.fits.length && !E.checks.length && !E.service.length) ln(2, K.provesNone);
      var here = o.here.map(function (i) { return c.calls[i]; }), sts = [], raw = [], fl = xAsserts(here).f;
      here.forEach(function (q) { q[6].forEach(function (s) { if (sts.indexOf(s) < 0) sts.push(s); }); raw = raw.concat(q[7]); });
      var said = E.proves.concat(E.fits, E.checks, E.service).map(String);                 /* R-05: a status the lines above name is said once */
      sts = sts.filter(function (s) { return said.indexOf(String(s)) < 0; });
      if (sts.length) ln(2, fill(K.outSt, { v: sts.join(" · ") })); if (fl.length) ln(2, fill(K.outFields, { v: fl.join(" · ") }));
      if (raw.length) ln(2, fill(A, { v: raw.join(" · ") })); }
    else if (k === "gate") { ln(0, it.role === "login" ? K.inLogin : it.role === "catch" && o.types ? fill(K.inCatch, { v: o.types }) : fill(K.in, { v: c.n })); if (c.raw) ln(0, fill(A, { v: c.raw }));
      ln(1, o.fn != null ? fill(K.do, { name: xFnName(xT(o.fn)) }) : o.place ? fill(K.do, { name: o.place }) : K.doNone); if (o.at != null) ln(1, fill(K.at, { at: xT(o.at) }));
      if (o.after.length) ln(1, fill(K.after, { v: o.after.map(xT).join(" · ") }));
      var ef = xGateEff(it), eff = (o.effs || (o.eff ? [o.eff] : [])).map(function (x) { var ec = EX.cat[it.ep + "|" + x]; return ec ? ec.st + " · " + xEndWords(ec) : null; }).filter(Boolean);
      ln(2, eff.length ? fill(K.out, { v: eff.join("; ") }) : ef.sts.length ? fill(K.out, { v: ef.sts.join(" · ") }) : it.role === "branch" ? fill(K.branch, { v: o.ret || "" })
        : it.role === "switch" && o.impl && o.impl.length ? fill(K["switch"], { v: o.impl.join(" · ") }) : ef.word || K.outNone);
      if (o.tests.length) ln(2, fill(K.tests, { n: o.tests.length })); }
    else if (k === "hook") { ln(0, o.screens.length ? fill(K.in, { v: o.screens.join(" · ") }) : K.inNone); o.send.forEach(function (s) { ln(1, fill(K.do, { v: s[0] + " " + s[1] })); });
      o.refresh.forEach(function (x) { ln(1, fill(K.refresh, { v: "[" + x[0] + "]" })); }); var n = o.react.filter(function (x) { return x[2]; }).length; ln(2, n ? fill(K.out, { n: n }) : K.outNone); }
    else if (k === "inf") { ln(0, c.by || c.set ? fill(K.in, { name: c.by || "?", at: c.set || "?" }) : K.inNone); if (c.from) ln(0, fill(K.from, { k: c.from[0], v: c.from[1] }));
      ln(1, fill(K.do, { n: it.o.reads.length, v: it.o.reads.map(function (x) { return xT(x[1]); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(" · ") }));
      ln(2, c.dies === "with the answer" ? XC2.il.end : c.dies === "with the server process" ? XC2.il.keep : XC2.il.unk); }        /* BY MOMENT's lifetime words */
    return ioHtml(P); }

  /* ── one column: its title, the selector, the block, the controls under it, the copy line ── */
  function xList0(k) { var st = XS.col[k], r = BYID[S.open], here = (r && r.ex[k]) || [];
    if (st.scope === "here") return here.map(function (e) { return { k: k, id: e[0], role: e[1], ep: r.id, o: e[2] }; });
    return XALL[k].map(function (id) { var h = here.filter(function (e) { return e[0] === id; })[0], hm = XHOME[id];
      return h ? { k: k, id: id, role: h[1], ep: r.id, o: h[2] } : { k: k, id: id, role: hm[1][1], ep: hm[0], o: hm[1][2] }; }); }
  function xHasRole(k, it, role) { return XS.col[k].scope === "here" ? it.role === role : !!(XROLES[it.id] || {})[role]; }
  function xItems(k) { var st = XS.col[k], all = xList0(k); return st.role ? all.filter(function (it) { return xHasRole(k, it, st.role); }) : all; }
  function xCurrent(k) { var st = XS.col[k], items = xItems(k); if (!items.length) return null;
    var hit = items.filter(function (it) { return it.id === st.id; })[0]; if (hit) return hit;
    /* my pick of the first example: a test that proves its ending by what it checks, a table the endpoint writes */
    var pref = k === "test" ? (items.filter(function (it) { return it.role === "act" && it.o.ends.length && it.o.ends.every(function (e) { return e[1] === "refs"; }); })[0]
        || items.filter(function (it) { return it.role === "act"; })[0]) : k === "table" ? (items.filter(function (it) { return it.role === "rw"; })[0] || items.filter(function (it) { return it.role === "w"; })[0]) : null;
    return pref || items[0]; }
  function xName(it) { var c = EX.cat[it.id]; if (it.k === "end") return c.st + " · " + xEndWords(c) + xTw(it);
    if (it.k === "test") return c.cid + " · " + c.n; return c.n + xTw(it); }
  function xWhose(k) { return EX.parts[k] ? (k === "table" ? "his" : "lab") : "mine"; }
  /* L-36 · an option is an icon square (the page's own: `.opt`), its words in its label; the bench-level options keep BY MOMENT's hover (name · whose · what it does) */
  function xIco(path, z) { var i = document.createElementNS("http://www.w3.org/2000/svg", "svg"); i.setAttribute("viewBox", "0 0 24 24"); i.setAttribute("aria-hidden", "true"); i.innerHTML = path; if (z) { i.style.width = z + "px"; i.style.height = z + "px"; } return i; }
  function xOptBtn(group, v, R, cur, onPick, icon) { var b = el("button", "opt exo exi"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-xopt", group); b.setAttribute("data-v", v);
    b.setAttribute("aria-checked", cur === v ? "true" : "false"); b.setAttribute("aria-label", R.opts[v].name); b.setAttribute("data-tip", "exopt"); b.appendChild(xIco(icon));
    if (R.pick === v) b.setAttribute(R.ruled ? "data-ruled" : "data-pick", "true"); b.addEventListener("click", function () { onPick(v); }); return b; }
  /* a control that does something, its hover a verb and its object (L-36): `key` names it in the words (ex.act), `vars` fill its object */
  function xAct(cls, icon, key, vars, onClick) { var A = XW.act[key], obj = fill(A.obj, vars || {}), b = el("button", cls); b.type = "button"; b.setAttribute("aria-label", A.verb + " " + obj);
    b.setAttribute("data-tip", "exctl"); b.setAttribute("data-verb", A.verb); b.setAttribute("data-obj", obj); b.appendChild(xIco(icon)); if (onClick) b.addEventListener("click", onClick); return b; }
  /* a radio square whose hover is a verb and its object: the elements shown, the width */
  function xRadio(group, v, R, cur, icon, key, vars, onPick) { var b = xAct("opt exo exi", icon, key, vars, function () { onPick(v); }); b.setAttribute("role", "radio"); b.setAttribute("data-xopt", group); b.setAttribute("data-v", v);
    b.setAttribute("aria-checked", cur === v ? "true" : "false"); if (R.pick === v) b.setAttribute(R.ruled ? "data-ruled" : "data-pick", "true"); return b; }
  function xColIco(k) { return k === "end" ? XW.icons.end : k === "table" ? "model" : k === "schema" ? "schema" : k === "fn" ? "function" : k === "gate" ? XF.gdk.vals.one.icon : k === "inf" ? W.marks.own.inf : XW.icons[k]; }
  /* a role chip's glyph: the kind's own where the page already draws one (an ending's kind, a schema's side, an in-flight value's kind), else one by what the role is */
  var XROLEICO = { gate: { rule: "schema", login: "key", scheme: "key", own: "shield", down: "down", branch: "merge", "catch": "alert", "switch": "flag" },
    hook: { fetcher: "hook", streamer: "wave", store: "store", orchestrator: "merge" }, test: { service: "function" } };
  function xRoleIco(k, r) { if (k === "end") return (EN.kind[r] || {}).icon || XW.icons.end; if (k === "schema") return (EN.dir[String(r).split("-")[0]] || {}).icon || "schema";
    if (k === "inf") return ((XF.ifk.vals || {})[r] || {}).icon || (EN.ifk[r] || {}).icon || W.marks.own.inf; return ((XROLEICO[k] || {})[r]) || xColIco(k); }
  function xCol(k) { var st = XS.col[k], col = el("div", "excol"), whose = xWhose(k); col.setAttribute("data-k", k); col.setAttribute("data-w", st.width);
    var hd = el("div", "exhd"), t = el("h3"); t.appendChild(xSvg(xColIco(k), 16, xKindCol(k, { kd: "success" })));
    t.appendChild(el("span", null, XW.kinds[k].name)); hd.appendChild(t);
    var wm = el("span", "exwho", XW.whose[whose].name); wm.setAttribute("data-whose", whose); wm.setAttribute("data-tip", "exwho"); hd.appendChild(wm); col.appendChild(hd);
    if (EX.absent[k]) { col.appendChild(el("p", "exnone", W.absent + " · " + fill(W.absentWhy, { why: EX.absent[k] }))); return col; }   /* the arm is off: said, never a partial list */
    var redraw = function () { xSave(); renderEx(); writeOut(LAST.L, LAST.GS); };
    /* the controls at the top (L-36): icon squares — which elements (this endpoint · every endpoint), the width of the element drawn in the column (the default ·
       shorter · compact · most compact; D-087: the column's box never changes) — then the roles with their counts, then the element itself with a step before and one after; each one's meaning is its hover,
       a verb and its object */
    var sel = el("div", "exsel"), top = el("div", "extop"), sc = el("div", "opts exscope"), wd = el("div", "opts exwidth");
    sc.setAttribute("role", "radiogroup"); sc.setAttribute("aria-label", XW.opt.scope.label); wd.setAttribute("role", "radiogroup"); wd.setAttribute("aria-label", XW.width.label);
    Object.keys(XW.opt.scope.opts).forEach(function (v) { sc.appendChild(xRadio("scope", v, XW.opt.scope, st.scope, XICON.scope[v], v === "here" ? "scopeHere" : "scopeAll", null, function (nv) { st.scope = nv; st.role = null; redraw(); })); });
    Object.keys(XW.width.opts).forEach(function (v) { wd.appendChild(xRadio("width", v, XW.width, st.width, XICON.width[v], "width", { v: XW.width.opts[v].name }, function (nv) { st.width = nv; redraw(); })); });
    top.appendChild(sc); top.appendChild(wd); sel.appendChild(top);
    var all = xList0(k), roles = {}, order = [];
    all.forEach(function (it) { (st.scope === "here" ? [it.role] : Object.keys(XROLES[it.id] || {})).forEach(function (r) { if (!(r in roles)) { roles[r] = 0; order.push(r); } roles[r]++; }); });
    if (order.length > 1 || st.role) { var rc = el("div", "exroles"); var ab = el("button", "exrc", XW.ctl.all + " " + all.length); ab.type = "button"; ab.setAttribute("aria-pressed", st.role ? "false" : "true");
      ab.setAttribute("data-tip", "exrole"); ab.setAttribute("data-role", ""); ab.addEventListener("click", function () { st.role = null; redraw(); }); rc.appendChild(ab);
      order.forEach(function (r) { var b = el("button", "exrc"); b.type = "button"; b.setAttribute("data-role", r); b.setAttribute("aria-pressed", st.role === r ? "true" : "false"); b.setAttribute("data-tip", "exrole");
        b.appendChild(xSvg(xRoleIco(k, r), 13, "currentColor")); b.appendChild(document.createTextNode(xRoleName(k, r) + " " + roles[r])); b.addEventListener("click", function () { st.role = st.role === r ? null : r; redraw(); }); rc.appendChild(b); });
      sel.appendChild(rc); }
    var items = xItems(k), cur = xCurrent(k), pk = el("div", "expick");
    var prev = xAct("opt exo exi exstep", XICON.prev, "prev"), next = xAct("opt exo exi exstep", XICON.next, "next"), s = el("select", "exselect");
    s.setAttribute("aria-label", XW.ctl.pickEl);
    items.forEach(function (it) { var op = el("option", null, xName(it) + (st.scope === "all" ? " · " + it.ep : "")); op.value = it.id; if (cur && it.id === cur.id) op.selected = true; s.appendChild(op); });
    var go = function (d) { var i = items.map(function (x) { return x.id; }).indexOf(cur ? cur.id : null); var j = Math.max(0, Math.min(items.length - 1, i + d)); if (items[j]) { st.id = items[j].id; xSave(); renderEx(); } };
    prev.addEventListener("click", function () { go(-1); }); next.addEventListener("click", function () { go(1); });
    s.addEventListener("change", function () { st.id = s.value; xSave(); renderEx(); });
    pk.appendChild(s); pk.appendChild(prev); pk.appendChild(next); sel.appendChild(pk); col.appendChild(sel);
    if (!cur) { col.appendChild(el("p", "exnone", st.role ? XW.ctl.noneRole : XW.ctl.none)); return col; }
    if (cur.ep !== S.open) col.appendChild(el("p", "exon", fill(XW.ctl.on, { ep: cur.ep })));
    /* the block, in its look */
    var L = st.look, w = el("div", "exw form-block rail-" + L.railSide + " rwbox-" + L.rwBox + " cntbox-" + L.cntBox + (L.rwA < 50 ? " rw-thin" : "") + (L.sqShape === "square" ? " sqs-square" : "")
      + (L.sqUqMark === "corners" ? " uqm-corners uqc-" + L.sqUqAt : "") + (L.sqUqFlip ? " uqc-flip" : ""));
    w.style.setProperty("--rail-w", L.railW + "px"); w.style.setProperty("--rail-s", L.railStyle); w.style.setProperty("--rw-a", String(L.rwA)); w.style.setProperty("--cnt-a", String(L.cntA));
    w.style.setProperty("--sq", L.sqSize + "px"); w.style.setProperty("--sqg", L.sqGap + "px"); w.style.setProperty("--uq-len", String((L.sqUqLen || 40) / 100));
    w.style.setProperty("--uq-w", (L.sqUqW || 1.5) + "px"); w.style.setProperty("--uq-tip", ((L.sqUqW || 1.5) * (L.sqUqTip || 10) / 100) + "px");
    w.appendChild(xBlock(k, cur, L)); col.appendChild(w);
    col.appendChild(xCtl(k, cur)); return col; }
  function xBlock(k, it, L) { var c = EX.cat[it.id], blk = el("div", "blk rw-" + (k === "table" ? it.role : "x")), hd = el("div", "bkhd"), ti = el("div", "bkti");
    blk.style.setProperty("--ec", c.ec || xKindCol(k, c));
    L.rows.forEach(function (row) { var ln = el("div", "bkln"), A = el("div", "bkcol l"), B = el("div", "bkcol r");
      row.l.forEach(function (p) { var n = XPART[k](p, c, it, L, L.size[p] || 12); if (n) { n.setAttribute("data-part", p); A.appendChild(n); } });
      row.r.forEach(function (p) { var n = XPART[k](p, c, it, L, L.size[p] || 12); if (n) { n.setAttribute("data-part", p); B.appendChild(n); } });
      if (A.childNodes.length || B.childNodes.length) { ln.appendChild(A); ln.appendChild(B); ti.appendChild(ln); } });
    hd.appendChild(ti); var sq = xStrip(k, c, it, L); if (sq) hd.appendChild(sq); blk.appendChild(hd); blk.appendChild(xList(k, c, it));
    blk.setAttribute("data-tip", "exblk"); blk.setAttribute("data-exk", k); blk.setAttribute("data-exid", it.id); blk.setAttribute("data-exep", it.ep); if (c.key) blk.setAttribute("data-keys", c.key);
    blk.querySelectorAll("[data-tip]").forEach(function (n) { if (n !== blk && !n.closest(".exfl")) n.removeAttribute("data-tip"); });
    if (XS.col[k].open) blk.classList.add("open");
    blk.addEventListener("click", function (e) { if (e.target.closest(".exfl")) return; XS.col[k].open = !XS.col[k].open; blk.classList.toggle("open", XS.col[k].open); });
    return blk; }

  /* ── the controls under a block: parts (drag between the lines, or into not drawn) · size · colour, and the copy line ── */
  function xPartWord(k, p) { return (XW.parts[k][p] || {}).name || p; }
  function xPartPlain(k, p) { var lp = EX.parts[k] ? EX.parts[k].filter(function (x) { return x.key === p; })[0] : null; return lp ? fill(lp.note || "", { god: EX.god, dirs: EX.dirs }) : (XW.parts[k][p] || {}).plain; }
  function xPartIco(k, p) { var lp = EX.parts[k] ? EX.parts[k].filter(function (x) { return x.key === p; })[0] : null; return lp ? lp.ico : (p === "icon" ? xColIco(k) : p === "file" || p === "via" ? "file" : p === "count" ? "info" : p === "name" || p === "cond" ? "doc" : "role"); }
  function xMove(k, p, line, side, idx) { var L = XS.col[k].look; L.rows = L.rows.map(function (r) { return { l: r.l.filter(function (q) { return q !== p; }), r: r.r.filter(function (q) { return q !== p; }) }; });
    L.off = (L.off || []).filter(function (q) { return q !== p; });
    if (line === "off") L.off.push(p); else { var c = L.rows[line][side === "r" ? "r" : "l"]; c.splice(Math.max(0, Math.min(idx == null ? c.length : idx, c.length)), 0, p); }
    XS.col[k].sel = p; xSave(); renderEx(); writeOut(LAST.L, LAST.GS); }
  function xPartChip(k, p) { var b = el("button", "expc"), L = XS.col[k].look; b.type = "button"; b.draggable = true; b.setAttribute("data-part", p); b.setAttribute("data-tip", "expart");
    b.setAttribute("aria-pressed", XS.col[k].sel === p ? "true" : "false"); b.appendChild(xSvg(xPartIco(k, p), 13, "currentColor")); b.appendChild(el("span", null, xPartWord(k, p)));
    b.addEventListener("dragstart", function (e) { try { e.dataTransfer.setData("text/plain", k + "|" + p); e.dataTransfer.effectAllowed = "move"; } catch (x) {} b.classList.add("dragging"); });
    b.addEventListener("dragend", function () { b.classList.remove("dragging"); });
    b.addEventListener("click", function () { XS.col[k].sel = p; renderEx(); }); return b; }
  function xZone(k, line, side, parts, label) { var z = el("div", "dzone exz"); z.setAttribute("data-line", String(line)); z.setAttribute("data-side", side || ""); if (label) z.setAttribute("aria-label", label);
    parts.forEach(function (p) { z.appendChild(xPartChip(k, p)); });
    z.addEventListener("dragover", function (e) { e.preventDefault(); z.classList.add("over"); }); z.addEventListener("dragleave", function () { z.classList.remove("over"); });
    z.addEventListener("drop", function (e) { e.preventDefault(); z.classList.remove("over"); var d = (e.dataTransfer.getData("text/plain") || "").split("|"); if (d[0] !== k || !d[1]) return;
      var at = [].slice.call(z.querySelectorAll(".expc")).filter(function (c) { var r = c.getBoundingClientRect(); return e.clientX > r.left + r.width / 2 || e.clientY > r.bottom; }).length;
      xMove(k, d[1], line, side, at); }); return z; }
  function xRange(label, v, lo, hi, step, on) { var r = el("label", "exrg"); r.appendChild(el("span", "rl", label)); var i = el("input"); i.type = "range"; i.min = lo; i.max = hi; i.step = step || 1; i.value = v;
    var o = el("span", "exv", String(v)); i.addEventListener("input", function () { o.textContent = i.value; }); i.addEventListener("change", function () { on(+i.value); }); r.appendChild(i); r.appendChild(o); return r; }
  function xPick(label, v, vals, on, words) { var r = el("label", "exrg"); r.appendChild(el("span", "rl", label)); var s = el("select");
    vals.forEach(function (x) { var o = el("option", null, words && words[x] ? words[x] : x); o.value = x; if (x === v) o.selected = true; s.appendChild(o); });
    s.addEventListener("change", function () { on(s.value); }); r.appendChild(s); return r; }
  function xSet(k, f) { f(XS.col[k].look); xSave(); renderEx(); writeOut(LAST.L, LAST.GS); }
  /* the glyph colours a kind is offered: the table's in the lab's words (his DATA line says "model"), every other kind's in words of its own (S4-25) */
  function xIcol(k) { var o = {}; if (k === "table") Object.keys(EX.icol).forEach(function (x) { o[x] = EX.icol[x]; }); else Object.keys(XW.icol).forEach(function (x) { o[x] = XW.icol[x]; }); return o; }
  /* the smallest a part may be sized: a glyph to 9px; text to the floor (S4-24) — the table's parts to his own size where his line sets them lower */
  function xMin(k, p) { if (XGLYPH[p]) return 9; return k === "table" ? Math.min(EX.floor, EX.look.table.size[p] || EX.floor) : EX.floor; }
  /* L-36 · every control is always on the page — none stands behind a fold: the parts (drag between the lines, or into not drawn), their size, the colours, and
     under them the two buttons, back to the default and copy. The copy line is never shown; the button copies it whole. The part whose size is shown is the one
     last clicked, the first drawn one until a click */
  function xSelPart(k) { var st = XS.col[k], drawn = []; st.look.rows.forEach(function (r) { drawn = drawn.concat(r.l, r.r); });
    return st.sel && XPARTS[k].indexOf(st.sel) >= 0 ? st.sel : (drawn[0] || XPARTS[k][0]); }
  function xSec(title, cls) { var d = el("div", "exsec " + cls); d.appendChild(el("h4", "exsh", title)); return d; }
  function xCtl(k, it) { var st = XS.col[k], L = st.look, box = el("div", "exctl");
    var pa = xSec(XW.ctl.parts, "exparts"); pa.appendChild(el("p", "exhint", XW.ctl.partsPlain));
    L.rows.forEach(function (row, i) { var r = el("div", "lnrow"); r.appendChild(el("span", "dzl", fill(XW.ctl.line, { i: i + 1 }))); var sd = el("div", "lnsides");
      sd.appendChild(xZone(k, i, "l", row.l, XW.ctl.left)); sd.appendChild(el("span", "lnmid")); sd.appendChild(xZone(k, i, "r", row.r, XW.ctl.right)); r.appendChild(sd); pa.appendChild(r); });
    var tr = el("div", "lnrow extray"); tr.appendChild(el("span", "dzl", XW.ctl.tray)); var tz = xZone(k, "off", "", L.off || [], XW.ctl.tray); tz.classList.add("exoff"); tr.appendChild(tz); pa.appendChild(tr); box.appendChild(pa);
    var sz = xSec(XW.ctl.size, "exsize"), p = xSelPart(k);
    sz.appendChild(xRange(fill(XW.ctl.sizeOf, { name: xPartWord(k, p) }), L.size[p] || 12, xMin(k, p), 26, 1, function (v) { xSet(k, function (x) { x.size[p] = v; }); }));
    if (EX.modes[p] && (k !== "end" || p === "count" || p === "via")) sz.appendChild(xPick(XW.ctl.mode, (L.mode || {})[p] || EX.modes[p][0], EX.modes[p], function (v) { xSet(k, function (x) { x.mode = x.mode || {}; x.mode[p] = v; }); }));
    sz.appendChild(xRange(XW.ctl.markSize, L.sqSize, 6, 24, 1, function (v) { xSet(k, function (x) { x.sqSize = v; }); }));
    sz.appendChild(xRange(XW.ctl.gap, L.sqGap, 0, 6, 1, function (v) { xSet(k, function (x) { x.sqGap = v; }); })); box.appendChild(sz);
    var co = xSec(XW.ctl.colour, "excolour"), IC = xIcol(k), iw = {}; Object.keys(IC).forEach(function (x) { iw[x] = IC[x].word; }); var cg = el("div", "exgrid2");
    cg.appendChild(xPick(XW.ctl.glyph, L.iconCol, Object.keys(IC), function (v) { xSet(k, function (x) { x.iconCol = v; }); }, iw));
    cg.appendChild(xPick(XW.ctl.edgeSide, L.railSide, ["left", "right", "top", "bottom", "none"], function (v) { xSet(k, function (x) { x.railSide = v; }); }));
    cg.appendChild(xPick(XW.ctl.edgePat, L.railStyle, ["solid", "dashed", "dotted"], function (v) { xSet(k, function (x) { x.railStyle = v; }); }));
    cg.appendChild(xRange(XW.ctl.edgeW, L.railW, 1, 8, 1, function (v) { xSet(k, function (x) { x.railW = v; }); }));
    cg.appendChild(xPick(XW.ctl.chipBox, L.rwBox, ["pill", "tag", "square", "outline", "bare"], function (v) { xSet(k, function (x) { x.rwBox = v; }); }));
    cg.appendChild(xRange(XW.ctl.chipFill, L.rwA, 0, 100, 5, function (v) { xSet(k, function (x) { x.rwA = v; }); }));
    cg.appendChild(xPick(XW.ctl.cntBox, L.cntBox, ["pill", "tag", "square", "outline", "bare"], function (v) { xSet(k, function (x) { x.cntBox = v; }); }));
    cg.appendChild(xRange(XW.ctl.cntFill, L.cntA, 0, 100, 5, function (v) { xSet(k, function (x) { x.cntA = v; }); }));
    cg.appendChild(xPick(XW.ctl.enc, L.sqEnc, ["symbol", "colour", "char", "shape"], function (v) { xSet(k, function (x) { x.sqEnc = v; }); }));
    cg.appendChild(xPick(XW.ctl.pal, L.sqPal, ["type", "channel", "entity", "mono"], function (v) { xSet(k, function (x) { x.sqPal = v; }); }));
    cg.appendChild(xPick(XW.ctl.shape, L.sqShape, ["round", "square"], function (v) { xSet(k, function (x) { x.sqShape = v; }); })); co.appendChild(cg); box.appendChild(co);
    var cp = el("div", "excp"), code = el("code", "exline", xCopy(k)), said = el("span", "said");
    code.hidden = true;                                           /* the line is not shown — the button copies it whole (L-36) */
    var rs = xAct("opt exo exi exreset", XICON.reset, "reset", null, function () { st.look = xClone(EX.look[k]); st.sel = null; xSave(); renderEx(); writeOut(LAST.L, LAST.GS); });
    var cb = xAct("opt exo exi excopy", XICON.copy, "copy", null, function () { copyText(code.textContent, said, XW.ctl.copied); });
    cp.appendChild(rs); cp.appendChild(cb); cp.appendChild(said); cp.appendChild(code); box.appendChild(cp);
    return box; }

  /* ── the copy line. The table's is the lab's own words (COPYTXT), so it reads as his DATA line while it is his; every other kind's
     names its parts with the words the controls show (S4-26), each part's mode and the glyph's colour included (S4-05) ── */
  function xBlockLine(k, L) { var on = function (p) { return L.rows.some(function (r) { return r.l.indexOf(p) >= 0 || r.r.indexOf(p) >= 0; }); };
    var tail = " · squares " + L.sqSize + "px gap " + L.sqGap + " " + L.sqShape + " as " + L.sqEnc + " by " + L.sqPal;
    if (k === "table") { var cp = XW.cp.table;
      var st = XPARTS[k].map(function (p) { if (p === "icon") return cp.icon + " " + (on(p) ? "on" : "off") + " " + L.iconCol;
        if (EX.modes[p] && (L.mode || {})[p]) return cp[p] + " " + (on(p) ? L.mode[p] : "off"); return cp[p] + " " + (on(p) ? "on" : "off"); });
      var sizes = Object.keys(L.size).filter(function (p) { return XPARTS[k].indexOf(p) >= 0; }).map(function (p) { return p + " " + L.size[p]; });
      return "block " + L.form + " (" + st.join(", ") + ") · edge " + L.railSide + (L.railSide === "none" ? "" : " " + L.railStyle + " " + L.railW + "px")
        + " · chips count " + L.cntBox + " " + L.cntA + "%, " + XW.chipWord[k] + " " + L.rwBox + " " + L.rwA + "%"
        + " · lines " + L.rows.map(function (r) { return (r.l.join(" ") || "—") + " | " + (r.r.join(" ") || "—"); }).join(" / ") + " · sizes " + sizes.join(" ") + tail; }
    var nm = function (p) { return xPartWord(k, p); }, IC = xIcol(k);
    var st2 = XPARTS[k].map(function (p) { if (!on(p)) return nm(p) + " off"; if (p === "icon") return nm(p) + " on, " + ((IC[L.iconCol] || {}).word || L.iconCol);
      return nm(p) + " " + ((L.mode || {})[p] || "on"); });
    return "block " + L.form + " (" + st2.join(", ") + ") · edge " + L.railSide + (L.railSide === "none" ? "" : " " + L.railStyle + " " + L.railW + "px")
      + " · chips count " + L.cntBox + " " + L.cntA + "%, " + XW.chipWord[k] + " " + L.rwBox + " " + L.rwA + "%"
      + " · lines " + L.rows.map(function (r) { return (r.l.map(nm).join(" · ") || "—") + " | " + (r.r.map(nm).join(" · ") || "—"); }).join(" / ")
      + " · sizes " + XPARTS[k].filter(function (p) { return L.size[p] != null; }).map(function (p) { return nm(p) + " " + L.size[p]; }).join(", ") + tail; }
  function xSame(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function xCopy(k) { var st = XS.col[k], it = xCurrent(k), L = st.look, whose = xWhose(k), mine = !xSame(L, EX.look[k]) || st.width !== XW.width.pick;   /* L-36: the column's width is part of its look */
    var off = (L.off || []).map(function (p) { return k === "table" ? p : xPartWord(k, p); }).join(k === "table" ? " " : " · ") || "—";
    return XW.copy.where + " · " + XW.kinds[k].name + " · " + (it ? xName(it) : "—") + " · " + fill(XW.copy.on, { ep: st.scope === "all" ? XW.copy.all : S.open })
      + (st.role ? " · " + fill(XW.copy.role, { v: xRoleName(k, st.role) }) : "")
      + " · " + xBlockLine(k, L) + " · " + XW.ctl.tray + " " + off + " · " + XW.ctl.widthIs + " " + XW.width.opts[st.width].name
      + " (" + (mine ? W.copy.his : whose === "his" ? fill(XW.whose.his.name) + ", " + XW.look.table.ruled : whose === "lab" ? XW.whose.lab.name + ", " + W.copy.pick : W.copy.pick) + ")"; }
  /* the page's copy text (S4-06): the bench's two layout options first, then one line per kind */
  function exLines() { return [optLine(XW.copy.where, XW.opt.lay, XS.lay), optLine(XW.copy.where, XW.opt.follow, XS.follow)]
    .concat(XK.filter(function (k) { return !EX.absent[k]; }).map(xCopy)); }

  /* ── the section ── */
  function exBar() { var bar = $("exbar"); if (!bar) return; bar.textContent = "";
    [["lay", XS.lay], ["follow", XS.follow]].forEach(function (g) { var R = XW.opt[g[0]], grp = el("div", "mgrp"), o = el("div", "opts"); grp.appendChild(el("span", "rl", R.label));
      o.setAttribute("role", "radiogroup"); o.setAttribute("aria-label", R.label);
      Object.keys(R.opts).forEach(function (v) { o.appendChild(xOptBtn(g[0], v, R, g[1], function (nv) { XS[g[0]] = nv; xSave(); tipOff(); renderEx(); writeOut(LAST.L, LAST.GS); }, XICON[g[0]][v])); });
      grp.appendChild(o); bar.appendChild(grp); }); }
  /* the columns: in one row across the page, wrapped, or (ruled, D-081) an upper and a lower row — each column at its own width (L-36) */
  function renderEx() { var box = $("exgrid"); if (!box || !BYID[S.open]) return; box.textContent = ""; box.setAttribute("data-lay", XS.lay);
    exBar(); var cols = XK.map(xCol);
    if (XS.lay === "half") { var n = Math.ceil(cols.length / 2); [cols.slice(0, n), cols.slice(n)].forEach(function (g) { var r = el("div", "exrow"); g.forEach(function (c) { r.appendChild(c); }); box.appendChild(r); }); }
    else cols.forEach(function (c) { box.appendChild(c); }); }
  /* the element lit anywhere (D-041): its kind's column shows it, when the column holds it and the option says follow */
  function exFollow() { if (XS.follow !== "on" || !S.el) return; var hit = false;
    XK.forEach(function (k) { var st = XS.col[k], it = xList0(k).filter(function (x) { return x.id === S.el || (EX.cat[x.id] || {}).key === S.el; })[0];
      if (it && st.id !== it.id) { st.id = it.id; if (st.role && !xHasRole(k, it, st.role)) st.role = null; hit = true; } });
    if (hit) { renderEx(); writeOut(LAST.L, LAST.GS); } }
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("#ocol-uni [data-key], #ocol-cm [data-key], #sec-mo [data-key]"); if (t) setTimeout(exFollow, 0);
    /* S4-16: BY MOMENT's gate icons option decides the bench's gate glyphs too */
    if (e.target.closest && e.target.closest('button[data-mopt="gic"]')) setTimeout(renderEx, 0); });
  /* the hovers: a block's one card, the options', the roles', the parts' — the controls' meanings live in the section's info line */
  function exTip(t, kind) {
    if (kind === "exblk") { var k = t.getAttribute("data-exk"), id = t.getAttribute("data-exid"), ep = t.getAttribute("data-exep"), r = BYID[ep], e = ((r && r.ex[k]) || []).filter(function (x) { return x[0] === id; })[0];
      return e ? xTipBlock(k, { k: k, id: id, role: e[1], ep: ep, o: e[2] }) : null; }
    if (kind === "exopt") { var g = t.getAttribute("data-xopt"), R = XW.opt[g], v = t.getAttribute("data-v"); return "<b>" + esc(R.opts[v].name) + "</b>" + (R.pick === v ? " · " + esc(W.pickMark) : "") + "<span class=pl>" + esc(R.opts[v].plain) + "</span>"; }
    if (kind === "exwho") { var wh = t.getAttribute("data-whose"), ts = EX.look.table.size, fs = Math.min.apply(null, Object.keys(ts).map(function (p) { return ts[p]; }));
      return "<b>" + esc(XW.whose[wh].name) + "</b><span class=pl>" + esc(fill(XW.whose[wh].plain, { v: XW.look.table.ruled, lo: fs, hi: EX.floor })) + "</span>"; }
    if (kind === "exctl") return "<b>" + esc(t.getAttribute("data-verb")) + "</b> " + esc(t.getAttribute("data-obj"));        /* L-36: a verb and its object */
    if (kind === "exrole") { var col = t.closest(".excol").getAttribute("data-k"), rl = t.getAttribute("data-role"), pl = rl ? xRolePlain(col, rl) : XW.ctl.allPlain, A = rl ? XW.act.role : XW.act.roleAll;
      return "<b>" + esc(A.verb) + "</b> " + esc(fill(A.obj, { v: rl ? xRoleName(col, rl) : "" })) + (pl ? "<span class=pl>" + esc(pl) + "</span>" : ""); }
    if (kind === "expart") { var kk = t.closest(".excol").getAttribute("data-k"), pp = t.getAttribute("data-part"); return "<b>" + esc(xPartWord(kk, pp)) + "</b><span class=pl>" + esc(xPartPlain(kk, pp) || "") + "</span>"; }
    return null; }
  (function () { var I = $("info-ex"); if (!I) return; I.appendChild(el("p", "cap", XW.lede)); I.appendChild(el("p", "cap", XW.how)); })();
  window.__allepEx = { key: XKEY, state: XS, move: xMove, copy: xCopy, lines: exLines, render: function () { renderEx(); }, current: xCurrent, items: xItems,
    set: function (k, f) { xSet(k, f); }, pick: function (k, id) { XS.col[k].id = id; renderEx(); }, scope: function (k, v) { XS.col[k].scope = v; XS.col[k].role = null; renderEx(); },
    role: function (k, r) { XS.col[k].role = r; renderEx(); }, width: function (k, v) { XS.col[k].width = XW.width.opts[v] ? v : XW.width.pick; xSave(); renderEx(); writeOut(LAST.L, LAST.GS); }, tip: function (k, it) { return xTipBlock(k, it); } };
