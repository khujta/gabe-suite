"""Element forms — the inflight part's READ leaf (amendment 1 §A2 Slice 12): one function, read once.

What ONE function does to in-flight state in its own body — ``_census`` over ``_visit``'s nodes — and the small readers the
stations of ``_a3_forms_inflight`` ask of a function they meet: ``_cached`` (a functools cache on it), ``_closure`` (the nested
def a factory RETURNS), ``_mapped`` (which caller name each parameter was passed), ``_bound`` · ``_dead`` (what a call site proves of
the callee's guards — the falsification leaf, asked timidly), ``_factory_arms`` (a factory-local dependency alias). A leaf: it imports no arm and no station
logic, places nothing on an endpoint, and writes no row. ``_MEMO`` is the part's one memo — ``inflight_part`` clears it.
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_carrier as CR
import _a3_forms_falsify as FAL
import _a3_forms_migrate as MG
import _a3_forms_settings as S
import _a3_graft as G
import _a3_paths as P

IN = F.INFLIGHT
_NESTED = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)
_LOCK_SQL, _LOCK_NOT, _TESTS = re.compile(IN["lock_sql"]), re.compile(IN["lock_not_receivers"]), re.compile(IN["test_files"])
_MEMO: dict = {}


# ── one function, read once ──────────────────────────────────────────────────────────────────────────
def _visit(fn) -> list[tuple]:
    """Every node of ``fn`` outside its nested defs, lambdas and classes → ``(node, guards, cond, final, item)``: guards in
    ``_a3_paths._events``' own text form (so ``P._path_prefixes`` reads them), ``cond`` as ``S._self_assigns`` defines it (under
    an if · loop · except · match), ``final`` inside a ``finally``, ``item`` inside a ``with`` item. A docstring is no node."""
    out: list[tuple] = []

    def expr(node, ctx: tuple) -> None:
        todo = [node]
        while todo:
            n = todo.pop()
            if isinstance(n, _NESTED):
                continue
            out.append((n,) + ctx)
            todo.extend(ast.iter_child_nodes(n))

    def walk(stmts, guards: tuple, cond: bool, final: bool) -> None:
        for st in stmts:
            if isinstance(st, _NESTED) or (isinstance(st, ast.Expr) and isinstance(st.value, ast.Constant)):
                continue
            ctx = (guards, cond, final, False)
            if isinstance(st, ast.If):
                expr(st.test, ctx)
                t = P._unp(st.test, P._PRED_CAP)
                walk(st.body, guards + ((t, st.lineno),), True, final)
                walk(st.orelse, guards + ((f"not ({t})", st.lineno),), True, final)
            elif isinstance(st, (ast.For, ast.AsyncFor, ast.While)):
                expr(st.test if isinstance(st, ast.While) else st.iter, ctx)
                walk(st.body, guards, True, final)
                walk(st.orelse, guards, True, final)
            elif isinstance(st, (ast.With, ast.AsyncWith)):
                for it in st.items:
                    expr(it.context_expr, (guards, cond, final, True))
                walk(st.body, guards, cond, final)
            elif isinstance(st, P._TRY):
                walk(st.body, guards, cond, final)
                for h in st.handlers:
                    walk(h.body, guards, True, final)
                walk(st.orelse, guards, cond, final)
                walk(st.finalbody, guards, cond, True)
            elif isinstance(st, ast.Match):
                expr(st.subject, ctx)
                for case in st.cases:
                    walk(case.body, guards + ((f"match {P._unp(case.pattern, P._PRED_CAP)}", st.lineno),), True, final)
            else:
                expr(st, ctx)

    walk(fn.body, (), False, False)
    return out


def _params(fn) -> list[str]:
    a = fn.args
    return [p.arg for p in list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs)]


def _carried(repo: Path, m, value, held: dict | None = None) -> dict | None:
    """The carrier a written value was read from — its own header or state read, else a local bound from one. ``cond`` when the
    read is one arm of the value (``a or <read>`` · ``<read> if t else None``); a held binding keeps its own ``cond`` · ``guards``."""
    for n in ast.walk(value):
        got = CR.hit(repo, m, n)
        if got:
            kind, name = next(iter(got.items()))
            arm = any(isinstance(x, (ast.IfExp, ast.BoolOp)) for x in ast.walk(value))
            return {"kind": kind, "name": name, **({"cond": True, "guards": ()} if arm else {})}
    return (held or {}).get(value.id) if isinstance(value, ast.Name) else None


def _method_never(repo: Path, m, guards, method: str | None) -> bool:
    """A guard above a binding tests the request method against LITERAL methods (written out, or a constant ``S.resolve_const``
    resolves) and this endpoint's method provably fails it — the binding never runs on this request. Unresolved is False."""
    for g, _ in guards or ():
        try:
            node = ast.parse(g, mode="eval").body
        except SyntaxError:
            continue
        neg = False
        while isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            neg, node = not neg, node.operand
        if not (method and isinstance(node, ast.Compare) and len(node.ops) == 1 and ast.unparse(node.left).endswith(".method")
                and isinstance(node.ops[0], (ast.Eq, ast.In, ast.NotEq, ast.NotIn))):
            continue
        right = node.comparators[0]
        vals = (right.value,) if isinstance(right, ast.Constant) else S.resolve_const(repo, m, right.id) if isinstance(right, ast.Name) else P._literal(right)
        if not (isinstance(vals, tuple) and vals and all(isinstance(x, str) for x in vals)):
            continue
        if (method.upper() in {x.upper() for x in vals}) == (neg != isinstance(node.ops[0], (ast.NotEq, ast.NotIn))):
            return True
    return False


def _receiver(fn, first: str | None, expr) -> tuple | None:
    """RECEIVER PROOF for ``<x>.state`` → ``(carrier, "unproven" | None)``, or None when it is no row (``self.state``): ``app``
    is the application; a parameter typed as the connection, or a dispatch's first parameter, is the request; anything else
    is kept and says so."""
    if expr is None:
        return "state", "unproven"
    if P._leaf(expr) in IN["app_receivers"]:
        return "app.state", None
    if isinstance(expr, ast.Name):
        if expr.id in ("self", "cls"):
            return None
        if expr.id == first or P._leaf(P._param_ann(fn, expr.id)) in IN["request_types"]:
            return "request.state", None
    return f"{P._unp(expr, 60)}.state", "unproven"


def _cv_var(repo: Path, m, fn, recv) -> tuple | None:
    """``(file, NAME, label)`` when ``recv`` RESOLVES to a module-level ``ContextVar(...)`` — never by the method name alone.
    Read where it is written: an import in the function's own body counts (``_a3_paths_read``'s scoped-import rule)."""
    r = None
    if isinstance(recv, ast.Name) and recv.id not in _params(fn):
        r = P._resolve(repo, m, recv.id, at=recv)
    elif isinstance(recv, ast.Attribute) and isinstance(recv.value, ast.Name):
        imp = P._import_at(m, recv.value.id, recv)
        if imp and imp[0] and imp[1] is None:
            r = P._resolve(repo, P._mod(repo, imp[0]), recv.attr)
    val = r[0].assigns.get(r[1]) if r else None
    if not (isinstance(val, ast.Call) and P._leaf(val.func) in IN["contextvar_ctors"]):
        return None
    label = val.args[0].value if val.args and isinstance(val.args[0], ast.Constant) and isinstance(val.args[0].value, str) else None
    return r[0].rel, r[1], label


def _ann_leaves(ann) -> set:
    """The type names an annotation admits — through ``X | None`` · ``Optional[X]`` · ``Union[X, …]`` · ``Annotated[X, …]`` and a
    quoted annotation: a helper's ``tasks: BackgroundTasks | None = None`` is a BackgroundTasks parameter like any other."""
    if isinstance(ann, ast.Constant) and isinstance(ann.value, str):
        try:
            ann = ast.parse(ann.value, mode="eval").body
        except SyntaxError:
            return set()
    if isinstance(ann, ast.BinOp) and isinstance(ann.op, ast.BitOr):
        return _ann_leaves(ann.left) | _ann_leaves(ann.right)
    if isinstance(ann, ast.Subscript) and P._leaf(ann.value) in ("Optional", "Union", "Annotated"):
        elts = list(ann.slice.elts) if isinstance(ann.slice, ast.Tuple) else [ann.slice]
        return set().union(*(_ann_leaves(e) for e in (elts[:1] if P._leaf(ann.value) == "Annotated" else elts)))
    return {P._leaf(ann)} - {None}


def _bg_ctor(leaf: str | None) -> bool:
    return bool(leaf) and any(leaf in (t, t[:-1]) for t in IN["background_types"])       # BackgroundTask(f, …) on a returned response


def _task_args(call) -> list[str]:
    return [P._unp(a, 120) for a in call.args[1:]] + [f"{k.arg}={P._unp(k.value, 120)}" for k in call.keywords if k.arg]


def _census(repo: Path, m, node, qual: str, dispatch: bool = False) -> dict:
    """What ONE function does to in-flight state in its own body → ``{facts, calls, bg_params, passes, loads}``; memoised by
    fid, so a dependency 79 endpoints share is read once."""
    key = ("census", m.rel, qual, dispatch)
    if key in _MEMO:
        return _MEMO[key]
    params = _params(node)
    first = next((p for p in params if p not in ("self", "cls")), None) if dispatch and node.name == "dispatch" else None
    once = S.locals_once(node)
    visited = _visit(node)
    recv_call = {id(n.func.value): n for n, *_ in visited if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)}
    held: dict = {}
    for n, guards, cond, *_ in sorted(visited, key=lambda x: (getattr(x[0], "lineno", 0), getattr(x[0], "col_offset", 0))):
        if isinstance(n, (ast.Assign, ast.AnnAssign)) and n.value is not None:
            got = _carried(repo, m, n.value)
            for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
                if got and isinstance(t, ast.Name):
                    held.setdefault(t.id, {**got, "cond": True, "guards": guards} if cond else got)     # F1: a binding under a condition says so
    facts, calls, passes, loads, releases = [], [], [], [], []
    made, handed, taken, entered = {}, set(), set(), set()     # a lock OBJECT bound to a name · returned · the names acquired · the names a `with` enters

    def add(k: str, n, guards, cond, **kw) -> None:
        facts.append({"k": k, "line": n.lineno, "col": n.col_offset, "guards": guards, "cond": cond, **kw})

    def state(k: str, n, guards, cond, name, recv, value=None) -> None:
        rc = _receiver(node, first, recv)
        if name and rc:
            add(k, n, guards, cond, name=name, carrier=rc[0], unproven=rc[1], src=_carried(repo, m, value, held) if value is not None else None)

    for n, guards, cond, final, item in visited:
        if isinstance(n, (ast.Assign, ast.AnnAssign, ast.AugAssign)) and n.value is not None:
            for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
                if CR.state_target(t):
                    state("sw", n, guards, cond, CR.state_target(t), t.value.value, n.value)
                elif isinstance(t, ast.Name) and P._leaf(n.value) in F.LOCK_CALLS:
                    made[t.id] = id(n.value)
        elif isinstance(n, ast.Return) and n.value is not None and P._leaf(n.value) in F.LOCK_CALLS:
            handed.add(id(n.value))                              # `return r.lock(k)` hands the object back — nothing is taken here
        elif isinstance(n, ast.Attribute) and isinstance(n.ctx, ast.Load):
            got = CR.hit(repo, m, n)
            if got and got.get("state"):
                state("sr", n, guards, cond, got["state"], n.value.value)
            if isinstance(n.value, ast.Name) and n.value.id == "self":
                call = recv_call.get(id(n))
                arg = call.args[0] if call is not None and call.args else None
                add("self", n, guards, cond, attr=n.attr, call=P._unp(call, 120) if call is not None else None,
                    key=(once.get(arg.id) if isinstance(arg, ast.Name) else None) or (P._unp(arg, 120) if arg is not None else None))
        elif isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
            if n.id in params:
                loads.append((n.id, n.lineno))
            if item:
                entered.add(n.id)
        elif isinstance(n, ast.Constant) and isinstance(n.value, str):
            hit = _LOCK_SQL.search(n.value)
            if hit:                                              # an advisory lock named in SQL text: an xact lock ends with its transaction
                add("lock", n, guards, cond, name=hit.group(0), call=n.value.strip()[:60], held="call", shape="tx" if "xact" in hit.group(0).lower() else "open")
            if final and "advisory_unlock" in n.value.lower():
                releases.append(n.lineno)
        if not isinstance(n, ast.Call):
            continue
        leaf, f = P._leaf(n.func), n.func
        calls.append({"node": n, "line": n.lineno, "col": n.col_offset, "guards": guards, "cond": cond})
        if leaf == "setattr" and isinstance(f, ast.Name) and len(n.args) >= 3 and isinstance(n.args[0], ast.Attribute) and n.args[0].attr == "state":
            state("sw", n, guards, cond, CR.text(repo, m, n.args[1]), n.args[0].value, n.args[2])
        got = CR.hit(repo, m, n)
        if got and got.get("state"):                              # getattr(<x>.state, "attr", …) — the name is the carrier leaf's
            state("sr", n, guards, cond, got["state"], n.args[0].value if isinstance(n.args[0], ast.Attribute) else None)
        if isinstance(f, ast.Attribute) and f.attr in IN["contextvar_ops"]:
            var = _cv_var(repo, m, node, f.value)
            if var:
                add("cv", n, guards, cond, op=f.attr, var=var, final=final, src=_carried(repo, m, n.args[0], held) if f.attr == "set" and n.args else None)
        if leaf in IN["contextvar_binders"]:
            op = IN["contextvar_binders"][leaf]                  # structlog: bind(k=v) names keywords, unbind("k") names strings
            names = [a.value for a in n.args if isinstance(a, ast.Constant)] if op == "reset" else [k.arg for k in n.keywords if k.arg]
            add("bind", n, guards, cond, op=op, names=names, final=final, item=item)
        if isinstance(f, ast.Attribute) and f.attr in IN["background_calls"] and isinstance(f.value, ast.Name) and f.value.id in params and n.args:
            add("bg", n, guards, cond, recv=f.value.id, task=n.args[0], args=_task_args(n))
        for kw in n.keywords:
            if kw.arg in IN["background_kw"] and isinstance(kw.value, ast.Call) and _bg_ctor(P._leaf(kw.value.func)) and kw.value.args:
                add("bg", kw.value, guards, cond, recv=None, task=kw.value.args[0], args=_task_args(kw.value))
        passes += [{"param": x.id, "line": n.lineno} for a in list(n.args) + [k.value for k in n.keywords] for x in ast.walk(a)
                   if isinstance(x, ast.Name) and x.id in params]       # anywhere inside the argument: `tasks if flag else None` hands it on too
        if leaf in F.LOCK_CALLS:
            recv = P._leaf(f.value) if isinstance(f, ast.Attribute) else None
            if not (recv and _LOCK_NOT.search(recv)) and (item or not leaf[:1].isupper()):       # a lock OBJECT built here is not a lock taken
                add("lock", n, guards, cond, name=P._unp(f, 60), call=P._unp(n, 60), held="with-block" if item else "call", shape="with" if item else "open", id=id(n))
                taken.update({recv} if leaf == "acquire" and recv else ())
        elif leaf in IN["lock_methods"]:
            add("lock", n, guards, cond, name=leaf, call=P._unp(n, 60), held="call", shape="tx")
        if final and leaf in IN["release_calls"]:
            releases.append(n.lineno)
    for f in facts:
        if f["k"] == "cv" and f["op"] == "set":
            f["reset"] = _reset_of(facts, f)
        elif f["k"] == "bind" and f["op"] == "set":               # per NAME: a finally-unbind that names it, or a clear — at or after the bind
            later = sorted((g for g in facts if g["k"] == "bind" and g["final"] and g["line"] >= f["line"]), key=lambda g: (g["line"], g["col"]))
            f["resets"] = {nm: next((g["line"] for g in later if g["op"] == "clear" or g["op"] == "reset" and nm in g["names"]), None) for nm in f["names"]}
        elif f["k"] == "lock" and f["shape"] == "open":
            name = next((k for k, v in made.items() if v == f.get("id")), None)
            if name in entered:                                   # `lock = r.lock(k)` … `with lock:` — held for the block
                f.update({"held": "with-block", "shape": "with"})
            f["released"] = next((ln for ln in sorted(releases) if ln >= f["line"]), None)
            f["object"] = f.get("id") in handed or name in taken  # … `lock.acquire()` — the acquire is the taking, this call only built the object
    out = {"facts": sorted((f for f in facts if not f.get("object")), key=lambda f: (f["line"], f["col"], f["k"])), "calls": sorted(calls, key=lambda c: (c["line"], c["col"])),
           "bg_params": [p for p in params if _ann_leaves(P._param_ann(node, p)) & set(IN["background_types"])],
           "passes": sorted({(x["line"], x["param"]): x for x in passes}.values(), key=lambda x: (x["line"], x["param"])), "loads": sorted(set(loads), key=lambda x: (x[1], x[0]))}
    _MEMO[key] = out
    return out


def _reset_of(facts: list, s: dict) -> int | None:
    """The line of the ``reset`` that puts a set back: the same variable, inside a ``finally`` of the SAME function, at or AFTER
    the set — a ``finally`` above the set ran before it and proves nothing (the lock arm's own order guard)."""
    return next((f["line"] for f in facts if f["k"] == "cv" and f["op"] == "reset" and f["var"] == s["var"] and f["final"] and f["line"] >= s["line"]), None)


def _cached(node) -> tuple | None:
    """``(decorator, maxsize)`` when a function's results are kept on the function (functools ``lru_cache`` · ``cache``)."""
    for d in getattr(node, "decorator_list", None) or []:
        nm = C._dec_name(d)
        if nm not in IN["cache_decorators"]:
            continue
        default = IN["cache_decorators"][nm]
        size = next((k.value for k in d.keywords if k.arg == "maxsize"), d.args[0] if d.args else None) if isinstance(d, ast.Call) else None
        if size is None:
            return nm, "unbounded" if default is None else f"default {default}"
        if isinstance(size, ast.Constant) and (size.value is None or isinstance(size.value, int)):
            return nm, "unbounded" if size.value is None else size.value
        return nm, "unknown"
    return None


def _closure(node):
    """A factory's RETURNED nested def — what FastAPI calls for ``Depends(factory(...))``. The factory body runs at import."""
    inner = {n.name: n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    rets = sorted((n for n, *_ in _visit(node) if isinstance(n, ast.Return) and isinstance(n.value, ast.Name) and n.value.id in inner), key=lambda n: n.lineno)
    return inner[rets[0].value.id] if rets else None


def _bound(cnode, call) -> dict:
    """What THIS call site decides for the callee (the falsification leaf's ``bind``) — minus every parameter the callee
    rebinds, and nothing at all when the call spreads ``*args`` / ``**kw``: what arrives is then not what is written."""
    if call is None or any(isinstance(a, ast.Starred) for a in call.args) or any(k.arg is None for k in call.keywords):
        return {}
    stored = {n.id for n, *_ in _visit(cnode) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
    return {k: v for k, v in FAL.bind(cnode, call).items() if k not in stored}


def _dead(guards, bound: dict) -> bool:
    """One of the guards a fact sits under folds to False for this call site — the branch cannot run (§A4 fix 3)."""
    return any(FAL.truth(g, bound) is False for g, _ in guards or ())


def _factory_arms(repo: Path, m, factory, fqual: str, am, call, name: str) -> tuple[list, bool]:
    """A dependency NAME the module does not resolve, asked by the closure ``factory`` RETURNED → ``([((module, qual),
    conditional)], whole)``: through the factory's own body — ``name = <Name>``, or an ``a if t else b`` / ``a or b`` of names,
    each arm the ``Depends(factory(...))`` call's bindings do not prove dead (the one arm left by proof is unconditional; else
    every arm, conditional); a factory PARAMETER is the name the call passed, read in the asker's module ``am``; and each name
    through the factory's OWN import statements (F2 — the scoped-import rule: a name the factory's closure names is read at
    the factory's last line, past every import in its body). ``whole`` is False when an arm stays unresolved."""
    bound, fend = _bound(factory, call), getattr(factory, "end_lineno", None) or factory.lineno
    vals = [(n.value, g) for n, g, *_ in sorted(_visit(factory), key=lambda x: getattr(x[0], "lineno", 0)) if isinstance(n, (ast.Assign, ast.AnnAssign))
            and n.value is not None and any(isinstance(t, ast.Name) and t.id == name for t in (n.targets if isinstance(n, ast.Assign) else [n.target]))]
    live = [v for v, g in vals if not _dead(g, bound)]
    arms: list = []

    def spread(v, cond: bool, mod) -> None:
        if isinstance(v, ast.IfExp):
            t = FAL.truth(P._unp(v.test, P._PRED_CAP), bound)
            for arm, want in ((v.body, True), (v.orelse, False)):
                if t is None or t is want:
                    spread(arm, cond or t is None, mod)
        elif isinstance(v, ast.BoolOp):
            for arm in v.values:
                spread(arm, True, mod)
        else:
            arms.append((v, cond, mod))

    for v in live:
        spread(v, len(live) > 1, m)
    if not vals:                                                 # no local of that name: the factory's parameter, or its own import
        expr, origin = bound.get(name) or (ast.Name(id=name), "callee")
        spread(expr if expr is not None else ast.Constant(None), False, am if origin == "caller" else m)
    out, whole = [], bool(arms)
    for v, cond, mod in arms:
        at = v if mod is not m or getattr(v, "lineno", None) else fend       # a name no statement wrote is read past the factory's imports
        r = P._resolve(repo, mod, v.id, at=at) if isinstance(v, ast.Name) else None
        whole = whole and bool(r)
        out += [(r, cond)] if r and r not in [x for x, _ in out] else []
    return out, whole


def _mapped(call, cnode, params=()) -> dict:
    """``{callee parameter: (the caller's name, conditional)}`` for the arguments a call passes as a bare name — or as the ONE
    caller parameter among the arms of ``a if t else b`` / ``a or b`` (conditional: another arm may be what arrives)."""
    ps = [p.arg for p in list(cnode.args.posonlyargs) + list(cnode.args.args)]
    if ps and ps[0] in ("self", "cls") and isinstance(call.func, ast.Attribute):
        ps = ps[1:]

    def one(a) -> tuple | None:
        if isinstance(a, ast.Name):
            return a.id, False
        arms, todo = set(), [a] if isinstance(a, (ast.IfExp, ast.BoolOp)) else []
        while todo:
            x = todo.pop()
            todo += [x.body, x.orelse] if isinstance(x, ast.IfExp) else x.values if isinstance(x, ast.BoolOp) else []
            arms |= {x.id} if isinstance(x, ast.Name) and x.id in params else set()
        return (arms.pop(), True) if len(arms) == 1 else None

    out = {ps[i]: one(a) for i, a in enumerate(call.args) if i < len(ps)}
    out.update({k.arg: one(k.value) for k in call.keywords if k.arg})
    return {k: v for k, v in out.items() if v}


def _fn_middleware(repo: Path) -> list[str]:
    """Every ``@<x>.middleware("http")`` FUNCTION in the project's python, wherever it is registered from — tier3 wires its own
    through ``add_*_middleware(app)`` helpers no stack scan reads. No station walks one (12b), so each is NAMED, in
    ``_a3_forms_mw._unscanned``'s own words: never a station, never a row. A text pre-filter, then one parse per file that
    passes it; center, vendored and test files are never read."""
    out: list[str] = []
    for root, dirs, files in os.walk(repo):
        rel_root = os.path.relpath(root, repo)
        if rel_root != "." and G._is_center(rel_root + "/"):
            dirs[:] = []
            continue
        dirs[:] = sorted(d for d in dirs if d not in MG.SKIP_DIRS and not d.startswith("."))
        for name in sorted(files):
            rel = name if rel_root == "." else os.path.normpath(os.path.join(rel_root, name))
            if not name.endswith(".py") or G._is_center(rel) or _TESTS.search(rel):
                continue
            try:
                if ".middleware(" not in (Path(root) / name).read_text(encoding="utf-8", errors="replace"):
                    continue
            except OSError:
                continue
            m = P._mod(repo, rel)
            for fn in (ast.walk(m.tree) if m is not None else ()):
                if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    out += [f"{rel}:{d.lineno} @{ast.unparse(d.func)} {fn.name}" for d in fn.decorator_list
                            if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr == "middleware"
                            and d.args and isinstance(d.args[0], ast.Constant) and d.args[0].value == "http"]
    return sorted(out)
