  /* ══ D-071 · THE EXAMPLES BENCH (his L-23 · L-08 · L-13 · L-11). One column per kind of element, in his order, each an example
     drawn as a BLOCK in the endpoint lab's anatomy — its title lines (parts on a left and a right side), a strip of marks, a list that
     opens on a click, and ONE hover in input → process → output order (L-22) — with its controls BELOW it: the parts dragged between
     the lines or into "not drawn", their sizes, the colours, and a copy line. The table boots on his DATA line (D-027), the schema and
     the function on the lab's looks, the other five on my picks (dashed). D.ex is the generator's (_ae_bench.py): the lifted looks,
     the parts, the field kinds and one record per element; r.ex holds each endpoint's elements with their role there. This file is
     inlined by the generator inside the page's script, so it draws with the page's own helpers. ══ */
  var EX = D.ex, XW = W.ex, XKEY = "gabe:allep:bench:v1", XK = EX.kinds;
  var XS = { lay: XW.opt.lay.pick, follow: XW.opt.follow.pick, col: {} };
  function xClone(o) { return JSON.parse(JSON.stringify(o)); }
  XK.forEach(function (k) { XS.col[k] = { scope: XW.opt.scope.pick, role: null, id: null, look: xClone(EX.look[k]), fold: null, sel: null, open: false }; });
  try { var xr = JSON.parse(window.localStorage.getItem(XKEY) || "null");
    if (xr) { if (XW.opt.lay.opts[xr.lay]) XS.lay = xr.lay; if (XW.opt.follow.opts[xr.follow]) XS.follow = xr.follow;
      XK.forEach(function (k) { var c = (xr.col || {})[k]; if (!c) return; var st = XS.col[k];
        if (XW.opt.scope.opts[c.scope]) st.scope = c.scope; if (typeof c.id === "string") st.id = c.id; if (typeof c.role === "string") st.role = c.role;
        if (c.look && Array.isArray(c.look.rows) && c.look.rows.length === 3) st.look = Object.assign(xClone(EX.look[k]), c.look); }); } } catch (e) {}
  function xSave() { try { var o = { lay: XS.lay, follow: XS.follow, col: {} }; XK.forEach(function (k) { var st = XS.col[k]; o.col[k] = { scope: st.scope, role: st.role, id: st.id, look: st.look }; });
    window.localStorage.setItem(XKEY, JSON.stringify(o)); } catch (e) {} }
  /* every element's home: the first endpoint that has it, and the roles it has anywhere (the "every endpoint" scope's role filter) */
  var XHOME = {}, XROLES = {}, XALL = {};
  XK.forEach(function (k) { XALL[k] = []; });
  ROWS.forEach(function (r) { XK.forEach(function (k) { ((r.ex || {})[k] || []).forEach(function (e) {
    if (!XHOME[e[0]]) { XHOME[e[0]] = [r.id, e]; XALL[k].push(e[0]); } (XROLES[e[0]] = XROLES[e[0]] || {})[e[1]] = 1; }); }); });
  var XSTR = EX.str; function xT(i) { return i == null ? null : XSTR[i]; }   /* the generator's one table of repeated strings */
  var XSQ = {}; EX.sq.forEach(function (x) { XSQ[x.key] = x; });
  var XPARTS = {}; XK.forEach(function (k) { XPARTS[k] = EX.parts[k] ? EX.parts[k].map(function (p) { return p.key; }) : Object.keys(XW.parts[k]); });
  var XICO = { table: function () { return "model"; }, schema: function () { return "schema"; }, fn: function () { return "function"; },
    end: function (c) { return (EN.kind[c.kd] || {}).icon || XW.icons.end; }, test: function () { return XW.icons.test; }, gate: function () { return XW.icons.gate; },
    hook: function () { return XW.icons.hook; }, inf: function (c) { return (EN.ifk[c.ik] || {}).icon || XW.icons.inf; } };
  /* a kind's own colour (the lab's "model" glyph colour: the station's colour for that kind), read from the lifted tokens */
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
  function xB(text, z) { var b = el("b", null, text == null ? XW.face.none : String(text)); b.style.fontSize = z + "px"; return b; }
  function xChip(text, col, z, cls) { var s = el("span", "bkrw"), i = el("i", "jdrw" + (cls ? " " + cls : ""), String(text)); i.style.setProperty("--rwc", col); i.style.fontSize = z + "px"; s.appendChild(i); return s; }
  function xMeta(icon, text, z, mode, cls) { if (mode === "off") return null; var m = el("span", "bkm" + (cls ? " " + cls : "")); m.style.fontSize = z + "px";
    if (mode !== "word" && icon) m.appendChild(xSvg(icon, z, "var(--muted)")); if (mode !== "icon" && text != null && text !== "") m.appendChild(el("span", null, String(text))); return m; }
  function xCount(n, z, mode, words) { if (mode === "off" || n == null) return null; var c = el("span", "bkn" + (mode === "badge" ? " badge" : ""), mode === "badge" ? String(n) : words); c.style.fontSize = z + "px"; return c; }
  function xShort(f) { return String(f || "").split("/").slice(-2).join("/"); }
  function xRoleName(k, r) { if (k === "end") return (W.kinds[r] || {}).name || r; var R = (XW.roles[k] || {})[r]; return R ? R.name : r; }
  function xFnRole(K) { var c = EX.cat[K]; if (c && c.role) return c.role; var s = SK.keys[K]; return s ? ((s[1] || []).filter(function (x) { return x[0] === "role"; })[0] || [])[1] : null; }
  function xFnName(K) { return K ? String(K).split("::").pop() : null; }
  /* a function named inside another element: the function glyph, its name, its role chip (L-09 · L-14) */
  function xFnRef(K, z) { var m = el("span", "bkm exfn"); m.style.fontSize = z + "px"; if (!K) { m.appendChild(el("span", null, XW.face.noFn)); return m; }
    m.appendChild(xStation(K, z, EX.col.kind["function"]) || xSvg("function", z, EX.col.kind["function"])); m.appendChild(el("span", null, xFnName(K)));
    var r = xFnRole(K); if (r && EN.role[r]) { var i = el("i", "jdrw exmini", EN.role[r].chip); i.style.setProperty("--rwc", EN.role[r].col); m.appendChild(i); } return m; }
  function xStatusChip(st, z) { return xChip(st, xStatusCol(st), z); }

  /* ── the parts, per kind: part → a node on the title line, or null when the element has nothing for it ── */
  var XPART = {
    table: function (p, c, it, L, z) { var md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg("model", z, xGlyphCol("table", c, it, L))); return s; }
      if (p === "rw") return xChip(it.role === "rw" ? "RW" : String(it.role).toUpperCase(), EX.col.rw[it.role], z);
      if (p === "name") return xB(c.n, z);
      if (p === "ent") { var e = el("span", "bke"); e.style.color = c.ec || "var(--muted)"; e.style.fontSize = z + "px"; if (md.ent !== "word") e.appendChild(xSvg("entity", z, c.ec));
        if (md.ent !== "icon") e.appendChild(el("span", null, c.ent || XW.face.none)); return e; }
      if (p === "count") { var n = c.cols.length + (c.nmore || 0); return xCount(n, z, md.count, n + " " + XW.list.fields); }
      if (p === "model") return xMeta("doc", c.model, z, md.model);
      return null; },
    schema: function (p, c, it, L, z) { var md = L.mode || {}, d = it.role.split("-")[0];
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xStation(c.key, z, xGlyphCol("schema", c, it, L)) || xSvg("schema", z, xGlyphCol("schema", c, it, L))); return s; }
      if (p === "dir") return xChip((EN.dir[d] || {}).chip || d, (EN.dir[d] || {}).col, z, "sdir");
      if (p === "name") return xB(c.n, z);
      if (p === "ent") { if (!c.ent) return null; var e = el("span", "bke"); e.style.color = c.ec || "var(--muted)"; e.style.fontSize = z + "px"; if (md.ent !== "word") e.appendChild(xSvg("entity", z, c.ec));
        if (md.ent !== "icon") e.appendChild(el("span", null, c.ent)); return e; }
      if (p === "count") return xCount(c.cols.length, z, md.count, c.cols.length + " " + XW.list.fields);
      if (p === "via") return xMeta(it.o.parent ? "link" : (EN.dir[d] || {}).icon, it.o.parent ? fill(XW.face.inside, { name: it.o.parent }) : (d === "in" ? XW.face.request : XW.face.reply), z, md.via);
      return null; },
    fn: function (p, c, it, L, z) { var md = L.mode || {}, o = it.o;
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xStation(c.key, z, xGlyphCol("fn", c, it, L)) || xSvg("function", z, xGlyphCol("fn", c, it, L))); return s; }
      if (p === "role") return EN.role[it.role] ? xChip(EN.role[it.role].chip, EN.role[it.role].col, z, "frole") : xChip("?", "var(--muted)", z);
      if (p === "name") return xB(c.n, z);
      if (p === "commit") return c.commits ? el("i", "cdot excdot") : null;
      if (p === "file") return xMeta("file", xShort(c.file), z, md.file || "both");
      if (p === "count") { var n = c.lines == null ? "?" : c.lines, q = xCount(n, z, md.count, fill(XW.tip.fn.lines, { n: n })); if (q && c.god) q.classList.add("god"); return q; }
      if (p === "via") return xMeta(o.h ? "target" : "link", o.h ? XW.face.handler : fill(XW.face.level, { i: o.lv, name: o.via }), z, md.via);
      return null; },
    end: function (p, c, it, L, z) { var md = L.mode || {};
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg(XICO.end(c), z, xGlyphCol("end", c, it, L))); return s; }
      if (p === "status") return xStatusChip(c.st, z);
      if (p === "name") return xB(c.kd === "success" ? fill(XW.face.answer, { n: c.fields }) : (c.say || c.code || XW.face.noWords), z);
      if (p === "stage") { var t = el("span", "bkm exstg", c.sg); t.style.fontSize = z + "px"; return t; }
      if (p === "count") return xCount(c.paths.length, z, md.count, fill(XW.tip.end.ways, { n: c.paths.length }));
      if (p === "via") return c.at ? xMeta("file", xShort(c.at), z, md.via) : null;
      return null; },
    test: function (p, c, it, L, z) { var md = L.mode || {}, o = it.o, here = o.here.map(function (i) { return c.calls[i]; });
      if (p === "icon") { var s = el("span", "bki"); s.appendChild(xSvg("test", z, xGlyphCol("test", c, it, L))); return s; }
      if (p === "cid") return xB(c.cid, z);
      if (p === "state") return xChip(c.state === "pass" ? XW.face.pass : XW.face.fail, c.state === "pass" ? EX.col.opc.read : "var(--alert)", z);
      if (p === "proves") { if (!o.ends.length) return null; var w = el("span", "bkm exends"), sts = {}; o.ends.forEach(function (e) { var ec = EX.cat[it.ep + "|" + e[0]]; if (ec) sts[ec.st] = 1; });
        Object.keys(sts).forEach(function (st) { w.appendChild(xStatusChip(st, z)); }); return w; }
      if (p === "role") return xChip(xRoleName("test", it.role), xChanCol("test", c, it), z);
      if (p === "name") { var n = el("span", "bkm exname", c.n); n.style.fontSize = z + "px"; return n; }
      if (p === "file") return xMeta("file", xShort(c.file) + ":" + c.line, z, md.file || "word");
      if (p === "sends") { var hs = {}; here.forEach(function (q) { q[5].forEach(function (h) { hs[h] = 1; }); }); var ks = Object.keys(hs); if (!ks.length) return null;
        var w2 = el("span", "bkm exhdr"); w2.style.fontSize = z + "px"; ks.forEach(function (h) { w2.appendChild(el("span", "exh", h)); }); return w2; }
      if (p === "asserts") { var a = []; here.forEach(function (q) { if (q[6].length) a.push(q[6].length > 1 ? fill(XW.face.accepts, { v: q[6].join(" · ") }) : String(q[6][0]));
          q[7].forEach(function (x) { var m = x.match(/\['(\w+)'\]/g); if (m) a.push(m[m.length - 1].slice(2, -2)); }); });
        return a.length ? xMeta(null, a.join(" · "), z, "word", "exasr") : null; }
      return null; },
  };

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
    return s.childNodes.length ? s : null; }

  /* ── the list a click opens: every field, the ways through the code, the ordered chain a test runs through ── */
  function xRow(box, cells, cls) { var r = el("div", "exr" + (cls ? " " + cls : "")); cells.forEach(function (x) { if (x == null) return; r.appendChild(typeof x === "string" ? el("span", null, x) : x); }); box.appendChild(r); return r; }
  function xHead(box, t) { box.appendChild(el("div", "exlh", t)); }
  function xChainRows(box, P) { P.ch.forEach(function (q) { if (q[0] === "step") return xRow(box, [el("span", "exk", "·"), xT(q[1])], "exq");
      var tag = q[0] === "gate" ? (q[2] ? "✕" : "✓") : q[0] === "branch" ? (q[2] ? "→" : "·") : q[0] === "call" ? "ƒ" : q[0] === "switch" ? "⇄" : "■";
      xRow(box, [el("span", "exk", tag), xT(q[1]) || "", q[5] != null ? el("span", "exs", xT(q[5])) : null, q[4] != null ? el("span", "exs", xT(q[4])) : null], "ex-" + q[0] + (q[2] ? " exhit" : "")); }); }
  function xTables(box, P) { P.tb.forEach(function (t) { xRow(box, [xChip(t[1] === "rw" ? "RW" : t[1].toUpperCase(), EX.col.rw[t[1]], 12), xT(t[0]),
    t[1].indexOf("w") >= 0 ? el("span", "exs", t[2] ? XW.chain.saved : XW.chain.notSaved) : null]); }); }
  function xList(k, c, it) { var b = el("div", "bkfl exfl"), o = it.o, L = XW.list, CH = XW.chain; b.setAttribute("data-tip", "exnone");
    if (k === "table") { xHead(b, L.fields); var fk = {}; (c.fks || []).forEach(function (f) { fk[f[0]] = f[1]; });
      c.cols.forEach(function (f) { xRow(b, [xMark("e-colour t-" + f[2], (XSQ[f[2]] || XSQ.other).col), f[0], el("span", "exs", f[1]), fk[f[0]] ? el("span", "exs", "→ " + fk[f[0]]) : null]); });
      if (c.more.length) { xHead(b, fill(L.more, { n: c.more.length })); c.more.forEach(function (f) { xRow(b, [xMark("e-colour exmore", "var(--muted)"), f[0], el("span", "exs", f[1])]); }); }
      if (o.ops.length) { xHead(b, L.ops); o.ops.forEach(function (q) { xRow(b, [el("span", "exk", q[0]), q[2], el("span", "exs", q[1]), q[3] && q[0] !== "read" ? el("span", "exs", L.saved) : null]); }); } }
    else if (k === "schema") { xHead(b, L.fields); c.cols.forEach(function (f) { xRow(b, [xMark("e-colour t-" + f[2], (XSQ[f[2]] || XSQ.other).col), f[0], el("span", "exs", f[1]), f[5] ? el("span", "exs", f[5]) : null]); }); }
    else if (k === "fn") { if (c.raises.length) { xHead(b, L.raises); c.raises.forEach(function (z, i) { var to = (o.rz || [])[i] || []; xRow(b, [el("span", "exk", "!"), z[0], el("span", "exs", z[1]), to.length ? xStatusChip(to.join("|"), 12) : null]); }); }
      if (o.ops.length) { xHead(b, L.tables); o.ops.forEach(function (q) { xRow(b, [xChip(q[0].toUpperCase(), EX.col.rw[q[0]], 12), q[1]]); }); }
      if (o.calls.length) { xHead(b, L.calls); o.calls.forEach(function (n) { xRow(b, [el("span", "exk", "ƒ"), xT(n)]); }); }
      if (o.does.length) { xHead(b, L.does); xRow(b, [o.does.map(xT).join(" · ")]); } }
    else if (k === "end") { var R = BYID[c.ep]; c.paths.forEach(function (pid, i) { xHead(b, c.paths.length > 1 ? fill(L.way, { i: i + 1 }) : L.paths); xChainRows(b, R.ex.paths[pid]); });
      xHead(b, L.answer); xRow(b, [c.media || XW.face.none, c.hd.length ? el("span", "exs", c.hd.map(function (h) { return h[0]; }).join(" · ")) : null]); }
    else if (k === "test") xTestChain(b, c, it);
    return b; }
  /* EX-3 (L-08): what a test runs through here, in order — its requests, then per way to the ending it proves: the checks it passes,
     the branch it takes, the functions it runs, the tables it touches (saved or not), the in-flight values it meets, the ending */
  function xTestChain(b, c, it) { var o = it.o, CH = XW.chain, R = BYID[it.ep], NK = XW.notKnown;
    xHead(b, XW.list.req); c.calls.forEach(function (q, i) { xRow(b, [el("span", "exk", String(i + 1)), q[1], el("span", "exs", xRoleName("test", q[2] === "act" ? "act" : q[2] === "arrange-checked" ? "check" : "arrange")),
      q[6].length ? xStatusChip(q[6].join("|"), 12) : null], o.here.indexOf(i) >= 0 ? "exhit" : ""); });
    if (!c.calls.length && c.raises.length) { xHead(b, CH.raise); c.raises.forEach(function (z) { xRow(b, [el("span", "exk", "!"), z[0] + " → " + z[1]]); });
      xRow(b, [fill(CH.service, { v: c.raises.map(function (z) { return z[0]; }).join(" · ") })], "exnote"); }
    xHead(b, CH.title);
    o.paths.forEach(function (pid, i) { var P = R.ex.paths[pid]; if (!P) return; if (o.paths.length > 1) xHead(b, fill(CH.which, { i: i + 1, n: o.paths.length }) + " · " + P.st);
      var gates = P.ch.filter(function (q) { return q[0] === "gate" && !q[2]; }), br = P.ch.filter(function (q) { return q[0] === "branch" && q[2]; });
      if (!c.calls.length) { xRow(b, [el("span", "exk", "✕"), P.ch.filter(function (q) { return q[0] === "gate" && q[2]; }).map(function (q) { return xT(q[1]); }).join(" · ") || String(P.st)]); return; }
      var q0 = c.calls[o.here[0]] || []; xRow(b, [el("span", "exk", "1"), CH.request, q0[1] ? el("span", "exs", q0[1]) : null, q0[5] && q0[5].length ? el("span", "exs", q0[5].join(" · ")) : null], "exsec"); xRow(b, [el("span", "exk", "2"), CH.checks + " · " + gates.length], "exsec");
      gates.forEach(function (q) { xRow(b, [el("span", "exk", "✓"), xT(q[1]), q[5] != null ? el("span", "exs", xT(q[5])) : null], "exin"); });
      if (br.length) { xRow(b, [el("span", "exk", "→"), CH.branch], "exsec"); br.forEach(function (q) { xRow(b, [el("span", "exk", "→"), xT(q[1])], "exin"); }); }
      xRow(b, [el("span", "exk", "ƒ"), CH.fns + " · " + P.fn.length], "exsec"); xRow(b, [P.fn.map(function (i) { return xFnName(xT(i)); }).join(" · ")], "exin");
      xRow(b, [el("span", "exk", "▤"), CH.tables + " · " + P.tb.length], "exsec"); var tb = el("div", "exin"); xTables(tb, P); b.appendChild(tb);
      if (P.inf.length && R.ex.inf) { xRow(b, [el("span", "exk", "~"), CH.inf + " · " + P.inf.length], "exsec"); var inf = ((R.ex.inf || [])); xRow(b, [P.inf.map(function (j) { var e = inf[j]; return e ? EX.cat[e[0]].n : ""; }).join(" · ")], "exin"); }
      xRow(b, [el("span", "exk", "■"), CH.ending, xStatusChip(P.st, 12)], "exsec"); });
    var nk = [NK.body]; if (!o.here.some(function (i) { return c.calls[i][5].length; }) && c.calls.length) nk.push(NK.fixture);
    o.ends.forEach(function (e) { var ec = EX.cat[it.ep + "|" + e[0]]; if (ec && ec.paths.length > 1) nk.push(fill(NK.which, { n: ec.paths.length, status: ec.st })); });
    if (c.calls.length > 1) nk.push(NK.step); nk.push(NK.loop);
    xHead(b, NK.title); nk.forEach(function (t) { xRow(b, [el("span", "exk", "?"), t], "exnk"); }); }

  /* ── ONE hover per block (L-02 · L-22): what goes in, what it does, what comes out — this element's own facts ── */
  function xTipBlock(k, it) { var c = EX.cat[it.id], o = it.o, T = XW.tip, K = T[k], lines = [[], [], []], ln = function (i, s) { if (s) lines[i].push(s); };
    var head = "<b>" + esc(k === "test" ? c.cid + " · " + c.n : k === "gate" ? c.n : k === "end" ? c.st + " · " + (c.kd === "success" ? fill(XW.face.answer, { n: c.fields }) : (c.say || c.code || XW.face.noWords)) : c.n) + "</b> · " + esc(XW.kinds[k].name) + " · " + esc(xRoleName(k, it.role));
    if (k === "end") { ln(0, c.pred || c.via ? fill(K.in, { v: c.pred || c.via }) : fill(K.inNone, { v: c.sg }));
      ln(1, c.at ? fill(c.via ? K.doVia : K.do, { at: c.at, v: c.via }) : K.doNone); ln(1, c.skip != null ? fill(K.skip, { v: c.skip }) : fill(K.ways, { n: c.paths.length }));
      ln(2, fill(K.out, { status: c.st, v: c.kd === "success" ? fill(XW.face.answer, { n: c.fields }) : (c.say || c.code || XW.face.noWords) }));
      ln(2, c.decl == null ? null : c.decl ? K.decl : K.undecl); c.hd.forEach(function (h) { ln(2, fill(K.hdr, { v: h[0] })); });
      ln(2, c.tests.length ? fill(K.tests, { n: c.tests.length }) : K.noTests); }
    else if (k === "table") { var fns = {}; o.ops.forEach(function (q) { fns[q[2]] = 1; });
      ln(0, Object.keys(fns).length ? fill(K.in, { v: Object.keys(fns).join(" · ") }) : K.inNone);
      ln(1, o.ops.length ? fill(K.do, { v: o.ops.map(function (q) { return q[0] + " " + q[1]; }).join(" · ") }) : xRoleName("table", it.role));
      var w = o.ops.filter(function (q) { return q[0] !== "read"; }); ln(2, !w.length ? K.outRead : w.some(function (q) { return q[3]; }) ? K.out : K.outNot);
      if (c.race && w.length) ln(2, K.race); c.drift.forEach(function (d) { ln(2, fill(K.drift, { v: d[0] + " " + d[1] })); }); if (c.writers) ln(2, fill(K.writers, { n: c.writers })); }
    else if (k === "schema") { ln(0, fill(K.in, { v: xRoleName("schema", it.role) + (o.parent ? " · " + fill(XW.face.inside, { name: o.parent }) : "") }));
      ln(1, fill(K.do, { n: c.cols.length, k: c.cols.filter(function (f) { return f[4]; }).length, w: c.cols.filter(function (f) { return f[5]; }).length }));
      if (o.c422) ln(1, fill(K.c422, { n: o.c422 })); if (c.extra) ln(2, fill(K.extra, { v: c.extra })); if (c.cons) ln(2, fill(K.cons, { n: c.cons })); }
    else if (k === "fn") { ln(0, o.h ? K.inHandler : fill(K.in, { v: o.via })); ln(1, o.does.length ? fill(K.do, { v: o.does.map(xT).join(" · ") }) : null);
      o.ops.forEach(function (q) { ln(1, fill(K.ops, { op: xRoleName("table", q[0]), tbl: q[1] })); }); if (c.commits) ln(1, K.commit);
      if (c.ret) ln(2, fill(K.out, { v: c.ret })); c.raises.forEach(function (z, i) { var to = (o.rz || [])[i] || []; ln(2, fill(K.raise, { cls: z[0], at: z[1], st: to.length ? fill(K.raiseTo, { v: to.join(" · ") }) : "" })); }); }
    else if (k === "test") { var hs = {}; o.here.forEach(function (i) { c.calls[i][5].forEach(function (h) { hs[h] = 1; }); });
      ln(0, c.calls.length ? (Object.keys(hs).length ? fill(K.in, { v: Object.keys(hs).join(" · ") }) : K.inNone) : null);
      ln(1, c.calls.length ? fill(K.do, { n: c.calls.length, v: xRoleName("test", it.role) }) : fill(K.doService, { v: c.raises.map(function (z) { return z[0]; }).join(" · ") }));
      var sts = {}; o.ends.forEach(function (e) { var ec = EX.cat[it.ep + "|" + e[0]]; if (ec) sts[ec.st] = 1; });
      ln(2, Object.keys(sts).length ? fill(K.proves, { v: Object.keys(sts).join(" · ") }) : K.provesNone);
      o.here.forEach(function (i) { var q = c.calls[i]; if (q[6].length || q[7].length) ln(2, fill(K.out, { v: q[6].join(" · ") + (q[7].length ? " · " + q[7].join(" · ") : "") })); }); }
    var h = head; [T.in, T.do, T.out].forEach(function (lab, i) { if (lines[i].length) h += "<span class=ln><i class=exio>" + esc(lab) + "</i> " + esc(lines[i].join(" · ")) + "</span>"; });
    return h; }

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
  function xName(it) { var c = EX.cat[it.id]; if (it.k === "end") return c.st + " · " + (c.say || c.code || (W.kinds[c.kd] || {}).name);
    if (it.k === "gate") return c.n; if (it.k === "test") return c.cid + " · " + c.n; return c.n; }
  function xWhose(k) { return EX.parts[k] ? (k === "table" ? "his" : "lab") : "mine"; }
  function xOptBtn(group, v, R, cur, onPick, label) { var b = el("button", "opt exo"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-xopt", group); b.setAttribute("data-v", v);
    b.setAttribute("aria-checked", cur === v ? "true" : "false"); b.setAttribute("aria-label", R.opts[v].name); b.setAttribute("data-tip", "exopt"); b.textContent = label || R.opts[v].name;
    if (R.pick === v) b.setAttribute(R.ruled ? "data-ruled" : "data-pick", "true"); b.addEventListener("click", function () { onPick(v); }); return b; }
  function xCol(k) { var st = XS.col[k], col = el("div", "excol"), whose = xWhose(k); col.setAttribute("data-k", k);
    var hd = el("div", "exhd"), t = el("h3"); t.appendChild(xSvg(k === "end" ? XW.icons.end : k === "table" ? "model" : k === "schema" ? "schema" : k === "fn" ? "function" : XW.icons[k], 16, xKindCol(k, { kd: "success" })));
    t.appendChild(el("span", null, XW.kinds[k].name)); hd.appendChild(t);
    var wm = el("span", "exwho", XW.whose[whose].name); wm.setAttribute("data-whose", whose); wm.setAttribute("data-tip", "exwho"); hd.appendChild(wm); col.appendChild(hd);
    if (EX.absent[k]) { col.appendChild(el("p", "exnone", W.absent + " · " + fill(W.absentWhy, { why: EX.absent[k] }))); return col; }   /* the arm is off: said, never a partial list */
    /* the selector: which elements (this endpoint · every endpoint), the roles with their counts, the element itself */
    var sel = el("div", "exsel"), sc = el("div", "opts exscope"); sc.setAttribute("role", "radiogroup"); sc.setAttribute("aria-label", XW.opt.scope.label);
    Object.keys(XW.opt.scope.opts).forEach(function (v) { sc.appendChild(xOptBtn("scope", v, XW.opt.scope, st.scope, function (nv) { st.scope = nv; st.role = null; xSave(); renderEx(); })); });
    sel.appendChild(sc);
    var all = xList0(k), roles = {}, order = [];
    all.forEach(function (it) { (st.scope === "here" ? [it.role] : Object.keys(XROLES[it.id] || {})).forEach(function (r) { if (!(r in roles)) { roles[r] = 0; order.push(r); } roles[r]++; }); });
    if (order.length > 1 || st.role) { var rc = el("div", "exroles"); var ab = el("button", "exrc", XW.ctl.all + " " + all.length); ab.type = "button"; ab.setAttribute("aria-pressed", st.role ? "false" : "true");
      ab.setAttribute("data-tip", "exrole"); ab.setAttribute("data-role", ""); ab.addEventListener("click", function () { st.role = null; xSave(); renderEx(); }); rc.appendChild(ab);
      order.forEach(function (r) { var b = el("button", "exrc", xRoleName(k, r) + " " + roles[r]); b.type = "button"; b.setAttribute("data-role", r); b.setAttribute("aria-pressed", st.role === r ? "true" : "false");
        b.setAttribute("data-tip", "exrole"); b.addEventListener("click", function () { st.role = st.role === r ? null : r; xSave(); renderEx(); }); rc.appendChild(b); });
      sel.appendChild(rc); }
    var items = xItems(k), cur = xCurrent(k), pk = el("div", "expick");
    var prev = el("button", "btn quiet exstep", "‹"), next = el("button", "btn quiet exstep", "›"), s = el("select", "exselect");
    prev.type = next.type = "button"; prev.setAttribute("aria-label", XW.ctl.prev); next.setAttribute("aria-label", XW.ctl.next); s.setAttribute("aria-label", XW.ctl.pickEl);
    items.forEach(function (it) { var op = el("option", null, xName(it) + (st.scope === "all" ? " · " + it.ep : "")); op.value = it.id; if (cur && it.id === cur.id) op.selected = true; s.appendChild(op); });
    var go = function (d) { var i = items.map(function (x) { return x.id; }).indexOf(cur ? cur.id : null); var j = Math.max(0, Math.min(items.length - 1, i + d)); if (items[j]) { st.id = items[j].id; xSave(); renderEx(); } };
    prev.addEventListener("click", function () { go(-1); }); next.addEventListener("click", function () { go(1); });
    s.addEventListener("change", function () { st.id = s.value; xSave(); renderEx(); });
    pk.appendChild(prev); pk.appendChild(s); pk.appendChild(next); sel.appendChild(pk); col.appendChild(sel);
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
  function xPartPlain(k, p) { var lp = EX.parts[k] ? EX.parts[k].filter(function (x) { return x.key === p; })[0] : null; return lp ? lp.note : (XW.parts[k][p] || {}).plain; }
  function xPartIco(k, p) { var lp = EX.parts[k] ? EX.parts[k].filter(function (x) { return x.key === p; })[0] : null; return lp ? lp.ico : (p === "icon" ? (k === "end" ? XW.icons.end : XW.icons[k]) : p === "file" || p === "via" ? "file" : p === "count" ? "info" : p === "name" || p === "cond" ? "doc" : "role"); }
  function xMove(k, p, line, side, idx) { var L = XS.col[k].look; L.rows = L.rows.map(function (r) { return { l: r.l.filter(function (q) { return q !== p; }), r: r.r.filter(function (q) { return q !== p; }) }; });
    L.off = (L.off || []).filter(function (q) { return q !== p; });
    if (line === "off") L.off.push(p); else { var c = L.rows[line][side === "r" ? "r" : "l"]; c.splice(Math.max(0, Math.min(idx == null ? c.length : idx, c.length)), 0, p); }
    XS.col[k].sel = p; XS.col[k].fold = "parts"; xSave(); renderEx(); writeOut(LAST.L, LAST.GS); }
  function xPartChip(k, p) { var b = el("button", "expc"), L = XS.col[k].look; b.type = "button"; b.draggable = true; b.setAttribute("data-part", p); b.setAttribute("data-tip", "expart");
    b.setAttribute("aria-pressed", XS.col[k].sel === p ? "true" : "false"); b.appendChild(xSvg(xPartIco(k, p), 13, "currentColor")); b.appendChild(el("span", null, xPartWord(k, p)));
    b.addEventListener("dragstart", function (e) { try { e.dataTransfer.setData("text/plain", k + "|" + p); e.dataTransfer.effectAllowed = "move"; } catch (x) {} b.classList.add("dragging"); });
    b.addEventListener("dragend", function () { b.classList.remove("dragging"); });
    b.addEventListener("click", function () { XS.col[k].sel = p; XS.col[k].fold = "size"; renderEx(); }); return b; }
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
  var XTEXT = { name: 1, cond: 1, ent: 1, model: 1, via: 1, file: 1, sends: 1, asserts: 1, set: 1, ikind: 1, fkind: 1, fn: 1 };
  function xCtl(k, it) { var st = XS.col[k], L = st.look, box = el("div", "exctl"), bar = el("div", "exfolds");
    ["parts", "size", "colour"].forEach(function (f) { var b = el("button", "btn quiet exfold", XW.ctl[f]); b.type = "button"; b.setAttribute("data-fold", f); b.setAttribute("aria-expanded", st.fold === f ? "true" : "false");
      b.setAttribute("data-tip", "exfold"); b.addEventListener("click", function () { st.fold = st.fold === f ? null : f; renderEx(); }); bar.appendChild(b); });
    var rs = el("button", "btn quiet exreset", XW.ctl.reset); rs.type = "button"; rs.setAttribute("data-tip", "exreset");
    rs.addEventListener("click", function () { st.look = xClone(EX.look[k]); st.sel = null; xSave(); renderEx(); writeOut(LAST.L, LAST.GS); }); bar.appendChild(rs); box.appendChild(bar);
    var pane = el("div", "expane"); pane.setAttribute("data-fold", st.fold || "");
    if (st.fold === "parts") { pane.appendChild(el("p", "exhint", XW.ctl.partsPlain));
      L.rows.forEach(function (row, i) { var r = el("div", "lnrow"); r.appendChild(el("span", "dzl", fill(XW.ctl.line, { i: i + 1 }))); var sd = el("div", "lnsides");
        sd.appendChild(xZone(k, i, "l", row.l, XW.ctl.left)); sd.appendChild(el("span", "lnmid")); sd.appendChild(xZone(k, i, "r", row.r, XW.ctl.right)); r.appendChild(sd); pane.appendChild(r); });
      var tr = el("div", "lnrow extray"); tr.appendChild(el("span", "dzl", XW.ctl.tray)); var tz = xZone(k, "off", "", L.off || [], XW.ctl.tray); tz.classList.add("exoff"); tr.appendChild(tz); pane.appendChild(tr); }
    if (st.fold === "size") { var p = st.sel;
      if (!p) pane.appendChild(el("p", "exhint", XW.ctl.pickPart));
      else { var glyph = !XTEXT[p]; pane.appendChild(xRange(fill(XW.ctl.sizeOf, { name: xPartWord(k, p) }), L.size[p] || 12, glyph ? 9 : 12, 26, 1, function (v) { xSet(k, function (x) { x.size[p] = v; }); }));
        if (EX.modes[p] && (k !== "end" || p === "count" || p === "via")) pane.appendChild(xPick(XW.ctl.mode, (L.mode || {})[p] || EX.modes[p][0], EX.modes[p], function (v) { xSet(k, function (x) { x.mode = x.mode || {}; x.mode[p] = v; }); })); }
      pane.appendChild(xRange(XW.ctl.markSize, L.sqSize, 6, 24, 1, function (v) { xSet(k, function (x) { x.sqSize = v; }); }));
      pane.appendChild(xRange(XW.ctl.gap, L.sqGap, 0, 6, 1, function (v) { xSet(k, function (x) { x.sqGap = v; }); })); }
    if (st.fold === "colour") { var iw = {}; Object.keys(EX.icol).forEach(function (x) { iw[x] = EX.icol[x].word; });
      pane.appendChild(xPick(XW.ctl.glyph, L.iconCol, Object.keys(EX.icol), function (v) { xSet(k, function (x) { x.iconCol = v; }); }, iw));
      pane.appendChild(xPick(XW.ctl.edgeSide, L.railSide, ["left", "right", "top", "bottom", "none"], function (v) { xSet(k, function (x) { x.railSide = v; }); }));
      pane.appendChild(xPick(XW.ctl.edgePat, L.railStyle, ["solid", "dashed", "dotted"], function (v) { xSet(k, function (x) { x.railStyle = v; }); }));
      pane.appendChild(xRange(XW.ctl.edgeW, L.railW, 1, 8, 1, function (v) { xSet(k, function (x) { x.railW = v; }); }));
      pane.appendChild(xPick(XW.ctl.chipBox, L.rwBox, ["pill", "tag", "square", "outline", "bare"], function (v) { xSet(k, function (x) { x.rwBox = v; }); }));
      pane.appendChild(xRange(XW.ctl.chipFill, L.rwA, 0, 100, 5, function (v) { xSet(k, function (x) { x.rwA = v; }); }));
      pane.appendChild(xPick(XW.ctl.cntBox, L.cntBox, ["pill", "tag", "square", "outline", "bare"], function (v) { xSet(k, function (x) { x.cntBox = v; }); }));
      pane.appendChild(xRange(XW.ctl.cntFill, L.cntA, 0, 100, 5, function (v) { xSet(k, function (x) { x.cntA = v; }); }));
      pane.appendChild(xPick(XW.ctl.enc, L.sqEnc, ["symbol", "colour", "char", "shape"], function (v) { xSet(k, function (x) { x.sqEnc = v; }); }));
      pane.appendChild(xPick(XW.ctl.pal, L.sqPal, ["type", "channel", "entity", "mono"], function (v) { xSet(k, function (x) { x.sqPal = v; }); }));
      pane.appendChild(xPick(XW.ctl.shape, L.sqShape, ["round", "square"], function (v) { xSet(k, function (x) { x.sqShape = v; }); })); }
    box.appendChild(pane);
    var cp = el("div", "excp"), code = el("code", "exline", xCopy(k)), cb = el("button", "btn quiet excopy", XW.ctl.copy), said = el("span", "said"); cb.type = "button"; cb.setAttribute("data-tip", "excopy");
    cb.addEventListener("click", function () { copyText(code.textContent, said, XW.ctl.copied); }); cp.appendChild(code); cp.appendChild(cb); cp.appendChild(said); box.appendChild(cp);
    return box; }

  /* ── the copy line: the lab's own words for a block (COPYTXT), so the table's reads as his DATA line while it is his ── */
  function xBlockLine(k, L) { var cp = XW.cp[k], on = function (p) { return L.rows.some(function (r) { return r.l.indexOf(p) >= 0 || r.r.indexOf(p) >= 0; }); };
    var st = XPARTS[k].map(function (p) { if (p === "icon") return cp.icon + " " + (on(p) ? "on" : "off") + (k === "table" || !EX.parts[k] ? " " + L.iconCol : "");
      if (EX.modes[p] && (L.mode || {})[p] && EX.parts[k]) return cp[p] + " " + (on(p) ? L.mode[p] : "off"); return cp[p] + " " + (on(p) ? "on" : "off"); });
    var sizes = Object.keys(L.size).filter(function (p) { return XPARTS[k].indexOf(p) >= 0; }).map(function (p) { return p + " " + L.size[p]; });
    return "block " + L.form + " (" + st.join(", ") + ") · edge " + L.railSide + (L.railSide === "none" ? "" : " " + L.railStyle + " " + L.railW + "px")
      + " · chips count " + L.cntBox + " " + L.cntA + "%, " + XW.chipWord[k] + " " + L.rwBox + " " + L.rwA + "%"
      + " · lines " + L.rows.map(function (r) { return (r.l.join(" ") || "—") + " | " + (r.r.join(" ") || "—"); }).join(" / ")
      + " · sizes " + sizes.join(" ") + " · squares " + L.sqSize + "px gap " + L.sqGap + " " + L.sqShape + " as " + L.sqEnc + " by " + L.sqPal; }
  function xSame(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function xCopy(k) { var st = XS.col[k], it = xCurrent(k), L = st.look, whose = xWhose(k), mine = !xSame(L, EX.look[k]);
    return XW.copy.where + " · " + XW.kinds[k].name + " · " + (it ? xName(it) : "—") + " · " + fill(XW.copy.on, { ep: st.scope === "all" ? XW.copy.all : S.open })
      + " · " + xBlockLine(k, L) + " · " + XW.ctl.tray + " " + ((L.off || []).join(" ") || "—")
      + " (" + (mine ? W.copy.his : whose === "his" ? fill(XW.whose.his.name) + ", " + XW.look.table.ruled : whose === "lab" ? XW.whose.lab.name : W.copy.pick) + ")"; }
  function exLines() { return XK.filter(function (k) { return !EX.absent[k]; }).map(xCopy); }

  /* ── the section ── */
  function exBar() { var bar = $("exbar"); if (!bar) return; bar.textContent = "";
    [["lay", XS.lay], ["follow", XS.follow]].forEach(function (g) { var R = XW.opt[g[0]], grp = el("div", "mgrp"), o = el("div", "opts"); grp.appendChild(el("span", "rl", R.label));
      o.setAttribute("role", "radiogroup"); o.setAttribute("aria-label", R.label);
      Object.keys(R.opts).forEach(function (v) { o.appendChild(xOptBtn(g[0], v, R, g[1], function (nv) { XS[g[0]] = nv; xSave(); tipOff(); renderEx(); writeOut(LAST.L, LAST.GS); })); });
      grp.appendChild(o); bar.appendChild(grp); }); }
  function renderEx() { var box = $("exgrid"); if (!box || !BYID[S.open]) return; box.textContent = ""; box.setAttribute("data-lay", XS.lay);
    exBar(); XK.forEach(function (k) { box.appendChild(xCol(k)); }); }
  /* the element lit anywhere (D-041): its kind's column shows it, when the column holds it and the option says follow */
  function exFollow() { if (XS.follow !== "on" || !S.el) return; var hit = false;
    XK.forEach(function (k) { var st = XS.col[k], it = xList0(k).filter(function (x) { return x.id === S.el || (EX.cat[x.id] || {}).key === S.el; })[0];
      if (it && st.id !== it.id) { st.id = it.id; if (st.role && !xHasRole(k, it, st.role)) st.role = null; hit = true; } });
    if (hit) { renderEx(); writeOut(LAST.L, LAST.GS); } }
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("#ocol-uni [data-key], #ocol-cm [data-key], #sec-mo [data-key]"); if (t) setTimeout(exFollow, 0); });
  /* the hovers: a block's one card, and the controls' short words */
  function exTip(t, kind) {
    if (kind === "exblk") { var k = t.getAttribute("data-exk"), id = t.getAttribute("data-exid"), ep = t.getAttribute("data-exep"), r = BYID[ep], e = ((r && r.ex[k]) || []).filter(function (x) { return x[0] === id; })[0];
      return e ? xTipBlock(k, { k: k, id: id, role: e[1], ep: ep, o: e[2] }) : null; }
    if (kind === "exopt") { var g = t.getAttribute("data-xopt"), R = XW.opt[g], v = t.getAttribute("data-v"); return "<b>" + esc(R.opts[v].name) + "</b>" + (R.pick === v ? " · " + esc(W.pickMark) : "") + "<span class=pl>" + esc(R.opts[v].plain) + "</span>"; }
    if (kind === "exwho") { var wh = t.getAttribute("data-whose"); return "<b>" + esc(XW.whose[wh].name) + "</b><span class=pl>" + esc(fill(XW.whose[wh].plain, { v: XW.look.table.ruled })) + "</span>"; }
    if (kind === "exrole") { var col = t.closest(".excol").getAttribute("data-k"), rl = t.getAttribute("data-role"), RR = (XW.roles[col] || {})[rl];
      return "<b>" + esc(t.textContent) + "</b>" + (rl ? (RR && RR.plain ? "<span class=pl>" + esc(RR.plain) + "</span>" : col === "end" && W.kinds[rl] ? "<span class=pl>" + esc(W.kinds[rl].plain) + "</span>" : "") : "<span class=pl>" + esc(XW.ctl.allPlain) + "</span>"); }
    if (kind === "expart") { var kk = t.closest(".excol").getAttribute("data-k"), pp = t.getAttribute("data-part"); return "<b>" + esc(xPartWord(kk, pp)) + "</b><span class=pl>" + esc(xPartPlain(kk, pp) || "") + "</span>"; }
    if (kind === "exfold") return "<b>" + esc(t.textContent) + "</b><span class=pl>" + esc(XW.ctl.foldPlain) + "</span>";
    if (kind === "exreset") return esc(XW.ctl.resetPlain);
    if (kind === "excopy") return "<b>" + esc(XW.ctl.copy) + "</b><span class=pl>" + esc(XW.ctl.copyPlain) + "</span>";
    return null; }
  (function () { var I = $("info-ex"); if (!I) return; I.appendChild(el("p", "cap", XW.lede)); I.appendChild(el("p", "cap", XW.how)); })();
  window.__allepEx = { key: XKEY, state: XS, move: xMove, copy: xCopy, lines: exLines, render: function () { renderEx(); }, current: xCurrent, items: xItems,
    set: function (k, f) { xSet(k, f); }, pick: function (k, id) { XS.col[k].id = id; renderEx(); }, scope: function (k, v) { XS.col[k].scope = v; XS.col[k].role = null; renderEx(); },
    role: function (k, r) { XS.col[k].role = r; renderEx(); } };
