  /* ══ D-101 · his: "I still don't see the How field when I go to the Show section … Where should I activate or deactivate the things that show in the card? If I
     go to Show, things are dim or grayed out, but if I go to Order, I cannot see the How section. … Let's take a step back and see if there is a better way to
     orchestrate how we structure the different things that we show." Two causes, two answers:
     (1) a look remembered before a part existed placed the part nowhere — on no line and not in not drawn — so no tab could reach it: xPlaceNew puts such a part
         where the bench's own look draws it;
     (2) a part's settings sat in four tabs, and only ORDER said whether it is drawn: the PARTS tab is one row per part, in the order the card draws it — drawn or
         not, where, what it shows, its size, its own hover. The other four tabs stay as they were until he has seen it.
     And the item's own mark ("none is good enough because they are doing too many things at the same time"): as the lab's field marks, ONE channel per meaning —
     its own mark SHAPED (the lab's corners, or a ring), the others TONED (the lab's optional stop). This file is inlined after _ae-bench.js, in the same scope. ══ */
  function xPartsOf(k) { return EX.parts[k] ? EX.parts[k].map(function (p) { return p.key; }) : Object.keys(XW.parts[k]); }   /* XPARTS is not set yet when xFix first runs */
  function xAtOf(R, p) { for (var i = 0; i < R.length; i++) { if (R[i].l.indexOf(p) >= 0) return [i, "l"]; if (R[i].r.indexOf(p) >= 0) return [i, "r"]; } return null; }
  function xPlaceNew(k, L) { var off = L.off || [], miss = xPartsOf(k).filter(function (p) { return off.indexOf(p) < 0 && !xAtOf(L.rows, p); }); if (!miss.length) return;
    L.rows = L.rows.map(function (r) { return { l: r.l.slice(), r: r.r.slice() }; }); L.off = off.slice();
    miss.forEach(function (p) { var at = xAtOf(EX.look[k].rows, p); if (at) L.rows[at[0]][at[1]].push(p); else L.off.push(p); }); }
  function xSel(cls, vals, cur, words, aria, on) { var s = el("select", cls); s.setAttribute("aria-label", aria); s.setAttribute("data-tip", "exctl"); s.setAttribute("data-verb", aria);
    vals.forEach(function (x) { var o = el("option", null, words[x]); o.value = x; if (String(x) === String(cur)) o.selected = true; s.appendChild(o); });
    s.addEventListener("change", function () { on(s.value); }); return s; }
  /* PARTS: drawn (the eye: off puts the part in not drawn, on puts it back where the bench draws it) · the part · where it is · what it shows · its size · its own hover */
  function xPartsPane(k, L, order) { var d = xPane("parts"), C = XW.ctl, P = C.pcol, t = el("div", "exptbl"), hd = el("div", "exptr exphd");
    [[P.on, XICON.eye.on], ["", null], [P.at, null], [P.form, null], [P.size, null], [P.hov, XICON.hov]].forEach(function (h) { var c = el("span", h[1] ? "exphi" : null, h[1] ? null : h[0]);
      if (h[1]) { c.appendChild(xIco(h[1], 14)); c.setAttribute("title", h[0]); c.setAttribute("aria-label", h[0]); } hd.appendChild(c); }); t.appendChild(hd);   /* a button's column is headed by its icon, its word on hover */
    order.concat(["marks"]).forEach(function (p) { var mk = p === "marks", at = mk ? null : xAtOf(L.rows, p), nm = mk ? C.theMarks : xPartWord(k, p), r = el("div", "exptr" + (at || mk ? "" : " exptoff"));
      r.setAttribute("data-part", p);
      if (mk) r.appendChild(el("span")); else { var on = xAct("opt exo exi expon", at ? XICON.eye.on : XICON.eye.off, at ? "partOff" : "partOn", { part: nm }, function () {
          if (at) xMove(k, p, "off"); else { var h = xAtOf(EX.look[k].rows, p) || [L.rows.length - 1, "r"]; xMove(k, p, h[0], h[1]); } });
        on.setAttribute("aria-pressed", at ? "true" : "false"); r.appendChild(on); }
      var h = el("span", "exprn"); h.appendChild(mk ? el("i", "exmkic") : xSvg(xPartIco(k, p), 13, "currentColor")); h.appendChild(el("span", null, nm)); r.appendChild(h);
      r.appendChild(el("span", "expat", mk ? "" : at ? fill(C.atLine, { i: at[0] + 1, side: at[1] === "l" ? C.left : C.right }) : C.tray));
      var F = mk ? null : (EX.forms[k] || {})[p], fw = {};
      if (F && F.opts.length > 1) { F.opts.forEach(function (v) { fw[v] = XW.form[v].name; });
        r.appendChild(xSel("expsel", F.opts, xForm(k, p, L), fw, fill(XW.act.form.obj, { part: nm, v: "" }).trim(), function (v) { xSet(k, function (x) { x.mode = Object.assign({}, x.mode); x.mode[p] = v; }); })); }
      else r.appendChild(el("span", "expone", mk ? "" : F ? XW.form[F.opts[0]].name : C.oneForm));
      if (mk || XGLYPH[p]) r.appendChild(el("span")); else { var zs = [], zw = {}; for (var z = xMin(k, p); z <= 26; z++) { zs.push(z); zw[z] = z + "px"; }
        r.appendChild(xSel("expsel expsz", zs, L.size[p] || 12, zw, XW.act.size.verb + " " + fill(XW.act.size.obj, { part: nm }), function (v) { xSet(k, function (x) { x.size = Object.assign({}, x.size); x.size[p] = +v; }); })); }
      r.appendChild(xHov(k, p, L, nm)); t.appendChild(r); });
    d.appendChild(t); return d; }
  /* the item's own mark: its shape (three looks, my pick dashed), where its corners sit or how thick its ring is, and the others' tone — each control one thing */
  function xHereSec(k, L) { var HW = XW.here, hs = el("div", "exhere-sec"), hg = el("div", "opts exhereopts"), what = HW.kinds[k].name, g = el("div", "exgrid2");
    var mine = function (G) { var o = {}; Object.keys(G.opts).forEach(function (v) { o[v] = G.opts[v] + (v === G.pick ? " (" + W.copy.pick + ")" : ""); }); return o; };
    hs.appendChild(el("h5", "exsh2", HW.title)); hs.appendChild(el("p", "exhint", HW.plain)); hg.setAttribute("role", "radiogroup"); hg.setAttribute("aria-label", HW.title);
    EX.heres.forEach(function (v) { var b = xAct("opt exo exi", XICON.here[v], "here", { what: what, v: HW.opts[v].name }, function () { xSet(k, function (x) { x.here = v; }); });
      b.setAttribute("role", "radio"); b.setAttribute("data-xhere", v); b.setAttribute("aria-checked", L.here === v ? "true" : "false"); if (HW.pick === v) b.setAttribute("data-pick", "true"); hg.appendChild(b); });
    hs.appendChild(hg);
    if (L.here === "corners") g.appendChild(xPick(HW.at.label, L.hereAt, EX.hereAts, function (v) { xSet(k, function (x) { x.hereAt = v; }); }, mine(HW.at)));
    if (L.here === "ring") g.appendChild(xRange(HW.w, L.hereW, 1, 4, 1, function (v) { xSet(k, function (x) { x.hereW = v; }); }));
    g.appendChild(xPick(HW.rest.label, L.hereRest, EX.hereRests, function (v) { xSet(k, function (x) { x.hereRest = v; }); }, mine(HW.rest)));
    hs.appendChild(g); return hs; }
  /* the copy line says the item's mark only where it is not the bench's own — the default line stays byte for byte */
  function xHereLine(k, L) { var D = EX.look[k], HW = XW.here; if (EX.hereKinds.indexOf(k) < 0) return "";
    if (L.here === D.here && L.hereW === D.hereW && L.hereAt === D.hereAt && L.hereRest === D.hereRest) return "";
    return " · " + HW.title + " " + HW.opts[L.here].name + (L.here === "corners" ? " " + HW.at.opts[L.hereAt] : L.here === "ring" ? " " + L.hereW + "px" : "")
      + ", " + HW.rest.label + " " + HW.rest.opts[L.hereRest]; }
