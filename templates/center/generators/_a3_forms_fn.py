"""Element forms — FUNCTION forms: the kinds arm's ``functions`` part (amendment 1 §A2 Slice 8 · B-fn, service K2 folded in).

A function form is what one reached function decides for the requests that reach it: the classes it raises and where
each one ends — translated by an endpoint (``translated_by``), left to the 500 (``untranslated_at``), or deeper than the
one call level the endpoint pass reads (``translation: "beyond one level"``) — the refusals it raises itself and the
endpoints they surface on, the commits it makes (Slice 6 ``st:`` ids), its savepoints and the broad catches that
swallow. Functions are reached from every root the map knows — endpoint handlers, their dependencies (the kinds
``dependencies`` forms), task roots and event handlers — by ``_a3_forms_reach.bfs``; ``reached_by`` names each root with
its depth and the call site inside the root the walk left it through. A root may reach the function through SEVERAL of
its own calls (D-060): ``_a3_forms_reach.routes`` finds one route per root site, each is re-proved hop by hop from the
source (``_proved``) before it counts, an entry with two or more lists them as ``routes`` in request order, and for an
endpoint root ``paths`` is the union of the paths whose chain calls through a proved route's root site — a path is
listed only through a route it passes. A function no fact attaches to gets no form (``OPTIONS.function_scope: facts``).
Imports no arm.
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_forms as F
import _a3_forms_catch as CA
import _a3_forms_reach as R
import _a3_paths as P


def _handlers(repo: Path, forms: dict):
    for key in sorted(forms.get("endpoints") or {}):
        e = forms["endpoints"][key]
        for v in e.get("variants") or [e]:
            file, _, name = str(v.get("handler") or "").partition("::")
            m = P._mod(repo, file) if file else None
            if m is None or not name:
                continue
            fn, _dec = P._find_handler(m, {"fn": name, "method": v.get("method"), "path": v.get("path")})
            if fn is not None:
                yield key, v, m, fn


def _qual(m, node) -> str:
    return next((q for q, n in m.defs.items() if n is node), node.name)


def _def(repo: Path, rel: str, qual: str):
    m = P._mod(repo, rel) if rel else None
    return (m, m.defs[qual]) if m is not None and qual in m.defs else (None, None)


def roots(repo: Path, forms: dict, amap: dict) -> tuple[list, dict, dict]:
    """``(seeds [(module, qual)], names {fid: [root name]}, endpoint handlers {fid: [(key, variant)]})`` — endpoint handlers
    (named by endpoint key), dependency functions, task roots (``endpoint:TASK <name>``) and event handlers (their fid)."""
    seeds, names, handlers = [], {}, {}

    def add(m, q: str, name: str) -> str:
        fid = f"{m.rel}::{q}"
        if fid not in names:
            seeds.append((m, q))
            names[fid] = []
        if name not in names[fid]:
            names[fid].append(name)
        return fid

    for key, v, m, fn in _handlers(repo, forms):
        handlers.setdefault(add(m, _qual(m, fn), key), []).append((key, v))
    for fid in sorted(forms.get("dependencies") or {}):
        rel, _, q = fid.partition("::")
        m, node = _def(repo, rel, q)
        if node is not None:
            add(m, q, fid)
    for t in amap.get("task_roots") or []:
        m, node = _def(repo, t.get("file"), t.get("fn"))
        if node is not None:
            add(m, t["fn"], f"endpoint:TASK {t.get('path')}")
    for d in (amap.get("dispatch") or {}).get("dispatches") or []:
        rel, _, q = str(d.get("t") or "").partition("#")
        m, node = _def(repo, rel, q)
        if node is not None:
            add(m, q, f"{rel}::{q}")
    return seeds, names, handlers


def _root_site(reached: dict, fid: str, root: str) -> str | None:
    """The call site inside ``root`` that the walk to ``fid`` left the root through."""
    seen = set()
    while fid not in seen:
        seen.add(fid)
        e = (reached.get(fid) or {}).get(root)
        if e is None:
            return None
        if e["via"] == root:
            return e["site"]
        fid = e["via"]
    return None


def _proved(repo: Path, root: str, fid: str, hops) -> bool:
    """A route stands only when every hop re-reads from the source: the function the previous hop entered holds, on the
    hop's line, a call the resolver takes to the hop's callee; the last callee is ``fid``; the root is never re-entered;
    at most ``reach_depth`` hops."""
    if not hops or len(hops) > F.OPTIONS["reach_depth"]:
        return False
    cur = root
    for s, nxt in hops:
        rel, _, q = cur.partition("::")
        m, node = _def(repo, rel, q)
        srel, _, ln = s.rpartition(":")
        if node is None or srel != rel or nxt == root or not ln.isdigit():
            return False
        if not any(e["kind"] == "call" and e["line"] == int(ln) and (r := R.callee(repo, m, q, node, e["node"])) is not None
                   and f"{r[0].rel}::{r[1]}" == nxt for e in P._events(node)):
            return False
        cur = nxt
    return cur == fid


def _passing(plist: list, site: str) -> list[str]:
    """The paths whose chain calls through the root's line ``site`` (a ``call`` or ``collapsed`` step at it)."""
    return sorted(p["id"] for p in plist if any(c.get("kind") in ("call", "collapsed") and c.get("at") == site for c in p.get("chain") or []))


def _swallows(repo: Path, m, node) -> list[dict]:
    """Every broad handler (bare, ``Exception``, ``BaseException``) that returns normally — one that calls a retry method
    (``RETRY_CALLS``, which raises) does not."""
    hev: dict = {}
    for e in P._events(node):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
    out = []
    for t in (n for n in ast.walk(node) if isinstance(n, P._TRY)):
        for h in t.handlers:
            types = P._handler_types(h)
            retries = any(isinstance(n, ast.Call) and P._leaf(n.func) in F.RETRY_CALLS for n in ast.walk(h))   # Celery's retry raises
            if (types is None or types & {"Exception", "BaseException"}) and CA.classify(h, hev) == "swallow" and not retries:
                out.append({"at": f"{m.rel}:{h.lineno}", "types": sorted(types or {"*"}), "try": f"{m.rel}:{t.lineno}"})
    return sorted(out, key=lambda x: int(x["at"].rpartition(":")[2]))


def _raises(repo: Path, m, node, rows_by_raise: dict, escapes_by_at: dict, climbs_one: bool, by_endpoint: bool,
            late_by_at: dict | None = None) -> list[dict]:
    hev: dict = {}
    events = {}
    for e in P._events(node):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)
        if e["kind"] == "raise":
            events.setdefault(e["line"], e)
    out = []
    for x in P._analyse(repo, m, node)["escapes"]:
        row = {"cls": x["cls"], "at": x["at"], **({"msg": x["msg"]} if x.get("msg") else {}), **({"pred": x["pred"]} if x.get("pred") else {})}
        ev = events.get(int(x["at"].rpartition(":")[2]))
        through = [t for t in CA.trail(x["cls"], P._bases(repo, m, x["cls"], at=x["at"]), ev["tries"], hev) if t["op"] != "escape"] if ev else []
        if through:
            row["through"] = [{"at": f"{m.rel}:{t['handler']}", "types": t["types"], "op": t["op"]} for t in through]
        row["translated_by"] = rows_by_raise.get(x["at"], [])
        row["untranslated_at"] = escapes_by_at.get((x["cls"], x["at"]), [])
        late = (late_by_at or {}).get((x["cls"], x["at"]), [])
        if late and not row["translated_by"] and not row["untranslated_at"]:
            row["after_response"] = late                     # §A4 V18: the stream had started; no status can carry it
            row["translation"] = "after the response line"
        elif row["translated_by"] or row["untranslated_at"]:
            row["translation"] = "untranslated" if not row["translated_by"] else ("mixed" if row["untranslated_at"] else "translated")
        else:
            row["translation"] = ("not reached by an endpoint" if not by_endpoint else "beyond one level" if not climbs_one else "not joined")
        out.append(row)
    return out


def functions_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, list, dict]:
    """``(functions{fid: form}, findings, stats)``."""
    repo = Path(repo)
    seeds, names, handlers = roots(repo, forms, amap)
    walk = R.bfs(repo, seeds)
    reached = walk["reached"]
    every = R.routes(repo, seeds)
    fids = sorted(set(reached) | set(names))
    produced = [(key, v, r) for key, e in sorted((forms.get("endpoints") or {}).items()) for v in (e.get("variants") or [e]) for r in v.get("produced") or []]
    rows_by_raise: dict = {}
    rows_by_at: dict = {}
    for key, v, r in produced:
        if r.get("raised_at") and r.get("source") == "verified":
            rows_by_raise.setdefault(r["raised_at"], []).append({"endpoint": key, "exit": r.get("id"), "status": r.get("status"), "at": r.get("at")})
        if r.get("at") and r.get("phase") in ("handler", "dependency"):
            rows_by_at.setdefault(r["at"], []).append({"endpoint": key, "exit": r.get("id"), "status": r.get("status")})
    escapes_by_at: dict = {}
    late_by_at: dict = {}
    for key, e in sorted((forms.get("endpoints") or {}).items()):
        for v in e.get("variants") or [e]:
            unc = next((r for r in v.get("produced") or [] if r.get("phase") == "uncaught"), None)
            for cause in (unc or {}).get("causes") or []:
                cls, _, at = str(cause).partition(" ")
                escapes_by_at.setdefault((cls, at), []).append({"endpoint": key, "exit": (unc or {}).get("id"), "status": 500})
            for x in (unc or {}).get("after_response") or []:   # §A4 V18: raised while streaming — the two arms agree
                late_by_at.setdefault((x["cls"], x["at"]), []).append({"endpoint": key, "via": x.get("via")})
    commits: dict = {}
    for sid, s in sorted((forms.get("steps") or {}).items()):
        if s.get("op") == "commit":
            commits.setdefault(s["fn"], []).append(sid)
    out, found = {}, []
    stats = {"roots": len(names), "reached": len(fids), "pairs": 0, "truncated": walk["truncated"], "forms": 0,
             "raises": 0, "translation": {}, "refusals": 0, "swallows": 0, "routes": 0, "multi_route_pairs": 0, "routes_unproven": 0}
    for fid in fids:
        rel, _, q = fid.partition("::")
        m, node = _def(repo, rel, q)
        if node is None or not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        by = []
        for name in names.get(fid, []):
            by.append({"root": name, "depth": 0})
        for root, e in sorted((reached.get(fid) or {}).items()):
            site = _root_site(reached, fid, root)
            got = (every.get(fid) or {}).get(root) or {}
            rs = sorted(((s, r) for s, r in got.items() if _proved(repo, root, fid, r["hops"])), key=lambda x: int(x[0].rpartition(":")[2]))
            own = dict(rs).get(site)                  # the walk's own route must be one of the proved ones, at its depth
            stats["routes_unproven"] += len(got) - len(rs) + (own is None or own["depth"] != e["depth"])
            for name in names.get(root, [root]):
                entry = {"root": name, "depth": e["depth"], "via": e["via"], "site": e["site"], "root_site": site}
                per = {}
                if root in handlers and site:
                    plist = [p for key, v in handlers[root] if key == name for p in v.get("paths") or []]
                    per = {s: _passing(plist, s) for s, _ in rs}
                    entry["paths"] = sorted({p for ids in per.values() for p in ids})
                if len(rs) > 1:                          # D-060: every root site that reaches fid, in request order
                    entry["routes"] = [{"root_site": s, "depth": r["depth"], "via": r["via"], "site": r["site"],
                                        **({"paths": per[s]} if per else {})} for s, r in rs]
                stats["routes"] += len(rs)
                stats["multi_route_pairs"] += len(rs) > 1
                by.append(entry)
        stats["pairs"] += sum(1 for b in by if b["depth"] > 0)
        endpoint_depths = [b["depth"] for b in by if str(b["root"]).startswith("endpoint:") and not str(b["root"]).startswith("endpoint:TASK ")]
        climbs_one = F.OPTIONS.get("k2_climb", "one-level") != "one-level" or not endpoint_depths or min(endpoint_depths) <= 1
        raises = _raises(repo, m, node, rows_by_raise, escapes_by_at, climbs_one, bool(endpoint_depths), late_by_at)
        refusals = []
        for r in P._analyse(repo, m, node)["rows"]:
            hit = rows_by_at.get(r.get("at"), [])
            refusals.append({"status": r.get("status"), "at": r.get("at"), **({"pred": r["pred"]} if r.get("pred") else {}),
                             "surfaces_on": hit,              # §A4 V23: an empty list is not "nowhere" — say why
                             **({} if hit else {"surfaces": "beyond one level" if endpoint_depths else "not reached by an endpoint"})})
        swallows = _swallows(repo, m, node)
        savepoints = sorted({f"{m.rel}:{n.lineno}" for n in ast.walk(node) if isinstance(n, ast.Call) and P._leaf(n.func) == "begin_nested"},
                            key=lambda a: int(a.rpartition(":")[2]))
        facts = commits.get(fid) or raises or refusals or swallows or savepoints
        if not facts and F.OPTIONS.get("function_scope", "facts") == "facts":
            continue
        out[fid] = {"at": f"{m.rel}:{node.lineno}", "reached_by": by, "commits": commits.get(fid, []), "raises": raises,
                    "refusals": refusals, "swallows": swallows, "savepoints": savepoints}
        stats["forms"] += 1
        stats["raises"] += len(raises)
        stats["refusals"] += len(refusals)
        stats["swallows"] += len(swallows)
        for x in raises:
            stats["translation"][x["translation"]] = stats["translation"].get(x["translation"], 0) + 1
            if x["untranslated_at"]:
                found.append({"id": "untranslated-raise", "slot": F.FINDINGS["untranslated-raise"]["slot"], "fn": fid, "cls": x["cls"], "at": x["at"],
                              "endpoints": sorted({u["endpoint"] for u in x["untranslated_at"]})})
        for s in swallows:
            found.append({"id": "swallows-broad", "slot": F.FINDINGS["swallows-broad"]["slot"], "fn": fid, "at": s["at"]})
    return out, found, stats
