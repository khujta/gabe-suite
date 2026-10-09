  /* ══ D-099 · THE PORTRAIT, IN THE LAB'S FRAME (his: "We're also going to show that element in what would be the portrait panel … tables, for example, have different sections.
     I would like to replicate something similar here, actually kind of the same, because what we are going to configure is what we are going to show there in the endpoint lab
     later … You can interpolate or approximate what we want to show in that portrait section by looking in the endpoint lab at what we already have for the tables.").
     The frame is the lab's #port (endpoint-lab.html drawPortrait0): a head with the subject's glyph, what is drawn, the view's name and one square per way of drawing it; a body
     that is one of the lab's records (_lab-ep-panels.js). The views are the lab's own where it draws a portrait — a table's Record · Shape · Wheel · Keys (dataPortrait · dataShape ·
     dataWheel · dataKeys), a schema's and a function's Record (schRecord · fnRecord), an ending's Exit and a test's Case (the command panel's exitPortrait · casePortrait) — and
     approximated, said in the frame, for the three it draws none for (gate · hook · in-flight): the same record pattern over the bench's own data. Every value is the bench's
     catalogue (D.ex.cat) or the element's place on this endpoint (r.ex); the field marks wear the column's look, as the lab's portrait wears the blocks'. This file is inlined
     after _ae-card.js inside the page's script, so it draws with the bench's and the card's helpers. ══ */
  var PTV = { table: ["record", "shape", "wheel", "keys"], schema: ["record"], fn: ["record"], end: ["exit"], test: ["case"], gate: ["record"], hook: ["record"], inf: ["record"] };
  var PTLAB = { table: 1, schema: 1, fn: 1, end: 1, test: 1 };          /* the kinds the lab opens a portrait for — the other three are approximated, and the frame says so */
  var PF = XW.pf, PW = XW.portrait;
  function pfFrame(k, blk) { var box = el("div", "expf"), S0 = blk ? cdBlock(blk) : null, c = S0 && S0.c, it = S0 && S0.it, vs = PTV[k] || ["record"], v = vs.indexOf(XS.pv[k]) >= 0 ? XS.pv[k] : vs[0];
    box.setAttribute("data-pt", k); box.setAttribute("data-src", PTLAB[k] ? "lab" : "approx"); box.setAttribute("data-box", XS.box); box.setAttribute("data-pv", v);
    var hd = el("div", "expfhd"), ic = el("span", "pti"); ic.appendChild(xSvg(xColIco(k), 14, c ? "var(--accent)" : xKindCol(k, { kd: "success" }))); hd.appendChild(ic);
    hd.appendChild(xWrap(el("b", "expft"), c ? pfSubject(k, c) : XW.kinds[k].name)); hd.appendChild(el("span", "ptsub", PF.v[v].name));
    var nav = el("nav", "expfv"); vs.forEach(function (q) { var b = el("button", "ptv" + (q === v ? " on" : "")); b.type = "button"; b.setAttribute("data-pv", q); b.setAttribute("aria-pressed", q === v ? "true" : "false");
      b.setAttribute("aria-label", PF.v[q].name); b.setAttribute("data-tip", "expv"); b.appendChild(xSvg(PF.v[q].icon, 14, "currentColor"));
      b.addEventListener("click", function () { XS.pv[k] = q; xSave(); pfRe(k, blk, box); }); nav.appendChild(b); });   /* D-100: the controls follow the view, each view its own */
    hd.appendChild(nav); box.appendChild(hd);
    if (!PTLAB[k]) box.appendChild(el("p", "expfnote", fill(PW.approx, { kind: XW.kinds[k].name })));
    var b0 = el("div", "ptbody"); box.appendChild(b0);
    if (!c) { b0.className = "ptidle"; b0.appendChild(el("span", null, xCurrent(k) ? PW.empty : XS.col[k].role ? XW.ctl.noneRole : XW.ctl.none)); box.setAttribute("data-state", "empty"); return box; }   /* nothing to pick: the column's own sentence, not "pick one" */
    box.setAttribute("data-state", "drawn"); PFV[k][v](b0, c, it, S0, XS.col[k].look); box._pt = pfTailor(b0, k, v); return box; }
  function pfSubject(k, c) { return k === "end" ? c.st + " · " + xEndWords(c) : k === "test" ? c.cid : c.n; }

  /* ── the record's pieces, the lab's classes: the head (glyph · name), a row (its icon · its label · its value), a section, a table with named columns ── */
  function pfHd(b, icon, name, extra) { var h = el("div", "rchd"), i = el("span", "rci"); if (icon) i.appendChild(icon); h.appendChild(i); h.appendChild(xWrap(el("b"), name));
    (extra || []).forEach(function (x) { if (x) h.appendChild(x); }); b.appendChild(h); return h; }
  function pfRow(b, key, icon, value, label) { if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
    var r = el("div", "rcrow"), i = el("span", "rci"); r.setAttribute("data-row", key); i.appendChild(typeof icon === "string" ? xSvg(icon, 14, "var(--muted)") : icon); r.appendChild(i);
    r.appendChild(el("span", "k", label != null ? label : PF.r[key] || key));   /* "" = no label, the section names it */ var v = el("span", "v");
    (Array.isArray(value) ? value : [value]).forEach(function (x) { v.appendChild(typeof x === "string" || typeof x === "number" ? xWrap(el("span"), String(x)) : x); }); r.appendChild(v); b.appendChild(r); return r; }
  function pfChip(text, col) { var i = el("i", "rcchip", text); i.style.setProperty("--rwc", col || "var(--muted)"); return i; }
  function pfSec(b, key, title, n) { var s = el("div", "exptsec"); s.setAttribute("data-ps", key); s.setAttribute("data-pn", title); s.appendChild(el("h5", "ptsec", n == null ? title : title + " · " + n)); b.appendChild(s); return s; }
  function pfTab(b, heads, n, L, ec, key, name) { var t = xLookOn(el("div", "exw flds rctab"), L); if (ec) t.style.setProperty("--ec", ec); if (key) { t.setAttribute("data-tk", key); t.setAttribute("data-pn", name || heads[0]); }
    var h = el("div", "rcth"), f = el("span", "c-f", heads[0]); if (n != null) f.appendChild(el("i", "rcfp", String(n))); h.appendChild(f); h.appendChild(el("span", "c-k", heads[1])); h.appendChild(el("span", "c-t", heads[2]));
    t.appendChild(h); b.appendChild(t); return t; }
  function pfFld(t, mark, name, mid, ty, cls) { var f = el("div", "fld" + (cls ? " " + cls : "")), a = el("span", "c-f"); if (mark) a.appendChild(mark); a.appendChild(xWrap(el("span", "fn"), name)); f.appendChild(a);
    var m = el("span", "c-k"); (Array.isArray(mid) ? mid : [mid]).forEach(function (x) { if (x != null && x !== "") m.appendChild(typeof x === "string" ? xWrap(el("span"), x) : x); }); f.appendChild(m);
    f.appendChild(xWrap(el("span", "c-t ft"), ty == null || ty === "" ? PF.none : String(ty))); t.appendChild(f); return f; }
  function pfIco(name, z, col) { return xSvg(name, z, col); }
  function pfFile(c) { return c.at || c.file || null; }
  function pfFk(to) { var s = el("span", "fkx fko");   /* not "out": the page's kit owns .out (an output box 7em tall) */ s.appendChild(xSvg("key", 12, EX.col.kind.external)); s.appendChild(xWrap(el("span"), "→ " + (to || PF.keys.another))); return s; }
  function pfLines(b, S0) { var d = S0 && S0.P ? cdDetail(S0.P) : null; if (!d || d.hidden) return;
    var io = [].filter.call(d.children, function (x) { return x.classList.contains("io") && !x.hidden; });
    if (!io.length) { pfSec(b, "lines", PF.sec.lines).appendChild(d); return; }   /* the hovers drawn as one sentence (BY MOMENT's option): one section, as before */
    io.forEach(function (g) { var p = g.getAttribute("data-part"), s = el("div", "exptsec ptlines"), w = el("div", "cdd"); s.setAttribute("data-ps", PTLN[p] || p); s.setAttribute("data-pn", XIO.parts[p] || p);
      w.appendChild(g); s.appendChild(w); b.appendChild(s); }); }   /* D-100: before · checks · gives, each a section of its own — its name is the card's own, beside or above its lines */
  function pfEnding(ep, x) { var ec = EX.cat[ep + "|" + x]; return ec ? [cdStatusPill(ec.st), xWrap(el("span", "pfw"), xEndWords(ec))] : null; }

  /* ── the TABLE (the lab's four: Record · Shape · Wheel · Keys) ── */
  function pfFkSet(c) { var o = {}; (c.fks || []).forEach(function (f) { o[f[0]] = f[1] || true; }); return o; }
  function pfTypeCol(f) { return (XSQ[f[2]] || XSQ.other).col; }
  function pfTblGlyph(c, z) { return xStation("table:" + c.n, z, c.ec || EX.col.kind.model) || xSvg("model", z, c.ec || EX.col.kind.model); }
  function pfTblRecord(b, c, it, S0, L) { b.classList.add("ptrec"); var fk = pfFkSet(c), uq = xUqSet(c);
    pfHd(b, pfTblGlyph(c, 18), c.n);
    var en = el("span", null, c.ent || PF.none); en.style.color = c.ec || ""; pfRow(b, "entity", pfIco("entity", 14, c.ec || "var(--muted)"), en);
    pfRow(b, "model", pfIco("doc", 14, EX.col.kind.schema), c.model);
    pfRow(b, "file", "file", pfFile(c));
    pfRow(b, "channel", pfIco("role", 14, EX.col.opc.call), pfChip(PF.chan[it.role] || it.role, EX.col.rw[it.role]));
    var t = pfTab(b, [PF.cols.fields, PF.cols.fk, PF.cols.type], c.cols.length + (c.nmore || 0), L, c.ec, "fields");
    c.cols.forEach(function (f) { var x = (fk[f[0]] ? "fk" : "") + (uq[f[0]] ? " uq" : "");
      pfFld(t, xField(f, L, c, it, x.trim()), f[0], fk[f[0]] ? pfFk(fk[f[0]] === true ? null : fk[f[0]]) : null, f[1], x.trim()).setAttribute("data-col", f[0]); });
    (c.more || []).forEach(function (n) { var m = Array.isArray(n) ? n : [n]; pfFld(t, null, m[0], null, m[1], "more").setAttribute("data-col", m[0]); });   /* the model's columns the lab names without a mark: [name, type] */
    if (c.nmore && !(c.more || []).length) b.appendChild(el("div", "ptsec", fill(PF.more, { n: c.nmore }))); }
  function pfTblShape(b, c, it, S0, L) { b.classList.add("shp"); var fk = pfFkSet(c), uq = xUqSet(c), d = el("div", "shdrum");
    d.appendChild(pfTblGlyph(c, 58)); d.appendChild(xWrap(el("b"), c.n)); d.appendChild(el("span", null, fill(PF.drum, { ent: c.ent || PF.none, n: c.cols.length }))); b.appendChild(d);
    var g = el("div", "shgrid"); c.cols.forEach(function (f) { var q = el("div", "shcell" + (f[3] ? " opt" : "") + (fk[f[0]] ? " fk" : "") + (uq[f[0]] ? " uq" : "")); q.style.setProperty("--fc", pfTypeCol(f));
      q.appendChild(el("i", "shsw")); q.appendChild(xWrap(el("span", "fn"), f[0])); if (fk[f[0]]) q.appendChild(pfFk(fk[f[0]] === true ? null : fk[f[0]])); q.appendChild(xWrap(el("span", "ft"), f[1] || PF.none));
      q.setAttribute("data-col", f[0]); g.appendChild(q); }); b.appendChild(g);
    if (c.nmore) b.appendChild(el("div", "ptsec", fill(PF.more, { n: c.nmore }))); }
  function pfTblWheel(b, c, it, S0, L) { b.classList.add("whl"); var fk = pfFkSet(c), uq = xUqSet(c), n = c.cols.length, R = 118, r0 = 62, NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 300 300"); svg.setAttribute("class", "wsvg");
    c.cols.forEach(function (f, i) { var a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.012, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.012, P = function (r, a) { return (150 + r * Math.cos(a)) + " " + (150 + r * Math.sin(a)); };
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", "M" + P(R, a0) + "A" + R + " " + R + " 0 0 1 " + P(R, a1) + "L" + P(r0, a1) + "A" + r0 + " " + r0 + " 0 0 0 " + P(r0, a0) + "Z");
      p.setAttribute("fill", pfTypeCol(f)); p.setAttribute("fill-opacity", f[3] ? ".42" : ".92"); p.setAttribute("class", "wseg"); p.setAttribute("data-col", f[0]);
      if (fk[f[0]]) { p.setAttribute("stroke", EX.col.kind.external); p.setAttribute("stroke-width", "2"); }
      if (uq[f[0]]) { p.setAttribute("stroke", EX.col.opc.gate); p.setAttribute("stroke-width", "1.5"); p.setAttribute("stroke-dasharray", "3 2"); }
      svg.appendChild(p); });
    var w = el("div", "wwrap"), hub = el("div", "whub"); w.appendChild(svg); hub.appendChild(pfTblGlyph(c, 42)); hub.appendChild(el("b", null, String(n))); hub.appendChild(el("span", null, PF.hub)); w.appendChild(hub); b.appendChild(w);
    var mix = {}; c.cols.forEach(function (f) { var q = (XSQ[f[2]] || XSQ.other).key; mix[q] = (mix[q] || 0) + 1; });
    var lg = el("div", "wlgd"); EX.sq.forEach(function (x) { if (!mix[x.key]) return; var s = el("span", "lg"), sw = el("i", "sw"); sw.style.background = x.col; s.appendChild(sw); s.appendChild(document.createTextNode(x.word + " " + mix[x.key])); lg.appendChild(s); });
    b.appendChild(lg); b.appendChild(el("div", "ptsec", c.n + " · " + (c.ent || PF.none))); }
  function pfTblKeys(b, c, it, S0, L) { b.classList.add("keys"); var K = PF.keys, out = (c.fks || []).map(function (f) { return { col: f[0], to: f[1] }; }), inb = [];
    Object.keys(EX.cat).forEach(function (id) { var o = EX.cat[id]; if (o.k !== "table" || o.n === c.n) return;
      (o.fks || []).forEach(function (f) { if (f[1] && String(f[1]).split(".")[0] === c.n) inb.push({ from: o.n, col: f[0], ec: o.ec }); }); });
    var uqs = (c.uq || []).length ? c.uq.map(function (u) { return u[1] || []; }) : (c.uqs || []).map(function (u) { return Array.isArray(u) ? u : [u]; });
    var ce = el("div", "kcentre"); ce.appendChild(pfTblGlyph(c, 34)); ce.appendChild(xWrap(el("b"), c.n)); ce.appendChild(el("span", null, fill(K.sum, { u: uqs.length, o: out.length, i: inb.length }))); b.appendChild(ce);
    var lane = function (key, title, rows, empty) { var s = pfSec(b, key, title); if (!rows.length) s.appendChild(el("div", "kempty", empty)); rows.forEach(function (r) { s.appendChild(r); }); };
    var krow = function (cls, col, parts) { var r = el("div", "krow " + cls); r.appendChild(xSvg("key", 13, col)); parts.forEach(function (p) { r.appendChild(xWrap(el("span", p[0]), p[1])); }); return r; };
    lane("out", K.out, out.map(function (o) { return krow("kout", EX.col.kind.external, [["kc", o.col], ["ka", "→"], ["kt", o.to || K.another]]); }), K.noOut);
    lane("in", K["in"], inb.map(function (o) { var r = krow("kin", o.ec || "var(--muted)", [["kt", o.from], ["ka", "→"], ["kc", o.col]]); r.style.setProperty("--ec", o.ec || "var(--rule)"); return r; }), K.noIn);
    lane("uq", K.uq, uqs.map(function (u) { return krow("kuq", EX.col.opc.gate, [["kc", u.join(" + ")]]); }), K.noUq); }

  /* ── the SCHEMA (the lab's Record) ── */
  function pfSchBase(t) { var m = String(t || "").match(/[A-Z]\w+/g) || []; return m.filter(function (n) { return EX.cat["schema:" + n]; })[0] || null; }
  function pfSchRecord(b, c, it, S0, L) { b.classList.add("ptrec"); var side = String(it.role).split("-")[0], dc = (EN.dir[side] || {}).col || EX.col.kind.schema;
    pfHd(b, xSvg("schema", 18, EX.col.kind.schema), c.n);
    pfRow(b, "channel", pfIco("role", 14, EX.col.opc.call), pfChip(PF.dir[it.role] || it.role, dc));
    if (c.ent) { var en = el("span", null, c.ent); en.style.color = c.ec || ""; pfRow(b, "entity", pfIco("entity", 14, c.ec || "var(--muted)"), en); }
    if (it.o.parent) pfRow(b, "parent", "link", it.o.parent); else pfRow(b, "body", (EN.dir[side] || {}).icon || "schema", PF.top);
    pfRow(b, "file", "file", pfFile(c));
    if (c.extra) pfRow(b, "extra", "info", PF.extra[c.extra] || c.extra);
    if (!it.o.parent && side === "out" && c.cons != null) pfRow(b, "shared", "link", c.cons > 1 ? fill(PF.shared, { n: c.cons }) : PF.alone);
    var t = pfTab(b, [PF.cols.fields, PF.cols.nest, PF.cols.type], c.cols.length, L, c.ec, "fields");
    c.cols.forEach(function (f) { var nb = pfSchBase(f[1]), mid = nb ? [xSvg("schema", 12, EX.col.kind.schema), nb] : f[5] || null;
      pfFld(t, xField([f[0], f[1], f[2], f[4] ? 0 : 1], L, c, it), f[0], mid, f[1], nb ? "nest" : "").setAttribute("data-col", f[0]); }); }

  /* ── the FUNCTION (the lab's Record) ── */
  function pfFnRecord(b, c, it, S0, L) { b.classList.add("ptrec"); var o = it.o, rc = EX.col.role[c.role] || EX.col.kind["function"];
    pfHd(b, xSvg("function", 18, c.nokey ? "var(--muted)" : rc), c.n);
    if (c.role) pfRow(b, "role", pfIco("role", 14, rc), pfChip(c.role, rc));
    pfRow(b, "entity", "entity", c.ent);
    pfRow(b, "level", c.nokey ? "info" : o.h ? "target" : "link", c.nokey ? XW.face.noKey : o.h ? fill(PF.lvl0, { n: 0 }) : o.lv != null ? fill(PF.lvlN, { n: o.lv, via: o.via || PF.none }) : null);   /* a function the map knows by name only says so, as its card and block do */
    pfRow(b, "file", "file", pfFile(c));
    pfRow(b, "size", "info", [c.lines != null ? fill(PF.lines, { n: c.lines }) : null, c.async ? PF.async : null, c.ret ? fill(PF.ret, { v: c.ret }) : null].filter(Boolean).join(" · "));
    if (c.commits) pfRow(b, "commits", pfIco("key", 14, EX.col.opc.write), PF.commits);
    if ((c.raises || []).length) pfRow(b, "raises", "info", c.raises.map(function (r) { return r[0]; }).join(" · "));
    if (c.doc) pfRow(b, "doc", "doc", c.doc);
    if ((o.ops || []).length) { var t = pfTab(b, [PF.cols.tables, PF.cols.chan, PF.r.model], o.ops.length, L, null, "tables", PF.sec.tables);
      o.ops.forEach(function (q) { var tc = EX.cat["table:" + q[1]] || {}, rw = q[0] === "w" ? "w" : q[0] === "rw" ? "rw" : "r";
        pfFld(t, xStation("table:" + q[1], 13, tc.ec || EX.col.kind.model) || xSvg("model", 13, tc.ec || EX.col.kind.model), q[1], pfChip(rw.toUpperCase(), EX.col.rw[rw]), tc.model || null).setAttribute("data-table", q[1]); }); }
    if ((o.calls || []).length) { var t2 = pfTab(b, [PF.cols.calls, PF.cols.role, PF.cols.lines], o.calls.length, L, null, "calls", PF.sec.calls);
      o.calls.forEach(function (q) { var K = xT(q[0]), cc = EX.cat[K] || {}, col = EX.col.role[cc.role] || "var(--muted)";
        pfFld(t2, xSvg("function", 13, col), xFnName(K) || PF.none, cc.role ? pfChip(cc.role, col) : null, cc.lines != null ? String(cc.lines) : null).setAttribute("data-call", xFnName(K) || ""); }); } }

  /* ── the ENDING (the command panel's Exit — D-098's sections, now in the frame's record) ── */
  function pfExit(b, c, it, S0, L) { b.classList.add("ptrec"); var F = PW.f, g = XPART.end("icon", c, it, L, 18);
    pfHd(b, g ? g.firstChild : null, xEndWords(c), [cdStatusPill(c.st), el("span", "cdv", c.sg)]).classList.add("pfexit");
    var s1 = pfSec(b, "facts", PW.sec.facts);
    pfRow(s1, "stage", "journey", c.sg, F.stage); pfRow(s1, "where", "file", c.at, F.where); pfRow(s1, "how", "link", c.via ? xHow(c.via) : null, F.how); pfRow(s1, "check", "shield", c.pred, F.check);
    pfRow(s1, "code", "key", c.code, F.code); pfRow(s1, "form", "doc", xAform(c), F.form); pfRow(s1, "decl", "info", pfChip.apply(null, xDecl(c)), F.decl);
    pfLines(b, S0);
    var s3 = pfSec(b, "answer", PW.sec.answer); pfRow(s3, "media", "doc", c.media, F.media); pfRow(s3, "model", "model", c.model, F.model); pfRow(s3, "fields", "schema", (c.fl || []).join(" · "), F.fields);
    pfRow(s3, "body", "doc", (c.body || []).join(" · "), F.body);
    pfRow(s3, "headers", "info", (c.hd || []).map(function (q) { return q[0] + (q[1] && q[1] !== "…" ? ": " + q[1] : ""); }).join(" · ") || PW.noHdr, F.headers);
    if ((c.cases || []).length) { var s4 = pfSec(b, "rules", PW.sec.rules, c.cases.length); c.cases.forEach(function (q) { pfRow(s4, "rule", "schema", [q[1], q[2]].filter(Boolean).join(" · "), q[0]); }); }
    var s5 = pfSec(b, "ways", PW.sec.ways, c.paths.length), wr = xLookOn(el("div", "exw exptw"), L);
    c.paths.forEach(function (pid, i) { var r = el("div", "exptway"); r.appendChild(el("span", "exptl", String(i + 1))); r.appendChild(xStrip("end", Object.assign({}, c, { paths: [pid] }), it, L)); wr.appendChild(r); }); s5.appendChild(wr);
    var s6 = pfSec(b, "tests", PW.sec.tests, (c.tests || []).length), tl = el("div", "expttests"); (c.tests || []).forEach(function (t) { tl.appendChild(cdPill(t, EX.col.opc.read, L)); });
    if (!(c.tests || []).length) tl.appendChild(el("span", "exhint", PW.noTest)); s6.appendChild(tl); }

  /* ── the TEST (the command panel's Case) ── */
  function pfCase(b, c, it, S0, L) { b.classList.add("ptrec"); var o = it.o, here = (o.here || []).map(function (i) { return c.calls[i]; }).filter(Boolean), A = xAsserts(here), tc = xKindCol("test", c);
    pfHd(b, xSvg("test", 18, tc), c.cid);
    pfRow(b, "name", "doc", c.n); pfRow(b, "file", "file", c.file ? c.file + (c.line != null ? ":" + c.line : "") : null); pfRow(b, "corpus", "info", c.corpus);
    if (c.state) pfRow(b, "state", "test", pfChip(c.state, c.state === "pass" ? EX.col.opc.read : "#d64545"));
    pfRow(b, "role", "role", xRoleName("test", it.role));
    pfRow(b, "asserts", "target", A.st.concat(A.f).join(" · "));
    var snd = {}; here.forEach(function (q) { (q[5] || []).forEach(function (h) { snd[h] = 1; }); }); pfRow(b, "sends", "up", Object.keys(snd).join(" · "));
    var pv = (o.ends || []).filter(function (e) { return e[1] === "refs"; }), s = pfSec(b, "proves", PF.sec.proves, pv.length), l = el("div", "pfends");
    pv.forEach(function (e) { var w = pfEnding(it.ep, e[0]); if (!w) return; var r = el("span", "pfend"); w.forEach(function (x) { r.appendChild(x); }); l.appendChild(r); });
    if (!pv.length) l.appendChild(el("span", "exhint", PF.nothing)); s.appendChild(l);
    var t = pfTab(pfSec(b, "steps", PF.sec.steps, c.calls.length), [PF.cols.step, PF.cols.role, PF.cols.asserts], null, L);
    c.calls.forEach(function (q, i) { var f = pfFld(t, el("b", "exmth", q[0]), String(q[1] || "").replace(/^\S+ /, ""), xRoleName("test", q[2]) || q[2], (q[6] || []).join(" · ") || null, (o.here || []).indexOf(i) >= 0 ? "here" : "");
      f.setAttribute("data-step", String(i)); }); }

  /* ── the three the lab draws no portrait for, approximated in the same record ── */
  function pfGate(b, c, it, S0, L) { b.classList.add("ptrec"); var o = it.o, gc = EX.col.opc.gate, ec = o.eff ? EX.cat[it.ep + "|" + o.eff] : null;
    pfHd(b, xGateIco(it, 18, gc), c.n);
    pfRow(b, "role", pfIco("shield", 14, gc), pfChip(xRoleName("gate", it.role), gc));
    pfRow(b, "where", "function", o.fn != null ? xFnName(xT(o.fn)) : o.place || null);
    pfRow(b, "file", "file", o.at != null ? xT(o.at) : null);
    pfRow(b, "cond", "shield", c.raw || c.n);
    if (ec) pfRow(b, "gives", "target", [cdStatusPill(ec.st), xWrap(el("span", "pfw"), xEndWords(ec))]); else if (o.st) pfRow(b, "gives", "target", cdStatusPill(o.st));
    if (o.gl && XF.gdl.vals[o.gl]) pfRow(b, "level", "journey", XF.gdl.vals[o.gl].name);
    if ((o.after || []).length) pfRow(b, "after", "link", o.after.map(xT).filter(Boolean).join(" · "));
    pfLines(b, S0);
    var s = pfSec(b, "tests", PF.sec.tests, (o.tests || []).length), tl = el("div", "expttests"); (o.tests || []).forEach(function (t) { tl.appendChild(cdPill(t, EX.col.opc.read, L)); });
    if (!(o.tests || []).length) tl.appendChild(el("span", "exhint", PW.noTest)); s.appendChild(tl); }
  function pfHook(b, c, it, S0, L) { b.classList.add("ptrec"); var o = it.o, hc = EX.col.hrole[it.role] || EX.col.kind.hook;
    pfHd(b, xStation(c.key, 18, hc) || xSvg("hook", 18, hc), c.n);
    pfRow(b, "role", pfIco("role", 14, hc), pfChip(xRoleName("hook", it.role), hc));
    pfRow(b, "fkind", "info", c.fkind ? XW.face[c.fkind] || c.fkind : null);
    pfRow(b, "file", "file", pfFile(c));
    if ((o.send || []).length) { var s1 = pfSec(b, "sends", PF.sec.sends, o.send.length); o.send.forEach(function (q) { pfRow(s1, "send", "up", [el("b", "exmth", q[0]), q[1]], q[2] || PF.r.sends); }); }
    if ((o.refresh || []).length) { var s2 = pfSec(b, "refresh", PF.sec.refresh, o.refresh.length); o.refresh.forEach(function (q) { pfRow(s2, "refresh", "link", q[0], q[1] || PF.none); }); }
    if ((o.screens || []).length) { var s4 = pfSec(b, "screens", PF.sec.screens, o.screens.length); o.screens.forEach(function (q) { pfRow(s4, "screen", "doc", q, ""); }); }
    if ((o.react || []).length) { var s3 = pfSec(b, "react", PF.sec.react, o.react.length);
      o.react.forEach(function (q) { var r = pfRow(s3, "react", "target", [q[2] ? (q[3] || PF.own) : PF.rest].concat(q[4] ? [el("span", "pfat", q[4])] : []), "");
        r.querySelector(".k").textContent = ""; r.querySelector(".k").appendChild(cdStatusPill(q[1])); if (q[2]) r.classList.add("own"); }); }
    pfLines(b, S0); }
  function pfInf(b, c, it, S0, L) { b.classList.add("ptrec"); var o = it.o, lc = EN.life[c.dies] || "var(--muted)";
    pfHd(b, xSvg(xInfIco(c), 18, xKindCol("inf", c)), c.n);
    pfRow(b, "kind", "info", xRoleName("inf", c.ik));
    pfRow(b, "lives", pfIco("journey", 14, lc), pfChip(xLife(c.dies), lc));
    pfRow(b, "set", "file", c.set); pfRow(b, "by", "function", c.by); pfRow(b, "in", "link", c["in"]);
    pfRow(b, "carrier", "key", c.carrier); pfRow(b, "from", "link", c.from ? c.from.filter(Boolean).join(" ") : null); pfRow(b, "value", "doc", c.expr);
    if ((o.reads || []).length) { var s = pfSec(b, "reads", PF.sec.reads, o.reads.length); o.reads.forEach(function (q) { pfRow(s, "read", "function", [xT(q[1]) || PF.none].concat(q[0] != null ? [el("span", "pfat", xT(q[0]))] : []), q[2] || PF.none); }); }
    pfLines(b, S0); }

  /* ══ D-100 · HOW THE PORTRAIT IS DRAWN (his: "add some configuration on the right of the portrait, similar to the configuration that we have for the card, but for the
     portrait: stuff like what we show, how we show it, the order of the things in different sections, and the layout … in the before section … for checks and gives").
     The record is taken apart after it is drawn, the same way for every kind: its sections (.exptsec), its top rows (one section, "its facts"), each top table (a section of
     its own); rows under one key (a rule, a send) move as one. Kept per kind and per way of drawing it: the sections' order and which are drawn, each section's rows the same
     way, what each row shows, and where each section puts its names. My picks, dashed: every row as the lab draws it, names beside — before, checks and gives above (D-095) ══ */
  var PTLN = { b: "before", c: "checks", g: "gives" }, PTABS = ["parts", "order", "show", "layout"], PFORMS = ["ilv", "lv", "iv", "v"], PLAYS = ["beside", "above"];
  var PICON = { ilv: '<circle cx="5" cy="12" r="2.5"/><path d="M10 12h3M16 12h5"/>', lv: '<path d="M3 12h5M12 12h9"/>', iv: '<circle cx="5" cy="12" r="2.5"/><path d="M11 12h10"/>', v: '<path d="M3 12h18"/>' };
  function pfLay0(q) { return PTLN.b === q || PTLN.c === q || PTLN.g === q ? "above" : "beside"; }
  function pfLook(k, v) { var T = XS.pt[k + ":" + v]; T = T && typeof T === "object" ? T : {};   /* what was remembered, each value checked: a key no section has is ignored where it is drawn */
    var A = function (x) { return Array.isArray(x) ? x.filter(function (q) { return typeof q === "string"; }) : []; },
      O = function (x, f) { var o = {}; if (x && typeof x === "object" && !Array.isArray(x)) Object.keys(x).forEach(function (q) { var y = f(x[q]); if (y != null) o[q] = y; }); return o; },
      In = function (L) { return function (x) { return L.indexOf(x) >= 0 ? x : null; }; };
    return { order: A(T.order), off: A(T.off), rows: O(T.rows, A), roff: O(T.roff, A), form: O(T.form, In(PFORMS)), lay: O(T.lay, In(PLAYS)) }; }
  /* the remembered order over what this element has: a section or a row he has not placed keeps its place after the one it followed */
  function pfMerge(nat, saved) { var out = saved.filter(function (q, i) { return nat.indexOf(q) >= 0 && saved.indexOf(q) === i; });
    nat.forEach(function (q, i) { if (out.indexOf(q) >= 0) return; var j = i - 1; while (j >= 0 && out.indexOf(nat[j]) < 0) j--; out.splice(j < 0 ? 0 : out.indexOf(nat[j]) + 1, 0, q); }); return out; }
  function pfUnits(b) { var secs = [], about = null, last = null;
    [].slice.call(b.children).forEach(function (n) { var C = n.classList;
      if (C.contains("rcrow")) { if (!about) { about = el("div", "exptsec ptabout"); about.setAttribute("data-ps", "about"); about.setAttribute("data-pn", PF.ctl.about); b.insertBefore(about, n); secs.push(about); } about.appendChild(n); last = about; return; }
      if (C.contains("rctab")) { var s = el("div", "exptsec pttab"); s.setAttribute("data-ps", n.getAttribute("data-tk") || "table"); s.setAttribute("data-pn", n.getAttribute("data-pn") || PF.cols.fields); b.insertBefore(s, n); s.appendChild(n); secs.push(s); last = s; return; }
      if (C.contains("exptsec")) { secs.push(n); last = n; return; }
      if (last && C.contains("ptsec")) last.appendChild(n); });   /* a caption under a table ("and n more") stays with it */
    return secs; }
  function pfRowsOf(s) { var g = {}, ks = []; [].forEach.call(s.children, function (r) { if (!r.classList.contains("rcrow")) return; var q = r.getAttribute("data-row") || "row"; if (!g[q]) { g[q] = []; ks.push(q); } g[q].push(r); }); return { g: g, ks: ks }; }
  function pfRowName(q, rs) { if (PF.ctl.rows[q]) return PF.ctl.rows[q]; var t = rs.map(function (r) { var x = r.querySelector(".k"); return x ? x.textContent.trim() : ""; });
    return t[0] && t.every(function (x) { return x === t[0]; }) ? t[0] : PF.r[q] || q; }
  function pfTailor(b, k, v) { var T = pfLook(k, v), secs = pfUnits(b), by = {}, nat = [], D = { k: k, v: v, secs: [] };
    secs.forEach(function (s) { var q0 = s.getAttribute("data-ps"), q = q0, n = 2; while (by[q]) q = q0 + "-" + n++; s.setAttribute("data-ps", q); by[q] = s; nat.push(q); });
    pfMerge(nat, T.order).forEach(function (q) { var s = by[q], R = pfRowsOf(s), off = T.off.indexOf(q) >= 0,
        d = { key: q, name: s.getAttribute("data-pn") || q, kind: s.classList.contains("ptlines") ? "lines" : s.classList.contains("pttab") ? "tab" : R.ks.length ? "rows" : "other", off: off, rows: [], lay: T.lay[q] || pfLay0(q), node: s };
      if (R.ks.length) { var rs0 = [].filter.call(s.children, function (x) { return x.classList.contains("rcrow"); }), at = rs0[rs0.length - 1].nextSibling, roff = T.roff[q] || [];
        pfMerge(R.ks, T.rows[q] || []).forEach(function (rq) { var rs = R.g[rq], ro = roff.indexOf(rq) >= 0, f = T.form[q + "/" + rq] || PFORMS[0], ic = rs[0].querySelector(".rci svg");
          d.rows.push({ key: rq, name: pfRowName(rq, rs), icon: ic ? ic.cloneNode(true) : null, off: ro, form: f, nodes: rs });
          rs.forEach(function (r) { r.remove(); if (!ro) { r.setAttribute("data-pf", f); s.insertBefore(r, at); } }); }); }
      s.setAttribute("data-lay", d.lay); D.secs.push(d); if (off) s.remove(); else b.appendChild(s); });
    return D; }
  /* the frame and its controls drawn again together, after a view or a control changed */
  function pfRe(k, blk, f0) { var f = f0 || document.querySelector("#exact .expf"), ar = f && f.closest(".exabody"), c = ar ? ar.querySelector(".expctl") : null, nf = pfFrame(k, blk);
    if (f) f.replaceWith(nf); if (c) c.replaceWith(pfCtl(k, blk, nf)); }
  function pfPut(k, v, blk, f) { var T = pfLook(k, v); f(T); XS.pt[k + ":" + v] = T; xSave(); pfRe(k, blk); }
  function pfSecIco(d, z) { return xSvg(d.kind === "lines" ? "journey" : d.kind === "tab" ? "model" : d.kind === "rows" ? "doc" : "info", z || 13, "currentColor"); }
  function pfChipB(cls, icon, name, key, vars, data) { var A = XW.act[key], obj = fill(A.obj, vars), b = el("button", "expc " + cls); b.type = "button"; b.setAttribute("aria-label", A.verb + " " + obj);
    b.setAttribute("data-tip", "exctl"); b.setAttribute("data-verb", A.verb); b.setAttribute("data-obj", obj); if (icon) b.appendChild(icon); b.appendChild(el("span", null, name)); b.draggable = true;
    b.addEventListener("dragstart", function (e) { try { e.dataTransfer.setData("text/plain", data); e.dataTransfer.effectAllowed = "move"; } catch (x) {} b.classList.add("dragging"); });
    b.addEventListener("dragend", function () { b.classList.remove("dragging"); }); return b; }
  function pfDrop(z, on) { z.addEventListener("dragover", function (e) { e.preventDefault(); z.classList.add("over"); }); z.addEventListener("dragleave", function () { z.classList.remove("over"); });
    z.addEventListener("drop", function (e) { e.preventDefault(); z.classList.remove("over"); if (on((e.dataTransfer.getData("text/plain") || "").split("|"), e) !== false) e.stopPropagation(); }); }
  function pfAt(z, e, skip) { return [].filter.call(z.querySelectorAll(".expc"), function (c) { if (c.getAttribute("data-row") === skip) return false; var r = c.getBoundingClientRect(); return e.clientX > r.left + r.width / 2 || e.clientY > r.bottom; }).length; }
  function pfCopy(k, v, D) { var C = PF.ctl, mine = JSON.stringify(XS.pt[k + ":" + v] || {}) !== "{}", on = D.secs.filter(function (d) { return !d.off; }), off = D.secs.filter(function (d) { return d.off; });
    return XW.copy.where + " · " + C.copy + " · " + XW.kinds[k].name + " · " + PF.v[v].name + " · " + C.secs + " " + on.map(function (d) { var rs = d.rows.filter(function (x) { return !x.off; }), ro = d.rows.filter(function (x) { return x.off; });
        return d.name + (d.kind === "lines" || rs.length ? " (" + C.lays[d.lay].name + ")" : "") + (rs.length ? ": " + rs.map(function (x) { return x.name + (x.form !== PFORMS[0] ? " as " + C.forms[x.form].name : ""); }).join(", ") : "")
          + (ro.length ? "; " + C.tray + " " + ro.map(function (x) { return x.name; }).join(", ") : ""); }).join(" → ")
      + " · " + C.tray + " " + (off.map(function (d) { return d.name; }).join(", ") || "—") + " (" + (mine ? W.copy.his : W.copy.pick) + ")"; }
  function pfCtl(k, blk, f) { var C = PF.ctl, box = el("div", "expctl"), D = f && f._pt, v = D ? D.v : null; box.setAttribute("data-k", k); box.appendChild(el("h4", "exsh", C.title));
    if (!D || !D.secs.length) { box.appendChild(el("p", "exhint", D ? C.noSec : XW.row.noEl)); return box; }
    var bar = el("div", "extabs"); bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", C.tabsLabel);
    var show = function () { bar.querySelectorAll(".exptab").forEach(function (b) { var on = b.getAttribute("data-ptab") === XS.ptab; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
      box.querySelectorAll(".extp").forEach(function (q) { q.hidden = q.getAttribute("data-ptp") !== XS.ptab; }); };
    PTABS.forEach(function (t, i) { var b = el("button", "exptab", C.tab[t].name);   /* not .extab: the card's tabs are found by that name */ b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("data-ptab", t);
      b.addEventListener("click", function () { XS.ptab = t; xSave(); show(); });
      b.addEventListener("keydown", function (e) { var dd = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!dd) return; e.preventDefault(); XS.ptab = PTABS[(i + dd + PTABS.length) % PTABS.length]; xSave(); show();
        var q = bar.querySelector('[data-ptab="' + XS.ptab + '"]'); if (q) q.focus(); });
      bar.appendChild(b); }); box.appendChild(bar);
    var pane = function (t) { var d = el("div", "extp"); d.setAttribute("role", "tabpanel"); d.setAttribute("data-ptp", t); d.appendChild(el("p", "exhint", C.tab[t].plain)); box.appendChild(d); return d; };
    var keys = function (L, drawn) { return L.filter(function (x) { return !!x.off !== drawn; }).map(function (x) { return x.key; }); };
    /* PARTS (D-103): every section and its rows in the order the portrait draws them, each an eye; hiding keeps the row in place (D-102), its name shows its value */
    var pp = pane("parts"), tb = el("div", "exptbl ptptbl"), sk = D.secs.map(function (x) { return x.key; });
    D.secs.forEach(function (d) { var r = el("div", "exptr" + (d.off ? " exptoff" : "")), h = el("span", "exprn"); r.setAttribute("data-ps", d.key);
      var e = xAct("opt exo exi expon", d.off ? XICON.eye.off : XICON.eye.on, d.off ? "ptShow" : "ptHide", { name: d.name }, function () {
        pfPut(k, v, blk, function (T) { T.order = sk.slice(); T.off = d.off ? T.off.filter(function (q) { return q !== d.key; }) : T.off.concat([d.key]); }); });
      e.setAttribute("aria-pressed", d.off ? "false" : "true"); r.appendChild(e); h.appendChild(pfSecIco(d)); h.appendChild(el("span", null, d.name)); r.appendChild(h);
      xPv(h, function () { return pfPvNode(f, d); }); tb.appendChild(r);
      d.rows.forEach(function (rw) { var rr = el("div", "exptr ptprow" + (rw.off || d.off ? " exptoff" : "")), h2 = el("span", "exprn"); rr.setAttribute("data-ps", d.key); rr.setAttribute("data-row", rw.key);
        var e2 = xAct("opt exo exi expon", rw.off ? XICON.eye.off : XICON.eye.on, rw.off ? "ptShow" : "ptHide", { name: rw.name }, function () {
          pfPut(k, v, blk, function (T) { var o = T.roff[d.key] || []; T.rows[d.key] = d.rows.map(function (x) { return x.key; }); T.roff[d.key] = rw.off ? o.filter(function (q) { return q !== rw.key; }) : o.concat([rw.key]); }); });
        e2.setAttribute("aria-pressed", rw.off ? "false" : "true"); rr.appendChild(e2); if (rw.icon) h2.appendChild(rw.icon.cloneNode(true)); h2.appendChild(el("span", null, rw.name)); rr.appendChild(h2);
        xPv(h2, function () { return pfPvNode(f, d, rw); }); tb.appendChild(rr); }); });
    pp.appendChild(tb);
    /* ORDER: the sections top to bottom, each with its rows; drag a section onto another (above or below its middle), a row along its own section; either into not drawn */
    var po = pane("order"), list = el("div", "ptslist"), sbin = el("div", "dzone exz exoff ptsoff"); sbin.setAttribute("aria-label", C.tray);
    var moveSec = function (a, to, after) { pfPut(k, v, blk, function (T) { var on = keys(D.secs, true).filter(function (q) { return q !== a; }), off = keys(D.secs, false).filter(function (q) { return q !== a; });
      if (to == null) off.push(a); else on.splice(on.indexOf(to) + (after ? 1 : 0), 0, a); T.order = on.concat(off); T.off = off; }); };
    D.secs.forEach(function (d) { var sc = pfChipB("ptsc", pfSecIco(d), d.name, "ptMove", { name: d.name }, "pts|" + d.key); sc.setAttribute("data-ps", d.key);
      if (d.off) { sbin.appendChild(sc); return; }
      var r = el("div", "ptsrow"); r.setAttribute("data-ps", d.key); r.appendChild(sc);
      if (d.rows.length) { var w = el("div", "ptrws"), z = el("div", "dzone exz ptrz"), zo = el("div", "dzone exz exoff ptrz ptroff"), lb = el("div", "ptrofl"); z.setAttribute("data-ps", d.key); zo.setAttribute("data-ps", d.key); zo.setAttribute("aria-label", C.tray);
        d.rows.forEach(function (rw) { var c = pfChipB("ptrc", rw.icon ? rw.icon.cloneNode(true) : null, rw.name, "ptRow", { name: rw.name }, "ptr|" + d.key + "|" + rw.key); c.setAttribute("data-row", rw.key); (rw.off ? zo : z).appendChild(c); });
        [[z, true], [zo, false]].forEach(function (Z) { pfDrop(Z[0], function (dd, e) { if (dd[0] !== "ptr" || dd[1] !== d.key || !dd[2]) return false; var at = Z[1] ? pfAt(Z[0], e, dd[2]) : 0;
          pfPut(k, v, blk, function (T) { var on = keys(d.rows, true).filter(function (q) { return q !== dd[2]; }), off = keys(d.rows, false).filter(function (q) { return q !== dd[2]; });
            if (Z[1]) on.splice(Math.min(at, on.length), 0, dd[2]); else off.push(dd[2]); T.rows[d.key] = on.concat(off); T.roff[d.key] = off; }); }); });
        w.appendChild(z); lb.appendChild(el("span", "dzl", C.tray)); lb.appendChild(zo); w.appendChild(lb); r.appendChild(w); }
      pfDrop(r, function (dd, e) { if (dd[0] !== "pts" || !dd[1]) return false; if (dd[1] === d.key) return; var bx = r.getBoundingClientRect(); moveSec(dd[1], d.key, e.clientY > bx.top + bx.height / 2); });
      list.appendChild(r); });
    pfDrop(sbin, function (dd) { if (dd[0] !== "pts" || !dd[1]) return false; moveSec(dd[1], null); });
    var sb = el("div", "ptsbin"); sb.appendChild(el("span", "dzl", C.tray)); sb.appendChild(sbin); po.appendChild(list); po.appendChild(sb);
    /* SHOW: what each drawn row shows — its icon, its label, its value, or less */
    var ps = pane("show"), anyR = false;
    D.secs.forEach(function (d) { var rs = d.rows.filter(function (x) { return !x.off; }); if (d.off || !rs.length) return; anyR = true; ps.appendChild(el("h5", "exsh2 ptsh", d.name));
      rs.forEach(function (rw) { var r = el("div", "expr"), h = el("span", "exprn"), o = el("div", "opts exforms"); r.setAttribute("data-ps", d.key); r.setAttribute("data-row", rw.key);
        if (rw.icon) h.appendChild(rw.icon.cloneNode(true)); h.appendChild(el("span", null, rw.name)); r.appendChild(h); o.setAttribute("role", "radiogroup"); o.setAttribute("aria-label", rw.name);
        PFORMS.forEach(function (fm) { var b = xAct("opt exo exi", PICON[fm], "ptForm", { name: rw.name, v: C.forms[fm].name }, function () { pfPut(k, v, blk, function (T) { T.form[d.key + "/" + rw.key] = fm; }); });
          b.setAttribute("role", "radio"); b.setAttribute("data-pform", d.key + "/" + rw.key); b.setAttribute("data-v", fm); b.setAttribute("aria-checked", rw.form === fm ? "true" : "false"); if (fm === PFORMS[0]) b.setAttribute("data-pick", "true"); o.appendChild(b); });
        r.appendChild(o); ps.appendChild(r); }); });
    if (!anyR) ps.appendChild(el("p", "exhint", C.noRows));
    /* LAYOUT: per section that names its rows or its lines, the names beside or above */
    var pl = pane("layout"), anyL = false;
    D.secs.forEach(function (d) { if (d.off || !(d.kind === "lines" || d.rows.some(function (x) { return !x.off; }))) return; anyL = true;
      var r = el("div", "expr"), h = el("span", "exprn"), o = el("div", "opts exforms"); r.setAttribute("data-ps", d.key); h.appendChild(pfSecIco(d)); h.appendChild(el("span", null, d.name)); r.appendChild(h);
      o.setAttribute("role", "radiogroup"); o.setAttribute("aria-label", d.name);
      PLAYS.forEach(function (L0) { var b = xAct("opt exo exi", XICON.card[L0 === "beside" ? "cols" : "rows"], "ptLay", { name: d.name, v: C.lays[L0].name }, function () { pfPut(k, v, blk, function (T) { T.lay[d.key] = L0; }); });
        b.setAttribute("role", "radio"); b.setAttribute("data-play", d.key); b.setAttribute("data-v", L0); b.setAttribute("aria-checked", d.lay === L0 ? "true" : "false"); if (pfLay0(d.key) === L0) b.setAttribute("data-pick", "true"); o.appendChild(b); });
      r.appendChild(o); pl.appendChild(r); });
    if (!anyL) pl.appendChild(el("p", "exhint", C.noLay));
    show();
    var cp = el("div", "excp"), code = el("code", "exptline", pfCopy(k, v, D)), said = el("span", "said"); code.hidden = true;   /* the line is not shown — the button copies it whole (L-36); its own class names, so nothing reading the card's controls finds these */
    cp.appendChild(xAct("opt exo exi exptreset", XICON.reset, "ptReset", null, function () { delete XS.pt[k + ":" + v]; xSave(); pfRe(k, blk); }));
    cp.appendChild(xAct("opt exo exi exptcopy", XICON.copy, "ptCopy", null, function () { copyText(code.textContent, said, XW.ctl.copied); })); cp.appendChild(said); cp.appendChild(code); box.appendChild(cp);
    return box; }

  /* a section (or one of its rows) as this element's portrait draws it — a hidden one too, kept when it was taken out — inside copies of the frame and its body */
  function pfPvNode(f, d, rw) { var b = f.querySelector(".ptbody"), fw = f.cloneNode(false), bw = b ? b.cloneNode(false) : el("div", "ptbody"), s;
    fw.removeAttribute("id"); fw.setAttribute("data-box", "grow"); fw.classList.add("expvf");
    if (rw) { s = d.node.cloneNode(false); rw.nodes.forEach(function (r) { s.appendChild(r.cloneNode(true)); }); } else s = d.node.cloneNode(true);
    bw.appendChild(s); fw.appendChild(bw); return fw; }
  var PFV = { table: { record: pfTblRecord, shape: pfTblShape, wheel: pfTblWheel, keys: pfTblKeys }, schema: { record: pfSchRecord }, fn: { record: pfFnRecord },
    end: { exit: pfExit }, test: { "case": pfCase }, gate: { record: pfGate }, hook: { record: pfHook }, inf: { record: pfInf } };
  window.__allepPort = { frame: pfFrame, ctl: pfCtl, views: PTV, lab: PTLAB, look: pfLook };
