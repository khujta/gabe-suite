"""D-070 · RELATIONS DRAWN ACROSS THE MOMENTS (his note "API Hover Legend Consolidation", L-12 and L-17, batch C2).

Two things a human reader could not get from BY MOMENT's chips, because the chip lists the parts and not the link between them:

  L-12  Data effects — "we are affecting these tables, but how? With what function?" Every placed data chip already carries both
        keys (the table and the function that reads or writes it). `data_links` turns the placed chips into ONE record of connectors:
        the functions in the order they first touch data, the tables in the order they are first touched, per function → table the
        operations in time order (read, write, each at its moment, on its paths, with the fate each path gives a write), the table-less
        steps as ticks on the function's line (a flush, a savepoint, an add of a table the code does not name) and the commits and
        rollbacks as rules naming who commits, the race on the link it breaks.
  L-17  In-flight state — "surface what we are affecting". `lifelines` gives each in-flight value a lane: the moment it is set, every
        moment that reads it (from the feed's own read_at: a middleware reads at the edge, a dependency in the dependencies, the
        handler on its line or the call its read hangs under), what each read can decide (an ending checked at that very line, a limit
        checked there, the repeat key's refusal and its get-or-create claim), and when it dies (with the answer, or kept by the server).
        Values that live alike — set at one moment by one owner, read at the same moments, dying alike — fold into one lane.

Both records are READ from what by_moment placed and PROVEN here (D-037: a build that dies on a wrong join):
  · every connector operation, tick and rule is a placed data chip, each drawn once — the diagram draws exactly the row's chips;
  · every operation, dot and rule sits at a moment one of its paths passes;
  · a value is never read before the moment it is set; an ending a read decides leaves at or after that read, on one of its paths;
  · the repeat key's claim is the placed write of the claimed table by the claiming function, at or after the key's read.
Nothing here places an element or guesses one: a read the feed places at no moment is named on its lane (`un`), not drawn."""
from __future__ import annotations

import collections
import re

import _ae_truth as TRUTH

VIA_CALL = re.compile(r"^call (.+) @ (.+):(\d+)$")
RULE_OPS = ("commit", "rollback")                                  # a step that ends the waiting writes: a rule across the band
LIFE = {"with the answer": "req", "with the server process": "srv"}


def _short(at) -> str:
    return TRUTH.short(at)


def _line(at):
    m = re.search(r":(\d+)$", str(at or ""))
    return int(m.group(1)) if m else None


def _paths(mask, live):
    """a placed element's paths as the picker's indices (None: every path)"""
    return set(live) if mask is None else {i for i in live if (mask >> i) & 1}


def _mask(ps, live):
    return None if set(ps) == set(live) else sum(1 << i for i in sorted(ps))


# ── L-12 · DATA EFFECTS AS CONNECTORS ──────────────────────────────────────────────────────────────────────────────────────────────
def data_links(el: list, pas: list, live: set, lab: str, die, tally: collections.Counter) -> dict:
    """{f: [function key …] in the order each first touches data, t: [table key …] in the order each is first touched,
    l: [[f index, t index, [[r|w, moment, line, paths, fates | None] …] in time order, race | None] …],
    k: [[f index, link index | -1, op, moment, line, paths] …] the table-less steps (a tick on the function's last write before it),
    c: [[function key, op, moment, line, paths] …] the commits and rollbacks (a rule across their band),
    b: [moment …] the bands, top to bottom} — el is by_moment's final list (time order within a moment)."""
    F, T, fi, ti, links, li, ticks, rules, n_data = [], [], {}, {}, [], {}, [], [], 0
    last_w = {}                                                    # function index → its last write link so far (time order)
    for x in el:
        if x[0] != "data":
            continue
        n_data += 1
        f, si, keys, chip, mask, hint, xx = x[0], x[1], x[2], x[4] or [], x[5], x[6], x[7] or {}
        fk = next((k for k in keys if k.startswith("fn:")), None)
        tk = next((k for k in keys if k.startswith("table:")), None)
        if not fk:
            die(f"{lab}: D-070 — a data chip at moment {si} ({hint}) names no function: its connector has no source")
        ps = _paths(mask, live)
        if not any(si in pas[i] for i in ps):
            die(f"{lab}: D-070 — {fk} {hint} stands at moment {si}, which none of its paths passes")
        if fk not in fi and (tk or chip[:1] != ["opw"] or chip[1] not in RULE_OPS):
            fi[fk] = len(F); F.append(fk)
        if tk:
            if tk not in ti:
                ti[tk] = len(T); T.append(tk)
            if chip[:1] != ["op"] or chip[1] not in ("r", "w"):
                die(f"{lab}: D-070 — the table chip {tk} {hint} wears {chip}, not a read or a write")
            pair = (fi[fk], ti[tk])
            if pair not in li:
                li[pair] = len(links); links.append([pair[0], pair[1], [], None])
            fa = xx.get("fa") if chip[1] == "w" else None
            links[li[pair]][2].append([chip[1], si, hint, mask, fa])
            if chip[1] == "w":
                last_w[fi[fk]] = li[pair]
            continue
        if chip[:1] != ["opw"]:
            die(f"{lab}: D-070 — the table-less data chip {fk} {hint} wears {chip}")
        if chip[1] in RULE_OPS:
            rules.append([fk, chip[1], si, hint, mask]); tally["c2:rule"] += 1
            continue
        lw = last_w.get(fi[fk], -1)
        ticks.append([fi[fk], lw, chip[1], si, hint, mask]); tally["c2:tick"] += 1
        if xx.get("rc"):                                         # D-056 (5): the race breaks at this flush — its badge rides the link
            cons, tbl, uniq, st = xx["rc"]
            pair = (fi[fk], ti.get("table:" + str(tbl)))
            if pair not in li:
                die(f"{lab}: D-070 — the race on {cons} breaks at {hint}, and {fk} draws no link to {tbl}")
            links[li[pair]][3] = [cons, uniq, st, hint, 1 if xx.get("rs") else 0]   # review S4-21: rs — no constraint name, its table stands for it
            tally["c2:race"] += 1
    drawn = sum(len(q[2]) for q in links) + len(ticks) + len(rules)
    if drawn != n_data:                                            # PROOF: the connectors draw exactly the row's chips, each once
        die(f"{lab}: D-070 — Data effects places {n_data} chips, its connectors draw {drawn}")
    tally["c2:links"] += len(links); tally["c2:ops"] += sum(len(q[2]) for q in links)
    tally["c2:rw"] += sum(1 for q in links if len({o[0] for o in q[2]}) > 1)
    bands = sorted({o[1] for q in links for o in q[2]} | {k[3] for k in ticks} | {c[2] for c in rules})
    return {"f": F, "t": T, "l": links, "k": ticks, "c": rules, "b": bands} if n_data else None


# ── L-17 · EACH IN-FLIGHT VALUE'S LIFELINE ─────────────────────────────────────────────────────────────────────────────────────────
class Ctx:
    """what one endpoint's lifelines are joined against (built once per endpoint in by_moment)"""

    def __init__(self, *, lab, die, rows, SI, x_si, XS, EXIT, picks, live, pas, hsi, hnext, inh, direct, own_ops, fep, F):
        self.lab, self.die, self.rows, self.SI, self.x_si, self.XS, self.EXIT = lab, die, rows, SI, x_si, XS, EXIT
        self.picks, self.live, self.pas, self.hsi, self.hnext, self.inh, self.direct, self.own_ops = picks, live, pas, hsi, hnext, inh, direct, own_ops
        # what a read at a line can decide: an ending produced or checked at that very line; a check whose own line (or the handler
        # call it sits inside) is that line; a rate limit checked there
        self.at_x = collections.defaultdict(set)
        for x in (fep.get("produced") or []) + (fep.get("framework_exits") or []):
            for a in (x.get("site"), x.get("at")):
                if a and x.get("id"):
                    self.at_x[a].add(x["id"])
            m = VIA_CALL.match(str(x.get("via") or ""))
            if m and x.get("id"):
                self.at_x[m.group(2) + ":" + m.group(3)].add(x["id"])
        for g in fep.get("preconditions") or []:
            if not g.get("exit"):
                continue
            if g.get("at"):
                self.at_x[g["at"]].add(g["exit"])
            m = VIA_CALL.match(str(g.get("via") or ""))
            if m:
                self.at_x[m.group(2) + ":" + m.group(3)].add(g["exit"])
        for l0 in (F.get("rate") or {}).get("limits") or []:
            if l0.get("at") and l0.get("exit"):
                self.at_x[l0["at"]].add(l0["exit"])
        # where each ending leaves, by file: the earliest line (a path that leaves inside a moment never reads past that line there)
        self.xpos = collections.defaultdict(dict)
        for xid, ats in _positions(fep).items():
            for a in ats:
                f, q = str(a).rsplit(":", 1)[0], _line(a)
                if q is not None and (f not in self.xpos[xid] or q < self.xpos[xid][f]):
                    self.xpos[xid][f] = q
        self.rep = fep.get("repeat") or {}
        self.lim_hosts = {str(l0.get("via")) for l0 in (F.get("rate") or {}).get("limits") or [] if l0.get("via")}


def _positions(fep: dict) -> dict:
    """ending id → the lines it leaves at, at the level a read is compared on: the handler call a check or a raise sits inside (its
    `via`), else where it is checked or produced (a middleware's limit: the line it is checked at)"""
    out = collections.defaultdict(set)
    for x in (fep.get("produced") or []) + (fep.get("framework_exits") or []) + [dict(g, id=g.get("exit"), site=None) for g in fep.get("preconditions") or []]:
        if not x.get("id"):
            continue
        m = VIA_CALL.match(str(x.get("via") or ""))
        a = (m.group(2) + ":" + m.group(3)) if m else (x.get("site") or x.get("at"))
        if a:
            out[x["id"]].add(a)
    return out


def _after(pos: list, leave: dict) -> bool:
    """a read (the handler line it is called from, else its own line) stands past the line its path leaves at, in the same file"""
    return any(f in leave and q is not None and q > leave[f] for f, q in pos)


def _owner(x) -> str | None:
    """who sets it: the class (or the function) of its setter — a middleware's __init__ is the middleware"""
    q = str(x.get("set_by") or x.get("owner") or x.get("dependency") or "")
    if not q:
        return None
    q = q.split("::")[-1].split(":")[-1]
    return q.split(".")[0] or None


def _read_si(q: dict, C: Ctx):
    """the moment a read_at record stands at: a middleware's at the edge, a dependency's in the dependencies, the handler's on its line
    — or, for a read inside a function the handler calls, on the handler line of that call (`via`); None: no moment"""
    w = q.get("in")
    if w == "middleware":
        return C.SI["edge"], None
    if w == "dependency":
        return C.SI["gate"], None
    if w == "handler":
        a = q.get("via") or q.get("at")
        if C.inh(a):
            si = C.hsi(_line(a))
            if si is None and C.hnext:                             # a line between two runs: the statement goes on into the next run
                si = C.hnext(_line(a))
            return si, _line(a)
    return None, None


def lifelines(el: list, src: dict, C: Ctx, tally: collections.Counter) -> dict:
    """{l: [[el index, set moment, lifetime req|srv|unk, end moment | None, dots, unplaced reads] …], f: [[name kind, owner, [lane …]] …]}
    — a dot: [moment, [read lines …], [[status, ending id] …] it can decide, [functions it is handed to …], claim table key | None,
    the handler's own step there (commit | rollback) | None, paths]. The end: the answer for a value that goes with it (or a later read),
    None for one the server keeps (its line runs on past the answer), the last moment it is seen for an unknown one."""
    lanes = []
    for i, x in enumerate(el):
        e = src.get(id(x))
        if e is None:
            continue
        row = C.rows.get(e["id"]) or C.die(f"{C.lab}: D-070 — in-flight element {e['id']} has no feed row")
        s0, lt = x[1], LIFE.get(row.get("dies"), "unk")
        lp = _paths(x[5], C.live)
        by, un = collections.OrderedDict(), []
        for q in row.get("read_at") or []:
            si, hl = _read_si(q, C)
            if si is None:
                un.append(_short(q.get("via") or q.get("at"))); tally["c2:il:unplaced"] += 1
                continue
            if si < s0:
                C.die(f"{C.lab}: D-070 — {row.get('name')} is read at {q.get('at')} (moment {si}) before the moment it is set ({s0})")
            d = by.setdefault(si, {"at": [], "x": set(), "fn": [], "cl": None, "own": None, "pos": []})
            d["pos"].append([(str(a).rsplit(":", 1)[0], _line(a)) for a in [q.get("via") or q.get("at")] if a])   # the level an ending is compared on
            d["at"].append(_short(q.get("at")) + (" ← " + _short(q["via"]) if q.get("via") else ""))
            for a in (q.get("at"), q.get("via")):
                d["x"] |= C.at_x.get(a, set()) if a else set()
            if hl is not None:
                d["fn"] += [f.split("::")[-1] for f, qs in sorted(C.direct.items()) if hl in qs]
                d["own"] = d["own"] or C.own_ops.get(hl)
            rk = C.rep.get("key") or {}
            if rk.get("read_at") and rk["read_at"] in (q.get("at"), q.get("via")):
                ex = (C.rep.get("required") or {}).get("exit")     # the refusal the key requires, and the rows it claims
                if ex:
                    d["x"].add(ex)
                for cl in C.rep.get("claims") or []:
                    ck = ("table:" + str(cl.get("table")), "fn:" + str(cl.get("fn")).replace("#", "::"))
                    # the write it claims: the claiming function's last write of that table between the claim and the line a second
                    # request races at (the insert the unique key guards)
                    lo, hi = _line(cl.get("at")) or 0, _line(cl.get("race_at")) or 10 ** 9
                    hit = [y for y in el if y[0] == "data" and ck[0] in y[2] and ck[1] in y[2] and (y[4] or [None, None])[1] == "w"
                           and _short(y[6]).split(":")[0] == _short(cl.get("at")).split(":")[0] and lo <= (_line(y[6]) or -1) <= hi]
                    hit = sorted(hit, key=lambda y: _line(y[6]))[-1:]
                    if len(hit) != 1 or hit[0][1] < si:
                        C.die(f"{C.lab}: D-070 — {row.get('name')}'s claim on {cl.get('table')} by {cl.get('fn')} stands on {len(hit)} placed writes, "
                              f"or before the key is read")
                    cd = by.setdefault(hit[0][1], {"at": [], "x": set(), "fn": [], "cl": None, "own": None, "pos": []})
                    cd["cl"] = [ck[0], ck[1], _short(cl.get("at")), (cl.get("idioms") or [None])[0]]
                    tally["c2:il:claim"] += 1
        dots = []
        for si, d in by.items():
            # on the paths that pass this moment — less a path that leaves inside it before every read here (the 409 at the checks
            # leaves at cooking.py:125, before the key is read at :126): a read the path never gets to is not on it
            ps = {p for p in lp if si in C.pas[p]}
            cut = {p for p in ps if d["pos"] and C.x_si.get(C.EXIT[C.picks[p]]) == si and all(_after(ps0, C.xpos[C.EXIT[C.picks[p]]]) for ps0 in d["pos"])}
            ps -= cut; tally["c2:il:leftBefore"] += len(cut)
            if not ps:
                tally["c2:il:dotOff"] += 1
                continue
            dec = []
            for xid in sorted(d["x"]):
                xs = C.x_si.get(xid)
                if not isinstance(xs, int):
                    continue                                       # an ending BY MOMENT does not place is not drawn here either
                if xs < si:
                    C.die(f"{C.lab}: D-070 — a read of {row.get('name')} at moment {si} decides {xid}, which leaves before it ({xs})")
                if not any(C.EXIT[C.picks[p]] == xid for p in C.live):
                    tally["c2:il:noPathEnd"] += 1                  # an ending no path reaches (the picker does not offer it): not drawn
                    continue
                if not any(C.EXIT[C.picks[p]] == xid for p in ps):
                    C.die(f"{C.lab}: D-070 — a read of {row.get('name')} at moment {si} decides {xid}, on none of the read's paths")
                dec.append([C.XS[xid].get("status"), xid])
            dec.sort(key=lambda q: (str(q[0]), q[1]))
            tally["c2:il:decides"] += len(dec)
            dots.append([si, d["at"], dec, list(dict.fromkeys(d["fn"])), d["cl"], d["own"], _mask(ps, C.live)])
        dots.sort(key=lambda q: q[0])
        last = max([s0] + [q[0] for q in dots])
        end = max(C.SI["answer"], last) if lt == "req" else None if lt == "srv" else last
        tally["c2:il:lanes"] += 1; tally["c2:il:dots"] += len(dots)
        lanes.append([i, s0, lt, end, dots, un, _owner(row)])
    # values that live alike fold into one lane — the same setter, set at one moment, read at the same moments, dying alike
    grp = collections.OrderedDict()
    for j, L in enumerate(lanes):
        if L[6]:
            grp.setdefault((L[6], L[1], L[2], L[3], tuple(q[0] for q in L[4])), []).append(j)
    folds = []
    for (own, *_r), js in grp.items():
        if len(js) > 1:
            folds.append(["lim" if own in C.lim_hosts else "own", own, js]); tally["c2:il:folds"] += 1; tally["c2:il:folded"] += len(js)
    for L in lanes:
        L.pop()
    return {"l": lanes, "f": folds} if lanes else None
