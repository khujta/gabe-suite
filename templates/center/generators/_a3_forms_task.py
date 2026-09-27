"""Element forms — TASK and HANDLER forms: the kinds arm's ``tasks`` and ``handlers`` parts (amendment 1 §A2 Slice 8 ·
B-task · B-evt).

A task form is how a background task runs when it is triggered: its decorator keywords (``TASK_KW`` — a literal, or
``{expr, state: unknown}``), its retry sites with their guards, the last-failure branch that compares ``retries`` with
``max_retries`` (its exit read from the ``if`` itself — ``break`` is an exit a loop body takes), its triggers (the
dispatch sites ``_a3_code.task_map`` joins by name, the beat entries whose ``task`` names it) and what bounds its
concurrency (keywords and lock calls). A retry with no ``max_retries`` and no last-failure branch is ``retry-unbounded``.

A handler form is how an event handler runs when its event is published: the publisher's publish site, the bus method
it calls, the registration that wires the handler (its order among that event's registrations), the isolation the
publish loop gives each handler (``begin_nested`` → ``savepoint``), the loop's catch and what it does (a swallow drops the
handler: ``handler-dropped``), ``retries: 0``, ``sequential`` unless the loop gathers, and the publisher's commits before
and after the publish site (Slice 6 steps). Imports no arm.
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_catch as CA
import _a3_forms_reach as R
import _a3_forms_settings as S
import _a3_paths as P


def _own(fn):
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        yield n
        todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda))]


def _exit(stmts) -> str | None:
    for s in stmts:
        if isinstance(s, ast.Break):
            return "break"
        if isinstance(s, ast.Return):
            return "return"
        if isinstance(s, ast.Raise):
            return "raise"
    return None


def _names_in(node) -> set:
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name)} | {n.attr for n in ast.walk(node) if isinstance(n, ast.Attribute)}


def _kw(repo: Path, m, node, consts: dict):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        val = S.resolve_const(repo, m, node.id)
        if val is not None:
            return val
    named = C._name_arg(node, consts)
    return named if named is not None else {"expr": P._unp(node, 120), "state": "unknown"}


def _line(at) -> int:
    return int(str(at).rpartition(":")[2] or 0)


# ── tasks ────────────────────────────────────────────────────────────────────────────────────────────
def _beats(trees: dict, consts: dict) -> tuple[dict, int, int]:
    """``({task name: [beat entry]}, joined, unjoined)`` — every dict literal with a ``task`` and a ``schedule`` key."""
    by, total = {}, 0
    for f, t in sorted(trees.items()):
        for n in ast.walk(t):
            if not isinstance(n, ast.Dict):
                continue
            keys = {k.value: v for k, v in zip(n.keys, n.values) if isinstance(k, ast.Constant) and isinstance(k.value, str)}
            if "task" not in keys or "schedule" not in keys:
                continue
            total += 1
            name = C._name_arg(keys["task"], consts)
            if name:
                by.setdefault(name, []).append({"kind": "beat", "at": f"{f}:{n.lineno}", "schedule": P._unp(keys["schedule"], 120)})
    return by, total, sum(len(v) for v in by.values())


def tasks_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, list, dict]:
    """``(tasks{"endpoint:TASK <name>": form}, findings, stats)``."""
    repo = Path(repo)
    tm = C.task_map(repo)
    recs = tm.get("tasks") or []
    trees = C._mapped_trees(repo) if recs else {}
    consts = C._str_constants(trees) if recs else {}
    beats, beat_total, beat_named = _beats(trees, consts) if recs else ({}, 0, 0)
    names = {r["name"] for r in recs}
    out, found = {}, []
    stats = {"tasks": 0, "retry_sites": 0, "last_failure": 0, "unbounded": 0, "dispatch_triggers": 0,
             "beat": {"entries": beat_total, "joined": sum(len(v) for k, v in beats.items() if k in names),
                      "unjoined": beat_total - sum(len(v) for k, v in beats.items() if k in names)},
             "unresolved_dispatch": list((tm.get("stats") or {}).get("unresolved") or [])}
    for r in recs:
        m = P._mod(repo, r["file"])
        node = m.defs.get(r["fn"]) if m is not None else None
        if node is None:
            continue
        dec = next((d for d in node.decorator_list if C._dec_name(d) in C._TASK_DECOS), None)
        keywords = {k.arg: _kw(repo, m, k.value, consts) for k in (dec.keywords if isinstance(dec, ast.Call) else []) if k.arg in F.TASK_KW}
        sites = [{"at": f"{m.rel}:{e['line']}", "call": P._unp(e["node"].func, 60), **{k: v for k, v in P._where(e).items() if not k.startswith("_")}}
                 for e in P._events(node) if e["kind"] == "call" and P._leaf(e["node"].func) in F.RETRY_CALLS]
        last = []
        for n in sorted((n for n in _own(node) if isinstance(n, ast.If)), key=lambda n: n.lineno):
            used = _names_in(n.test)
            if "retries" in used and "max_retries" in used:
                last.append({"at": f"{m.rel}:{n.lineno}", "guard": P._unp(n.test, 160), "exit": _exit(n.body)})
        tid = f"{r['file']}#{r['fn']}"
        triggers = [{"kind": "dispatch", "from": d["s"], "event": d.get("event")} for d in tm.get("dispatches") or [] if d.get("t") == tid]
        triggers += beats.get(r["name"], [])
        locks = [{"at": f"{m.rel}:{n.lineno}", "call": P._unp(n.func, 60)} for n in _own(node) if isinstance(n, ast.Call) and P._leaf(n.func) in F.LOCK_CALLS]
        bound = keywords.get("max_retries")
        form = {"task": r["name"], "fn": f"{r['file']}::{r['fn']}", "at": f"{r['file']}:{node.lineno}",
                "decorator": {"at": f"{r['file']}:{dec.lineno}" if dec is not None else None, "keywords": keywords},
                "retry": {"sites": sites, "max_retries": bound, "last_failure": last},
                "triggers": triggers,
                "concurrency": {**{k: keywords[k] for k in F.TASK_CONCURRENCY_KW if k in keywords}, "locks": locks}}
        out[f"endpoint:TASK {r['name']}"] = form
        stats["tasks"] += 1
        stats["retry_sites"] += len(sites)
        stats["last_failure"] += len(last)
        stats["dispatch_triggers"] += sum(1 for t in triggers if t["kind"] == "dispatch")
        if sites and (bound is None or isinstance(bound, dict)) and not last:
            stats["unbounded"] += 1
            found.append({"id": "retry-unbounded", "slot": F.FINDINGS["retry-unbounded"]["slot"], "task": f"endpoint:TASK {r['name']}",
                          "at": sites[0]["at"]})
    return dict(sorted(out.items())), found, stats


# ── handlers ─────────────────────────────────────────────────────────────────────────────────────────
def _registrations(repo: Path, trees: dict, event: str, t_rel: str, t_q: str) -> list[dict]:
    """``register*(Event, handler)`` calls whose handler name resolves — through a function-local or module import —
    to ``t_rel::t_q``, with the call's order among the event's registrations in the same function. Which import binds
    the name at the call is the scoped-import rule's (``_a3_paths_read._local_row``)."""
    out = []
    mod = t_rel[:-3].replace("/", ".")
    for f, t in sorted(trees.items()):
        module_imp = {a.asname or a.name: (n.module, a.name) for n in t.body if isinstance(n, ast.ImportFrom) for a in n.names}
        pm = P._mod(repo, f)
        for fn in (n for n in ast.walk(t) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))):
            calls = sorted((n for n in _own(fn) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in F.BUS_REGISTER
                            and len(n.args) >= 2 and P._leaf(n.args[0]) == event), key=lambda n: (n.lineno, n.col_offset))
            for i, n in enumerate(calls):
                hn = n.args[1].id if isinstance(n.args[1], ast.Name) else None
                row = P._local_row(pm, hn, n)
                src = ((row[3].module, row[4].name) if isinstance(row[3], ast.ImportFrom) else None) if row else module_imp.get(hn)
                hit = (src and src[1] == t_q and src[0] and (mod == src[0] or mod.endswith("." + src[0]))) or (hn == t_q and f == t_rel)
                if hit:
                    out.append({"at": f"{f}:{n.lineno}", "call": n.func.attr, "order": i, "of": len(calls)})
    return out


def _bus(repo: Path, bm, bq: str, bnode) -> dict:
    """The publish method's loop: the isolation, the catch around the handler call, retries and ordering."""
    hev: dict = {}
    for e in P._events(bnode):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
    out = {"fn": f"{bm.rel}::{bq}", "retries": 0,
           "execution": "concurrent" if any(isinstance(n, ast.Call) and P._leaf(n.func) in F.CONCURRENT_CALLS for n in _own(bnode)) else "sequential"}
    for loop in (n for n in _own(bnode) if isinstance(n, (ast.For, ast.AsyncFor))):
        for t in (n for n in ast.walk(loop) if isinstance(n, P._TRY)):
            nested = next((n for n in ast.walk(t) if isinstance(n, ast.Call) and P._leaf(n.func) == "begin_nested"), None)
            if nested is not None:
                out["isolation"] = {"kind": "savepoint", "at": f"{bm.rel}:{nested.lineno}"}
            for h in t.handlers:
                row = {"at": f"{bm.rel}:{h.lineno}", "types": sorted(P._handler_types(h) or {"*"}), "outcome": CA.classify(h, hev)}
                counter = next((n for n in ast.walk(h) if isinstance(n, ast.AugAssign)), None)
                if counter is not None:
                    row["counter"] = f"{bm.rel}:{counter.lineno}"
                out["catch"] = row
                break
            if "catch" in out:
                break
        if "catch" in out:
            break
    out.setdefault("isolation", None)
    out.setdefault("catch", None)
    return out


def _instance_method(repo: Path, m, call: ast.Call):
    """``bus.publish(…)`` where ``bus`` is a module-level instance (``bus = EventBus()``, maybe imported): the class method."""
    f = call.func
    if not (isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name)):
        return None
    r = P._resolve(repo, m, f.value.id, at=call)
    val = r[0].assigns.get(r[1]) if r else None
    if not (isinstance(val, ast.Call) and isinstance(val.func, ast.Name)):
        return None
    c = P._resolve(repo, r[0], val.func.id)
    q = f"{c[1]}.{f.attr}" if c and c[1] in c[0].classes else None
    return (c[0], q) if q and q in c[0].defs else None


def handlers_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, list, dict]:
    """``(handlers{handler fid: form}, findings, stats)`` from the archmap's ``dispatch`` edges."""
    repo = Path(repo)
    edges = (amap.get("dispatch") or {}).get("dispatches") or []
    trees = C._mapped_trees(repo) if edges else {}
    steps = forms.get("steps") or {}
    out, found = {}, []
    stats = {"handlers": 0, "dropped": 0, "unregistered": 0, "publish_unresolved": 0}
    for d in edges:
        s_rel, _, s_q = str(d.get("s") or "").partition("#")
        t_rel, _, t_q = str(d.get("t") or "").partition("#")
        sm = P._mod(repo, s_rel)
        snode = sm.defs.get(s_q) if sm is not None else None
        event = d.get("event")
        publish = None
        if snode is not None:
            publish = next((n for n in sorted(_own(snode), key=lambda n: (getattr(n, "lineno", 0), getattr(n, "col_offset", 0)))
                            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in F.BUS_PUBLISH
                            and event in {P._leaf(x) for a in n.args for x in ast.walk(a) if isinstance(x, (ast.Name, ast.Call, ast.Attribute))}), None)
        form = {"event": event, "handler": f"{t_rel}::{t_q}", "publisher": {"fn": f"{s_rel}::{s_q}", "at": f"{s_rel}:{publish.lineno}" if publish is not None else None}}
        bus = None
        if publish is not None:
            r = R.callee(repo, sm, s_q, snode, publish) or _instance_method(repo, sm, publish)
            if r and r[1] in r[0].defs:
                bus = _bus(repo, r[0], r[1], r[0].defs[r[1]])
        if bus is None:
            stats["publish_unresolved"] += 1
        form["bus"] = bus
        regs = _registrations(repo, trees, event, t_rel, t_q)
        form["registration"] = regs
        if not regs:
            stats["unregistered"] += 1
        form["retries"] = 0
        form["dropped"] = bool(bus and (bus.get("catch") or {}).get("outcome") == "swallow")
        if publish is not None:
            pub_commits = sorted({s["at"] for s in steps.values() if s.get("fn") == f"{s_rel}::{s_q}" and s.get("op") == "commit"}, key=_line)
            form["publisher_commits"] = {"before": [a for a in pub_commits if _line(a) < publish.lineno],
                                         "after": [a for a in pub_commits if _line(a) > publish.lineno]}
        if not regs:
            continue                                        # a dispatch edge no registration wires is no handler form
        out[f"{t_rel}::{t_q}"] = form
        stats["handlers"] += 1
        if form["dropped"]:
            stats["dropped"] += 1
            found.append({"id": "handler-dropped", "slot": F.FINDINGS["handler-dropped"]["slot"], "handler": f"{t_rel}::{t_q}",
                          "at": (bus.get("catch") or {}).get("at")})
    return dict(sorted(out.items())), found, stats
