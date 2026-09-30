"""D-067 · ONE HOVER PER BY MOMENT ITEM, its own facts in the order the code meets them (his rulings on L-01 … L-04 and L-22).

A hover used to be three or four: the chip's, then one per label or glyph inside it, each saying what its KIND means (the same words
on every item) and how the page drew it. Now an item has one hover, and it says what THIS item is, in three parts:
  b · before — what must already hold, and what brings the code here (the call it sits in, the setting that turns it on);
  c · checks — what it checks or does, and where (the condition, the line, the numbers);
  g · gives  — what comes out of it and what that does (the answer, the error it raises, the write, the test that proves it).
The kind's definition is no longer in it: it lives once, in the row's legend.

io_of(e, xx, C) is THE builder: one element in, its hover's lines out, as [word key, {token: value}] — the words are the words file's
(mo.io.l.<key>, or mo.x.<key> for a line the page already had), filled by the page. Later element kinds add a branch here. A line is
written only from a record the feed holds; a part it holds nothing for is left out, never guessed.

twins(rows) is the build's check: two items of one block at one moment whose hovers would read the same stop the build, named."""
from __future__ import annotations

import json
import re

TOKEN = re.compile(r"\{([a-z]\w*)\}", re.I)
CAP = 3                                                          # a list inside one line: its first few, then how many more


def _short(at) -> str:
    return str(at or "").rsplit("/", 1)[-1]


def _nm(q) -> str:
    return str(q or "").split("::")[-1]


def _says(x: dict) -> str:
    return str(x.get("detail") or x.get("code") or x.get("via") or x.get("reason") or "")


def _cap(xs: list) -> str:
    xs = [str(x) for x in xs]
    return " · ".join(xs[:CAP]) + (f" · +{len(xs) - CAP}" if len(xs) > CAP else "")


class Ctx:
    """the endpoint's records, keyed the ways the builder reads them (built once per endpoint in by_moment)"""

    def __init__(self, *, E, F, fj, fep, XS, steps, H, hf, chains, EXIT, dset, par, pieces):
        self.par, self.pieces = par or {}, {pr.get("key"): pr for pr in pieces or []}
        self.F, self.fj, self.fep, self.XS, self.steps, self.H, self.hf, self.EXIT, self.dset = F, fj, fep, XS, steps, H, hf, EXIT, dset
        self.fns = fj.get("functions") or {}
        self.frec = {x["id"]: x for x in (fep.get("produced") or []) + (fep.get("framework_exits") or [])}
        self.fpre = {g["id"]: g for g in F.get("preconditions") or []}
        self.fbr = {b["id"]: b for b in fep.get("branches") or []}
        self.cat = {c["id"]: c for c in (fep.get("failure") or {}).get("catches") or []}
        self.rets = {x["id"]: x for x in fep.get("returns") or []}
        self.resp = fep.get("responses") or {}
        self.lim_by_exit = {l0.get("exit"): l0 for l0 in (F.get("rate") or {}).get("limits") or []}
        self.lim_by_name = {str(l0.get("limiter") or l0.get("class") or "?").lstrip("_"): l0 for l0 in (F.get("rate") or {}).get("limits") or []}
        self.mw_exit = {x["id"]: x for m in (fj.get("middleware") or {}).values() for x in m.get("exits") or []}
        self.mw = {str(k).split(":", 1)[-1]: m for k, m in (fj.get("middleware") or {}).items()}
        self.sw = {w["id"]: w for w in F.get("switches") or []}
        self.fsw = {w["id"]: w for w in fep.get("switches") or []}
        self.inf = {(x.get("ref") or "|".join(str(x.get(q)) for q in ("kind", "name", "set_at"))): x for x in (F.get("inflight") or {}).get("rows") or []}
        self.sites = {s["id"]: s for s in (F.get("frontend") or {}).get("reason_sites") or []}
        self.fe_on = bool((F.get("frontend") or {}).get("present"))
        # an ending → the screen branches whose route reaches it (their lines), or the screen functions that have no branch for it
        self.E, self.read_by, self.rest_in = E, {}, {}
        for rd in (((fj.get("frontend") or {}).get("reasons") or {}).get("readers") or {}).get(E) or []:
            for ro in rd.get("routes") or []:
                if ro.get("site") == "rest":
                    self.rest_in.setdefault(ro.get("exit"), []).append(str(rd.get("fn") or _nm(rd.get("piece"))))
                else:
                    self.read_by.setdefault(ro.get("exit"), []).append(_short((self.sites.get(ro.get("site")) or {}).get("at")) or str(ro.get("site")))
        # the paths that take a fork → the endings they end at
        self.fork_ends = {}
        for pid, ch in chains.items():
            for s in ch:
                if s.get("kind") == "branch" and s.get("hit") and s.get("ref"):
                    self.fork_ends.setdefault(s["ref"], set()).add(EXIT[pid])
        self.cases = {}                                          # a validation rule's case, by its id
        for x in F.get("exits") or []:
            for c in x.get("cases") or []:
                if isinstance(c, dict):
                    self.cases[c["id"]] = (c, x)
        self.dep_vals = [x.get("param") or x.get("name") for x in (F.get("inflight") or {}).get("rows") or [] if x.get("set_in") == "dependency"]
        self.inside = {f.get("fn"): f for f in (F.get("inside") or {}).get("functions") or []}

    def st(self, xid):
        x = self.XS.get(xid) or {}
        return x.get("status")

    def ans(self, xid, key="ans", **more):
        """an ending's answer: its status and its words"""
        x = self.XS.get(xid) or {}
        w = _says(x)
        return [key, dict(more, st=x.get("status"), v=w)] if w else [key + "Bare", dict(more, st=x.get("status"))]


def _L(key: str, /, **v) -> list:
    return [key, v]


def io_of(e: dict, xx: dict, C: Ctx) -> dict:
    """one element → {h: [its name, its kind word key], b, c, g: [[word key, {token: value}] …]} (see the module head)"""
    f, idn = e["f"], str(e.get("id") or "")
    b, c, g = [], [], []
    k = None
    name = str(e.get("text") or "")
    X = xx or {}
    # ── ENDINGS ──
    if f == "end":
        x = C.XS.get(idn) or {}
        k, name = "end:" + str(x.get("kind")), str(x.get("status") if x.get("status") is not None else x.get("kind"))
        lm = C.lim_by_exit.get(idn)
        fr = C.frec.get(idn) or {}
        if lm:                                                   # a rate limit: which one, over what, its numbers
            name += " · " + str(lm.get("limiter") or "").lstrip("_")
            b += _lim_before(C, lm, idn)
            c += _lim_checks(lm)
        elif x.get("kind") == "framework":
            c.append(_L("fw", src=fr.get("source") or "?"))
            if x.get("code"):
                c.append(_L("code", v=x["code"]))
        elif x.get("kind") == "validation":
            n = len([q for q in x.get("cases") or [] if isinstance(q, dict)])
            c.append(_L("val", n=n))
        elif x.get("kind") == "uncaught":
            for q in X.get("cz") or []:
                b.append(_L("x.cause", cls=q[0], at=q[1]))
            c.append(_L("unc"))
        elif x.get("kind") == "success":
            if x.get("at"):
                c.append(_L("ret", at=_short(x["at"])))
        else:
            via = str(x.get("via") or "")
            m = re.match(r"^call (.+) @ (.+)$", via)
            if m:
                b.append(_L("inCall", fn=_nm(m.group(1)), at=_short(m.group(2))))
            elif via.startswith("except "):
                b.append(_L("raisedAs", cls=via[7:]))
            if x.get("pred"):
                c.append(_L("chk", v=x["pred"], at=_short(fr.get("site") or x.get("at"))))
            elif via.startswith("except "):
                c.append(_L("xcatch", cls=via[7:], at=_short(x.get("at"))))
            elif via:
                c.append(_L("by", v=via, at=_short(x.get("at"))))
        g.append(C.ans(idn))
        if x.get("kind") != "uncaught" and x.get("status") not in (None, ""):
            g.append(_L("x.declared" if x.get("status") in C.dset else "x.undeclared"))
        for h in X.get("hd") or []:
            g.append(_L("x.headers", v=h[0] + ": " + str(h[1])))
        if X.get("st"):
            g.append(_L("x.stream"))
        ts = sorted({str(t.get("case")) for t in x.get("tests") or [] if t.get("case") and not str(t.get("conf") or "").startswith("ambiguous")})
        ta = sorted({str(t.get("case")) for t in x.get("tests") or [] if t.get("case") and str(t.get("conf") or "").startswith("ambiguous")})
        if ts:
            g.append(_L("proven", v=_cap(ts)))
        if ta:
            g.append(_L("fitsTest", v=_cap(ta)))
        if not ts and not ta:
            g.append(_L("noTest"))
        if C.fe_on and x.get("kind") != "success":
            rb, rs = C.read_by.get(idn), sorted(set(C.rest_in.get(idn) or []))
            if rb:
                g.append(_L("screenReads", v=_cap(rb)))
            if rs:
                g.append(_L("screenRest", v=_cap(rs)))
            if not rb and not rs:
                g.append(_L("noScreen"))
    # ── GATES AND DECISIONS ──
    elif f == "gate":
        p, _s, v = idn.partition(":")
        if p == "g":                                             # the endpoint's own check
            q = C.fpre.get(v) or {}
            k = "guard"
            m = re.match(r"^call (.+) @ (.+)$", str(q.get("via") or ""))
            if m:
                b.append(_L("inCall", fn=_nm(m.group(1)), at=_short(m.group(2))))
            if q.get("after"):
                b.append(_L("after", v=" · ".join(q["after"])))
            if q.get("pred"):
                c.append(_L("chk", v=q["pred"], at=_short(q.get("at"))))
            if q.get("exit") and q["exit"] in C.XS:
                g.append(C.ans(q["exit"], "ends"))
            elif q.get("status") is not None:
                g.append(_L("endsUnknown", st=q["status"]))
            if X.get("rz"):
                g.append(_L("x.raises", cls=X["rz"][0], msg=X["rz"][1]) if X["rz"][1] is not None else _L("x.raisesBuilt", cls=X["rz"][0]))
        elif p == "b":                                           # a deciding branch
            q = C.fbr.get(v) or {}
            k = "fork"
            if q.get("call"):
                b.append(_L("inCall", fn=q["call"], at=_short(q.get("site"))))
            if q.get("pred"):
                c.append(_L("if", v=q["pred"]))
            elif q.get("token") == "fall-through":
                c.append(_L("fall"))
            rt = C.rets.get(q.get("return")) or {}
            if rt.get("value"):
                g.append(_L("retVal", fn=_nm(rt.get("fn")), v=rt["value"], at=_short(rt.get("at"))))
            ends = sorted({str(C.st(x0)) for x0 in C.fork_ends.get(v, ()) if C.st(x0) is not None})
            if ends:
                g.append(_L("pathsEnd", v=" · ".join(ends)))
        elif p == "c":                                           # a catch
            q = C.cat.get(v) or {}
            k = "catch"
            types = q.get("types") or []
            name = "except " + " · ".join(types) if types else name
            for cls in types:                                    # where it is raised: the raises this endpoint's endings translate
                at = sorted({_short(z.get("at")) for rec in C.fns.values() for z in rec.get("raises") or [] if z.get("cls") == cls
                             and any(t.get("exit") in C.XS for t in z.get("translated_by") or [])})
                b.append(_L("raisedAt", cls=cls, at=_cap(at)) if at else _L("raisedAs", cls=cls))
            c.append(_L("xcatch2", cls=" · ".join(types) or "?", at=_short(q.get("at"))))
            out = str(q.get("outcome") or "")
            if out == "translate":
                for st in q.get("answers") or []:
                    xs = [x0 for x0 in C.XS.values() if x0.get("status") == st and str(x0.get("via") or "") in ["except " + t for t in types]]
                    g.append(C.ans(xs[0]["id"]) if len(xs) == 1 else _L("ansBare", st=st))
            elif out:
                g.append(_L("outcome." + out))
            for cm in q.get("commits") or []:
                g.append(_L("commitsAt", at=_short(cm.get("at") if isinstance(cm, dict) else (C.steps.get(cm) or {}).get("at") or cm)))
        elif p == "l":                                           # a rate limiter
            lm = C.lim_by_name.get(v) or {}
            k = "limiter"
            b += _lim_before(C, lm, lm.get("exit"))
            c += _lim_checks(lm)
            if lm.get("exit") in C.XS:
                g.append(C.ans(lm["exit"], "ends"))
                for h, hv in sorted(((C.resp.get(lm["exit"]) or {}).get("headers") or {}).items()):
                    g.append(_L("x.headers", v=h + ": " + str(hv)))
        elif p == "a":                                           # the login check
            k = "login"
            for a in X.get("au") or []:
                c.append(_L("x.auth", scheme=a[0], header=a[2], carrier=a[1]))
            c.append(_L("calls", v=_nm(v)))
            au = C.F.get("auth") or {}
            for s in au.get("schemes") or []:
                if s.get("exit") in C.XS:
                    g.append(C.ans(s["exit"], "ends"))
            for x0 in C.F.get("exits") or []:
                if x0.get("phase") == "dependency" and x0.get("kind") == "refusal":
                    g.append(C.ans(x0["id"], "ends"))
            for pv in au.get("provisions") or []:
                g.append(_L("prov", op=pv.get("op"), tbl=pv.get("table"), at=_short(pv.get("at"))))
    # ── DATA EFFECTS ──
    elif f == "data":
        recs = [C.steps.get(r0[2:]) or {} for r0 in e.get("rec") or [] if str(r0).startswith("s:")]
        recs = [r0 for r0 in recs if r0]
        s0 = recs[0] if recs else {}
        k = "table" if s0.get("table") else "step"
        if s0.get("fn"):
            b.append(_L("inFnCond" if s0.get("cond") else "inFn", fn=_nm(s0["fn"])))
        for key in dict.fromkeys((r0.get("op"), r0.get("model") or r0.get("table"), _short(r0.get("at"))) for r0 in recs):
            c.append(_L("op", op=key[0], m=key[1], at=key[2]) if key[1] else _L("opw", op=key[0], at=key[2]))
        if X.get("rc"):
            g.append(_L("x.race", cons=X["rc"][0]))
            g.append(_L("x.racePlain", cols=", ".join(X["rc"][2]), tbl=X["rc"][1], st=X["rc"][3]))
    # ── FUNCTIONS ──
    elif f == "fn":
        fid = next((q[3:] for q in e.get("keys") or [] if str(q).startswith("fn:")), None)
        rec = C.fns.get(fid) or {}
        ins = C.inside.get(fid) or {}
        k = "handler" if fid == C.H else "fn"
        par = C.par.get(fid)                                     # the function that calls it, in the walk from the handler
        if fid == C.H:
            if C.dep_vals:
                b.append(_L("gets", v=_cap(C.dep_vals)))
        elif par and par != C.H:
            b.append(_L("calledBy", v=_nm(par)))
            if e.get("_q") is not None:
                b.append(_L("underCall", at=_short(C.hf) + ":" + str(e["_q"])))
        elif e.get("_q") is not None:
            b.append(_L("calledAt", at=_short(C.hf) + ":" + str(e["_q"])))
        elif e.get("_jc"):
            b.append(_L("calledBy", v=_cap(sorted(_nm(q) for q in e["_jc"]))))
        if X.get("dp"):
            b.append(_L("depth", n=X["dp"]) if X["dp"] != 1 else _L("depth1"))
        if X.get("cp"):
            b.append(_L("x.callPaths", via=X["cp"]))
            b.append(_L("x.callPathsPlain", via=X["cp"]))
        if X.get("cn"):
            b.append(_L("x.cutNear", v=X["cn"]))
            b.append(_L("x.cutNearPlain", v=X["cn"]))
        at = rec.get("at") or ins.get("at")
        if at:
            c.append(_L("defAt", at=_short(at)))
        ops = {}
        for s in C.steps.values():
            if s.get("fn") == fid and s.get("table"):
                ops.setdefault(s.get("op"), []).append(s["table"])
        for op, ts in ops.items():
            c.append(_L("opTables", op=op, v=_cap(sorted(set(ts)))))
        for z in ins.get("refusals") or rec.get("refusals") or []:
            g.append(_L("refuses", st=z.get("status"), at=_short(z.get("at"))))
        for z in rec.get("raises") or []:
            tb = [t for t in z.get("translated_by") or [] if t.get("exit") in C.XS]
            if tb:
                g.append(_L("rzTo", cls=z.get("cls"), at=_short(z.get("at")), st=" · ".join(sorted({str(t.get("status")) for t in tb}))))
            else:
                g.append(_L("rzLoose", cls=z.get("cls"), at=_short(z.get("at"))))
        for cm in rec.get("commits") or ins.get("commits") or []:
            g.append(_L("commitsAt", at=_short(cm.get("at") if isinstance(cm, dict) else (C.steps.get(cm) or {}).get("at") or cm)))
        for q in X.get("ru") or []:
            g.append(_L("x.uncaught", cls=q[0], at=q[1]))
    # ── STRUCTURES ──
    elif f == "shape":
        S = C.fj.get("schemas") or {}
        if idn == "q:body":
            k = "body"
            sc = S.get("schema:" + name) or {}
            c += _fields(sc)
            if sc.get("extra"):
                c.append(_L("extra", v=sc["extra"]))
            n = sum(1 for cs, _x in C.cases.values() if cs.get("schema") == "schema:" + name)
            g.append(_L("val422one") if n == 1 else _L("val422", n=n))
        elif idn.startswith("q:"):
            k = "field"
            top = next((q[7:] for q in e.get("keys") or [] if str(q).startswith("schema:")), None)
            sc = S.get("schema:" + str(top)) or {}
            if top:
                b.append(_L("fieldOf", v=top))
            fd = next((q for q in sc.get("fields") or [] if q.get("name") == name), None)
            if fd:
                c += _field(fd)
            n = sum(1 for cs, _x in C.cases.values() if str(cs.get("loc") or "").split(".")[-1] == name and cs.get("schema") == "schema:" + str(top))
            if n:
                g.append(_L("rules422one") if n == 1 else _L("rules422", n=n))
        elif idn == "r:reply":
            k = "reply"
            top = name.split(" · ")[0]
            name = top
            c += _fields(S.get("schema:" + top) or {})
            ok = sorted({str(x0.get("status")) for x0 in C.XS.values() if x0.get("kind") == "success"})
            if ok:
                g.append(_L("replyTo", st=" · ".join(ok)))
        else:
            k = "schema"
            if X.get("in"):
                b.append(_L("x.inside", v=X["in"]))
            c += _fields(S.get("schema:" + name) or {})
    # ── THE CLIENT ──
    elif f == "client":
        p = idn[:2]
        ch = e.get("chip") or []
        if p == "s:":
            s = C.sites.get(idn[2:]) or {}
            k = "reason"
            if s.get("piece"):
                b.append(_L("inFn", fn=str(s["piece"]).split("#")[-1]))
            rd = X.get("rd") or []
            if len(rd) > 2 and rd[2] is not None:
                c.append(_L("x.reads", what=rd[0], op=rd[1], v=rd[2]))
            if X.get("dw"):
                g.append(_L("x.does", v=X["dw"]))
        elif p == "o:":
            k = "cache"
            h = str(e.get("hint") or "")
            wn, _s, at = h.partition(" · ")
            if wn:
                b.append(_L("onWhen", v=wn))
            c.append(_L("cacheAt", at=at or "?"))
            g.append(_L("refreshKey" if (ch[1:2] == ["refresh"]) else "seedKey", v=name.split(" ", 1)[-1]))
            name = name.split(" ", 1)[0]
        elif p == "v:":
            k = "screen"
        elif X.get("fl"):
            k = "file"
            c.append(_L("x.file"))
        else:
            k = "hook"
            pid = (e.get("keys") or [None])[0]
            pc = ((C.fj.get("frontend") or {}).get("pieces") or {}).get(pid) or {}
            calls = [q for q in pc.get("calls") or [] if q.get("endpoint") == C.E]
            for q in calls:
                if q.get("callee"):
                    c.append(_L("through", v=q["callee"], at=_short(q.get("at"))))
                for ft in q.get("fetch") or []:
                    c.append(_L("fetchAt", m=ft.get("method"), p=ft.get("path"), at=_short(ft.get("at"))))
                for o in q.get("invalidates") or []:
                    g.append(_L("refresh", when=o.get("when") or "?", v=json.dumps(o.get("key"), ensure_ascii=False)))
                for o in q.get("seeds") or []:
                    g.append(_L("seed", when=o.get("when") or "?", v=json.dumps(o.get("key"), ensure_ascii=False)))
            if not calls:
                c.append(_L("fetches"))
    # ── IN-FLIGHT STATE ──
    elif f == "inf":
        ik = idn[2:]
        x = C.inf.get(ik) or {}
        k = "inflight"
        if x.get("set_by") or x.get("set_at"):
            b.append(_L("setBy", fn=_nm(str(x.get("set_by") or "?").split(":", 1)[-1] if str(x.get("set_by") or "").startswith("middleware:") else x.get("set_by")), at=_short(x.get("set_at"))))
        ra = [_short(q.get("at")) for q in x.get("read_at") or []]
        if ra:
            c.append(_L("readAt1", v=ra[0]) if len(ra) == 1 else _L("readAt", n=len(ra), v=_cap(ra)))
        if x.get("dies"):
            g.append(_L("lasts", v=x["dies"]))
        if x.get("applies_to"):
            g.append(_L("sharedBy", n=x["applies_to"]))
    # ── STANDARD OR SPECIALIST ──
    elif f == "std":
        if idn.startswith("w:"):
            w = dict(C.sw.get(idn[2:]) or {}, **(C.fsw.get(idn[2:]) or {}))   # the feed's own record: its settings with env and default
            k = "switch"
            ss = w.get("settings") or {}
            for sname in sorted(ss):
                sv = ss[sname] if isinstance(ss, dict) and isinstance(ss[sname], dict) else {}
                b.append(_L("setting", v=sname, env=sv.get("env") or "?", d=sv.get("default") or "?"))
            if w.get("expr"):
                c.append(_L("expr", v=w["expr"]))
            if w.get("port"):
                c.append(_L("bind", port=w["port"], at=_short(w.get("anchor") or w.get("site"))))
            for br in w.get("branches") or []:
                if br.get("impl") or br.get("pred"):
                    c.append(_L("arm", v=br.get("pred") or "?", impl=br.get("impl") or br.get("value") or "?"))
            xs = sorted({str(C.st(x0)) for x0 in (w.get("refs") or []) + (w.get("proves") or []) if C.st(x0) is not None})
            if xs:
                g.append(_L("decides", v=" · ".join(xs)))
        else:
            k = "piece"
            pr = C.pieces.get(idn[2:]) or {}
            if pr.get("of"):
                g.append(_L("rare", n=pr.get("n"), of=pr["of"]))
    # ── STAGES AND ORDER ──
    elif f == "stage":
        if idn.startswith("k:"):
            cs, x = C.cases.get(idn[2:], ({}, {}))
            k = "rule"
            if cs.get("param"):
                b.append(_L("param", v=cs["param"]))
            c.append(_L("ruleIs", v=cs.get("rule") or cs.get("type") or "?", at=_short(cs.get("at"))) if cs.get("at") else _L("ruleIsBare", v=cs.get("rule") or cs.get("type") or "?"))
            g.append(_L("err422", st=x.get("status"), v=cs.get("type") or "?"))
        else:
            k = "mw"
            m = C.mw.get(name) or {}
            od = m.get("order") or {}
            if od.get("runs") and od.get("of"):
                b.append(_L("order", n=od["runs"], of=od["of"]))
            if m.get("method"):
                c.append(_L("mwAt", fn=_nm(m["method"]), at=_short(m.get("registered_at"))))
            xs = sorted({str(x0.get("status")) for x0 in m.get("exits") or [] if x0.get("id") in C.XS})
            if xs:
                g.append(_L("mwEnds", v=" · ".join(xs)))
    # ── PROOF ──
    elif f == "proof":
        k = "case"
        parts = idn.split(":")
        cid = parts[1] if len(parts) > 1 else name
        tc = (C.fj.get("test_cases") or {}).get(cid) or {}
        if tc.get("name"):
            b.append(_L("tname", v=tc["name"], at=_short(tc.get("file")) + ":" + str(tc.get("line"))))
        raises = idn.endswith(":raises")
        if raises:
            c.append(_L("svc"))
        else:
            ln = parts[2] if len(parts) > 2 else None
            call = next((q for q in tc.get("calls") or [] if str(q.get("line")) == str(ln) and q.get("role") == "act"), None)
            if call:
                b.append(_L("sends", v=", ".join(call["sends"])) if call.get("sends") else _L("sendsNone"))
                c.append(_L("tcall", m=call.get("method"), p=call.get("path"), ln=call.get("line")))
            if X.get("as"):
                a = X["as"]
                c.append(_L("x.asserts", v=" · ".join(str(q) for q in a[0])) if a[0] else _L("x.assertsNone"))
                if a[1]:
                    c.append(_L("x.assertsDetail", v=" · ".join(str(q) for q in a[1])))
                if a[2]:
                    c.append(_L("x.assertsCode", v=" · ".join(str(q) for q in a[2])))
                if a[3]:
                    c.append(_L("x.assertsAttrs", n=a[3]))
        w = e.get("w") or ()
        xs = list(w[1]) if w and w[0] == "xs" else []
        for x0 in xs:                                            # the ending it proves, by where it is produced (two may share words)
            at = _short((C.frec.get(x0) or {}).get("site") or (C.XS.get(x0) or {}).get("at"))
            g.append(C.ans(x0, "provesAt", at=at) if at else C.ans(x0, "proves"))
        if X.get("ho"):
            g.append(_L("x.hollow", n=X["ho"]))
        if tc.get("state"):
            g.append(_L("state", v=tc["state"]))
    return {"h": [name, k or f], "b": b, "c": c, "g": g}


def _lim_before(C: Ctx, lm: dict, xid) -> list:
    out = []
    mx = C.mw_exit.get(xid) or {}
    sc = (C.frec.get(xid) or {}).get("scope") or mx.get("scope")
    if isinstance(sc, list):
        out.append(_L("limScope", n=len(sc), v=_cap(sc)))
    elif sc == "all":
        ex = (C.F.get("rate") or {}).get("exempt") or []
        out.append(_L("limAll", v=", ".join(ex)) if ex else _L("limAllNone"))
    if mx.get("applies_to"):
        out.append(_L("limEps", n=mx["applies_to"]))
    wp = (C.frec.get(xid) or {}).get("when_for_path")
    if wp:
        out.append(_L("onWhen", v=wp))
    return out


def _lim_checks(lm: dict) -> list:
    out = [_L("limCheck", via=lm.get("via") or "?", lim=str(lm.get("limiter") or lm.get("class") or "?").lstrip("_"), at=_short(lm.get("at")))]
    arg = {a.get("param"): a for a in lm.get("args") or []}
    if "limit" in arg and "window_seconds" in arg:
        w = arg["window_seconds"].get("value")
        out.append(_L("x.limit", n=arg["limit"].get("value"), w=int(w) if isinstance(w, float) and w.is_integer() else w, k=lm.get("key")))
    if arg.get("limit", {}).get("setting"):
        out.append(_L("limSet", v=arg["limit"]["setting"], env=arg["limit"].get("env") or "?"))
    return out


def _field(fd: dict) -> list:
    out = [_L("ann", v=fd.get("annotation"))]
    out.append(_L("req" if fd.get("required") else "opt"))
    cs = fd.get("constraints") or {}
    if cs:
        out.append(_L("cons", v=", ".join(f"{k}={v}" for k, v in sorted(cs.items()))))
    return out


def _fields(sc: dict) -> list:
    fs = sc.get("fields") or []
    if not fs:
        return []
    return [_L("fields", n=len(fs), v=_cap([q.get("name") for q in fs]))]


def sig(x: list) -> str:
    """what an element's hover says, whatever path is picked: its io lines, and the lines the page adds that hold on every path"""
    X = x[7] or {}
    lq = [[q[0], len(q[1])] for q in X.get("lq") or []]
    return json.dumps([X.get("io"), (X.get("cq") or [None])[0], lq, (X.get("jy") or {}).get("id"), (X.get("jy") or {}).get("k")], sort_keys=True, ensure_ascii=False)


def twins(lab: str, el: list) -> list:
    """two items of one block at one moment whose hovers would read the same — each pair, named"""
    seen, bad = {}, []
    for x in el:
        key = (x[0], x[1], sig(x))
        if key in seen:
            bad.append((x[0], x[1], (x[7] or {}).get("io", {}).get("h") or x[3]))
        seen[key] = x
    return bad


def words_check(W: dict, rows: list) -> list:
    """every line the build writes has words, and its words use exactly the tokens it is given (so a value given is a value shown)"""
    IO, MX = W["mo"]["io"], W["mo"]["x"]
    bad = []
    for r in rows:
        for x in r["mo"]["el"]:
            io = (x[7] or {}).get("io")
            if not io:
                continue
            hk = io["h"][1]
            if not (hk.startswith("end:") and hk[4:] in W["kinds"]) and not (hk in IO["k"] and (IO["k"][hk].get("name") or hk in W["el"]["kinds"])):
                bad.append(("kind", hk))
            for part in ("b", "c", "g"):
                for ln in io[part]:
                    key, vals = ln[0], (ln[1] if len(ln) > 1 else {})
                    if key.startswith("x."):
                        tpl = MX.get(key[2:])
                    elif key.startswith("outcome."):
                        tpl = IO["outcome"].get(key[8:])
                    else:
                        tpl = IO["l"].get(key)
                    if not isinstance(tpl, str):
                        bad.append(("no words", key))
                    elif set(TOKEN.findall(tpl)) != set(vals):
                        bad.append(("tokens", key, sorted(TOKEN.findall(tpl)), sorted(vals)))
    return bad
