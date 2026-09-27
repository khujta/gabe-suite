"""Element forms — the KINDS arm's middleware and dependency forms (amendment 1 §A2 Slice 3 · B-mw · B-dep).

A MIDDLEWARE form says where a class runs in the stack, what it refuses, on how many endpoints, and what lets a request
through untouched. A DEPENDENCY form says what a FastAPI dependency needs first (in parameter order), what it refuses
itself and what it inherits, what it commits — itself or one call down, before the handler or at teardown — whether it
tears down after the response, and how many endpoints run it. Both are top-level maps (``middleware{}`` keyed
``middleware:<Cls>``, ``dependencies{}`` keyed ``file::qual``) built from what the endpoint pass already reads. An exit an
endpoint row carries has that row's ``x:`` id; an exit no endpoint row carries is minted its own and says
``on_endpoints: false``. Findings land in ``arm_findings.kinds``: ``indistinct-exits`` (one builder answers several
refusals) and ``dependency-commits`` (a dependency commits before the handler runs).
"""
from __future__ import annotations

import ast
import json
from pathlib import Path

import _a3_forms_fn as FN  # the functions part (Slice 8)
import _a3_forms_inflight as IF  # the inflight part (Slice 12)
import _a3_forms_task as TK  # the tasks and handlers parts (Slice 8)
import _a3_code as C
import _a3_forms as F
import _a3_forms_ids as I
import _a3_forms_reach as R
import _a3_forms_settings as S
import _a3_paths as P

PARTS = ("middleware", "dependencies", "inflight", "functions", "tasks", "handlers")
_ROW_KEYS = ("phase", "status", "state", "form", "detail", "code", "at", "site", "scope", "pred", "when", "via", "source",
             "dep", "reason")
_APPS = frozenset({"FastAPI", "Starlette"})


def _own_nodes(fn):
    todo = list(ast.iter_child_nodes(fn))
    while todo:
        n = todo.pop()
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
            continue
        yield n
        todo.extend(ast.iter_child_nodes(n))


def _detail(r: dict) -> str:
    return json.dumps(r.get("detail"), sort_keys=True, ensure_ascii=False)


def _ids(forms: dict) -> dict:
    """The ``x:`` ids the endpoint rows already carry, by (site, at, status, detail) and by (at, status, detail)."""
    out: dict = {}
    for e in (forms.get("endpoints") or {}).values():
        for v in e.get("variants") or [e]:
            for r in v.get("produced") or []:
                if r.get("id"):
                    out.setdefault(("site", r.get("site"), r.get("at"), r.get("status"), _detail(r)), r["id"])
                    out.setdefault(("at", r.get("at"), r.get("status"), _detail(r)), r["id"])
    return out


def _row(r: dict) -> dict:
    return {k: (list(r[k]) if isinstance(r[k], list) else r[k]) for k in _ROW_KEYS if k in r}


def _exit(ids: dict, row: dict, fresh: list, **extra) -> dict:
    """One exit as a form carries it. It is matched to an endpoint row on its SITE when it has one — a sibling exit built
    by the same helper shares ``at``, never the site — else on ``at``; an exit no endpoint row carries is queued for
    :func:`_mint` and says ``on_endpoints: false``."""
    key = ("site", row.get("site")) if row.get("site") else ("at",)
    ident = ids.get(key + (row.get("at"), row.get("status"), _detail(row)))
    out = {"id": ident, **_row(row), **extra}
    out.setdefault("phase", "dependency")                    # §A4 V36: a dependency's own exit is in its phase
    if ident is None:
        out["on_endpoints"] = False
        fresh.append((out, row))
    return out


def _mint(repo: Path, forms: dict, fresh: list) -> None:
    """Ids for the exits no endpoint row carries: the ``x:`` tuple with its ordinal ranked AFTER every position that
    tuple already holds among the endpoint rows — a minted id never equals an endpoint row's, and two sites never share one."""
    if not fresh:
        return

    def key(r: dict, handler=None) -> str:
        return json.dumps(I.x_tuple(repo, r, handler), ensure_ascii=False)

    def pos(r: dict) -> tuple:
        return I._pos(r.get("site"), r.get("at"))

    want: dict[str, set] = {}
    for _, src in fresh:
        want.setdefault(key(src), set()).add(pos(src))
    held: dict[str, set] = {}
    for e in (forms.get("endpoints") or {}).values():
        for v in e.get("variants") or [e]:
            for r in v.get("produced") or []:
                k = key(r, v.get("handler") or e.get("handler"))
                if k in want:
                    held.setdefault(k, set()).add(pos(r))
    for out, src in fresh:
        k = key(src)
        out["id"] = I.ident("x", json.loads(k) + [len(held.get(k, ())) + sorted(want[k]).index(pos(src))])


def _handlers(repo: Path, forms: dict):
    for key in sorted(forms.get("endpoints") or {}):
        e = forms["endpoints"][key]
        for v in e.get("variants") or [e]:
            file, _, name = str(v.get("handler") or "").partition("::")
            m = P._mod(repo, file) if file else None
            if m is None or not name:
                continue
            fn, dec = P._find_handler(m, {"fn": name, "method": v.get("method"), "path": v.get("path")})
            if fn is not None:
                yield key, v, m, fn, dec


# ── middleware ───────────────────────────────────────────────────────────────────────────────────────
def _call_next(e: dict) -> bool:
    val = e["node"].value
    val = val.value if isinstance(val, ast.Await) else val
    return isinstance(val, ast.Call) and P._leaf(val.func) == "call_next"


def _guard_node(ifs: dict, g: str, ln: int):
    """A guard's expression rebuilt from its ``if`` node — never re-parsed from the text ``_a3_paths`` caps at 160
    characters. None for a ``match`` case: a pattern, not a condition."""
    st = ifs.get(ln)
    if st is None or g.startswith("match "):
        return None
    return st.test if g == P._unp(st.test, P._PRED_CAP) else ast.UnaryOp(op=ast.Not(), operand=st.test)


def _polar(expr: str, neg: bool) -> str:
    if not neg:
        return expr
    try:
        return ast.unparse(ast.UnaryOp(op=ast.Not(), operand=ast.parse(expr, mode="eval").body))
    except SyntaxError:
        return f"not ({expr})"


def _arm(repo: Path, cm, cname: str, node, subst: dict) -> dict:
    """One ``or`` operand of a pass-through guard → ``exact-paths`` · ``prefix`` · ``method`` · ``flag`` · ``expr``. A path
    arm under an odd number of ``not`` (or a ``not in``) carries ``negated: true`` — it passes every path EXCEPT its
    values; a flag's ``expr`` keeps the arm's polarity."""
    src = ast.unparse(node)
    neg, inner = False, node
    while isinstance(inner, ast.UnaryOp) and isinstance(inner.op, ast.Not):
        neg, inner = not neg, inner.operand
    if not neg and isinstance(inner, ast.Compare) and len(inner.ops) == 1 and ast.unparse(inner.left).endswith(".method") \
            and isinstance(inner.ops[0], (ast.Eq, ast.In)):
        right = inner.comparators[0]
        vals = [right.value] if isinstance(right, ast.Constant) else list(P._literal(right) or ())
        if vals:
            return {"kind": "method", "src": src, "values": vals}
    terms = S.terms(repo, cm, cname, ast.unparse(inner), at=node)
    if len(terms) == 1:
        t = terms[0]
        kind = {"in": "exact-paths", "not-in": "exact-paths", "startswith": "prefix"}.get(t["kind"])
        if kind and S.is_path(t.get("subject"), subst):
            arm = {"kind": kind, "src": src, "values": t["values"]}
            if neg != (t["kind"] == "not-in"):
                arm["negated"] = True
            return arm
        if t["src"].startswith("self."):
            arm = {"kind": "flag", "src": src}
            if t["kind"] == "expr" and t.get("expr"):
                arm["expr"] = _polar(t["expr"], neg)
            return arm
    return {"kind": "expr", "src": src}


def _pass_through(repo: Path, cm, cname: str, meth) -> list[tuple]:
    """``[(line, [arms])]`` — each ``return await call_next(…)`` under a guard: its guard, split on ``or``. An ``elif`` /
    ``else`` pass-through is decided by its own test when every earlier branch of its chain ends in a return or raise;
    nested guards and a ``match`` case stay one ``expr`` arm."""
    subst = S.locals_once(meth)
    ifs = {n.lineno: n for n in ast.walk(meth) if isinstance(n, ast.If)}
    out = []
    for e in P._events(meth):
        if e["kind"] != "return" or not e["guards"] or not _call_next(e):
            continue
        nodes = [_guard_node(ifs, g, ln) for g, ln in e["guards"]]
        whole = " and ".join(g for g, _ in e["guards"])
        if any(n is None for n in nodes):
            out.append((e["line"], [{"kind": "expr", "src": whole, "reason": "a match case is a pattern, not a condition"}]))
            continue
        if not all(n is not ifs[ln].test and P._exits(ifs[ln].body) for n, (_, ln) in zip(nodes[:-1], e["guards"][:-1])):
            out.append((e["line"], [{"kind": "expr", "src": whole}]))
            continue
        node = nodes[-1]
        parts = node.values if isinstance(node, ast.BoolOp) and isinstance(node.op, ast.Or) else [node]
        out.append((e["line"], [_arm(repo, cm, cname, part, subst) for part in parts]))
    return out


def _exempts(arm: dict, full_path: str) -> bool:
    kind = {"exact-paths": "in", "prefix": "startswith"}.get(arm["kind"])
    hit = S.path_match(full_path, kind, arm["values"]) if kind else None
    return hit is not None and hit != bool(arm.get("negated"))


def _helper_exits(repo: Path, cm, cname: str, meth, known_sites: set) -> list[dict]:
    """``return build_429(…)`` — a module-level helper that builds the response: one hop, the exits the endpoint pass did
    not keep, scoped and conditioned by their own guards and the pass-throughs above them (as ``_a3_paths`` reads its own)."""
    events = P._events(meth)
    passes = [(e["line"], "not (" + " and ".join(g for g, _ in e["guards"]) + ")")
              for e in events if e["kind"] == "return" and e["guards"] and _call_next(e)]
    out = []
    for e in events:
        if e["kind"] != "return" or f"{cm.rel}:{e['line']}" in known_sites:
            continue
        val = e["node"].value
        val = val.value if isinstance(val, ast.Await) else val
        if not (isinstance(val, ast.Call) and isinstance(val.func, ast.Name)):
            continue
        r = P._resolve(repo, cm, val.func.id, at=val)
        fn = r[0].defs.get(r[1]) if r else None
        for e2 in (P._events(fn) if fn is not None else []):
            ex = P._response_exit(e2["node"].value, r[0], repo) if e2["kind"] == "return" else None
            if not ex:
                continue
            scope, preds = None, []
            for g, gl in e["guards"]:
                px = P._path_prefixes(g, cm, repo, at=gl)
                if px:
                    scope = sorted(px)
                else:
                    preds.append(g)
            row = {**ex, "phase": "middleware", "at": f"{r[0].rel}:{e2['line']}", "site": f"{cm.rel}:{e['line']}",
                   "via": cname, "scope": scope or "all", "hop": f"helper {val.func.id}"}
            if preds:
                row["pred"] = " and ".join(preds)
            when = [w for ln, w in passes if ln < e["line"]]
            if when:
                row["when"] = " and ".join(when)
            out.append(row)
            break
    return out


def _unscanned(repo: Path, forms: dict, mws: list) -> list[str]:
    """Registrations the stack scan does not read — ``@app.middleware("http")`` functions and ``FastAPI(middleware=[…])``
    — in the directories ``_a3_code.parse_app_middleware`` scans (beside and one above the route files). Named, never placed."""
    dirs: set = {(repo / mw["file"]).parent for mw in mws if mw.get("file")}
    for e in (forms.get("endpoints") or {}).values():
        for v in e.get("variants") or [e]:
            file = str(v.get("handler") or "").partition("::")[0]
            if file:
                dirs.update({(repo / file).parent, (repo / file).parent.parent})
    out: set = set()
    for d in sorted(dirs, key=str):
        if not d.is_dir() or not (d == repo or repo in d.parents):
            continue
        for py in sorted(d.glob("*.py")):
            m = P._mod(repo, str(py.relative_to(repo)))
            for node in (ast.walk(m.tree) if m is not None else ()):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    out.update(f"{m.rel}:{dec.lineno} @{ast.unparse(dec.func)} {node.name}" for dec in node.decorator_list
                               if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.attr == "middleware")
                elif isinstance(node, ast.Call) and P._leaf(node.func) in _APPS and any(k.arg == "middleware" for k in node.keywords):
                    out.add(f"{m.rel}:{node.lineno} {P._leaf(node.func)}(middleware=…)")
    return sorted(out)


def middleware_forms(repo: Path, forms: dict, amap: dict) -> tuple[dict, list, list]:
    mws = sorted(amap.get("app_middleware") or [], key=lambda x: (x.get("order", 0), x.get("file") or "", x.get("line") or 0))
    n = len(mws)
    rows = P._middleware_exits(repo, amap, {"unknown_middleware": []})
    ids = _ids(forms)
    eps = sorted({(key, v.get("full_path") or "") for key, e in (forms.get("endpoints") or {}).items() for v in (e.get("variants") or [e])})
    files = sorted({mw.get("file") or "" for mw in mws})
    unscanned = _unscanned(repo, forms, mws)
    out: dict = {}
    fresh: list = []
    for i, mw in enumerate(mws):
        cls = mw.get("cls")
        key = f"middleware:{cls}"
        order = {"registered": i, "runs": n - 1 - i, "of": n}
        if len(files) > 1:
            order["basis"] = f"file-sorted — registrations span {len(files)} files, and the order they run in is not read"
        if unscanned:
            order["unscanned"] = unscanned
        form = {"cls": cls, "registered_at": f"{mw.get('file')}:{mw.get('line')}", "order": order,
                "outer": f"middleware:{mws[i + 1]['cls']}" if i + 1 < n else None,
                "inner": f"middleware:{mws[i - 1]['cls']}" if i > 0 else None}
        m = P._mod(repo, mw.get("file"))
        r = P._resolve(repo, m, cls, at=f"{mw.get('file')}:{mw.get('line')}") if m else None
        arms: list = []
        extra: list = []
        if r and r[1] in r[0].classes:
            cm, cname = r                                  # rows name the RESOLVED class, in its own file
            mine = [x for x in rows if x.get("via") == cname and str(x.get("site") or x.get("at") or "").startswith(f"{cm.rel}:")]
            meth = next((cm.defs[f"{cname}.{x}"] for x in F.MIDDLEWARE_METHODS if f"{cname}.{x}" in cm.defs), None)
            form.update({"kind": "project", "file": cm.rel, "method": f"{cm.rel}::{cname}.{meth.name}" if meth else None})
            if meth is not None:
                arms = _pass_through(repo, cm, cname, meth)
                extra = _helper_exits(repo, cm, cname, meth, {x.get("site") for x in mine})
            form["pass_through"] = [{**a, "at": f"{cm.rel}:{ln}"} for ln, al in arms for a in al]
        else:
            mine = [x for x in rows if x.get("via") == cls and x.get("at") == form["registered_at"]]
            form["kind"] = "third-party" if cls in F.THIRD_PARTY_MIDDLEWARE else "unknown"
        exits, seen = [], set()
        for x in mine + extra:
            k = (x.get("site"), x.get("at"), x.get("status"), _detail(x))
            if k in seen:                                  # a class registered twice: the endpoint pass reads it once per registration
                continue
            seen.add(k)
            site_line = I._line(x.get("site") or x.get("at"))
            scope = x.get("scope") or "all"
            in_scope = {k2: fp for k2, fp in eps if scope == "all" or any(fp.startswith(p) for p in scope)}
            exempt = sorted(k2 for k2, fp in in_scope.items() if any(_exempts(a, fp) for ln, al in arms if ln < site_line for a in al))
            row = _exit(ids, x, fresh, applies_to=len(in_scope) - len(exempt), exempt=exempt)
            if x.get("hop"):
                row["hop"] = x["hop"]
            exits.append(row)
        form["exits"] = exits
        if key in out:
            prior = out[key]
            out[key] = {"variants": (prior["variants"] if "variants" in prior else [prior]) + [form]}
        else:
            out[key] = form
    _mint(repo, forms, fresh)
    findings: list = []
    for key, entry in out.items():
        for form in entry.get("variants") or [entry]:
            groups: dict = {}
            for x in form["exits"]:
                groups.setdefault((x.get("status"), _detail(x), x.get("at")), []).append(x)
            for (status, _, at), same in sorted(groups.items(), key=lambda kv: str(kv[0])):
                if len(same) > 1:
                    findings.append({"id": "indistinct-exits", "slot": "K3", "subject": key, "status": status, "at": at,
                                     "exits": [x["id"] for x in same], "sites": sorted(x.get("site") or "" for x in same)})
    return out, findings, unscanned


# ── dependencies ─────────────────────────────────────────────────────────────────────────────────────
def _dep_params(fn, dec, aliases: dict, meta: dict) -> list[dict]:
    """The dependencies FastAPI resolves for ``fn``, in its own order: route ``dependencies=[…]`` first, then each
    parameter as written (a ``Depends()`` default, an ``Annotated[…, Depends()]``, a module alias), then — on a route
    handler only — its non-route decorators (a ``@require_household`` gate; ``@lru_cache`` on a dependency is not one).
    ``_a3_code._endpoint_middleware`` names the same set but sorts gates first."""
    order: list[dict] = []
    seen: set = set()

    def add(name, callee=None, decl=None, via="param-dep"):
        if name and name not in seen:
            seen.add(name)
            order.append({"name": name, "callee": callee, "_decl": decl, "via": via})

    for kw in getattr(dec, "keywords", None) or []:
        if kw.arg == "dependencies" and isinstance(kw.value, (ast.List, ast.Tuple)):
            for el in kw.value.elts:
                add(C._depends_target(el), C._depends_callee(el), via="route-dep")
    args = fn.args
    params = list(args.posonlyargs) + list(args.args)
    defaults = dict(zip([p.arg for p in params[len(params) - len(args.defaults):]], args.defaults))
    defaults.update({p.arg: d for p, d in zip(args.kwonlyargs, args.kw_defaults) if d is not None})
    for p in params + list(args.kwonlyargs):
        d = defaults.get(p.arg)
        if d is not None:
            add(C._depends_target(d), C._depends_callee(d))
        if p.annotation is not None:
            for nm in C._annotated_depends(p.annotation):
                add(nm)
            if isinstance(p.annotation, ast.Name) and p.annotation.id in aliases:
                am = meta.get(p.annotation.id) or {}
                for nm in aliases[p.annotation.id]:
                    add(nm, (am.get("callees") or {}).get(nm), am.get("decl"))
    for d in (fn.decorator_list if dec is not None else ()):
        if d is not dec:
            nm = C._dec_name(d)
            if nm and nm not in P._ROUTE_METHODS:
                add(nm, via="decorator")
    return order


def _commits(repo: Path, nm, nqual: str, node) -> list[dict]:
    """Commit-family calls in the dependency and one call down. A commit after the dependency's first ``yield`` runs at
    teardown — after the handler — and says ``when: teardown``."""
    ys = [n.lineno for n in _own_nodes(node) if isinstance(n, (ast.Yield, ast.YieldFrom))]
    first_yield = min(ys) if ys else None
    out, seen = [], set()
    for e in P._events(node):
        if e["kind"] != "call":
            continue
        if P._leaf(e["node"].func) in F.TX_CALLS:
            row = {"op": P._leaf(e["node"].func), "at": f"{nm.rel}:{e['line']}"}
        else:
            r = R.callee(repo, nm, nqual, node, e["node"])
            row = None
            for e2 in (P._events(r[0].defs[r[1]]) if r and r[1] in r[0].defs else []):
                if e2["kind"] == "call" and P._leaf(e2["node"].func) in F.TX_CALLS:
                    row = {"op": P._leaf(e2["node"].func), "at": f"{r[0].rel}:{e2['line']}", "via": f"{r[1]} @ {nm.rel}:{e['line']}"}
                    break
            if row is None:
                continue
        if first_yield is not None and e["line"] > first_yield:
            row["when"] = "teardown"
        if row["at"] not in seen:
            seen.add(row["at"])
            out.append(row)
    return out


def _dep_form(repo: Path, rm, qual: str, ids: dict, fresh: list, called: bool = False) -> tuple[dict, object, object]:
    """One dependency's form → ``(form, the node FastAPI calls or None, that node's module)``."""
    base = {"levels_id": f"{rm.rel}#{qual}"}
    empty = {"exits": [], "inherited_exits": [], "effects": [], "teardown": False, "subdeps": []}
    val = rm.assigns.get(qual)
    if isinstance(val, ast.Call) and P._leaf(val.func) in F.SECURITY_CLASSES:
        row = P._security_row(rm, qual, val, P._framework(repo, rm.rel))
        return {**base, "kind": "security", "class": P._leaf(val.func), "at": f"{rm.rel}:{val.lineno}", "auto_error": row is not None,
                **empty, "exits": [_exit(ids, row, fresh)] if row else []}, None, None
    got = P._dep_node(repo, rm, qual, called)
    if got is None:
        return {**base, "kind": "unknown", "reason": "not a function, a class, a callable instance or a security scheme", "subdeps": []}, None, None
    nm, node, nqual, kind = got
    if node is None:
        why = "no __init__ — FastAPI reads no parameters from it" if kind == "class" else "its class has no __call__"
        return {**base, "kind": kind, "reason": why, **empty}, None, None
    A = P._analyse(repo, nm, node)
    acc = {"rows": [], "escapes": [], "unknown_causes": [], "validated": [], "swallowed": [], "framework": P._framework(repo, nm.rel)}
    P._deps(repo, nm, node, None, 0, set(), acc)
    form = {**base, "kind": kind, "at": f"{nm.rel}:{node.lineno}",
            "exits": [_exit(ids, r, fresh) for r in A["rows"]],
            "inherited_exits": [_exit(ids, r, fresh) for r in acc["rows"]],
            "escapes": sorted({f"{x['cls']} {x['at']}" for x in A["escapes"]}),
            "effects": _commits(repo, nm, nqual, node),
            "teardown": any(isinstance(x, (ast.Yield, ast.YieldFrom)) for x in _own_nodes(node)), "subdeps": []}
    if nqual != qual:
        form["calls"] = f"{nm.rel}::{nqual}"
    return form, node, nm


def dependency_forms(repo: Path, forms: dict) -> tuple[dict, list]:
    ids = _ids(forms)
    out: dict = {}
    applies: dict[str, set] = {}
    fresh: list = []

    def transitive(fid: str, acc: set) -> set:
        for sub in (out.get(fid) or {}).get("subdeps") or []:
            if isinstance(sub, str) and sub not in acc:
                acc.add(sub)
                transitive(sub, acc)
        return acc

    def chain(m, fn, dec, path: frozenset) -> list:
        """The dependencies ``fn`` declares, in order. Each one's form is built ONCE, with its own sub-dependencies — never
        cut short by how deep the endpoint that reached it first happened to be; ``path`` stops a cycle."""
        order: list = []
        aliases = C._dep_aliases(repo, m.rel, m.tree)
        for d in _dep_params(fn, dec, aliases, C._dep_alias_meta(m.rel)):
            r = P._dep_target(repo, m, d.get("callee") or d["name"], d.get("_decl"))
            if not r:
                order.append({"name": d["name"], "resolved": False})
                continue
            rm, qual = r
            fid = f"{rm.rel}::{qual}"
            order.append(fid)
            if fid in out or fid in path:
                continue
            form, node, nm = _dep_form(repo, rm, qual, ids, fresh, called=str(d["name"]).rstrip().endswith(")"))
            out[fid] = form
            if node is not None:
                form["subdeps"] = chain(nm, node, None, path | {fid})
        return order

    for key, v, m, fn, dec in _handlers(repo, forms):
        for fid in chain(m, fn, dec, frozenset()):
            if isinstance(fid, str):
                for hit in {fid} | transitive(fid, set()):
                    applies.setdefault(hit, set()).add(key)
    _mint(repo, forms, fresh)
    findings = []
    for fid in sorted(out):
        out[fid]["applies_to"] = len(applies.get(fid, ()))
        commits = [x for x in out[fid].get("effects") or [] if x["op"] in F.TX_CALLS and x.get("when") != "teardown"]
        if commits:
            findings.append({"id": "dependency-commits", "slot": "K3", "subject": fid, "commits": [x["at"] for x in commits],
                             "applies_to": out[fid]["applies_to"]})
    return dict(sorted(out.items())), findings


def run(forms: dict, ctx: dict) -> dict:
    """The kinds arm: ``middleware`` and ``dependencies`` (Slice 3), ``inflight`` (Slice 12), ``functions`` · ``tasks`` ·
    ``handlers`` (Slice 8) — the orchestrator passes the parts to run."""
    repo, parts = Path(ctx["repo"]), ctx["parts"]
    stats: dict = {"findings": {}}
    found: list = []
    absent: dict = {}
    if "middleware" in parts:
        forms["middleware"], got, unscanned = middleware_forms(repo, forms, ctx["amap"])
        found += got
        every = [x for entry in forms["middleware"].values() for f in (entry.get("variants") or [entry]) for x in f.get("exits") or []]
        stats.update({"middleware": len(forms["middleware"]), "middleware_exits": len(every),
                      "middleware_exits_off_endpoints": sum(1 for x in every if x.get("on_endpoints") is False),
                      "unscanned_registrations": len(unscanned)})
    if "dependencies" in parts:
        forms["dependencies"], got = dependency_forms(repo, forms)
        found += got
        stats["dependencies"] = len(forms["dependencies"])
        stats["dependency_endpoint_pairs"] = sum(d.get("applies_to", 0) for d in forms["dependencies"].values())
    for part, builder in (("inflight", IF.inflight_part), ("functions", FN.functions_part), ("tasks", TK.tasks_part), ("handlers", TK.handlers_part)):
        if part in parts:
            try:
                forms[part], got, st = builder(repo, forms, ctx["amap"])
            except IF.Refused as why:                          # refused before a byte is written: the part is absent, its stage stands
                absent[part] = str(why)
                continue
            found += got
            stats[part] = st
    if found:
        forms["arm_findings"].setdefault("kinds", []).extend(found)
    for f in found:
        stats["findings"][f["id"]] = stats["findings"].get(f["id"], 0) + 1
    return {"version": 1, "stats": stats, "options": {k: F.OPTIONS[k] for k in IF.OPTION_KEYS if "inflight" in parts}, **({"absent": absent} if absent else {})}


run.parts = PARTS
