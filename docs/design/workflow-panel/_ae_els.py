"""D-069 · EVERY BY MOMENT ELEMENT SAYS WHAT IT IS (his note "API Hover Legend Consolidation", L-09 … L-18, batch C1).

What a human reader could not tell from a chip: which function a gate runs in, what its condition does when it holds, at which
level it decides; what a refresh makes fetch again and from where; which function a client branch sits in; what an in-flight value
is and how long it lives; what the Standard or specialist row is. This module reads each of those from the feed's OWN fields and
writes them onto the element (its `x`, the extras the page draws), for the page to draw. It never places an element (by_moment does)
and never guesses: a fact the feed does not hold is left out, and a join the page needs and cannot make STOPS the build.

The extras it writes (all optional; the page draws what is there):
  gate + switch  gh = [host key, host name] — the function (or the middleware) the gate runs in, a station element (D-052)
                 ef = [act, [[status, ending kind, stage, ending key] …]] — what happens when the condition holds
                 gk = the gate's kind (l limiter · a login check · g check · b fork · c catch · w switch)
                 gl = where it decides (app · login · dep · own · call) · gv = what it does (refuses · translates · routes · passes ·
                 swallows) · gc = the status a check refuses with (its "what it guards", checks only)
  piece          rr = [n, of] how rare · tg = how many drawn elements it names (they carry `ra`)
  any            ra = [[n, of, words]] the rare pieces that name it · xk = the extra keys it draws (so they wear the station's marks)
  fn             fd = the statuses its own code decides · ft = [[table, r|w|rw, hollow]] the tables it touches on this endpoint
  client         rf = the reads a refresh makes fetch again · pc = the client function a branch sits in · ox = a hook on the way
  inf            ty = the value's type · lt = its lifetime (req · srv · unk)
"""
from __future__ import annotations

import collections
import re

VIA_CALL = re.compile(r"^call (.+) @ (.+):(\d+)$")
LIFE = {"with the answer": "req", "with the server process": "srv"}
OUT_VERB = {"translate": "translates", "pass-through": "passes", "swallow": "swallows"}


def _short(at) -> str:
    return str(at or "").rsplit("/", 1)[-1]


def _nm(q) -> str:
    return str(q or "").split("::")[-1]


def fkey(q):
    return ("fn:" + str(q).replace("#", "::")) if q else None


class Ctx:
    """what one endpoint's elements are read against (built once per endpoint in by_moment)"""

    def __init__(self, *, lab, E, F, fj, fep, H, deps, XS, chains, EXIT, stage_of, r, X, die):
        self.lab, self.E, self.F, self.fj, self.fep, self.H, self.deps, self.XS, self.EXIT = lab, E, F, fj, fep, H, deps, XS, EXIT
        self.stage_of, self.r, self.X, self.die = stage_of, r, X, die
        self.fns = fj.get("functions") or {}
        self.fpre = {g["id"]: g for g in fep.get("preconditions") or []}
        self.lpre = {g["id"]: g for g in F.get("preconditions") or []}
        self.fbr = {b["id"]: b for b in fep.get("branches") or []}
        self.cat = {c["id"]: c for c in (fep.get("failure") or {}).get("catches") or []}
        self.rets = {x["id"]: x for x in fep.get("returns") or []}
        self.lim = {str(l0.get("limiter") or l0.get("class") or "?").lstrip("_"): l0 for l0 in (F.get("rate") or {}).get("limits") or []}
        self.mw_of_exit = {x["id"]: k for k, m in (fj.get("middleware") or {}).items() for x in m.get("exits") or []}
        fsw = {q.get("id"): q for q in fep.get("switches") or []}
        self.sw = {w["id"]: dict(w, **fsw.get(w["id"], {})) for w in F.get("switches") or []}
        au = F.get("auth") or {}
        self.auth = {g.get("fn") for g in au.get("gates") or [] if g.get("fn")}
        # a check's host: the function whose raise or refusal the feed records at the check's line
        self.at2fn = collections.defaultdict(set)
        for f, rec in self.fns.items():
            for z in (rec.get("raises") or []) + (rec.get("refusals") or []):
                if z.get("at"):
                    self.at2fn[z["at"]].add(f)
        for f in (F.get("inside") or {}).get("functions") or []:
            for z in (f.get("raises") or []) + (f.get("refusals") or []):
                if z.get("at") and f.get("fn"):
                    self.at2fn[z["at"]].add(f["fn"])
        self.fork_ends = collections.defaultdict(set)
        for pid, ch in chains.items():
            for s in ch:
                if s.get("kind") == "branch" and s.get("hit") and s.get("ref"):
                    self.fork_ends[s["ref"]].add(EXIT[pid])

    def end(self, xid):
        """an ending as the page draws its effect: [status, ending kind, stage, the ending's key]"""
        x = self.XS.get(xid) or {}
        st = x.get("status")
        return [st, x.get("kind"), self.stage_of(x), ("status:" + str(st)) if st not in (None, "") else None]

    def level(self, host):
        if host in self.auth:
            return "login"
        if host in self.deps:
            return "dep"
        return "own" if host == self.H else "call"


def gates(els: list, C: Ctx, tally: collections.Counter) -> None:
    """the host, the effect and the role of every gate and switch — his L-09 ("we should show the function … of the place where
    they are being called … ideally a function with a function role"), L-10 (function → condition → effect), L-11 (roles of the
    gates themselves). PROOF: every gate has a host; a check's host is ONE function"""
    for e in els:
        if e["f"] not in ("gate", "std"):
            continue
        p, _s, v = str(e.get("id") or "").partition(":")
        x, host, name, eff, act = e["x"], None, None, [], "ends"
        if e["f"] == "std":
            if p != "w":
                continue
            w = C.sw.get(v) or {}
            if w.get("via"):
                host, name = "middleware:" + str(w["via"]), str(w["via"])
            elif w.get("fn"):
                host, name = fkey(w["fn"]), _nm(w["fn"])
            elif w.get("scope") == "handler":                   # a flag the handler's own code reads
                host, name = fkey(C.H), _nm(C.H)
            eff = [C.end(q) for q in (w.get("refs") or []) + (w.get("proves") or []) if q in C.XS]
            act = "can" if w.get("changes_exit") is False else "dec"
            x.update(gk="w", gl={"middleware": "app", "dependency": "dep", "handler": "own"}.get(w.get("scope"), "call"))
        elif p == "g":                                           # the endpoint's own check
            g = C.fpre.get(v) or C.lpre.get(v) or {}
            hs = C.at2fn.get(g.get("at")) or set()
            if len(hs) > 1:
                C.die(f"{C.lab}: the check {v} at {g.get('at')} is recorded in {len(hs)} functions: {sorted(hs)[:3]}")
            h = next(iter(hs), None) or (C.H if str(g.get("at") or "").startswith(C.fep.get("file") or "\0") else None)
            host, name = fkey(h), _nm(h)
            xid = g.get("exit")
            eff = [C.end(xid)] if xid in C.XS else ([[g.get("status"), None, None, "status:" + str(g["status"])]] if g.get("status") is not None else [])
            x.update(gk="g", gl=C.level(h), gv="refuses", gc=g.get("status"))
        elif p == "a":                                           # the login check: it IS its function
            host, name = fkey(v), _nm(v)
            au = C.F.get("auth") or {}
            xs = [s.get("exit") for s in au.get("schemes") or [] if s.get("exit") in C.XS]
            xs += [q["id"] for q in C.F.get("exits") or [] if q.get("phase") == "dependency" and q.get("kind") == "refusal"]
            eff = [C.end(q) for q in dict.fromkeys(xs)]
            x.update(gk="a", gl="login", gv="refuses")
        elif p == "l":                                           # a rate limiter: the middleware it runs in
            l0 = C.lim.get(v) or {}
            mw = ("middleware:" + str(l0["via"])) if l0.get("via") else C.mw_of_exit.get(l0.get("exit"))
            if mw:
                host, name = mw, mw.split(":", 1)[1]
            eff = [C.end(l0["exit"])] if l0.get("exit") in C.XS else []
            x.update(gk="l", gl="app", gv="refuses")
        elif p == "b":                                           # a deciding fork: the function whose branch it is
            b = C.fbr.get(v) or {}
            host, name = fkey(b.get("fn")), _nm(b.get("fn"))
            ends = sorted(C.fork_ends.get(v, ()), key=lambda q: str(C.XS.get(q, {}).get("status")))
            rt = C.rets.get(b.get("return")) or {}
            eff = [C.end(q) for q in ends] or ([[rt.get("status"), "success", "ANSWER", None]] if rt.get("status") is not None else [])
            act = "ret"
            x.update(gk="b", gl=C.level(b.get("fn")), gv="routes", **({"fall": 1} if b.get("token") == "fall-through" else {}))
        elif p == "c":                                           # a catch: the function whose except it is
            c = C.cat.get(v) or {}
            host, name = fkey(c.get("fn")), _nm(c.get("fn"))
            types = ["except " + t for t in c.get("types") or []]
            out = str(c.get("outcome") or "")
            if out == "translate":
                for st in c.get("answers") or []:
                    xs = [q for q in C.XS.values() if q.get("status") == st and str(q.get("via") or "") in types]
                    eff += [C.end(xs[0]["id"])] if len(xs) == 1 else [[st, None, None, "status:" + str(st)]]
            act = {"pass-through": "pass", "swallow": "goes"}.get(out, "ends")
            x.update(gk="c", gl=C.level(c.get("fn")), gv=OUT_VERB.get(out, "translates"))
        if not host:
            C.die(f"{C.lab}: D-069 — the {e['f']} {e.get('id')} ({e.get('text')!r}) runs in no function or middleware the feed names")
        x["gh"], x["ef"] = [host, name], [act, eff]
        x.setdefault("xk", []).extend([host] + [q[3] for q in eff if q[3]])
        tally["c1:host:" + host.split(":", 1)[0]] += 1; tally["c1:eff"] += bool(eff) or act in ("pass", "goes")


def rarity(els: list, C: Ctx, pieces: list, WRITE: set, tally: collections.Counter) -> None:
    """his L-18 / lost-columns P5: a rare piece says how rare it is (n of the endpoints), and — for the split look — the drawn element
    it names wears that as a label at its end: an ending of its status or media type, a catch of its outcome, the in-flight value that
    carries the repeat key, the step that claims it"""
    pr = {q["key"]: q for q in pieces if q.get("word") in ("rare", "only here")}
    fep, resp = C.fep, C.fep.get("responses") or {}
    rp = fep.get("repeat") or {}
    rk = rp.get("key") or {}
    claims = rp.get("claims") or []
    steps = C.fj.get("steps") or {}
    for e in els:
        if e["f"] != "std" or not str(e.get("id") or "").startswith("x:"):
            continue
        key = e["id"][2:]
        q = pr.get(key) or {}
        fam, _s, val = key.partition(":")
        if fam == "status":
            hit = lambda o: o["f"] == "end" and str((C.XS.get(o.get("id")) or {}).get("status")) == val
        elif fam == "media":
            hit = lambda o: o["f"] == "end" and (resp.get(o.get("id")) or {}).get("media") == val
        elif fam == "catch":
            hit = lambda o: o["f"] == "gate" and str(o.get("id") or "").startswith("c:") and (C.cat.get(o["id"][2:]) or {}).get("outcome") == val
        elif key == "repeat:key":
            hit = lambda o: o["f"] == "inf" and bool(rk.get("set_at")) and str(o.get("id") or "").endswith("|" + str(rk.get("set_at")))
        elif fam == "repeat":
            ats = {(cl.get("fn"), cl.get("at")) for cl in claims if val.split(":")[-1] in (cl.get("idioms") or [])}
            hit = lambda o: o["f"] == "data" and any((steps.get(s0[2:]) or {}).get("fn") == fn and (steps.get(s0[2:]) or {}).get("op") in WRITE
                                                     and (steps.get(s0[2:]) or {}).get("table") for s0 in o.get("rec") or [] for fn, _a in ats)
        else:
            hit = lambda o: False
        tg = [o for o in els if o is not e and hit(o)]
        for o in tg:
            o["x"].setdefault("ra", []).append([q.get("n"), q.get("of"), q.get("words") or key, "piece:" + key])
        e["x"].update(rr=[q.get("n"), q.get("of")], tg=len(tg))
        tally["c1:rare"] += 1; tally["c1:rareTg"] += bool(tg)


def fn_marks(els: list, C: Ctx, tally: collections.Counter) -> None:
    """lost-columns P2 (his L-20, L-10's first link, L-12's left column): a function chip shows what gets it counted — the statuses its
    own code decides (a decider) and the tables it reads or writes on this endpoint (a data function; the login check's own, hollow,
    not counted). PROOF: the functions marked are exactly the code map's deciders and data functions"""
    dec = {}
    for f in (C.F.get("inside") or {}).get("functions") or []:
        st = {z.get("status") for z in f.get("refusals") or [] if z.get("status") is not None}
        st |= {h.get("status") for z in f.get("raises") or [] for h in z.get("here") or [] if h.get("status") is not None}
        if (f.get("refusals") or any(z.get("here") for z in f.get("raises") or [])) and f.get("fn"):
            dec[f["fn"]] = sorted(st, key=str)
    ops, stepped = collections.defaultdict(lambda: collections.defaultdict(set)), set()
    for p in C.F.get("paths") or []:
        for s in (p.get("effects") or {}).get("steps") or []:
            if not s.get("fn"):
                continue
            stepped.update([s["fn"]] if not s.get("dependency") else [])
            if s.get("table"):
                ops[(s["fn"], bool(s.get("dependency")))][s["table"]].add("w" if s.get("op") in C.X["WRITE"] else "r")
            elif s.get("op") in ("commit", "flush") and not s.get("dependency"):      # a save step of its own: said by its word
                ops[(s["fn"], False)]["\0" + s["op"]].add(s["op"])
    u = C.r.get("u") or {}
    want_d = {q for q in u.get("deciders") or [] if "::" in q}
    want_f = set(u.get("datafns") or [])
    got_d, got_f = set(), set()
    for e in els:
        if e["f"] != "fn":
            continue
        fid = next((k[3:] for k in e.get("keys") or [] if k.startswith("fn:")), None)
        if not fid:
            continue
        if fid in dec:
            e["x"]["fd"] = dec[fid]; got_d.add(fid)
        ft = [[t[1:], next(iter(o)), 0] if t.startswith("\0") else [t, "rw" if len(o) > 1 else next(iter(o)), 0] for t, o in sorted(ops.get((fid, False), {}).items())]
        ft += [[t, "rw" if len(o) > 1 else next(iter(o)), 1] for t, o in sorted(ops.get((fid, True), {}).items()) if t not in {q[0] for q in ft}]
        if ft:
            e["x"]["ft"] = ft
        if fid in stepped:
            got_f.add(fid)
        tally["c1:fnMarks"] += bool(ft or fid in dec)
    placed = {k[3:] for e in els if e["f"] == "fn" and e["w"][0] != "un" for k in (e.get("keys") or [])[:2] if k.startswith("fn:")}
    if (got_d & placed) != (want_d & placed) or (got_f & placed) != (want_f & placed):
        C.die(f"{C.lab}: D-069 — the functions marked as deciders {sorted(got_d & placed)[:3]} / data functions {sorted(got_f & placed)[:3]} are not the "
              f"code map's {sorted(want_d & placed)[:3]} / {sorted(want_f & placed)[:3]}")


def fe_piece_at(X: dict, at):
    """a frontend file:line → the innermost piece the c4 graph spans over it (a hook, a component, a module — never a type)"""
    f, _s, ln = str(at or "").rpartition(":")
    if not ln.isdigit():
        return None
    best = None
    for lo, hi, pid, name, kind in X["fespan"].get(f) or ():
        if lo <= int(ln) <= hi and (best is None or hi - lo < best[1] - best[0]):
            best = (lo, hi, pid, name, kind)
    return best


def refetches(pid: str, o: dict, C: Ctx) -> list:
    """his L-15 ("what is fetching and from where?"): the saved answers a refresh throws away, each the hook that fetches it again
    and the GET it sends — [[query hook key, its name, its key, the endpoint's key, its label, its reply, the tables it reads, the
    tables this request wrote that it reads]], read from each query's own `invalidated_by` (never a prefix guessed here)"""
    out = []
    eps = C.fj.get("endpoints") or {}
    steps = C.fj.get("steps") or {}
    wrote = {(steps.get(s["step"]) or {}).get("table") for p in C.fep.get("paths") or [] for s in (p.get("effects") or {}).get("steps") or []
             if (steps.get(s["step"]) or {}).get("op") in C.X["WRITE"] and not s.get("dependency")} - {None}
    for qid, pc in sorted(((C.fj.get("frontend") or {}).get("pieces") or {}).items()):
        for q in pc.get("calls") or []:
            if not any(b.get("hook") == pid and b.get("key") == o.get("key") and b.get("when") == o.get("when") for b in q.get("invalidated_by") or []):
                continue
            E2 = q.get("endpoint")
            e2 = eps.get(E2) or {}
            rd = sorted({(steps.get(s["step"]) or {}).get("table") for p in e2.get("paths") or [] for s in (p.get("effects") or {}).get("steps") or []
                         if (steps.get(s["step"]) or {}).get("op") == "read" and not s.get("dependency")} - {None})
            model = ((e2.get("declared") or {}).get("response_model") or {}).get("name")
            out.append([qid, qid.split("#")[-1], q.get("key"), E2, (E2 or "").split(":", 1)[-1], model, rd, sorted(set(rd) & wrote)])
    return out
