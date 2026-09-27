"""Element forms — the shared REACH walk (amendment 1): which project functions a root reaches, level by level.

Rows stay at plan D6 (a handler, one call level, the dependency chain); discovery reads deeper — to
``_a3_forms.OPTIONS["reach_depth"]`` — because a walk that never mints a row cannot inflate a refusal (D17). The walk
resolves a call the way ``_a3_paths._callee`` does and adds ``self.m()`` → ``Class.m`` inside a method. The adopted
center's own vendored generators (``_a3_graft._is_center``: ``docs/site/``, ``templates/center/``, a flat
``scripts/<generator>``) are never walked — tier3 carries a vendored ``scripts/_a3_code.py``. ``bfs`` keeps ONE route
per (function, root); ``routes`` keeps one per ROOT SITE, so a function reached through several of the root's own calls
keeps them all (D-060).
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_forms as F
import _a3_graft as G
import _a3_paths as P

_CALLEES: dict[int, tuple | None] = {}


def reset_caches() -> None:
    _CALLEES.clear()


def callee(repo: Path, m, qual: str, fn, call):
    """The project function a call resolves to, as ``(module, qual)``, or None. Memoised per call node."""
    k = id(call)
    if k in _CALLEES:
        return _CALLEES[k]
    r = P._callee(repo, m, fn, call)
    f = call.func
    if r is None and isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == "self" and "." in qual:
        q = f"{qual.split('.')[0]}.{f.attr}"
        if q in m.defs:
            r = (m, q)
    _CALLEES[k] = r
    return r


def bfs(repo, roots, depth: int | None = None) -> dict:
    """``roots``: ``[(module, qual)]`` → ``{"reached": {fid: {root_fid: {"depth", "via", "site"}}}, "truncated": n}``.
    Level order; the first entry per ``(fid, root)`` wins, which is also the shortest; ties fall to the caller and
    call-site order the walk visits in (sorted). ``truncated`` counts calls that would have gone past ``depth``."""
    repo = Path(repo)
    depth = F.OPTIONS["reach_depth"] if depth is None else depth
    reached: dict[str, dict] = {}
    truncated = 0
    for rm, rq in sorted(roots, key=lambda r: (r[0].rel, r[1])):
        root = f"{rm.rel}::{rq}"
        seen = {root}
        frontier = [(rm, rq)]
        for d in range(depth + 1):
            nxt = []
            for m, q in sorted(frontier, key=lambda x: (x[0].rel, x[1])):
                node = m.defs.get(q)
                if node is None:
                    continue
                for e in sorted((e for e in P._events(node) if e["kind"] == "call"), key=lambda e: (e["line"], e["node"].col_offset)):
                    r = callee(repo, m, q, node, e["node"])
                    if r is None or G._is_center(r[0].rel):
                        continue
                    fid = f"{r[0].rel}::{r[1]}"
                    if fid in seen:
                        continue
                    if d + 1 > depth:
                        truncated += 1
                        continue
                    seen.add(fid)
                    reached.setdefault(fid, {})[root] = {"depth": d + 1, "via": f"{m.rel}::{q}", "site": f"{m.rel}:{e['line']}"}
                    nxt.append(r)
            frontier = nxt
            if not frontier:
                break
    return {"reached": reached, "truncated": truncated}


def _project_calls(repo: Path, m, q: str, node):
    """The calls of ``node`` that resolve to a project function (never the vendored center's), in line then column order —
    ``bfs``'s own order."""
    for e in sorted((e for e in P._events(node) if e["kind"] == "call"), key=lambda e: (e["line"], e["node"].col_offset)):
        r = callee(repo, m, q, node, e["node"])
        if r is not None and not G._is_center(r[0].rel):
            yield e, r


def routes(repo, roots, depth: int | None = None) -> dict:
    """``roots`` as ``bfs`` → ``{fid: {root_fid: {root_site: {"depth", "via", "site", "hops"}}}}`` (D-060): the same
    level-order walk, run once per ROOT SITE — each line of the root that calls a project function — so a function the
    root reaches through several of its own calls keeps every one. Per site the first entry wins, as in ``bfs``; the root
    is never re-entered; ``hops`` is ``((site, callee fid), …)`` from the root's own call to ``fid``, the witness
    ``_a3_forms_fn`` re-proves before a route is listed. ``bfs``'s route per root is one of these, at the same depth
    (``_a3_forms_fn`` counts it when it is not); truncation is ``bfs``'s count alone."""
    repo = Path(repo)
    depth = F.OPTIONS["reach_depth"] if depth is None else depth
    out: dict[str, dict] = {}
    for rm, rq in sorted(roots, key=lambda r: (r[0].rel, r[1])) if depth >= 1 else []:
        root = f"{rm.rel}::{rq}"
        node = rm.defs.get(rq)
        if node is None:
            continue
        by_line: dict[int, list] = {}
        for e, r in _project_calls(repo, rm, rq, node):
            by_line.setdefault(e["line"], []).append(r)
        for line, firsts in sorted(by_line.items()):
            site0 = f"{rm.rel}:{line}"
            seen, frontier = {root}, []
            for r in firsts:
                fid = f"{r[0].rel}::{r[1]}"
                if fid in seen:
                    continue
                seen.add(fid)
                hops = ((site0, fid),)
                out.setdefault(fid, {}).setdefault(root, {})[site0] = {"depth": 1, "via": root, "site": site0, "hops": hops}
                frontier.append((r, hops))
            for d in range(1, depth):
                nxt = []
                for (m, q), hops in sorted(frontier, key=lambda x: (x[0][0].rel, x[0][1])):
                    nd = m.defs.get(q)
                    if nd is None:
                        continue
                    for e, r in _project_calls(repo, m, q, nd):
                        fid = f"{r[0].rel}::{r[1]}"
                        if fid in seen:
                            continue
                        seen.add(fid)
                        s = f"{m.rel}:{e['line']}"
                        h = hops + ((s, fid),)
                        out.setdefault(fid, {}).setdefault(root, {})[site0] = {"depth": d + 1, "via": f"{m.rel}::{q}", "site": s, "hops": h}
                        nxt.append((r, h))
                frontier = nxt
                if not frontier:
                    break
    return out
