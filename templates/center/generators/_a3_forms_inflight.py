"""Element forms — the KINDS arm's ``inflight`` part (amendment 1 §A2 Slice 12 · U15): what is alive while a request runs.

Per endpoint ``inflight[]`` — one row per thing that is alive while THIS request runs, in request order — and top level
``inflight{process, rules}``: what is built once for the whole server (an endpoint that meets it carries a short ``ref``
row with its own ``read_at``) and the rules the rows used. Eight kinds: ``state`` · ``contextvar`` · ``dependency-value`` ·
``background`` · ``lock`` · ``cache`` · ``built-once`` · ``setting-once``. An analysis, never a grade: no finding.

The part looks only at STATIONS — where the request really goes: each project middleware's ``dispatch`` by run order, each
dependency FastAPI solves (sub-dependencies before their parent, each once; a called ``Depends(factory(...))`` walks the
nested def the factory RETURNS, never the factory body — that runs at import), then the handler — each in its own body plus
ONE call level. A fact one call down is asked of the falsification leaf (``RD._dead``): a guard the call's own arguments fold
to False is no fact of this request. A sub-dependency a factory's closure names through a factory-local alias is a station
too (``RD._factory_arms``); a dependency name that resolves to nothing is counted and named (``deps_unresolved``), and that
endpoint's unwritten reads say ``dep-unresolved``. A test conftest, a startup seed or an unreached helper is never a station.
``scope`` and ``dies`` come from the ``_a3_forms.INFLIGHT`` rule a row names, never from free text, and ``dies`` describes the
CARRIER — the slot that holds the value — never the object behind it (D31). A rule that cites the framework opens only at
``_a3_forms_short.FRAMEWORK_MIN``; below it the row says ``dies: unknown``, ``rule: framework-gate-closed``, ``would_be``.
Not read (12b): route-wrapper callables, ``@app.middleware("http")`` function stations, module-level and ``global``-built
objects — those rows say ``none in scope`` / ``no-write-found`` / ``unknown``. Imports no arm (``_a3_forms_mw`` lazily).
What ONE function does in its own body is read by the leaf ``_a3_forms_inflight_read`` (``RD``); this module places it.
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_fn as FN
import _a3_forms_inflight_read as RD
import _a3_forms_reach as R
import _a3_forms_settings as S
import _a3_forms_short as SH
import _a3_graft as G
import _a3_paths as P

IN = F.INFLIGHT
RULES = IN["rules"]
KINDS = ("state", "contextvar", "dependency-value", "background", "lock", "cache", "built-once", "setting-once")
DIES = tuple(dict.fromkeys(r["dies"] for r in RULES.values()))          # the three words of the roster, in its own order
OPTION_KEYS = ("inflight_scope", "inflight_dep_values")


class Refused(ValueError):
    """An option value the part does not build: the part is absent and says why — ``options`` still says what was asked."""
_MEMO = RD._MEMO                                                        # ONE memo for the part, cleared per build


# ── stations ─────────────────────────────────────────────────────────────────────────────────────────
def _sites(repo: Path, st: dict) -> list[dict]:
    """A station's facts: its own body, then ONE call level (``set_fn`` · ``via``). A cached callee is met, never walked — its
    body runs once per process, not in this request."""
    key = ("sites", st["fid"], st["role"])
    if key in _MEMO:
        return _MEMO[key]
    m, node = st["m"], st["node"]
    own = RD._census(repo, m, node, st["qual"], st["role"] == "middleware")
    out = [dict(f, m=m, rel=m.rel, fn=st["fid"], via=None, pos=(f["line"], 0, f["line"], f["col"]), param=f.get("recv"))
           for f in own["facts"] if f["k"] != "bg" or f["recv"] is None or f["recv"] in own["bg_params"]]
    for c in own["calls"]:
        r = R.callee(repo, m, st["qual"], node, c["node"])
        if r is None or r[1] not in r[0].defs or G._is_center(r[0].rel) or r[0].defs[r[1]] is node:
            continue
        cm, cnode = r[0], r[0].defs[r[1]]
        here = {"m": cm, "rel": cm.rel, "fn": f"{cm.rel}::{r[1]}", "via": f"{m.rel}:{c['line']}", "via_guards": c["guards"]}
        if RD._cached(cnode):
            out.append({"k": "cache", "line": c["line"], "col": c["col"], "guards": c["guards"], "cond": c["cond"], "node": cnode,
                        **here, "via": None, "rel": m.rel, "fn": st["fid"], "cache": here["fn"], "cm": cm, "pos": (c["line"], 0, c["line"], c["col"])})
            continue
        sub, names, bound = RD._census(repo, cm, cnode, r[1]), RD._mapped(c["node"], cnode, RD._params(node)), RD._bound(cnode, c["node"])
        for f in sub["facts"]:
            got = names.get(f.get("recv")) or (None, False)      # the caller's name for the fact's receiver · whether another arm may arrive instead
            if f["k"] == "bg" and not (f["recv"] is None or f["recv"] in sub["bg_params"] or got[0] in own["bg_params"]):
                continue
            if RD._dead(f["guards"], bound):                      # §A4 fix 3: a branch THIS call site proves dead is no fact of this request
                continue
            out.append(dict(f, **here, cond=f["cond"] or c["cond"] or got[1], pos=(c["line"], 1, f["line"], f["col"]),
                            param=got[0] if got[0] in own["bg_params"] else None))
    _MEMO[key] = sorted(out, key=lambda s: s["pos"])
    return _MEMO[key]


def _mw_stations(repo: Path, forms: dict) -> list[dict]:
    """S1 — every project middleware's dispatch, by ``order.runs`` ascending; third-party and unknown classes are never walked."""
    out: dict = {}
    every = [(key, f) for key, e in (forms.get("middleware") or {}).items() for f in (e.get("variants") or [e])]
    for key, form in sorted(every, key=lambda x: ((x[1].get("order") or {}).get("runs", 0), x[0])):
        rel, _, qual = str(form.get("method") or "").partition("::")
        m = P._mod(repo, rel) if form.get("kind") == "project" and rel else None
        if m is not None and qual in m.defs and f"{rel}::{qual}" not in out:                  # a class registered twice is read once
            arms = [(int(str(a.get("at")).rpartition(":")[2]), a) for a in form.get("pass_through") or []]
            out[f"{rel}::{qual}"] = {"role": "middleware", "by": key, "m": m, "node": m.defs[qual], "qual": qual, "fid": f"{rel}::{qual}",
                                     "cls": qual.split(".")[0], "arms": arms}
    return list(out.values())


def _call_of(expr: str):
    try:
        node = ast.parse(expr, mode="eval").body
    except SyntaxError:
        return None
    return node if isinstance(node, ast.Call) else None


def _dep_stations(repo: Path, MW, m, fn, dec, asker: dict, seen: set, out: list, unread: set, lost: list, factory: tuple | None = None, cond: bool = False) -> None:
    """S2 — the dependencies FastAPI solves for ``fn``, in its own order, each preceded by its sub-dependencies and each ONCE
    (fastapi/dependencies/utils.py solves a dependency once per request). A dependency with nothing to walk keeps its place. A
    name the module does not resolve, asked by a closure a ``factory`` returned, is read through the factory's own body
    (``RD._factory_arms`` — an arm nothing proves is a CONDITIONAL station: its facts say ``set_cond``); what still resolves
    to nothing is NAMED in ``lost`` — never dropped in silence."""
    for d in MW._dep_params(fn, dec, C._dep_aliases(repo, m.rel, m.tree), C._dep_alias_meta(m.rel)):
        if d.get("via") == "decorator":
            continue
        name = d.get("callee") or d["name"]
        r = P._dep_target(repo, m, name, d.get("_decl"))
        targets, whole = ([(r, cond)], True) if r else RD._factory_arms(repo, *factory, name) if factory else ([], False)
        if not whole:
            lost.append(f"{m.rel}:{fn.lineno} Depends({str(d['name'])[:80]})")
        for r, arm_cond in targets:
            by = f"{r[0].rel}::{r[1]}"
            if by in seen:
                continue
            seen.add(by)
            called = str(d["name"]).rstrip().endswith(")")
            got = P._dep_node(repo, r[0], r[1], called)
            st = {"role": "dependency", "by": by, "m": None, "node": None, "called": called, "kind": got[3] if got else None, "asker": asker, "cond": cond or arm_cond}
            if got is not None and got[1] is not None:
                nm, node, nqual = got[0], got[1], got[2]
                inner = None
                if called and got[3] == "function":
                    inner, node = (nm, node, nqual, m, _call_of(str(d["name"]))), RD._closure(node)
                    if node is None:
                        unread.add(by)
                    else:
                        nqual = f"{nqual}.{node.name}"
                if node is not None:
                    st.update({"m": nm, "node": node, "qual": nqual, "fid": f"{nm.rel}::{nqual}", "cached": RD._cached(node) if not called else None})
                    if not st["cached"]:
                        _dep_stations(repo, MW, nm, node, None, {"at": f"{nm.rel}:{node.lineno}", "fn": st["fid"], "in": "dependency"}, seen, out, unread, lost, inner, st["cond"])
            out.append(st)


def _scope(repo: Path, pairs: list) -> object:
    """The path prefixes the innermost guard above a site names, else ``"all"``."""
    for m, guards in pairs:
        for g, gl in reversed(guards or ()):
            px = P._path_prefixes(g, m, repo, at=gl)
            if px:
                return sorted(px)
    return "all"


def _entry(st: dict, s: dict) -> dict:
    e = {"at": f"{s['rel']}:{s['line']}", "fn": s["fn"], "in": st["role"]}
    if s["via"]:
        e["via"] = s["via"]
    return e


def _capped(entries: list) -> dict:
    seen, out = set(), []
    for e in entries:
        if e["at"] not in seen:
            seen.add(e["at"])
            out.append(e)
    cap = IN["read_cap"]
    got = {"read_at": out[:cap], "reads": "found" if out else "none in scope"}
    if len(out) > cap:
        got["reads_more"] = len(out) - cap
    return got


def _set(st: dict | None, s: dict | None) -> dict:
    if s is None:
        return {"set_at": "unknown", "set_by": "unknown", "set_in": "unknown"}
    out = {"set_at": f"{s['rel']}:{s['line']}", "set_by": st["by"], "set_in": st["role"]}
    if s["via"]:
        out.update({"set_fn": s["fn"], "set_via": s["via"]})
    if s["cond"]:
        out["set_cond"] = True
    return out


def _ruled(row: dict, rule: str, open_: bool) -> dict:
    """``scope`` · ``dies`` · ``rule`` from the roster — a row never writes them as free text. A framework-cited rule on a lock
    file below FRAMEWORK_MIN keeps its scope and says ``unknown``, ``framework-gate-closed``, ``would_be``."""
    spec = RULES[rule]
    if spec.get("gate") and not open_:
        return {**row, "scope": spec["scope"], "dies": RULES["framework-gate-closed"]["dies"], "rule": "framework-gate-closed", "would_be": rule}
    return {**row, "scope": spec["scope"], "dies": spec["dies"], "rule": rule}


def _gate(repo: Path, rel: str) -> tuple:
    fw = P._framework(repo, rel)
    ok = bool(fw and P._vt(fw[0]) >= P._vt(SH.FRAMEWORK_MIN))
    return ok, "open" if ok else f"closed: fastapi {fw[0] if fw else 'unpinned'} < {SH.FRAMEWORK_MIN}"


# ── D6 · D7 — what a middleware builds and reads ONCE ───────────────────────────────────────────────
def _self_writes(init) -> list[tuple]:
    out = []
    for n, _, cond, _, _ in RD._visit(init):
        if isinstance(n, (ast.Assign, ast.AnnAssign)) and n.value is not None:
            for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
                if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "self":
                    out.append((t.attr, n.value, cond, n.lineno))
    return sorted(out, key=lambda x: (x[3], x[0]))


def _holds(lm, lcls) -> list[dict]:
    init = lm.defs.get(f"{lcls.name}.__init__")
    out = []
    for attr, val, _, line in (_self_writes(init) if init is not None else []):
        kind = P._leaf(val.func) if isinstance(val, ast.Call) else {ast.Dict: "dict", ast.List: "list", ast.Set: "set"}.get(type(val))
        if kind in IN["containers"]:
            out.append({"attr": attr, "as": kind, "at": f"{lm.rel}:{line}"})
    return out


def _literal(src):
    try:
        return ast.literal_eval(src)
    except (ValueError, SyntaxError, TypeError):
        return src


def _setting(repo: Path, cm, cls: str, held: tuple, name: str, direct: str | None) -> dict:
    """A settings attribute as the contract arm's ``_arg`` says it (every value still from ``S.fields``): a field → value · env ·
    declared_at with ``state: default`` — the environment can override, never "the live value"; a directly assigned property →
    ``S.resolve_self_attr``; anything else ``state: unknown``."""
    sm, scls = held
    out = {"settings_class": f"{sm.rel}::{scls.name}"}
    flds = S.fields(repo, sm, scls)
    if name in flds:
        fld = flds[name]
        at = next((f"{xm.rel}:{n.lineno}" for xm, c in S._chain(repo, sm, scls) for n in c.body
                   if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name) and n.target.id == name), None)
        return {**out, "setting": name, "value": _literal(fld.get("default")) if fld.get("default") is not None else None,
                "state": "unknown" if fld.get("required") else "default", "env": fld.get("env"), "declared_at": at}
    got = S.resolve_self_attr(repo, cm, cls, direct) if direct else {}
    if got.get("kind") == "expr":
        out.update({"expr": got["expr"], "fields": sorted(got.get("fields") or {}), "state": "default" if not got.get("unresolved") else "unknown"})
        if got.get("unresolved"):
            out["unresolved"] = got["unresolved"]
        return out
    return {**out, "expr": f"{scls.name.lower()}.{name}", "state": "unknown"}


def _init_rows(repo: Path, st: dict) -> dict:
    """``{process key: row}`` for one middleware class: every ``self.x = <Call>`` of its ``__init__`` that is no settings read
    (built-once) and every settings attribute read there (setting-once), each with the reads its dispatch makes and the path
    prefixes they sit under. An object built inside dispatch is per request and is no row."""
    cm, cls = st["m"], st["cls"]
    init = cm.defs.get(f"{cls}.__init__")
    if init is None:
        return {}
    open_, by = _gate(repo, cm.rel)[0], f"{cm.rel}::{cls}.__init__"
    reads: dict[str, list] = {}
    for s in _sites(repo, st):
        if s["k"] == "self":
            e = _entry(st, s)
            e.update({k: s[k] for k in ("call", "key") if s.get(k)})
            e["scope"] = _scope(repo, [(s["m"], s["guards"]), (st["m"], s.get("via_guards"))])
            e["_line"] = s["pos"][0]
            reads.setdefault(s["attr"], []).append(e)
    typed: dict = {}

    def settings_local(name: str):
        if name not in typed:
            held = S._typed_local(repo, cm, init, name)
            typed[name] = held if held and S._is_settings(repo, *held) else None
        return typed[name]

    def is_read(n) -> bool:
        return isinstance(n, ast.Attribute) and isinstance(n.ctx, ast.Load) and isinstance(n.value, ast.Name) and settings_local(n.value.id) is not None

    rows: dict = {}
    hands: dict[str, list] = {}
    writes = _self_writes(init)
    for attr, val, cond, line in writes:
        for n in ast.walk(val):
            if not is_read(n):
                continue
            hand = {"attr": attr}
            if isinstance(val, ast.Call) and n is not val:
                lc = S._class(repo, cm, P._leaf(val.func), at=val)
                li = lc[0].defs.get(f"{lc[1].name}.__init__") if lc else None
                ps = [a.arg for a in li.args.args[1:]] if li is not None else []
                pos = next((i for i, a in enumerate(val.args) if any(x is n for x in ast.walk(a))), None)
                hand["param"] = next((k.arg for k in val.keywords if any(x is n for x in ast.walk(k.value))),
                                     ps[pos] if pos is not None and pos < len(ps) else None)
            hands.setdefault(n.attr, []).append({**hand, "at": f"{cm.rel}:{n.lineno}"})
        ctor = val.value if isinstance(val, ast.Await) else val
        if not isinstance(ctor, ast.Call) or is_read(ctor.func):
            continue
        made = S._class(repo, cm, P._leaf(ctor.func), at=ctor)
        fn_r = P._resolve(repo, cm, P._leaf(ctor.func), at=ctor)
        returns = S._class(repo, fn_r[0], S._ann_name(fn_r[0].defs[fn_r[1]].returns)) if fn_r and fn_r[1] in fn_r[0].defs else None
        if any(h and S._is_settings(repo, *h) for h in (made, returns)):                # `self._s = get_settings()` is a settings read, not an object built
            continue
        key = f"built-once:{cm.rel}::{cls}.{attr}"
        if key in rows:
            rows[key].setdefault("also_set_at", []).append(f"{cm.rel}:{line}")
            continue
        row = {"kind": "built-once", "name": attr, "owner": st["by"], "attr": attr, "class": P._leaf(ctor.func)}
        if made:
            row.update({"class_at": f"{made[0].rel}:{made[1].lineno}", "holds": _holds(*made)})
        row.update({"set_at": f"{cm.rel}:{line}", "set_by": by, "set_in": "init", **({"set_cond": True} if cond else {})})
        rows[key] = {**_ruled(row, "middleware-init", open_), "_reads": sorted(reads.get(attr, []), key=lambda e: e["_line"])}
    seen_reads = sorted((n for n, *_ in RD._visit(init) if is_read(n)), key=lambda n: (n.lineno, n.col_offset))
    for n in seen_reads:
        key = f"setting-once:{cm.rel}::{cls}.{n.attr}"
        if key in rows:
            if f"{cm.rel}:{n.lineno}" not in [rows[key]["set_at"]] + rows[key].get("also_set_at", []):
                rows[key].setdefault("also_set_at", []).append(f"{cm.rel}:{n.lineno}")
            continue
        direct = next((attr for attr, val, _, _ in writes if val is n), None)
        row = {"kind": "setting-once", "name": n.attr, **_setting(repo, cm, cls, settings_local(n.value.id), n.attr, direct),
               "hands_to": hands.get(n.attr, []), "set_at": f"{cm.rel}:{n.lineno}", "set_by": by, "set_in": "init"}
        met = sorted((e for h in row["hands_to"] for e in reads.get(h["attr"], [])), key=lambda e: e["_line"])
        rows[key] = {**_ruled(row, "setting-at-init", open_), "_reads": [{k: v for k, v in e.items() if k not in ("call", "key")} for e in met]}
    return rows


# ── per endpoint ─────────────────────────────────────────────────────────────────────────────────────
def _exempt(MW, st: dict, line: int, full_path: str) -> bool:
    """A pass-through arm above the site proves this path never reaches it (D19: the row stays, ``applies: false``)."""
    return st["role"] == "middleware" and any(MW._exempts(a, full_path) for ln, a in st.get("arms") or [] if ln < line)


def _placed(repo: Path, MW, v: dict, row: dict, writes: list, reads: list, src: str) -> dict:
    """Where a state or context-variable row is set and read: the FIRST write in request order is ``set_at``, the rest
    ``also_set_at`` in the SAME request order (stations, then positions — never by file name); ``from`` when the written
    value was read off a ``src`` carrier — ``cond: true`` when the binding that fed the write sits under a condition, and NO
    ``from`` when that condition is a method test this endpoint's method provably fails (the carrier is never read on this
    request); ``applies: false`` past an exempting arm."""
    fp = v.get("full_path") or ""
    _, st, s = (writes or reads)[0]
    row.update(_set(st, s) if writes else _set(None, None))
    more = [x for x in dict.fromkeys(f"{w['rel']}:{w['line']}" for _, _, w in writes[1:]) if x != row["set_at"]]     # REQUEST order, each site once — never a set's order
    if more:
        row["also_set_at"] = more
    b = (s.get("src") or {}) if writes else {}
    if b.get("kind") == src and not (b.get("cond") and RD._method_never(repo, s["m"], b["guards"], v.get("method"))):
        row["from"] = {"kind": src, "name": b["name"], **({"cond": True} if b.get("cond") else {})}
    if _exempt(MW, st, s["pos"][0], fp):
        row["applies"] = False
    return {**row, **_capped([_entry(rst, r) for _, rst, r in reads])}


def _state_rows(repo: Path, MW, v: dict, sites: list, open_: bool, lost: bool = False) -> list:
    """D1 — one row per (carrier, name): the first write in request order is ``set_at``, the rest ``also_set_at``; a read with
    no write in scope says so; an unproven receiver is kept and says so. Never "never read", never a merge with a header."""
    groups: dict = {}
    for i, st, s in sites:
        if s["k"] in ("sw", "sr"):
            groups.setdefault((s["carrier"], s["name"]), []).append((i, st, s))
    out = []
    for (carrier, name), hits in sorted(groups.items()):
        writes, reads = [h for h in hits if h[2]["k"] == "sw"], [h for h in hits if h[2]["k"] == "sr"]
        i, st, s = (writes or reads)[0]
        row = {"kind": "state", "name": name, "carrier": carrier}
        if s["unproven"]:
            row["receiver"], rule = "unproven", "receiver-unproven"
        else:
            rule = "app-state" if carrier == "app.state" else "request-state" if writes else "dep-unresolved" if lost else "no-write-found"
        out.append(((i,) + s["pos"], _ruled(_placed(repo, MW, v, row, writes, reads, "header"), rule, open_)))
    return out


def _cv_rows(repo: Path, MW, v: dict, sites: list, open_: bool, lost: bool = False) -> list:
    """D2 — a context variable by its resolved module-level name, a structlog binder by keyword. A set with no reset says
    ``unknown``: nothing in the source says it leaks, or that it dies with the task."""
    groups: dict = {}
    for i, st, s in sites:
        if s["k"] == "cv":
            groups.setdefault((0, s["var"][1], s["var"][0]), []).append((i, st, s))
        elif s["k"] == "bind" and s["op"] in ("set", "scoped"):
            for nm in s["names"]:
                groups.setdefault((1, nm, ""), []).append((i, st, s))
    out = []
    for (bound, name, rel), hits in sorted(groups.items()):
        sets = [h for h in hits if h[2].get("op") in ("set", "scoped")]
        gets = [h for h in hits if h[2].get("op") == "get"]
        if not sets and not gets:
            continue
        i, st, s = (sets or gets)[0]
        row = {"kind": "contextvar", "name": name}
        row.update({"through": "structlog"} if bound else {"var": f"{rel}::{name}", "label": s["var"][2]})
        reset = (s.get("resets") or {}).get(name) if bound else s.get("reset")      # a binder's reset is per NAME — unbind("job") puts back job only
        if not sets:
            rule = "cv-dep-unresolved" if lost else "cv-get-only"
        elif s.get("op") == "scoped" and s.get("item"):
            rule = "cv-scoped"
        elif reset:
            rule, row["reset_at"] = "cv-reset", f"{s['rel']}:{reset}"
        else:
            rule = "cv-no-reset"
        out.append(((i,) + s["pos"], _ruled(_placed(repo, MW, v, row, sets, gets, "state"), rule, open_)))
    return out


def _bg_rows(repo: Path, walked: list, sites: list, open_: bool) -> list:
    """D4 — every ``<tasks>.add_task(f, …)`` in scope; a BackgroundTasks parameter nothing in scope queues on still says so.
    When the task ends cannot be read from source, and nothing here says a context variable is still set inside it."""
    out, queued = [], set()
    for i, st, s in sites:
        if s["k"] != "bg":
            continue
        queued.add((i, s.get("param")))
        r = P._resolve(repo, s["m"], s["task"].id, at=s["task"]) if isinstance(s["task"], ast.Name) else None
        row = {"kind": "background", "name": P._unp(s["task"], 120), "param": s.get("param")}
        if r and r[1] in r[0].defs:
            row["task"] = f"{r[0].rel}::{r[1]}"
        row.update({"args": s["args"], "after_answer": True, "queues": "found", **_set(st, s), **_capped([])})
        out.append(((i,) + s["pos"], _ruled(row, "after-the-answer", open_)))
    for i, st in walked:
        own = RD._census(repo, st["m"], st["node"], st["qual"], st["role"] == "middleware")
        for p in own["bg_params"]:
            if (i, p) in queued:
                continue
            passed = next((x for x in own["passes"] if x["param"] == p), None)
            row = {"kind": "background", "name": p, "param": p, "after_answer": True, "queues": "beyond one level" if passed else "none in scope"}
            if passed:
                row["passed_at"] = f"{st['m'].rel}:{passed['line']}"
            row.update({**_set(None, None), **_capped([])})
            out.append(((i, st["node"].lineno, 0, st["node"].lineno, 0), _ruled(row, "after-the-answer", open_)))
    return out


def _lock_rows(sites: list, open_: bool) -> list:
    """D5 — a lock TAKEN in scope. A pool checkout is no lock, a lock object is no lock taken, and a release nobody saw is
    never claimed: a database lock says ``unknown`` and when its transaction ends."""
    out = []
    for i, st, s in sites:
        if s["k"] != "lock":
            continue
        row = {"kind": "lock", "name": s["name"], "call": s["call"], "held": s["held"], **_set(st, s), **_capped([])}
        if s["shape"] == "tx":
            rule, row["released"] = "lock-transaction", "when its transaction ends"
        elif s["shape"] == "with":
            rule = "lock-with-block"
        elif s.get("released"):
            rule, row["released_at"] = "lock-released", f"{s['rel']}:{s['released']}"
        else:
            rule = "lock-open"
        out.append(((i,) + s["pos"], _ruled(row, rule, open_)))
    return out


def _param_deps(repo: Path, m, fn) -> list[tuple]:
    """``(parameter, annotation, dependency expression, factory callee, declaring file)`` for each parameter that names one —
    a ``Depends()`` default, an ``Annotated[…, Depends()]``, a module alias. ``_a3_forms_mw._dep_params`` is not edited."""
    a, out = fn.args, []
    pos = list(a.posonlyargs) + list(a.args)
    dflt = dict(zip([p.arg for p in pos[len(pos) - len(a.defaults):]], a.defaults))
    dflt.update({p.arg: d for p, d in zip(a.kwonlyargs, a.kw_defaults) if d is not None})
    aliases, meta = C._dep_aliases(repo, m.rel, m.tree), C._dep_alias_meta(m.rel)
    for p in pos + list(a.kwonlyargs):
        d, ann = dflt.get(p.arg), p.annotation
        name, callee, decl = (C._depends_target(d), C._depends_callee(d), None) if d is not None else (None, None, None)
        if not name and ann is not None:
            inner = C._annotated_depends(ann)
            if inner:
                name = inner[0]
            elif isinstance(ann, ast.Name) and aliases.get(ann.id):
                am = meta.get(ann.id) or {}
                name, decl = aliases[ann.id][0], am.get("decl")
                callee = (am.get("callees") or {}).get(name)
        if name:
            out.append((p.arg, ann, name, callee, decl))
    return out


def _base(repo: Path, m, ann):
    """The type an annotation names, through ``Annotated[T, …]`` and a module alias of one (``CurrentCtx = Annotated[Ctx, …]``)."""
    if isinstance(ann, ast.Name):
        r = P._resolve(repo, m, ann.id)
        ann = r[0].assigns[r[1]] if r and r[1] in r[0].assigns else ann
    if isinstance(ann, ast.Subscript) and P._leaf(ann.value) == "Annotated":
        ann = ann.slice.elts[0] if isinstance(ann.slice, ast.Tuple) and ann.slice.elts else ann.slice
    return ann


def _module_object(repo: Path, nm, node) -> bool:
    """Every ``return`` of the callee is a bare name that resolves to a module-level assignment — an object built at import."""
    local = set(RD._params(node)) | {n.id for n, *_ in RD._visit(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
    rets = [n.value for n, *_ in RD._visit(node) if isinstance(n, ast.Return) and n.value is not None]

    def built_at_import(v) -> bool:
        r = P._resolve(repo, nm, v.id) if isinstance(v, ast.Name) and v.id not in local else None
        return bool(r) and r[1] in r[0].assigns

    return bool(rets) and all(built_at_import(v) for v in rets)


def _dep_rows(repo: Path, forms: dict, m, fn, stations: list, caches: dict, open_: bool) -> list:
    """D3 — what a dependency hands the handler (the handler's own parameters only). A cached callee or a module-level object
    is process-scoped and says so (the two shapes D31 names); a generator is torn down with the request; else it is solved
    per request. An unresolved dependency makes no row, and a parameter FastAPI injects by type is never one."""
    out = []
    hid, hi = stations[-1]["fid"], len(stations) - 1
    loads = RD._census(repo, m, fn, stations[-1]["qual"])["loads"]
    for param, ann, name, callee, decl in _param_deps(repo, m, fn):
        r = P._dep_target(repo, m, callee or name, decl)
        if not r or P._leaf(_base(repo, m, ann)) in F.INJECTED_TYPES:
            continue
        rm, qual = r
        fid = f"{rm.rel}::{qual}"
        dform = (forms.get("dependencies") or {}).get(fid) or {}
        i, st = next(((i, x) for i, x in enumerate(stations) if x["role"] == "dependency" and x["by"] == fid), (hi, None))
        if st is None or (st["node"] is None and (dform.get("kind") != "security" and st.get("kind") != "class" or st.get("called"))):
            continue                                           # nothing FastAPI calls could be read: no claim
        node = st["node"]
        teardown = any(isinstance(n, (ast.Yield, ast.YieldFrom)) for n, *_ in RD._visit(node)) if node is not None else bool(dform.get("teardown"))
        row = {"kind": "dependency-value", "name": param, "param": param, "type": P._unp(_base(repo, m, ann), 120) if ann is not None else None,
               "dependency": fid, "teardown": teardown}
        if st.get("cached"):
            rule, row["ref"] = "dep-cached", _cache_row(caches, st["m"], node, st["fid"], st["cached"], True)
        elif node is not None and st.get("kind") == "function" and _module_object(repo, st["m"], node):
            rule = "dep-module-object"
        else:
            rule = "dep-teardown" if teardown else "dep-solved"
        at = f"{st['m'].rel}:{node.lineno}" if node is not None else dform.get("at") or "unknown"
        row.update({"set_at": at, "set_by": fid, "set_in": "dependency"})
        row.update(_capped([{"at": f"{m.rel}:{ln}", "fn": hid, "in": "handler"} for p, ln in loads if p == param]))
        line = node.lineno if node is not None else 0
        out.append(((i, line, 0, line, 0), _ruled(row, rule, open_)))
    return out


def _cache_row(caches: dict, cm, node, fid: str, cached: tuple, as_dep: bool = False) -> str:
    """D8 — the top-level row of a cached function a station meets, made once; returns its process key."""
    key = f"cache:{fid}"
    if key not in caches:
        row = {"kind": "cache", "name": fid.partition("::")[2], "fn": fid, "decorator": cached[0], "maxsize": cached[1],
               "set_at": f"{cm.rel}:{node.lineno}", "set_by": fid, "set_in": "unknown"}
        caches[key] = {**_ruled(row, "functools-cache", True), "_reads": []}
    if as_dep:
        caches[key]["as_dependency"] = True
    return key


def _ref(row: dict, key: str, entries: list) -> dict:
    """The SHORT row an endpoint carries for a process-scoped thing it meets: ``kind`` · ``name`` · the ``ref`` and this
    endpoint's own reads (the caller adds ``applies: false``). Its scope, lifetime, rule and where it is set are said ONCE, on
    the ``process`` row the ``ref`` names — a dependency-value row is the endpoint's own fact and stays whole."""
    return {"kind": row["kind"], "name": row["name"], "ref": key,
            **_capped([{k: v for k, v in e.items() if k in ("at", "fn", "in", "via")} for e in entries])}


def _endpoint(repo: Path, forms: dict, MW, v: dict, m, fn, dec, mws: list, process: dict, caches: dict, unread: set, lost: set) -> list:
    fp = v.get("full_path") or ""
    open_ = _gate(repo, m.rel)[0]
    stations, hq, mine = list(mws), FN._qual(m, fn), []
    _dep_stations(repo, MW, m, fn, dec, {"at": f"{m.rel}:{fn.lineno}", "fn": f"{m.rel}::{hq}", "in": "handler"}, set(), stations, unread, mine)
    lost.update(mine)
    stations.append({"role": "handler", "by": f"{m.rel}::{hq}", "m": m, "node": fn, "qual": hq, "fid": f"{m.rel}::{hq}"})
    walked = [(i, st) for i, st in enumerate(stations) if st.get("node") is not None and not st.get("cached")]
    sites = [(i, st, dict(s, cond=True) if st.get("cond") else s) for i, st in walked for s in _sites(repo, st)]     # a station only one arm reaches
    rows = (_state_rows(repo, MW, v, sites, open_, bool(mine)) + _cv_rows(repo, MW, v, sites, open_, bool(mine))     # an unresolved dependency: a write may sit behind it
            + _bg_rows(repo, walked, sites, open_) + _lock_rows(sites, open_))
    deps = _dep_rows(repo, forms, m, fn, stations, caches, open_) if F.OPTIONS.get("inflight_dep_values", True) else []
    rows += deps
    for i, st in enumerate(mws):                               # process refs: what this endpoint's path meets of a middleware's init rows
        for key, row in process.items():
            if row.get("set_by") != f"{st['m'].rel}::{st['cls']}.__init__":
                continue
            met = [e for e in row["_reads"] if e["scope"] == "all" or any(fp.startswith(p) for p in e["scope"])]
            if met:
                ref = _ref(row, key, met)
                if _exempt(MW, st, met[0]["_line"], fp):
                    ref["applies"] = False
                rows.append(((i, met[0]["_line"], 0, met[0]["_line"], 0), ref))
    handed = {r["ref"] for _, r in deps if r.get("ref")}
    meets: dict = {}
    for i, st in enumerate(stations):                          # D8: a cached function met as a dependency, or called in scope
        if st.get("cached") and st.get("node") is not None:
            key = _cache_row(caches, st["m"], st["node"], st["fid"], st["cached"], True)
            meets.setdefault(key, []).append(((i, st["node"].lineno, 0, st["node"].lineno, 0), st["asker"]))     # met where its asker is declared
    for i, st, s in sites:
        if s["k"] == "cache":
            key = _cache_row(caches, s["cm"], s["node"], s["cache"], RD._cached(s["node"]))
            meets.setdefault(key, []).append(((i,) + s["pos"], _entry(st, s)))
    for key in sorted(meets):
        entries = [e for _, e in sorted(meets[key], key=lambda x: x[0])]
        caches[key]["_reads"] += entries
        if key not in handed:                                  # PRECEDENCE: a cached dependency is ONE dependency-value row with `ref`
            rows.append((min(p for p, _ in meets[key]), _ref(caches[key], key, entries)))
    return [r for _, r in sorted(rows, key=lambda x: (x[0], x[1]["kind"], x[1]["name"]))]


def _by_site(named: str) -> tuple:
    """Sort key: file, line, then the whole entry — two entries on one line never fall to a set's hash order."""
    f, _, ln = named.partition(" ")[0].rpartition(":")
    return (f, int(ln), named) if ln.isdigit() else (named, 0, named)


def inflight_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, list, dict]:
    """The ``inflight`` part: writes every endpoint's ``inflight[]`` itself and returns the top-level ``{process, rules}``."""
    import _a3_forms_mw as MW                                  # lazy: `_a3_forms_mw` imports this module at column 0
    if F.OPTIONS.get("inflight_scope", "one-level") != "one-level":
        raise Refused(f"inflight_scope={F.OPTIONS['inflight_scope']!r}: only 'one-level' is built")
    _MEMO.clear()
    mws = _mw_stations(repo, forms)
    process: dict = {}
    for st in mws:
        process.update(_init_rows(repo, st))
    caches: dict = {}
    unread: set = set()
    lost: set = set()
    stats = {"endpoints": 0, "rows": 0, "by_kind": {k: 0 for k in KINDS}, "by_dies": {d: 0 for d in DIES}, "by_rule": {}, "process": 0,
             "names": {}, "caches_deeper": 0, "reach_truncated": 0, "unplaced_middleware": 0, "unplaced_middleware_at": [], "factories_unread": 0, "deps_unresolved": 0,
             "deps_unresolved_at": [], "framework_gate": "open"}
    gates, applies = set(), {}
    for key, v, m, fn, dec in MW._handlers(repo, forms):
        rows = _endpoint(repo, forms, MW, v, m, fn, dec, mws, process, caches, unread, lost)
        v["inflight"] = rows
        stats["endpoints"] += 1
        gates.add(_gate(repo, m.rel)[1])
        for r in rows:
            said = r if "rule" in r else process.get(r["ref"]) or caches[r["ref"]]      # a short ref row: its lifetime and rule are the process row's
            stats["rows"] += 1
            stats["by_kind"][r["kind"]] += 1
            stats["by_dies"][said["dies"]] += 1
            stats["by_rule"][said["rule"]] = stats["by_rule"].get(said["rule"], 0) + 1
            if r.get("ref") and r.get("applies") is not False:
                applies.setdefault(r["ref"], set()).add(key)
            if r["kind"] in ("state", "contextvar"):
                n = stats["names"].setdefault(f"{r['kind']}:{r['name']}", {"set_on": 0, "read_on": 0})
                n["set_on"] += r["set_at"] != "unknown"
                n["read_on"] += r["reads"] == "found"
    block: dict = {}
    for key, row in sorted({**process, **caches}.items()):
        entries = row.pop("_reads")
        if row["kind"] == "cache":                             # every site some endpoint met it at, each once, by file and line
            entries = sorted({e["at"]: e for e in reversed(entries)}.values(), key=lambda e: (e["at"].rpartition(":")[0], int(e["at"].rpartition(":")[2])))
        block[key] = {**row, **_capped([{k: x for k, x in e.items() if k != "_line"} for e in entries]), "applies_to": len(applies.get(key, ()))}
    used = sorted({r[k] for e in (forms.get("endpoints") or {}).values() for v in (e.get("variants") or [e]) for r in v.get("inflight") or []
                   for k in ("rule", "would_be") if r.get(k)} | {r[k] for r in block.values() for k in ("rule", "would_be") if r.get(k)})
    rules = {rid: {"scope": RULES[rid]["scope"], "dies": RULES[rid]["dies"], "says": RULES[rid]["says"], "source": RULES[rid].get("source")} for rid in used}
    seeds, _, handlers = FN.roots(repo, forms, amap)
    deps = set(forms.get("dependencies") or {})
    got = R.bfs(repo, [(rm, q) for rm, q in seeds if f"{rm.rel}::{q}" in handlers or f"{rm.rel}::{q}" in deps])
    deeper = [fid for fid in sorted(got["reached"]) if f"cache:{fid}" not in block and RD._cached(FN._def(repo, *fid.split("::", 1))[1])]
    mw_rows = sorted(amap.get("app_middleware") or [], key=lambda x: (x.get("order", 0), x.get("file") or "", x.get("line") or 0))
    unknown = [key for key, e in (forms.get("middleware") or {}).items() for f in (e.get("variants") or [e]) if f.get("kind") == "unknown"]
    unplaced = sorted(set(MW._unscanned(repo, forms, mw_rows)) | set(RD._fn_middleware(repo)), key=_by_site) + unknown     # no station walks any of them
    closed = sorted(g for g in gates if g != "open")
    stats.update({"by_rule": dict(sorted(stats["by_rule"].items())), "names": dict(sorted(stats["names"].items())), "process": len(block),
                  "caches_deeper": len(deeper), "reach_truncated": got["truncated"], "unplaced_middleware": len(unplaced), "unplaced_middleware_at": unplaced[:IN["unplaced_cap"]],
                  "factories_unread": len(unread), "deps_unresolved": len(lost), "deps_unresolved_at": sorted(lost, key=_by_site)[:IN["unplaced_cap"]], "framework_gate": closed[0] if closed else "open"})
    return {"process": block, "rules": rules}, [], stats
