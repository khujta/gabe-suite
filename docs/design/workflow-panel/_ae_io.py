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

import _ae_truth as TRUTH

TOKEN = re.compile(r"\{([a-z]\w*)\}", re.I)
CAP = 3                                                          # a list inside one line: its first few, then how many more
OPS_SAID = {"read", "add", "update", "delete", "merge", "execute"}   # review CR-30: the ops a function's hover says as a sentence
LIFE = {"with the answer": "req", "with the server process": "srv"}


def _short(at) -> str:
    return TRUTH.short(at)                                       # review N3-12: folder/file when two files here share the name


def _nm(q) -> str:
    return str(q or "").split("::")[-1]


def _short2(at) -> str:
    """apps/web/src/lib/query/client.ts:23 → query/client.ts:23 (two parts: a file name two folders share, told apart)"""
    return "/".join(str(at or "").split("/")[-2:])


def _file(at) -> str:
    return str(at or "").rsplit(":", 1)[0]


def _ln(at):
    t = str(at or "").rsplit(":", 1)
    return int(t[1]) if len(t) == 2 and t[1].isdigit() else None


def _says(x: dict) -> str:
    return TRUTH.said(x)                                         # review CR-10: the words as the caller gets them


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
                    self.read_by.setdefault(ro.get("exit"), []).append(ro.get("site"))
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
        self.req = None                                          # D-069: the request body's schema (set by by_moment, where it is read)
        mdl = ((fep.get("declared") or {}).get("response_model") or {}).get("name")
        self.ok = sorted({(x.get("status"), mdl) for x in F.get("exits") or [] if x.get("kind") == "success" and mdl}, key=str)
        # round-1 review F04 · CR-09: a raise the feed joins to no ending here meets the first except of its class up its callers
        self.cats = [c for c in (fep.get("failure") or {}).get("catches") or [] if c.get("outcome") == "translate"]
        self.parent = TRUTH.parent_of(self.inside, self.par, self.fns)
        self.site_fn = {}                                        # a client branch's id → the function it sits in (set by by_moment)
        self.radj, self.drawn, self.depth_of, self.fninfo, self.lvbeh = {}, set(), {}, {}, {}   # set by by_moment: callers by the station's edges, the
                                                                 # functions drawn, their depth, doc + return, each one's station behind list

    def near(self, fid, name):
        """the drawn functions (not the handler) whose station behind list names this one, less those another of them is behind"""
        n = _nm(fid) if fid else str(name or "")
        c = [g for g in self.drawn if g != self.H and g != fid and n in (self.lvbeh.get(g) or ())]
        return [g for g in c if not any(h != g and _nm(h) in (self.lvbeh.get(g) or ()) for h in c)]

    def caught(self, fid, cls):
        """(the except, the ending it makes) for a raise of `cls` in `fid` — the first except of its class up its callers"""
        c = TRUTH.catch_up(fid, cls, self.parent, self.cats) if fid and cls else None
        return (c, TRUTH.exit_of_catch(c, self.XS)) if c else (None, None)

    def causes(self, xid):
        """F05 · F06: the raises that become this ending, each [function, condition, where]"""
        return TRUTH.causes(xid, self.inside, self.par, self.fns, self.cats, self.XS)

    def st(self, xid):
        x = self.XS.get(xid) or {}
        return x.get("status")

    def ew(self, xid) -> str:
        """an ending in a list: its status, the rate limit's name when it is one (two 429s told apart, review F26), its words"""
        x = self.XS.get(xid) or {}
        lm = self.lim_by_exit.get(xid)
        return " ".join(str(q) for q in (x.get("status"), str((lm or {}).get("limiter") or "").lstrip("_") or None, _says(x) or None) if q not in (None, ""))

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
    k, title, asw = None, None, []                               # title: a name in words (review CR-37, CR-38) · asw: conditions as written (CR-15)
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
            cs0 = [q for q in x.get("cases") or [] if isinstance(q, dict)]
            nb = sum(1 for q in cs0 if str(q.get("loc") or "") == "body")
            c.append(_L("valBody", n=len(cs0), k=len(cs0) - nb) if nb else _L("val", n=len(cs0)))
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
                cz = C.causes(idn)                               # review F05 · F06: who raises it, and when — every cause, not one
                for fn0, pr0, at0, _by, m0 in cz:                   # the if a raise sits in is where it stands, not always why (it may sit in an except)
                    ln = _L("causeIf", fn=_nm(fn0), v=_plain(pr0), at=_short(at0)) if pr0 else _L("cause", fn=_nm(fn0), at=_short(at0))
                    b.append(ln)
                    if m0:
                        b.append(_L("causeMsg", v=m0))
                if not cz:
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
        for h in X.get("hd") or []:                              # review CR-36: a value worked out as it answers is said so, not elided
            g.append(_L("hdrRun", v=h[0]) if str(h[1]) in ("\u2026", "...", "") else _L("x.headers", v=h[0] + ": " + str(h[1])))
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
            if rb:                                               # review F18: the function that reads it, and where
                g.append(_L("screenReads", v=_cap(list(dict.fromkeys(
                    (C.site_fn.get(q) + " (" + _short((C.sites.get(q) or {}).get("at")) + ")") if C.site_fn.get(q) else (_short((C.sites.get(q) or {}).get("at")) or str(q)) for q in rb)))))
            if rs:
                g.append(_L("screenRest", v=_cap(rs)))
            if not rb and not rs:
                g.append(_L("noScreen"))
    # ── GATES AND DECISIONS ──
    elif f == "gate":
        p, _s, v = idn.partition(":")
        if X.get("gh") and p != "a":                             # D-069 (his L-09): the function (or middleware) it runs in, first
            b.append(_L("hostIn", fn=X["gh"][1]))
        if p == "g":                                             # the endpoint's own check
            q = C.fpre.get(v) or {}
            k = "guard"
            m = re.match(r"^call (.+) @ (.+)$", str(q.get("via") or ""))
            if m:
                b.append(_L("inCall", fn=_nm(m.group(1)), at=_short(m.group(2))))
            if q.get("after"):                                   # review CR-15: a negation said the other way round
                b.append(_L("after", v=" · ".join(_plain(a) for a in q["after"])))
                asw += [a for a in q["after"] if _plain(a) != a]
            if str(q.get("via") or "").startswith("except "):   # review N3-25: raised inside an except — that except is what refuses
                if q.get("pred"):
                    b.append(_L("inIf", v=q["pred"]))
                c.append(_L("chkExcept", cls=str(q["via"])[7:], at=_short(q.get("at"))))
            elif q.get("pred"):
                c.append(_L("chk", v=q["pred"], at=_short(q.get("at"))))
            cj = C.caught(X["gh"][0][3:] if X.get("gh") and str(X["gh"][0]).startswith("fn:") else None, (X.get("rz") or [None])[0]) if not (q.get("exit") in C.XS) else (None, None)
            if q.get("exit") and q["exit"] in C.XS:
                g.append(C.ans(q["exit"], "ends"))
            elif cj[1]:                                          # review F04 · F06: its raise becomes the ending of the except that catches it
                g.append(C.ans(cj[1]["id"], "ends"))
            elif q.get("status") is not None:
                g.append(_L("endsUnknown", st=q["status"]))
            if X.get("rz"):
                g.append(_L("x.raises", cls=X["rz"][0], msg=X["rz"][1]) if X["rz"][1] is not None else _L("x.raisesBuilt", cls=X["rz"][0]))
            if cj[0]:
                g.append(_L("caughtBy", cls=X["rz"][0], fn=_nm(cj[0].get("fn")), at=_short(cj[0].get("at"))))
        elif p == "b":                                           # a deciding branch
            q = C.fbr.get(v) or {}
            k = "fork"
            if q.get("call"):
                b.append(_L("inCall", fn=q["call"], at=_short(q.get("site"))))
            if q.get("after"):                                   # review CR-15: what must already hold, said the way it holds
                b.append(_L("after", v=" · ".join(_plain(a0) for a0 in q["after"])))
                asw += [a0 for a0 in q["after"] if _plain(a0) != a0]
            if q.get("pred"):
                c.append(_L("if", v=q["pred"]))
            elif q.get("token") == "fall-through":               # review CR-37: the fall-through is named "otherwise", never by its host
                c.append(_L("fall"))
                title = _L("forkElse")
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
            x1 = TRUTH.exit_of_catch(q, C.XS) if q.get("outcome") == "translate" else None
            cz1 = C.causes(x1["id"]) if x1 else []               # review F04 · F06: every raise it takes here, the feed's joins and by class
            for cls in types:                                    # where it is raised: the raises this endpoint's endings translate
                at = sorted({_short(z.get("at")) for rec in C.fns.values() for z in rec.get("raises") or [] if z.get("cls") == cls
                             and any(t.get("exit") in C.XS for t in z.get("translated_by") or [])} | {_short(q0[2]) for q0 in cz1})
                b.append(_L("raisedAt", cls=cls, at=_cap(at)) if at else _L("raisedAs", cls=cls))
            c.append(_L("xcatch2", cls=" · ".join(types) or "?", at=_short(q.get("at"))))
            out = str(q.get("outcome") or "")
            if out == "translate":
                for st in q.get("answers") or []:
                    xs = [x0 for x0 in C.XS.values() if x0.get("status") == st and str(x0.get("via") or "") in ["except " + t for t in types]]
                    g.append(C.ans(xs[0]["id"]) if len(xs) == 1 else _L("ansBare", st=st))
            elif out:
                g.append(_L("outcome." + out))
            for cm in q.get("commits") or []:                    # review F07 · N3-09: only a commit the except's own body runs (the
                sr = cm if isinstance(cm, dict) else (C.steps.get(cm) or {})   # feed lists the try's commits; one the raise skipped saves nothing here)
                if sr.get("fn") == q.get("fn") and _file(sr.get("at")) == _file(q.get("at")) and (_ln(sr.get("at")) or 0) >= (_ln(q.get("at")) or 0):
                    g.append(_L("commitsAt", at=_short(sr.get("at") or cm)))
        elif p == "l":                                           # a rate limiter
            lm = C.lim_by_name.get(v) or {}
            k = "limiter"
            b += _lim_before(C, lm, lm.get("exit"))
            c += _lim_checks(lm)
            if lm.get("exit") in C.XS:
                g.append(C.ans(lm["exit"], "ends"))
                for h, hv in sorted(((C.resp.get(lm["exit"]) or {}).get("headers") or {}).items()):
                    g.append(_L("hdrRun", v=h) if str(hv) in ("\u2026", "...", "") else _L("x.headers", v=h + ": " + str(hv)))   # review CR-36
        elif p == "a":                                           # the login check
            k = "login"
            for a in X.get("au") or []:
                c.append(_L("x.auth", scheme=a[0], header=a[2], carrier=a[1]))
            c.append(_L("calls", v=_nm(v)))
            au = C.F.get("auth") or {}
            for s in au.get("schemes") or []:
                if s.get("exit") in C.XS:
                    g.append(C.ans(s["exit"], "ends"))
            ct = {t for c0 in (C.fep.get("failure") or {}).get("catches") or [] for t in c0.get("types") or []}
            for x0 in C.F.get("exits") or []:                    # review N3-08: a dependency refusal an except makes is that except's
                if x0.get("phase") == "dependency" and x0.get("kind") == "refusal" and not (str(x0.get("via") or "").startswith("except ") and str(x0["via"])[7:] in ct):
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
        if X.get("rc"):                                          # review S4-21: ONE race sentence (N3-18: a race with no constraint name, by its table)
            q0 = dict(cols=", ".join(X["rc"][2]), at=_short(s0.get("at")), st=X["rc"][3])
            g.append(_L("x.raceStep", tbl=X["rc"][1], **q0) if X.get("rs") else _L("x.race", cons=X["rc"][0], **q0))
    # ── FUNCTIONS ──
    elif f == "fn":
        fid = next((q[3:] for q in e.get("keys") or [] if str(q).startswith("fn:")), None)
        rec = C.fns.get(fid) or {}
        ins = C.inside.get(fid) or {}
        k = "handler" if fid == C.H else "fn"
        k0 = str((e.get("keys") or [""])[0])
        if k0.startswith(("schema:", "table:")):                  # D-069 (P-L14d): a class the handler builds, not a function
            k = "built"
            c.append(_L("builds", v=name))
        par = C.par.get(fid)                                     # the function that calls it, in the walk from the handler
        # review N3-24 · F19: a function the walk does not hang under a caller — its callers among this endpoint's functions, by the
        # station's call edges, and the line it is called at there where the feeds hold it
        lvc = sorted(g for g in C.radj.get(fid, ()) if g in C.drawn and g != fid) if not par and fid and fid != C.H else []
        if fid == C.H:
            if C.dep_vals:
                b.append(_L("gets", v=_cap(C.dep_vals)))
        elif par and par != C.H:
            b.append(_L("calledBy", v=_nm(par)))
            if e.get("_q") is not None and not X.get("dd"):
                b.append(_L("underCall", at=_short(C.hf) + ":" + str(e["_q"])))
        elif lvc and lvc != [C.H]:
            _p, st0 = C.parent(fid) if len(lvc) == 1 else (None, None)
            b.append(_L("calledByAt", v=_nm(lvc[0]), at=_short(st0)) if st0 else _L("calledBy", v=_cap([_nm(g) for g in lvc])))
            if e.get("_q") is not None:
                b.append(_L("underCall", at=_short(C.hf) + ":" + str(e["_q"])))
            dps = {C.depth_of.get(g) for g in lvc}
            if len(dps) == 1 and None not in dps and not X.get("dp"):
                b.append(_L("depth", n=dps.pop() + 1))
        else:
            # review N3-24 · F19: a function the station's own list of what a function reaches puts behind a drawn one — the nearest such
            # (none of the others behind it) — runs under it; the handler's call it runs in is said as that, never as the line calling it
            near = sorted(e.get("_jc") or C.near(fid, name))
            if near:
                b.append(_L("underFn", v=_cap([_nm(g) for g in near])))
            if e.get("_q") is not None:
                b.append(_L("calledAt", at=_short(C.hf) + ":" + str(e["_q"])) if X.get("dp") == 1 and not near else _L("underCall", at=_short(C.hf) + ":" + str(e["_q"])))
        if X.get("dd"):                                          # review CR-05: run by FastAPI before the handler, inside its dependency
            b.append(_L("depRun", fn=X["dd"][0]) if X["dd"][1] else _L("depRoot"))
            if X["dd"][1]:
                b.append(_L("depIn1", fn=X["dd"][0]) if X["dd"][1] == 1 else _L("depIn", n=X["dd"][1], fn=X["dd"][0]))
        elif X.get("dp"):
            b.append(_L("depth", n=X["dp"]) if X["dp"] != 1 else _L("depth1"))
        if X.get("cp"):                                          # review F15: the code fact only — it runs inside that call
            b.append(_L("x.callPaths", via=X["cp"]))
        doc, ret = (C.fninfo.get(fid) or (None, None)) if fid else (None, None)
        if doc and fid != C.H:                                   # review F20 · CR-30: what it does, in its author's words (its docstring's first sentence)
            c.append(_L("doc", v=doc))
        at = rec.get("at") or ins.get("at")
        if at:
            c.append(_L("defAt", at=_short(at)))
        ops = {}
        for s in C.steps.values():
            if s.get("fn") == fid and s.get("table"):
                ops.setdefault(s.get("op"), []).append(s["table"])
        for op in sorted(ops, key=lambda o: (o != "read", str(o))):   # review CR-30: a sentence per op, the reads first
            ts = sorted(set(ops[op]))
            v0 = " and ".join(ts) if len(ts) <= CAP else _cap(ts)
            c.append(_L("op_" + op, v=v0) if op in OPS_SAID else _L("opTables", op=op, v=v0))
        if ret and fid != C.H:
            g.append(_L("gives", v=ret))
        for z in ins.get("refusals") or rec.get("refusals") or []:
            g.append(_L("refuses", st=z.get("status"), at=_short(z.get("at"))))
        for z in rec.get("raises") or []:
            tb = [t for t in z.get("translated_by") or [] if t.get("exit") in C.XS]
            cj = C.caught(fid, z.get("cls")) if not tb else (None, None)
            if tb:
                g.append(_L("rzTo", cls=z.get("cls"), at=_short(z.get("at")), st=" · ".join(sorted({str(t.get("status")) for t in tb}))))
            elif cj[1]:                                          # review F04 · CR-09: the except of its class up its callers answers it
                g.append(_L("rzCaught", cls=z.get("cls"), at=_short(z.get("at")), fn=_nm(cj[0].get("fn")), cat=_short(cj[0].get("at")), st=cj[1].get("status"), v=_says(cj[1]) or "?"))
                if z.get("pred"):
                    g.append(_L("rzWhen", v=_plain(z["pred"])))
                if z.get("msg"):
                    g.append(_L("causeMsg", v=z["msg"]))
            else:
                g.append(_L("rzLoose", cls=z.get("cls"), at=_short(z.get("at"))))
        for cm in rec.get("commits") or ins.get("commits") or []:
            g.append(_L("commitsAt", at=_short(cm.get("at") if isinstance(cm, dict) else (C.steps.get(cm) or {}).get("at") or cm)))
        for q in X.get("ru") or []:
            g.append(_L("x.uncaught", cls=q[0], at=q[1]))
        for x0 in C.inf.values():                                # D-069 (P-L14c): an in-flight value its own body reads
            for q in x0.get("read_at") or []:
                if q.get("fn") == fid and (x0.get("set_by") or x0.get("set_at")):
                    sb = str(x0.get("set_by") or "")
                    b.append(_L("readsInf", v=x0.get("name") or "?", fn=_nm(sb.split(":", 1)[-1] if sb.startswith("middleware:") else sb) or "?", at=_short(x0.get("set_at"))))
                    break
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
            nb = any(str(cs.get("loc") or "") == "body" for cs, _x in C.cases.values())
            g.append(_L("val422oneBody" if nb else "val422one") if n == 1 else _L("val422Body" if nb else "val422", n=n))
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
            pc = X.get("pc") or [None, None, None, {}]
            if s.get("piece") or pc[1]:
                b.append(_L("inFn", fn=pc[1] or str(s["piece"]).split("#")[-1]))
            if X.get("rx"):                                      # D-069 (his L-16: "why do they trigger?"): the endings that reach it
                b.append(_L("reachedBy", v=_cap([C.ew(x0) for x0 in X["rx"]])))
            hx = pc[3] or {}
            if hx.get("via"):                                    # … and in which context: the code that hands it the error
                b.append(_L("handedAt", v=", ".join(hx["via"]) + (" (" + ", ".join(str(q) for q in hx.get("err") or []) + ")" if hx.get("err") else "")))
            rd = X.get("rd") or []
            if len(rd) > 2 and rd[2] is not None:                # review F18 · CR-38: titled by what it reads, in which function; its line here
                c.append(_L("readsAt", what=rd[0], op=rd[1], v=rd[2], at=_short(s.get("at"))) if s.get("at") else _L("x.reads", what=rd[0], op=rd[1], v=rd[2]))
                if pc[1] or s.get("piece"):
                    title = _L("rsTitle", v=rd[2], fn=pc[1] or str(s["piece"]).split("#")[-1])
            if X.get("dw"):
                g.append(_L("x.does", v=X["dw"]))
            if X.get("al"):
                g.append(_L("collapsed", n=len(X.get("rx") or [])))
        elif p == "pc":                                          # review F09: the client function its branches sit in, heading them
            k = "clfn"
            pc = X.get("pc") or [None, name, None, {}]
            hx = pc[3] or {}
            if hx.get("via"):
                b.append(_L("handedAt", v=", ".join(hx["via"]) + (" (" + ", ".join(str(q) for q in hx.get("err") or []) + ")" if hx.get("err") else "")))
            vs = [str(q[2]) for q in X.get("cmp") or [] if q and len(q) > 2 and q[2] is not None]
            if vs:
                c.append(_L("clCmp", at=pc[2] or "?", what=(X["cmp"][0] or [None])[0] or "?", v=" \u00b7 ".join(dict.fromkeys(vs))))
        elif p == "t:":                                          # D-069 (client P3): what no branch of the function compares
            k = "rest"
            pc = X.get("pc") or [None, None]
            name = str(pc[1] or "")
            b.append(_L("inFn", fn=name or "?"))
            c.append(_L("restEnds", v=_cap([C.ew(x0) for x0 in X.get("rx") or []])))
            if X.get("fw"):                                      # review N3-20: the body's parse endings, which no branch compares either
                c.append(_L("restFw", v=" · ".join(C.ew(x0) for x0 in X["fw"])))
            g.append(_L("restDoes", fn=name or "?"))                 # review S4-12: the code fact, not what the map lacks
        elif p == "y:":                                          # D-069 (client P5): a hook on the way from the screen to the send
            k = "orch"
            ox = X.get("ox") or {}
            if ox.get("scr"):
                b.append(_L("usedBy", v=ox["scr"]))
            if ox.get("send"):
                c.append(_L("callsAt", fn=", ".join(ox.get("to") or []) or "?", v=", ".join(str(q) for q in ox["send"])))
            if ox.get("err"):
                g.append(_L("errAt", v=", ".join(str(q) for q in ox["err"])))
        elif p == "o:":
            k = "cache"
            h = str(e.get("hint") or "")
            wn, _s, at = h.partition(" · ")
            if wn:
                b.append(_L("onWhen", v=wn))
            c.append(_L("cacheAt", at=at or "?"))
            g.append(_L("refreshKey" if (ch[1:2] == ["refresh"]) else "seedKey", v=name.split(" ", 1)[-1]))
            for q in X.get("rf") or []:                          # D-069 (his L-15: "what is fetching and from where?")
                m0, _s, p0 = str(q[4] or "").partition(" ")
                g.append(_L("refetch", hook=q[1], m=m0 or "?", p=p0 or "?"))
                if q[5]:
                    g.append(_L("refetchReply", hook=q[1], v=q[5], tbl=_cap(q[6])) if q[6] else _L("refetchReplyBare", hook=q[1], v=q[5]))
                if q[7]:
                    g.append(_L("refetchWrote", v=" · ".join(q[7]), hook=q[1]))
            name = name.split(" ", 1)[0]
        elif p == "v:":
            k = "screen"
            if "#" in idn:                                           # review CR-16: where the screen is written (two screens may share a name)
                c.append(_L("scrIn", at=_short2(idn[2:].split("#")[0].replace("fe:", "", 1))))
            if X.get("uses"):                                    # review F33: what the screen does on the way to the request
                c.append(_L("scrUses", v=", ".join(X["uses"])))
        elif X.get("fl"):
            k = "file"
            c.append(_L("x.file"))
        else:
            k = "hook"
            pid = (e.get("keys") or [None])[0]
            pc = ((C.fj.get("frontend") or {}).get("pieces") or {}).get(pid) or {}
            calls = [q for q in pc.get("calls") or [] if q.get("endpoint") == C.E]
            if calls and C.req:                                  # D-069 (client P5): what it sends, what comes back, where an error goes
                b.append(_L("sendsBody", v=C.req))
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
            else:
                pol = next((q.get("policy") or {} for q in ((C.fj.get("frontend") or {}).get("client") or {}).get("clients") or []), {})
                rt = ((pol.get("mutations") or {}).get("retry") or {})
                if any(q.get("kind") == "mutation" for q in calls) and rt.get("state") == "defined" and rt.get("value") is False:
                    c.append(_L("noRetry", at=_short2(next((q.get("at") for q in ((C.fj.get("frontend") or {}).get("client") or {}).get("clients") or []), "")) or "?"))
                tr = ((C.fj.get("frontend") or {}).get("client") or {}).get("transport") or {}
                for q in calls:                                  # review N3-21: the wrapper that sends it has its own branch on a 401
                    for ft in q.get("fetch") or []:
                        wf = str(ft.get("wrapper") or "").split("#")[0].replace("fe:", "", 1)
                        for br in (tr.get(wf) or {}).get("branches") or []:
                            if br.get("fn") == ft.get("callee") and br.get("status") is not None and not br.get("when"):
                                c.append(_L("wrapBranch", fn=br["fn"], st=br["status"], at=_short2(br.get("at"))))
                                break
                for st, mdl in C.ok:
                    g.append(_L("okTo", st=st, v=mdl))
                rf = sorted({str(rd.get("fn") or "") for rd in (((C.fj.get("frontend") or {}).get("reasons") or {}).get("readers") or {}).get(C.E) or []} - {""})
                if rf:
                    g.append(_L("errTo", v=_cap(rf)))
    # ── IN-FLIGHT STATE ──
    elif f == "inf":
        ik = idn[2:]
        x = C.inf.get(ik) or {}
        k = "inflight"
        if x.get("set_by") or x.get("set_at"):
            b.append(_L("setBy", fn=_nm(str(x.get("set_by") or "?").split(":", 1)[-1] if str(x.get("set_by") or "").startswith("middleware:") else x.get("set_by")), at=_short(x.get("set_at"))))
        if X.get("ty"):
            c.append(_L("holdsA", v=X["ty"]))
        ra = [_short(q.get("at")) for q in x.get("read_at") or []]
        if ra:
            c.append(_L("readAt1", v=ra[0]) if len(ra) == 1 else _L("readAt", n=len(ra), v=_cap(ra)))
        if x.get("dies"):
            g.append(_L("lasts", v=TRUTH.TERMS["life"][LIFE.get(x["dies"], "unk")]["name"]))
        if x.get("applies_to"):
            g.append(_L("sharedBy", n=x["applies_to"]))
    # ── STANDARD OR SPECIALIST ──
    elif f == "std":
        if idn.startswith("w:"):
            w = dict(C.sw.get(idn[2:]) or {}, **(C.fsw.get(idn[2:]) or {}))   # the feed's own record: its settings with env and default
            k = "switch"
            if X.get("gh"):                                      # D-069: the function (or middleware) it switches in
                b.append(_L("hostIn", fn=X["gh"][1]))
            ss = w.get("settings") or {}
            for sname in sorted(ss):
                sv = ss[sname] if isinstance(ss, dict) and isinstance(ss[sname], dict) else {}
                b.append(_L("setting", v=sname, env=sv.get("env") or "?", d=sv.get("default") or "?"))
            if w.get("expr"):
                c.append(_L("expr", v=w["expr"]))
            if w.get("port"):                                    # review N3-10: where the verifier is used (the feed's site), who picks it
                c.append(_L("bind", port=w["port"], at=_short(w.get("site") or w.get("anchor"))))
                if w.get("factories"):
                    c.append(_L("pickedBy", v=", ".join(_nm(q) for q in w["factories"])))
            prev = None
            for br in w.get("branches") or []:                   # review CR-15 · F22: each arm, the last one "otherwise" when it is the first's negation
                if br.get("impl") or br.get("pred"):
                    pr = br.get("pred") or "?"
                    if prev and pr == "not (" + prev + ")":
                        c.append(_L("armElse", impl=br.get("impl") or br.get("value") or "?")); asw.append(pr)
                    else:
                        c.append(_L("arm", v=_plain(pr), impl=br.get("impl") or br.get("value") or "?"))
                        if _plain(pr) != pr:
                            asw.append(pr)
                    prev = prev or pr
            xs = sorted({str(C.st(x0)) for x0 in (w.get("refs") or []) + (w.get("proves") or []) if C.st(x0) is not None})
            if xs and w.get("changes_exit") is False:            # review N3-10 · F22: what each arm does to the request
                g.append(_L("eitherCan", v=" · ".join(xs)))
            elif xs and w.get("kind") == "flag" and w.get("expr"):
                g.append(_L("flagOn", v=w["expr"], st=" · ".join(xs)))
            elif xs:
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
            if od.get("runs") is not None and od.get("of"):     # review N3-11: the feed counts from 0; the first to run is 1 of 3
                b.append(_L("order", n=od["runs"] + 1, of=od["of"]))
            if m.get("method"):
                c.append(_L("mwAt", fn=_nm(m["method"]), at=_short(m.get("registered_at"))))
            elif m.get("registered_at"):                         # review F33: a library's middleware — its code is not the app's
                c.append(_L("mwLib", at=_short(m.get("registered_at"))))
            for pt in m.get("pass_through") or []:               # review F33: what it lets through without its check
                if pt.get("kind") == "exact-paths" and pt.get("values"):
                    c.append(_L("mwSkipPath", v=", ".join(str(q) for q in pt["values"])))
                elif pt.get("expr"):
                    c.append(_L("mwSkip", v=_plain(pt["expr"])))
            mine = [x0 for x0 in C.inf.values() if str(x0.get("set_by") or "") == "middleware:" + name]
            for x0 in mine:                                      # review F33: what it reads, and what it keeps on the request for later code
                fr = x0.get("from") or {}
                if fr.get("kind") == "header" and fr.get("name"):
                    c.append(_L("mwHdr", v=fr["name"]))
                rd = sorted({_nm(q.get("fn")) for q in x0.get("read_at") or [] if q.get("fn")})
                g.append(_L("mwSets", v=x0.get("name") or "?", at=_short(x0.get("set_at")), fn=", ".join(rd) or "?"))
            xs = [x0.get("id") for x0 in m.get("exits") or [] if x0.get("id") in C.XS]
            if xs:
                g.append(_L("mwEnds", v=" \u00b7 ".join(" ".join(str(q) for q in (C.st(x0), str((C.lim_by_exit.get(x0) or {}).get("limiter") or "").lstrip("_") or None) if q) for x0 in xs)))
            elif not mine:
                g.append(_L("mwNone"))
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
            c.append(_L("svcFn", fn=X.get("sv") or "?"))
        else:
            # one call, or (folded, review F03) every call of the case in this cell — each with what it sends and asserts
            lns = str(parts[2]).split(",") if len(parts) > 2 else []
            sends = []
            for ln in lns:
                call = next((q for q in tc.get("calls") or [] if str(q.get("line")) == ln and q.get("role") == "act"), None)
                if not call:
                    continue
                # review N3-02 · CR-02: `sends` null is headers a fixture sets, whose names the test does not spell; [] is none at all
                sl = _L("sends", v=", ".join(call["sends"])) if call.get("sends") else _L("sendsNone") if call.get("sends") == [] else _L("sendsFix")
                if sl not in sends:
                    sends.append(sl)
                c.append(_L("tcall", m=call.get("method"), p=call.get("path"), ln=call.get("line")))
                a = (X.get("asm") or {}).get(ln) or X.get("as")
                if a:
                    c.append(_L("x.asserts", v=" · ".join(str(q) for q in a[0])) if a[0] else _L("x.assertsNone"))
                    if a[1]:
                        c.append(_L("x.assertsDetail", v=" · ".join(str(q) for q in a[1])))
                    if a[2]:
                        c.append(_L("x.assertsCode", v=" · ".join(str(q) for q in a[2])))
                    if a[3]:
                        c.append(_L("x.assertsAttrs", n=a[3]))
            b += sends
        w = e.get("w") or ()
        xs = list(w[1]) if w and w[0] == "xs" else []
        fit = "fits" if X.get("am") else "proves"               # review F03: a status that fits several endings proves none of them
        for x0 in xs:                                            # the ending it proves (or fits), by where it is produced (two may share words)
            at = _short((C.frec.get(x0) or {}).get("site") or (C.XS.get(x0) or {}).get("at"))
            g.append(C.ans(x0, fit + "At", at=at) if at else C.ans(x0, fit))
        if X.get("am"):
            g.append(_L("fitsOf", n=X["am"], h=X.get("hn") or len(xs)))
        elif X.get("ho"):
            g.append(_L("x.hollow", n=X["ho"]))
        if tc.get("state"):
            g.append(_L("state", v=tc["state"]))
    if asw:                                                      # review CR-15: the code, as written, the hover's last line
        g.append(_L("asWritten", v=" · ".join(dict.fromkeys(asw))))
    return {"h": [name, k or f] + ([title] if title else []), "b": b, "c": c, "g": g}


NEG = re.compile(r"^not \((.*)\)$")
FLIP = (((" is not ", " is "), (" != ", " == "), (" not in ", " in ")), ((" is ", " is not "), (" == ", " != "), (" in ", " not in ")))


def _plain(p):
    """review CR-15: `not (A is not None)` → `A is None`, `not (A is None)` → `A is not None` — ONE comparison, no and/or/if, said the
    way it holds; anything else stays as written"""
    m = NEG.match(str(p or "").strip())
    if not m:
        return p
    q = m.group(1)
    if q.count("(") != q.count(")") or re.search(r"\b(and|or|if)\b", q):
        return p
    for grp in FLIP:
        for a, b0 in grp:
            if a in q:
                rest = q.replace(a, "\0", 1)
                return q.replace(a, b0, 1) if q.count(a) == 1 and not re.search(r" is | == | != | in |\bnot\b", rest) else p
    return p


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
        k0 = str(lm.get("key") or "")                            # review CR-36: the key in words — per caller IP, its own count for this limit
        m0 = re.fullmatch(r"f?['\"]\{ip\}(?::(\w+))?['\"]", k0)
        w0 = int(w) if isinstance(w, float) and w.is_integer() else w
        out.append(_L("limIp", n=arg["limit"].get("value"), w=w0, v=m0.group(1)) if m0 and m0.group(1) else _L("limIp1", n=arg["limit"].get("value"), w=w0) if m0
                   else _L("x.limit", n=arg["limit"].get("value"), w=w0, k=lm.get("key")))
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
        for x in r["mo"]["el"] + [[None] * 7 + [{"io": q}] for q in (r["mo"].get("hio") or {}).values()]:   # review F09: the host heads too
            io = (x[7] or {}).get("io")
            if not io:
                continue
            hk = io["h"][1]
            if len(io["h"]) > 2:                                 # a title in words (review CR-37, CR-38): checked like a line
                io = dict(io, b=list(io["b"]) + [io["h"][2]])
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
