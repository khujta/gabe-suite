"""Element forms — the SWITCHES arm (amendment 1 §A2 Slice 5 · A11 · U8).

A SWITCH is a choice the running app makes that the source can name but not settle: which implementation a port binds
to, which settings value a function returns, which setting lets a refusal fire at all. A switch never forks a path —
Slice 5b places it as a step on every later path — so this arm says what the choice is, where it is read, and, for a
binding, whether the choice can change how the request ends.

* ``binding`` — the edges of ``_a3_stacks_pydi.parse(repo)`` (D18: recomputed here, the levels ``binds`` are only a
  cross-check), grouped by (scope function, port) and placed on every endpoint whose scope reaches that function: the
  handler, its level-1 callees, every dependency function and each dependency's level-1 callees. ``changes_exit`` says
  whether the branches' escaping classes end differently through the catches at the site and at the anchor; when they
  agree, the refusal rows those catches translate are listed in ``proves``.
* ``value`` — a function the reach walk finds (to ``OPTIONS["reach_depth"]``, D17) with at least two value returns, one
  guarded, every return a settings attribute or a constant (at least one a setting), and a guard comparing with a
  constant or an ALL-CAPS member. One found a level past the walk is counted, never placed (``switch_depth_capped``).
* ``flag`` — joins only: the settings terms of a middleware row's ``when`` (a row its route proves off is left out),
  and a precondition the endpoint pass marked ``kind: flag``.
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_catch as CA
import _a3_forms_ids as I
import _a3_forms_mw as MW
import _a3_forms_paths as FP
import _a3_forms_reach as R
import _a3_forms_settings as S
import _a3_paths as P
import _a3_stacks_pydi as PYDI

_REACH: dict = {}
_VALUE: dict = {}
_BRANCH: dict = {}
_SCOPE_STAGE = {"handler": "handler", "call": "call", "dependency": "dependency"}


def _fid(m, qual: str) -> str:
    return f"{m.rel}::{qual}"


def _args(node) -> list:
    a = node.args
    return list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs)


# ── scope ────────────────────────────────────────────────────────────────────────────────────────────
def _callees(repo: Path, m, qual: str, node) -> list[tuple]:
    out, seen = [], set()
    for e in P._events(node):
        if e["kind"] != "call":
            continue
        r = R.callee(repo, m, qual, node, e["node"])
        if r is None or r[1] not in r[0].defs or (r, e["line"]) in seen:
            continue
        seen.add((r, e["line"]))
        out.append((r[0], r[1], e["line"]))
    return out


def scope_functions(repo: Path, m, fn, dec) -> list[dict]:
    """The functions an endpoint runs while it answers — ``[{fid, m, qual, node, stage, root, anchor, caller}]``: the
    handler, its level-1 callees, every dependency ``_a3_paths._deps`` would walk and each one's level-1 callees. The
    first stage a function is reached at wins; ``anchor`` is the line in the caller that reaches it."""
    out: list[dict] = []
    seen: set = set()

    def add(mm, q, node, stage, root, anchor, caller):
        fid = _fid(mm, q)
        if fid not in seen:
            seen.add(fid)
            out.append({"fid": fid, "m": mm, "qual": q, "node": node, "stage": stage, "root": root, "anchor": anchor, "caller": caller})

    add(m, fn.name, fn, "handler", True, None, None)
    for cm, cq, line in _callees(repo, m, fn.name, fn):
        add(cm, cq, cm.defs[cq], "call", False, f"{m.rel}:{line}", (m, fn))

    def deps(mm, node, d_dec, depth: int, path: frozenset) -> None:
        if depth > P._DEP_MAX:
            return
        aliases = C._dep_aliases(repo, mm.rel, mm.tree)
        for d in MW._dep_params(node, d_dec, aliases, C._dep_alias_meta(mm.rel)):
            r = P._dep_target(repo, mm, d.get("callee") or d["name"], d.get("_decl"))
            got = P._dep_node(repo, r[0], r[1], called=str(d["name"]).rstrip().endswith(")")) if r else None
            if not got or got[1] is None:
                continue
            nm, dn, nq, _ = got
            if _fid(nm, nq) in path:
                continue
            add(nm, nq, dn, "dependency", True, f"{nm.rel}:{dn.lineno}", None)
            for cm, cq, line in _callees(repo, nm, nq, dn):
                add(cm, cq, cm.defs[cq], "dependency", False, f"{nm.rel}:{line}", (nm, dn))
            deps(nm, dn, None, depth + 1, path | {_fid(nm, nq)})

    deps(m, fn, dec, 0, frozenset({out[0]["fid"]}))
    return out


# ── binding switches ─────────────────────────────────────────────────────────────────────────────────
def _port_site(node, method: str, port: str) -> int | None:
    """The first ``<receiver>.<method>(`` in ``node`` whose receiver is a parameter annotated ``port`` (or ``self.<x>``)."""
    anns = {a.arg: PYDI._ann_name(a.annotation) for a in _args(node)}
    lines = []
    for n in ast.walk(node):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == method:
            base = n.func.value
            if (isinstance(base, ast.Name) and anns.get(base.id) == port) or \
                    (isinstance(base, ast.Attribute) and isinstance(base.value, ast.Name) and base.value.id == "self"):
                lines.append(n.lineno)
    return min(lines) if lines else None


def _hev(node) -> dict:
    hev: dict = {}
    for e in P._events(node):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
    return hev


def _ends(cls: str, bases, hops: list) -> dict:
    """How ``cls`` ends through the catch chain ``hops`` = [(module, node, line)], innermost first: the first handler
    that decides it, else ``escape``."""
    for mm, node, line in hops:
        if node is None or line is None:
            continue
        tries = next((e["tries"] for e in P._events(node) if e["kind"] == "call" and e["line"] == line), ())
        last = CA.trail(cls, bases, tries, _hev(node))[-1]
        if last["op"] != "escape":
            return {"op": last["op"], "at": f"{mm.rel}:{last['handler']}", "fn": (mm.rel, node.lineno, getattr(node, "end_lineno", node.lineno))}
    return {"op": "escape"}


def _branch(repo: Path, e: dict) -> tuple[dict, list, list]:
    """One implementation → ``(branch row, [(escaping class, bases)], [refusal statuses])``, memoised per target."""
    if e["t"] not in _BRANCH:
        file, _, tq = e["t"].partition("#")
        tm = P._mod(repo, file)
        node = tm.defs.get(tq) if tm else None
        if node is None:
            _BRANCH[e["t"]] = (None, None, None)
        else:
            A = P._analyse(repo, tm, node)
            escs = {x["cls"]: sorted(P._bases(repo, tm, x["cls"], at=x["at"])) for x in A["escapes"]}
            _BRANCH[e["t"]] = (f"{file}::{tq}", sorted(escs.items()), sorted({r["status"] for r in A["rows"] if r.get("status")}))
    t, escs, refuses = _BRANCH[e["t"]]
    row = {"impl": e["impl"], "t": t or e["t"].replace("#", "::"), "pred": e.get("predicate") or None, "binding": e.get("binding")}
    if escs is None:
        row["reason"] = "the implementation's method is not in the scanned tree"
        return row, None, None
    row["escapes"] = [c for c, _ in escs]
    if refuses:
        row["refuses"] = refuses
    return row, escs, refuses


def _factories(repo: Path, edges: list, port: str) -> list[str]:
    impls = {e["impl"] for e in edges}
    out: set = set()
    for rel in sorted({e["t"].partition("#")[0] for e in edges}):
        m = P._mod(repo, rel)
        if m is None:
            continue
        w = PYDI._Walker(rel)
        w.visit(m.tree)
        out |= {f"{rel}::{f['fn']}" for f in w.factories if f["port"] == port and f["impl"] in impls}
    return sorted(out)


def _binding(repo: Path, v: dict, s: dict, port: str, edges: list) -> dict:
    method = edges[0]["t"].rpartition(".")[2]
    site = _port_site(s["node"], method, port)
    caller = s.get("caller")
    hops = [(s["m"], s["node"], site), (caller[0], caller[1], I._line(s["anchor"])) if caller else (None, None, None)]
    branches, sigs, known, ends_seen = [], set(), True, []
    for e in sorted(edges, key=lambda x: (x["impl"], x["t"])):
        row, escs, refuses = _branch(repo, e)
        branches.append(row)
        if escs is None:
            known = False
            continue
        ends = sorted(((c, _ends(c, bases, hops)) for c, bases in escs), key=lambda x: x[0])
        row["ends"] = [f"{c} → {x['op']}" + (f" {x['at']}" if x.get("at") else "") for c, x in ends]
        sigs.add((tuple(row["ends"]), tuple(refuses)))
        ends_seen = ends
    sw = {"id": I.ident("sw", ["binding", s["fid"], port]), "kind": "binding", "scope": _SCOPE_STAGE[s["stage"]], "fn": s["fid"],
          "port": port, "site": f"{s['m'].rel}:{site}" if site else None, "anchor": s["anchor"] or (f"{s['m'].rel}:{site}" if site else None),
          "factories": _factories(repo, edges, port), "branches": branches,
          "changes_exit": (len(sigs) > 1) if known and sigs else None}
    if sw["changes_exit"] is False:
        proves = set()
        for c, x in ends_seen:
            if x["op"] != "translate":
                continue
            rel, lo, hi = x["fn"]
            for r in v.get("produced") or []:
                via = str(r.get("via") or "")
                if via.startswith("except ") and c in via[len("except "):].split(" | ") and r.get("id") \
                        and str(r.get("at") or "").rpartition(":")[0] == rel and lo <= I._line(r.get("at")) <= hi:
                    proves.add(r["id"])
        if proves:
            sw["proves"] = sorted(proves)
    return sw


# ── value switches ───────────────────────────────────────────────────────────────────────────────────
def _settings_of(repo: Path, m, fn, v):
    """``settings.x`` → ``(x, (module, SettingsClass))`` when ``settings`` is a parameter typed by, a call returning, or a
    module name bound to a settings class; else None."""
    if not isinstance(v, ast.Attribute):
        return None
    base, cls = v.value, None
    if isinstance(base, ast.Name):
        ann = P._param_ann(fn, base.id)
        if ann is not None:
            cls = P._class_of(repo, m, ann)
        elif isinstance(m.assigns.get(base.id), ast.Call):
            base = m.assigns[base.id]
    if cls is None and isinstance(base, ast.Call) and isinstance(base.func, ast.Name):
        r = P._resolve(repo, m, base.func.id, at=base)
        if r and r[1] in r[0].classes:
            cls = r
        elif r and r[1] in r[0].defs and r[0].defs[r[1]].returns is not None:
            cls = P._class_of(repo, r[0], r[0].defs[r[1]].returns)
    if cls and S._is_settings(repo, cls[0], cls[0].classes[cls[1]]):
        return v.attr, cls
    return None


def _constant(repo: Path, m, v) -> bool:
    if isinstance(v, ast.Constant) or (isinstance(v, ast.UnaryOp) and isinstance(v.operand, ast.Constant)):
        return True
    if isinstance(v, ast.Attribute) and v.attr.isupper():
        return True
    return isinstance(v, ast.Name) and v.id.isupper() and S.resolve_const(repo, m, v.id) is not None


def _compares_constant(guard: str) -> bool:
    try:
        node = ast.parse(guard, mode="eval").body
    except SyntaxError:
        return False
    for n in ast.walk(node):
        if isinstance(n, ast.Compare):
            for side in [n.left] + list(n.comparators):
                if (isinstance(side, ast.Constant) and side.value is not None) or \
                        (isinstance(side, ast.Attribute) and side.attr.isupper()) or (isinstance(side, ast.Name) and side.id.isupper()):
                    return True
    return False


def value_switch(repo: Path, m, qual: str, node) -> dict | None:
    fid = _fid(m, qual)
    if fid in _VALUE:
        return _VALUE[fid]
    got = None
    rets = [e for e in FP.returns_of(node) if FP._value(e) is not None]
    if len(rets) >= 2 and any(e["guards"] for e in rets):
        branches, settings = [], {}
        for e in rets:
            val = FP._value(e)
            hit = _settings_of(repo, m, node, val)
            if hit is None and not _constant(repo, m, val):
                branches = None
                break
            row = {"pred": " and ".join(g for g, _ in e["guards"]) or " and ".join(e["after"]) or None,
                   "value": P._unp(val, 80), "at": f"{m.rel}:{e['line']}"}
            if hit:
                row["setting"] = hit[0]
                flds = S.fields(repo, hit[1][0], hit[1][0].classes[hit[1][1]])
                if hit[0] in flds:
                    settings[hit[0]] = {k: flds[hit[0]][k] for k in ("default", "env") if k in flds[hit[0]]}
            branches.append(row)
        if branches and settings and any(_compares_constant(e["guards"][-1][0]) for e in rets if e["guards"]):
            got = {"fn": fid, "branches": branches, "settings": dict(sorted(settings.items()))}
    _VALUE[fid] = got
    return got


def _values(repo: Path, scope: list, stats: dict) -> list[dict]:
    depth = F.OPTIONS["reach_depth"]
    out: dict = {}
    for s in (x for x in scope if x["root"]):
        root = s["fid"]
        if root not in _REACH:
            _REACH[root] = R.bfs(repo, [(s["m"], s["qual"])], depth + 1)["reached"]
        reached = _REACH[root]
        for fid in sorted(reached):
            info = reached[fid][root]
            rel, _, q = fid.partition("::")
            fm = P._mod(repo, rel)
            node = fm.defs.get(q) if fm else None
            vs = value_switch(repo, fm, q, node) if node is not None else None
            if vs is None or fid in out:
                continue
            if info["depth"] > depth:
                stats["switch_depth_capped"] += 1
                continue
            chain, hop = [fid], info
            while hop["via"] != root:
                chain.append(hop["via"])
                hop = reached[hop["via"]][root]
            chain.append(root)
            out[fid] = {"id": I.ident("sw", ["value", fid]), "kind": "value", "scope": "call" if s["stage"] == "handler" else "dependency",
                        "fn": fid, "depth": info["depth"], "chain": chain[::-1], "anchor": hop["site"], "site": info["site"],
                        **{k: vs[k] for k in ("branches", "settings")}, "on": "success"}
    return [out[k] for k in sorted(out)]


# ── flag switches ────────────────────────────────────────────────────────────────────────────────────
def _flags(repo: Path, v: dict, cache: dict) -> list[dict]:
    groups: dict = {}
    for r in v.get("produced") or []:
        if r.get("phase") != "middleware" or not r.get("when") or not r.get("id"):
            continue
        val, _, terms = FP.row_condition(repo, r, v.get("full_path") or "", cache)
        if val is False:
            continue                                      # the route proves the row off: no switch lets it fire here
        sets = [t for t in terms if t["kind"] == "expr" and t.get("settings_class")]
        if sets:
            groups.setdefault((r.get("via"), r["when"]), {"refs": set(), "terms": sets})["refs"].add(r["id"])
    out = []
    for (via, when), g in sorted(groups.items(), key=lambda kv: str(kv[0])):
        refs = sorted(g["refs"])
        settings = {name: {k: f[k] for k in ("default", "env") if k in f} for t in g["terms"] for name, f in sorted((t.get("fields") or {}).items())}
        out.append({"id": I.ident("sw", ["flag", refs]), "kind": "flag", "scope": "middleware", "via": via, "when": when,
                    "expr": " and ".join(t["expr"] for t in g["terms"]), "settings_class": g["terms"][0]["settings_class"],
                    "settings": dict(sorted(settings.items())), "refs": refs})
    for g in v.get("preconditions") or []:
        if g.get("kind") == "flag" and g.get("exit"):
            out.append({"id": I.ident("sw", ["flag", [g["exit"]]]), "kind": "flag", "scope": "handler", "pred": g["pred"],
                        "at": g.get("at"), "refs": [g["exit"]]})
    return out


def run(forms: dict, ctx: dict) -> dict:
    """The switches arm: ``switches[]`` per endpoint (and per ``variants[]`` entry)."""
    repo = Path(ctx["repo"])
    for cache in (_REACH, _VALUE, _BRANCH):
        cache.clear()
    pydi = PYDI.parse(repo)
    groups: dict = {}
    for e in pydi.get("edges") or []:
        if e.get("via") == "binding":
            s_file, _, s_qual = str(e["s"]).partition("#")
            groups.setdefault((f"{s_file}::{s_qual}", e["port"]), []).append(e)
    stats = {"binding": 0, "value": 0, "flag": 0, "endpoints": 0, "binding_edges": sum(len(x) for x in groups.values()),
             "binds_unplaced": 0, "changes_exit": 0, "switch_depth_capped": 0}
    placed, cache, seen = set(), {}, {"binding": {}, "value": {}, "flag": {}}
    for key, v, m, fn, dec in MW._handlers(repo, forms):
        scope = scope_functions(repo, m, fn, dec)
        by_fid = {s["fid"]: s for s in scope}
        sws = []
        for (sfid, port), edges in sorted(groups.items()):
            if sfid in by_fid:
                placed.add((sfid, port))
                sws.append(_binding(repo, v, by_fid[sfid], port, edges))
        sws += _values(repo, scope, stats)
        sws += _flags(repo, v, cache)
        if sws:
            v["switches"] = sws
            stats["endpoints"] += 1
        for sw in sws:
            seen[sw["kind"]][sw["id"]] = sw
    for kind, ids in seen.items():
        stats[kind] = len(ids)
    stats["changes_exit"] = sum(1 for sw in seen["binding"].values() if sw.get("changes_exit"))
    stats["binds_unplaced"] = sum(len(edges) for k, edges in groups.items() if k not in placed)
    if not pydi.get("present"):
        stats["bindings_reason"] = pydi.get("reason")
    return {"version": 1, "stats": stats, "options": {"reach_depth": F.OPTIONS["reach_depth"]}}
