"""Element forms — the PATHS arm's ``paths`` part: one path per exit (amendment 1 §A2 Slice 5 · A8 · U6).

A PATH is one way a request ends, read in request order as a CHAIN: the middleware that ran (``step``) or could have
refused and did not (``gate`` · ``hit: false``), the body read, the dependencies in FastAPI's resolution order — each one's
parameter validation before its body — the endpoint's own parameters, then the handler's anchors: the guards it passed,
the calls it made (a ``collapsed`` one, or a deciding one whose ``branch`` arms it passed and took), the ``catch`` handlers
an exception went through, and the ``switch`` es read on the way. A switch never forks a path. Every exit gets its paths:
each produced refusal and framework exit the route can reach, each success return — combined LINEARLY with the arms of the
deciding callees before it (1 + Σ(arms − 1); the product's rest is ``combinations_omitted``) — and the uncaught 500
(``anywhere``). A path is ``partial`` when a step on it is unknown (a dynamic status, an unverified translation no binding
proves, an ambiguous binding, ``anywhere``).
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_catch as CA
import _a3_forms_falsify as _FAL
import _a3_forms_ids as I
import _a3_forms_mw as MW
import _a3_forms_paths as FP
import _a3_forms_reach as R
import _a3_paths as P

PATH_CAP = 48
_RANK = {p: i for i, p in enumerate(F.PATH_PHASES)}
_REFUSAL_PHASES = frozenset({"middleware", "security", "dependency", "handler"})


def _line(at) -> int:
    return I._line(at)


def _hev(node) -> dict:
    hev: dict = {}
    for e in P._events(node):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
    return hev


def _guards(e: dict) -> list:
    return [g for g, _ in e["guards"]]


def _passed(a: dict, t: dict) -> bool:
    """An earlier exit ``a`` is passed on the way to ``t``: its last guard is negated in ``t``'s ``after`` and the guards
    before it prefix ``t``'s (the ``_a3_paths._walk`` stacks)."""
    ga, gt = _guards(a), _guards(t)
    return a["line"] < t["line"] and bool(ga) and ga[:-1] == gt[:len(ga) - 1] and f"not ({ga[-1]})" in t["after"]


def _on(a: dict, t: dict) -> bool:
    """An earlier anchor ``a`` (a call) runs on the way to ``t``: its guards prefix ``t``'s."""
    ga, gt = _guards(a), _guards(t)
    return a["line"] <= t["line"] and ga == gt[:len(ga)]


def _raised_into(a: dict, t: dict) -> bool:
    """The call ``a`` is the one whose exception put us inside ``t``'s ``except`` body (§A4 RC-B, V8). It RAN — so it
    stays on the chain — but it never returned, so none of its arms is on this path and the handler that caught it is."""
    h = t.get("handler")
    return bool(h) and h[0] in (a.get("tries") or ())


def _gate(r: dict, hit: bool) -> dict:
    g = {"kind": "gate", "ref": r.get("id"), "hit": hit, "phase": r.get("phase")}
    if r.get("raised_at") or r.get("site") or r.get("at"):
        g["at"] = r.get("raised_at") or r.get("site") or r.get("at")   # a translated refusal starts where it was raised
    if hit:
        cond = [c for c in (r.get("when_for_path") or r.get("when"), (" or ".join(f"path starts {p}" for p in r["scope"]) if isinstance(r.get("scope"), list) else None), r.get("pred")) if c]
        if cond:
            g["cond"] = " ∧ ".join(cond)
    return g


# ── before the handler: middleware · body · dependencies · parameters ───────────────────────────────
def _dep_order(repo: Path, m, fn, dec) -> list[dict]:
    """FastAPI's resolution order: each dependency after its own sub-dependencies (post-order), each once; a security
    scheme is a leaf."""
    out, seen = [], set()

    def walk(mm, node, d_dec, depth: int, path: frozenset) -> None:
        if depth > P._DEP_MAX:
            return
        aliases = C._dep_aliases(repo, mm.rel, mm.tree)
        for d in MW._dep_params(node, d_dec, aliases, C._dep_alias_meta(mm.rel)):
            r = P._dep_target(repo, mm, d.get("callee") or d["name"], d.get("_decl"))
            if not r:
                continue
            rm, qual = r
            fid = f"{rm.rel}::{qual}"
            if fid in seen or fid in path:
                continue
            val = rm.assigns.get(qual)
            if isinstance(val, ast.Call) and P._leaf(val.func) in F.SECURITY_CLASSES:
                seen.add(fid)
                out.append({"fid": fid, "security": f"{rm.rel}:{val.lineno}"})
                continue
            got = P._dep_node(repo, rm, qual, called=str(d["name"]).rstrip().endswith(")"))
            if not got or got[1] is None:
                continue
            walk(got[0], got[1], None, depth + 1, path | {fid})
            seen.add(fid)
            out.append({"fid": fid, "m": got[0], "node": got[1], "name": got[1].name})

    walk(m, fn, dec, 0, frozenset())
    return out


def _before_handler(repo: Path, forms: dict, v: dict, m, fn, dec, claim: list | None = None) -> list[dict]:
    """The ordered items a request meets before the handler body: ``{item: row|step|switch, entry, row?, split?, cases?}``.
    ``claim``: app-handler rows the handler cannot place — a dependency whose function holds the raise takes them."""
    claim = list(claim or ())
    rows = [r for r in v.get("produced") or [] if r.get("applies") is not False]
    switches = v.get("switches") or []
    items: list[dict] = []
    placed: set = set()
    forms_mw = sorted((f for e in (forms.get("middleware") or {}).values() for f in (e.get("variants") or [e])), key=lambda f: f["order"]["runs"])
    for form in forms_mw:                                  # 1 · middleware, outermost first
        ids = {x["id"] for x in form.get("exits") or []}
        mine = sorted((r for r in rows if r.get("phase") == "middleware" and r.get("id") in ids), key=lambda r: _line(r.get("site") or r.get("at")))
        if not mine:
            items.append({"item": "step", "entry": {"kind": "step", "call": form["cls"], "phase": "middleware"}})
            continue
        for sw in switches:
            if sw["kind"] == "flag" and sw.get("scope") == "middleware" and set(sw.get("refs") or ()) & ids and sw["id"] not in placed:
                placed.add(sw["id"])
                items.append({"item": "switch", "entry": {"kind": "switch", "ref": sw["id"], "phase": "middleware"}})
        items += [{"item": "row", "row": r} for r in mine]
    seen_ids = {i["row"]["id"] for i in items if i["item"] == "row"}
    items += [{"item": "row", "row": r} for r in rows if r.get("phase") == "middleware" and r.get("id") not in seen_ids]
    items += [{"item": "row", "row": x, "split": "body-parse"} for x in v.get("framework_exits") or []]   # 2 · the body read
    val = next((r for r in rows if r.get("phase") == "validation"), None)
    cases = (val or {}).get("cases") or []
    order = _dep_order(repo, m, fn, dec)
    names = {d.get("name") for d in order if d.get("name")}
    for d in order:                                        # 3 · dependencies, each after its sub-dependencies
        if val is not None and d.get("name") and any(p.startswith(d["name"] + ".") for p in val.get("params") or []):
            items.append({"item": "row", "row": val, "split": "dependency-params", "dependency": d["fid"],
                          "cases": [c["id"] for c in cases if str(c.get("param", "")).startswith(d["name"] + ".")]})
        mine = [r for r in rows if (d.get("security") and r.get("phase") == "security" and r.get("at") == d["security"])
                or (r.get("phase") == "dependency" and r.get("dep") == d["fid"])]
        node = d.get("node")
        lo, hi = (node.lineno, getattr(node, "end_lineno", node.lineno)) if node is not None else (0, 0)
        for r in list(claim) if node is not None else ():   # raised in this dependency, answered by an app exception handler
            if r["raised_at"].rpartition(":")[0] == d["m"].rel and lo <= _line(r["raised_at"]) <= hi:
                claim = [c for c in claim if c is not r]
                mine.append(dict(r, phase="dependency", dep=d["fid"], _claimed=id(r)))
        anchored = [sw for sw in switches if sw["kind"] == "binding" and sw["id"] not in placed and node is not None
                    and str(sw.get("anchor") or "").rpartition(":")[0] == d["m"].rel and lo <= _line(sw.get("anchor")) <= hi]
        seq = sorted([(_line(r.get("raised_at") if r.get("_claimed") else r.get("at")), 1, {"item": "row", "row": r}) for r in mine] +
                     [(_line(sw["anchor"]), 0, {"item": "switch", "entry": {"kind": "switch", "ref": sw["id"], "phase": "dependency"}}) for sw in anchored],
                     key=lambda x: (x[0], x[1]))
        for sw in anchored:
            placed.add(sw["id"])
        items += [x[2] for x in seq]
    if val is not None:                                    # 4 · the endpoint's own parameters, after every dependency
        own = [p for p in val.get("params") or [] if "." not in p or p.split(".", 1)[0] not in names]
        if own:
            items.append({"item": "row", "row": val, "split": "own-params",
                          "cases": [c["id"] for c in cases if "." not in str(c.get("param", "")) or str(c.get("param")).split(".", 1)[0] not in names]})
    items += [{"item": "row", "row": r, "split": "decorator"} for r in rows            # §A4 V12: a limiter decorator is the last
              if r.get("phase") == "handler" and str(r.get("via", "")).startswith("decorator ")]   # gate before the body runs
    return items


def _pass(item: dict) -> dict:
    if item["item"] != "row":
        return dict(item["entry"])
    g = _gate(item["row"], False)
    if item.get("split"):
        g["split"] = item["split"]
    return g


# ── the handler ──────────────────────────────────────────────────────────────────────────────────────
class _Spine:
    """The handler's anchors — its refusals, returns and calls — read against ``_a3_paths._walk``'s guard stacks."""

    def __init__(self, repo: Path, v: dict, m, fn) -> None:
        self.repo, self.v, self.m, self.fn = repo, v, m, fn
        self.evs = P._events(fn)
        self.rows = v.get("produced") or []
        calls = {}
        for e in self.evs:
            if e["kind"] == "call":
                calls.setdefault(e["line"], e)
        self.calls = calls
        self.raises = {}
        for r in self.rows:
            if r.get("phase") == "handler" and r.get("depth") == 0 and str(r.get("at", "")).rpartition(":")[0] == m.rel:
                e = next((e for e in self.evs if e["kind"] == "raise" and e["line"] == _line(r["at"])), None)
                if e is not None:
                    self.raises[e["line"]] = (e, r)
        rets = {e["line"]: e for e in FP.returns_of(fn)}
        self.returns = {rets[_line(rr["at"])]["line"]: (rets[_line(rr["at"])], rr)
                        for rr in v.get("returns") or [] if rr["depth"] == 0 and _line(rr["at"]) in rets}
        self.collapsed = {_line(c["site"]): c for c in v.get("collapsed") or []}
        self.deciding: dict = {}
        for b in v.get("branches") or []:
            self.deciding.setdefault(_line(b["site"]), []).append(b)
        self.returns_by_id = {rr["id"]: rr for rr in v.get("returns") or []}
        self.recv: dict = {}                                 # `deleted = await delete_location(…)` → line: "deleted"
        for st in ast.walk(fn):
            tgt = st.targets[0] if isinstance(st, ast.Assign) and len(st.targets) == 1 else \
                st.target if isinstance(st, ast.AnnAssign) else None
            val = getattr(st, "value", None)
            if isinstance(tgt, ast.Name) and val is not None:
                call = val.value if isinstance(val, ast.Await) else val
                if isinstance(call, ast.Call):
                    self.recv[call.lineno] = tgt.id

    def raise_at(self, line: int):
        return next((e for e in self.evs if e["kind"] == "raise" and e["line"] == line), None)

    def target(self, line: int, kind: str):
        pool = self.raises if kind == "raise" else self.returns
        return pool.get(line, (None, None))[0]

    def site_of(self, row: dict) -> int | None:
        """The handler call a depth-1 row (``call Q @ file:line``) or a translated row (raised inside a callee) came through."""
        via = str(row.get("via") or "")
        if via.startswith("call ") and " @ " in via:
            return _line(via.rpartition(" @ ")[2])
        src = row.get("raised_at")
        if not src:
            return None
        e = next((e for e in self.evs if e["kind"] == "raise" and e["line"] == _line(row.get("at"))), None) \
            if str(row.get("at", "")).rpartition(":")[0] == self.m.rel else None
        trys = {id(e["handler"][0])} if e is not None and e["handler"] is not None else set()
        for ce in sorted((e for e in self.evs if e["kind"] == "call"), key=lambda e: e["line"]):   # a nested call too: f(g()) · g().h()
            r = R.callee(self.repo, self.m, self.fn.name, self.fn, ce["node"])
            if r and r[0].rel == src.rpartition(":")[0] and (not trys or trys & {id(t) for t in ce["tries"]}):
                node = r[0].defs[r[1]]
                if node.lineno <= _line(src) <= getattr(node, "end_lineno", node.lineno):
                    return ce["line"]
        return None

    def anchor(self, row: dict) -> tuple:
        """The handler event a refusal sits at, and the call site it came through (``None`` when raised in the body)."""
        site = self.site_of(row)
        if row.get("depth") == 0 and site is None:
            return self.target(_line(row["at"]), "raise"), None
        if site is None and str(row.get("via", "")).startswith("app handler ") and str(row.get("raised_at", "")).rpartition(":")[0] == self.m.rel:
            return self.raise_at(_line(row["raised_at"])), None   # raised in the handler, answered by an app exception handler
        return self.calls.get(site), site

    def inner(self, site: int, to_line: int | None, arms: list) -> tuple[list, dict | None]:
        """Inside the deciding callee at ``site``: the arms and raises passed before ``to_line`` (an arm's return or a
        raise), and that point's event."""
        ce = self.calls.get(site)
        r = R.callee(self.repo, self.m, self.fn.name, self.fn, ce["node"]) if ce else None
        if r is None:
            return [], None
        cm, q = r
        cnode = cm.defs[q]
        rets = {e["line"]: e for e in FP.returns_of(cnode) if FP._value(e) is not None}
        arm_at = {_line(self.returns_by_id[b["return"]]["at"]): b for b in arms if b.get("return") in self.returns_by_id}
        raises = {}
        for row in self.rows:
            at = row.get("raised_at") if row.get("raised_at") else row.get("at") if str(row.get("via", "")).startswith("call ") else None
            if at and at.rpartition(":")[0] == cm.rel and cnode.lineno <= _line(at) <= getattr(cnode, "end_lineno", cnode.lineno):
                e = next((e for e in P._events(cnode) if e["kind"] == "raise" and e["line"] == _line(at)), None)
                if e is not None:
                    raises[e["line"]] = (e, row)
        point = rets.get(to_line) or (raises.get(to_line) or (None,))[0]
        out = []
        for line in sorted(set(arm_at) | set(raises)):
            if point is None or line >= point["line"]:
                break
            if line in arm_at and line in rets and _passed(rets[line], point):
                out.append({"kind": "branch", "ref": arm_at[line]["id"], "hit": False, "at": f"{cm.rel}:{line}"})
            elif line in raises and _passed(raises[line][0], point):
                out.append(_gate(raises[line][1], False))
        return out, point

    def caught(self, t: dict) -> dict | None:
        """The ``except`` handler ``t`` sits inside, as a chain entry — the catch that got us here (§A4 RC-B, V8)."""
        h = t.get("handler")
        if not h:
            return None
        types = P._handler_types(h[1])
        return {"kind": "catch", "op": "translate", "at": f"{self.m.rel}:{h[1].lineno}",
                "cls": " | ".join(sorted(types)) if types else "BaseException"}

    def catches(self, row: dict) -> list[dict]:
        """The handlers an exception passed on its way to ``row`` — a callee's own (``pass-through``), then the one that
        translated it."""
        via = str(row.get("via") or "")
        app = via.startswith("app handler ")
        cls = via[len("except "):].split(" | ")[0] if via.startswith("except ") else (via[len("app handler "):] if app else None)
        out = []
        src = row.get("raised_at")
        if cls and src:
            sm = P._mod(self.repo, src.rpartition(":")[0])
            node = next((n for q, n in sm.defs.items() if n.lineno <= _line(src) <= getattr(n, "end_lineno", n.lineno)), None) if sm else None
            e = next((e for e in P._events(node) if e["kind"] == "raise" and e["line"] == _line(src)), None) if node is not None else None
            if e is not None:
                for t in CA.trail(cls, P._bases(self.repo, sm, cls, at=src), e["tries"], _hev(node)):
                    if t["op"] != "escape":
                        out.append({"kind": "catch", "op": t["op"], "at": f"{sm.rel}:{t['handler']}", "cls": " | ".join(t["types"])})
        e = next((e for e in P._events(self._node_of(row)) if e["kind"] == "raise" and e["line"] == _line(row.get("at"))), None) if self._node_of(row) is not None else None
        if cls and e is not None and e["handler"] is not None:
            out.append({"kind": "catch", "op": "translate", "at": f"{str(row.get('at')).rpartition(':')[0]}:{e['handler'][1].lineno}", "cls": cls})
        if app and cls:                                    # an app exception handler answers what escaped the handler
            out.append({"kind": "catch", "op": "translate", "at": row.get("at"), "cls": cls, "by": "app handler"})
        return out

    def _node_of(self, row: dict):
        rel = str(row.get("at") or "").rpartition(":")[0]
        mm = P._mod(self.repo, rel) if rel else None
        if mm is None:
            return None
        ln = _line(row.get("at"))
        best = [n for n in mm.defs.values() if n.lineno <= ln <= getattr(n, "end_lineno", n.lineno)]
        return min(best, key=lambda n: getattr(n, "end_lineno", n.lineno) - n.lineno) if best else None

    def walk(self, t: dict, stop_site: int | None, arms_choice: dict) -> tuple[list, list]:
        """The handler chain up to the event ``t``: the refusals and returns passed, the calls made — a deciding call takes
        ``arms_choice[site]`` — and the value/binding switches anchored on the way. Returns (entries, chosen b: ids)."""
        out, chosen = [], []                                  # a call that raised into t's except keeps its `call`
                                                              # entry and gets no arm: `combos` never offers one
        anchors = sorted(set(self.raises) | set(self.returns) | set(self.collapsed) | set(self.deciding))
        for line in anchors:
            if line > t["line"] or (line == t["line"] and line not in (self.collapsed.keys() | self.deciding.keys())):
                break
            if line in self.raises and _passed(self.raises[line][0], t):
                out.append(_gate(self.raises[line][1], False))
            elif line in self.returns and _passed(self.returns[line][0], t):
                out.append({"kind": "gate", "ref": self.returns[line][1]["id"], "hit": False, "phase": "handler", "at": f"{self.m.rel}:{line}"})
            ce = self.calls.get(line)
            if ce is None or not _on(ce, t):
                continue
            if line in self.deciding:
                b = self.deciding[line][0]
                out.append({"kind": "call", "call": b["call"], "fn": b["fn"], "at": f"{self.m.rel}:{line}"})
                if line == stop_site:
                    break
                arm = arms_choice.get(line)
                if arm is not None:
                    inner, _ = self.inner(line, _line(self.returns_by_id[arm["return"]]["at"]), self.deciding[line])
                    out += inner + [{"kind": "branch", "ref": arm["id"], "hit": True, "at": self.returns_by_id[arm["return"]]["at"]}]
                    chosen.append(arm["id"])
            elif line in self.collapsed:
                c = self.collapsed[line]
                out.append({"kind": "collapsed", "call": c["call"], "fn": c.get("fn"), "at": c["site"], "reason": c["reason"]})
        return out, chosen

    def impossible(self, t: dict, combo: dict) -> bool:
        """The chosen arms CONTRADICT the way to ``t`` (§A4 RC-A, V7). ``deleted = await delete_location(…)`` binds the
        handler's name to the value each arm returns, so the arm that deletes and returns ``True`` cannot reach
        ``if not deleted: raise 404`` — a path that books its two writes as uncommitted on a refusal that never fires.
        Only a literal return decides; anything else abstains, and the caller keeps one path whatever this says."""
        bound = {}
        for site, b in combo.items():
            name = self.recv.get(site)
            rr = self.returns_by_id.get(b.get("return") or "")
            if not name or not rr or rr.get("value") is None:
                continue
            try:
                bound[name] = (ast.parse(str(rr["value"]), mode="eval").body, "callee")
            except SyntaxError:
                continue
        if not bound:
            return False
        return _FAL.dead({"pred": " and ".join(_guards(t)) or None, "after": list(t.get("after") or ())}, bound)

    def live(self, t: dict, stop_site: int | None) -> list[dict]:
        """``combos`` minus the ones the arms falsify — never empty: an exit with NO path would be a bigger lie than an
        impossible one, so a fold that kills every combination keeps the base and says so."""
        all_ = self.combos(t, stop_site)
        kept = [c for c in all_ if not self.impossible(t, c)]
        return kept or all_[:1]

    def combos(self, t: dict, stop_site: int | None) -> list[dict]:
        """The linear combinations of the deciding calls on the way to ``t``: the base (every call at its fall-through)
        plus one per other arm."""
        sites = [line for line in sorted(self.deciding) if line != stop_site and line < t["line"] and line in self.calls
                 and _on(self.calls[line], t) and not _raised_into(self.calls[line], t)]
        def base(arms):
            return next((b for b in arms if b["token"] == "fall-through"), arms[-1])
        out = [{s: base(self.deciding[s]) for s in sites}]
        for s in sites:
            for b in self.deciding[s]:
                if b is not base(self.deciding[s]):
                    out.append({**out[0], s: b})
        return out


def _product(spine: _Spine, t: dict, stop_site) -> int:
    n = 1
    for line in spine.deciding:
        if line != stop_site and line < t["line"] and line in spine.calls and _on(spine.calls[line], t) \
                and not _raised_into(spine.calls[line], t):
            n *= len(spine.deciding[line])
    return n


# ── paths ────────────────────────────────────────────────────────────────────────────────────────────
def _path(key: str, v: dict, exit_row: dict, kind: str, chain: list, chosen: list, split: str | None, switches: dict, **extra) -> dict:
    exit_id = exit_row.get("id")
    id_tag = extra.pop("id_tag", None)
    p = {"id": I.ident("p", [key, v.get("handler"), exit_id, sorted(chosen), id_tag or split]), "phase": extra.pop("phase", exit_row.get("phase")),
         "status": exit_row.get("status"), "exit": {"id": exit_id, "kind": kind},
         "names": {"detail": exit_row.get("detail") if kind != "success" else exit_row.get("value"), "token": extra.pop("token", None),
                   "exception": extra.pop("exception", None), "stage": extra.pop("stage", exit_row.get("phase"))},
         "chain": chain + [{"kind": "exit", "ref": exit_id}], "switches": [e["ref"] for e in chain if e["kind"] == "switch"]}
    if split:
        p["split"] = split
    p.update(extra)
    unknown = []
    if exit_row.get("status") is None and kind != "success":
        unknown.append("dynamic status")
    proven = next((sid for sid in p["switches"] if exit_id in (switches.get(sid, {}).get("proves") or [])), None)
    if proven:
        p["proven_by"] = proven
    elif exit_row.get("source") == "unverified":
        unknown.append("an unverified translation no binding proves")
    if any(any(b.get("binding") == "ambiguous" for b in switches.get(sid, {}).get("branches") or []) for sid in p["switches"]):
        unknown.append("an ambiguous binding")
    if p.get("anywhere"):
        unknown += list(exit_row.get("unknown_causes") or []) + list(exit_row.get("causes") or []) or ["anywhere"]
    p["state"] = "partial" if unknown else "defined"
    if unknown:
        p["unknown"] = unknown
    return p


def endpoint_paths(repo: Path, forms: dict, key: str, v: dict, m, fn, dec, stats: dict) -> list[dict]:
    switches = {sw["id"]: sw for sw in v.get("switches") or []}
    spine = _Spine(repo, v, m, fn)
    handler_rows = [r for r in v.get("produced") or [] if r.get("phase") == "handler"
                    and not str(r.get("via", "")).startswith("decorator ")]   # placed as a gate before the body, above
    anchors = {id(r): spine.anchor(r) for r in handler_rows}
    claim = [r for r in handler_rows if anchors[id(r)][0] is None and r.get("raised_at") and str(r.get("via", "")).startswith("app handler ")]
    items = _before_handler(repo, forms, v, m, fn, dec, claim)
    claimed = {i["row"]["_claimed"] for i in items if i["item"] == "row" and i["row"].get("_claimed")}
    out: list[dict] = []
    for i, item in enumerate(items):                       # exits before the handler
        if item["item"] != "row":
            continue
        row = item["row"]
        alt = item.get("split") == "body-parse"            # the body-parse exits are alternatives of one read, never a sequence
        chain = [_pass(x) for x in items[:i] if not (alt and x.get("split") == "body-parse")] + \
            [dict(_gate(row, True), **({"split": item["split"]} if item.get("split") else {}))]
        chain += spine.catches(row) if row.get("phase") == "dependency" else []
        kind = "framework" if item.get("split") in ("body-parse", "own-params", "dependency-params") else "refusal"
        extra = {"cases": item["cases"]} if item.get("cases") else {}
        if item.get("dependency"):                         # one 422 per dependency whose parameters fail — its own path
            extra.update(dependency=item["dependency"], id_tag=f"dependency-params {item['dependency']}")
        via = str(row.get("via", ""))
        out.append(_path(key, v, row, kind, chain, [], item.get("split"), switches,
                         exception=(via.partition("except ")[2] or (via[len("app handler "):] if via.startswith("app handler ") else None)),
                         _pos=(0, i, 0), **extra))
    prefix = [_pass(x) for x in items]
    value_sw = [sw for sw in switches.values() if sw["kind"] in ("value", "binding") and sw.get("scope") in ("call", "handler")]

    def with_switches(chain: list, t_line: int, success: bool) -> list:
        for sw in switches.values():                       # a `kind: flag` precondition's switch sits before the row it gates
            if sw["kind"] == "flag" and sw.get("scope") == "handler":
                idx = next((j for j, e in enumerate(chain) if e.get("ref") in (sw.get("refs") or ()) and e["kind"] == "gate"), None)
                if idx is not None:
                    chain.insert(idx, {"kind": "switch", "ref": sw["id"], "phase": "handler"})
        for sw in value_sw:
            if sw["kind"] == "value" and not success:
                continue
            at = _line(sw.get("anchor"))
            if str(sw.get("anchor", "")).rpartition(":")[0] == m.rel and at <= t_line:
                idx = next((j for j, e in enumerate(chain) if e["kind"] == "exit" or (str(e.get("at", "")).rpartition(":")[0] == m.rel
                            and _line(e["at"]) >= at and e["kind"] in ("collapsed", "call", "gate") and e.get("phase", "handler") == "handler")), len(chain))
                chain.insert(idx, {"kind": "switch", "ref": sw["id"], "phase": "handler"})
        return chain

    for row in handler_rows:                               # the handler's refusals
        if id(row) in claimed:
            continue
        t, site = anchors[id(row)]
        app = str(row.get("via", "")).startswith("app handler ")
        if t is None:
            stats["unplaced"] += 1
            continue
        live = spine.live(t, site)
        stats["impossible"] += len(spine.combos(t, site)) - len(live)
        for combo in live:
            entries, chosen = spine.walk(t, site, combo)
            if site is not None and site in spine.deciding:
                inner, _ = spine.inner(site, _line(row.get("raised_at") or row.get("at")), spine.deciding[site])
                entries += inner
            seen = spine.catches(row)
            here = [] if seen else [x for x in (spine.caught(t),) if x]      # the except body this refusal is raised in
            chain = with_switches(prefix + entries + here + [_gate(row, True)] + seen, t["line"], False)
            out.append(_path(key, v, row, "refusal", chain, chosen, None, switches, token=FP._token(_guards(t)[-1] if t.get("guards") else None),
                             exception=(str(row.get("via", "")).partition("except ")[2] or (str(row["via"])[len("app handler "):] if app else None)),
                             _pos=(1, t["line"], _line(row.get("raised_at") or (row.get("at") if site is not None else None)))))
        stats["combinations_omitted"] += _product(spine, t, site) - len(spine.combos(t, site))
    for line, (t, rr) in sorted(spine.returns.items()):   # the handler's success returns
        live = spine.live(t, None)
        stats["impossible"] += len(spine.combos(t, None)) - len(live)
        for combo in live:
            entries, chosen = spine.walk(t, None, combo)
            chain = with_switches(prefix + entries, t["line"], True)
            tok = next((b["token"] for s in sorted(combo, reverse=True) for b in [combo[s]]), None)
            last = max((_line(spine.returns_by_id[combo[s]["return"]]["at"]) for s in combo if combo[s].get("return") in spine.returns_by_id), default=0)
            out.append(_path(key, v, rr, "success", chain, chosen, None, switches, phase="handler", stage="handler", token=tok, _pos=(1, t["line"], last)))
        stats["combinations_omitted"] += _product(spine, t, None) - len(spine.combos(t, None))
    unc = next((r for r in v.get("produced") or [] if r.get("phase") == "uncaught"), None)
    if unc is not None:                                    # the uncaught 500: anywhere after the stack
        out.append(_path(key, v, unc, "uncaught", prefix, [], None, switches, anywhere=True, _pos=(2, 0, 0)))
    out.sort(key=lambda p: (p["_pos"], p.get("status") or 999, p["id"]))   # request order: the stack's timeline, then the handler by line
    for p in out:
        p.pop("_pos")
    if len(out) > PATH_CAP:
        keep = [p for p in out if p["exit"]["kind"] != "success"]
        rest = sorted((p for p in out if p["exit"]["kind"] == "success"), key=lambda p: p["id"])[:max(0, PATH_CAP - len(keep))]
        v["paths_truncated"] = len(out) - len(keep) - len(rest)
        stats["paths_truncated"] += v["paths_truncated"]
        out = [p for p in out if p["exit"]["kind"] != "success" or p in rest]
    return out


def paths_part(repo: Path, forms: dict) -> dict:
    stats = {"paths": 0, "success": 0, "refusal": 0, "framework": 0, "uncaught": 0, "partial": 0, "combinations_omitted": 0,
             "paths_truncated": 0, "unplaced": 0, "endpoints": 0, "impossible": 0}
    for key, v, m, fn, dec in MW._handlers(repo, forms):
        ps = endpoint_paths(repo, forms, key, v, m, fn, dec, stats)
        if ps:
            v["paths"] = ps
            stats["endpoints"] += 1
        for p in ps:
            stats["paths"] += 1
            stats[p["exit"]["kind"]] += 1
            stats["partial"] += p["state"] == "partial"
    return stats
