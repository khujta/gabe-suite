"""Element forms — the EFFECTS arm: what each path writes, commits and rolls back (amendment 1 §A2 Slice 6 · A9 · A7).

The map says a function reads or writes a table; a path needs WHEN — which writes ran before the refusal, which commit made
them stick, which rollback undid them. Every ORM/Core effect is a STEP (``steps{}``; an ``st:`` id names the function, the
op, the table, its rank among the function's same op on that table, ``cond`` and ``suppressed`` — never a line).

Along each Slice 5 path a function is read against the point the path leaves it: a step in an arm beside the one the path
took, or in a block that leaves the function before that point, never ran and is left out; a step under a loop, a
non-exiting branch or a swallowing ``except`` is ``cond``. A function the path only passes through is read to its normal
completion — a raising branch did not run, a returning one might have. The path's ``catch`` entries walk the handler
bodies the exception passed. Each path gets ``effects{steps, committed, maybe_committed, rolled_back, uncommitted,
dependency}`` — every write lands in one bucket; ``failure{catches}`` names every try a path went through (U11); an add
of a bound instance on a table with a unique key carries its ``race`` fact. ``flush`` never commits — the archmap's
``commits`` lumps the two.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import _a3_forms as F
import _a3_forms_catch as CA
import _a3_forms_ids as I
import _a3_forms_mw as MW
import _a3_forms_reach as R
import _a3_forms_short as SH
import _a3_forms_walk as W
import _a3_paths as P
import _a3_stacks_pydi as PYDI

EF = F.EFFECTS
_BLOCKS = ("branch", "except")                # frames a block leaves its function from
_SESSION = re.compile(EF["session_names"])


# ── models ───────────────────────────────────────────────────────────────────────────────────────────
def _cols(args) -> tuple:
    return tuple(a.value if isinstance(a, ast.Constant) else a.attr for a in args
                 if (isinstance(a, ast.Constant) and isinstance(a.value, str)) or isinstance(a, ast.Attribute))


def _unique_kw(call: ast.Call) -> bool:
    return any(k.arg == "unique" and isinstance(k.value, ast.Constant) and k.value.value is True for k in call.keywords)


def models(repo: Path, amap: dict) -> tuple[dict, dict]:
    """``{Model: table}`` and ``{table: [unique column tuples]}`` from the archmap's model rows and model census; a unique
    key from each ``uqs`` string read with ``ast``, and from the class's ``Index(name, …, unique=True)`` and
    ``unique=True`` columns."""
    m2t: dict = {}
    uq: dict = {}
    rows = [mdl for ent in (amap.get("entities") or {}).values() for mdl in ent.get("models") or []]
    rows += list(((amap.get("model_census") or {}).get("unclaimed")) or [])
    for mdl in rows:
        if not (mdl.get("cls") and mdl.get("table")):
            continue
        m2t.setdefault(mdl["cls"], mdl["table"])
        found = []
        for u in mdl.get("uqs") or []:
            try:
                node = ast.parse(str(u), mode="eval").body
            except SyntaxError:
                continue
            if isinstance(node, ast.Call) and _cols(node.args):
                found.append(_cols(node.args))
        mm = P._mod(repo, mdl.get("file")) if mdl.get("file") else None
        cls = mm.classes.get(mdl["cls"]) if mm is not None else None
        for n in ast.walk(cls) if cls is not None else ():
            if isinstance(n, ast.Call) and P._leaf(n.func) == "Index" and _unique_kw(n) and _cols(n.args[1:]):
                found.append(_cols(n.args[1:]))
            elif isinstance(n, (ast.Assign, ast.AnnAssign)) and isinstance(n.value, ast.Call) and _unique_kw(n.value) \
                    and P._leaf(n.value.func) in EF["column_calls"]:
                tgt = n.targets[0] if isinstance(n, ast.Assign) else n.target
                if isinstance(tgt, ast.Name):
                    found.append((tgt.id,))
        for cols in found:
            if cols not in uq.get(mdl["table"], []):
                uq.setdefault(mdl["table"], []).append(cols)
    return m2t, uq


# ── effect events ────────────────────────────────────────────────────────────────────────────────────
def _own(fn):
    """Every node of ``fn`` outside its nested defs, classes and lambdas."""
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        yield n
        todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda))]


def _root(node, m2t: dict) -> str | None:
    """The Model at the root of an attribute chain — ``Model.col`` → ``Model`` (``_a3_code._orm_access``'s rule)."""
    while isinstance(node, ast.Attribute):
        node = node.value
    return node.id if isinstance(node, ast.Name) and node.id in m2t else None


def _ann_model(ann, m2t: dict) -> str | None:
    return next((t for t in re.findall(r"[A-Za-z_]\w*", ast.unparse(ann)) if t in m2t), None) if ann is not None else None


class _Symtab:
    """Local name → Model the way ``_a3_code._orm_access`` binds it — a Model-annotated parameter or assignment,
    ``x = Model(…)``, ``x = session.get(Model, …)``, ``for row in <bound>`` — plus two named widenings: W1 a tuple
    unpacked from a call whose return annotation names models · W2 a name bound from a query of one model
    (``select(Model)…`` or an awaited ``session.get``)."""

    def __init__(self, repo: Path, m, qual: str, fn, m2t: dict, widen: bool) -> None:
        self.m2t, self.map, self.widened = m2t, {}, {}
        for a in list(fn.args.posonlyargs) + list(fn.args.args) + list(fn.args.kwonlyargs):
            hit = _ann_model(a.annotation, m2t)
            if hit:
                self.map[a.arg] = hit
        nodes = list(_own(fn))
        for n in sorted((n for n in nodes if isinstance(n, (ast.Assign, ast.AnnAssign))), key=lambda n: (n.lineno, n.col_offset)):
            if isinstance(n, ast.AnnAssign):
                if isinstance(n.target, ast.Name) and ast.unparse(n.annotation) in m2t:
                    self.map[n.target.id] = ast.unparse(n.annotation)
                continue
            if len(n.targets) != 1:
                continue
            tgt, val = n.targets[0], n.value
            if isinstance(tgt, ast.Name) and isinstance(val, ast.Call):
                if isinstance(val.func, ast.Name) and val.func.id in m2t:
                    self.map[tgt.id] = val.func.id
                    continue
                if isinstance(val.func, ast.Attribute) and val.func.attr == "get" and val.args and isinstance(val.args[0], ast.Name) and val.args[0].id in m2t:
                    self.map[tgt.id] = val.args[0].id
                    continue
            if not widen:
                continue
            inner = val.value if isinstance(val, ast.Await) else val
            if isinstance(tgt, ast.Name) and isinstance(inner, ast.Call):
                if isinstance(inner.func, ast.Attribute) and inner.func.attr == "get" and inner.args and isinstance(inner.args[0], ast.Name) \
                        and inner.args[0].id in m2t:
                    self._bind(tgt.id, inner.args[0].id, "W2")
                    continue
                sel = next((x for x in ast.walk(inner) if isinstance(x, ast.Call) and (P._verb(m, x) or P._leaf(x.func)) == "select"), None)
                hits = {h for h in (_root(a, m2t) for a in sel.args) if h} if sel is not None else set()
                if len(hits) == 1:
                    self._bind(tgt.id, hits.pop(), "W2")
            elif isinstance(tgt, ast.Tuple) and isinstance(inner, ast.Call):
                r = R.callee(repo, m, qual, fn, inner)
                ret = r[0].defs[r[1]].returns if r and r[1] in r[0].defs else None
                names = [t for t in re.findall(r"[A-Za-z_]\w*", ast.unparse(ret)) if t in m2t] if ret is not None else []
                for el, model in zip(tgt.elts, names):
                    if isinstance(el, ast.Name):
                        self._bind(el.id, model, "W1")
        for n in nodes:
            if isinstance(n, (ast.For, ast.AsyncFor)) and isinstance(n.target, ast.Name) and isinstance(n.iter, ast.Name) and n.iter.id in self.map:
                self.map[n.target.id] = self.map[n.iter.id]
                if n.iter.id in self.widened:
                    self.widened[n.target.id] = self.widened[n.iter.id]

    def _bind(self, name: str, model: str, how: str) -> None:
        if name not in self.map:
            self.map[name], self.widened[name] = model, how

    def model(self, arg) -> tuple[str | None, str | None]:
        if isinstance(arg, ast.Name):
            return self.map.get(arg.id), self.widened.get(arg.id)
        if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name) and arg.func.id in self.m2t:
            return arg.func.id, None
        return None, None


def _exit_kind(stmts) -> str | None:
    """How a block leaves its function once it runs: ``raise`` · ``return`` · None."""
    for s in stmts:
        if isinstance(s, ast.Raise):
            return "raise"
        if isinstance(s, ast.Return):
            return "return"
    return None


def _walk(stmts, ctx: dict, out: list, visit) -> None:
    """A statement walk keeping what a step needs: ``stack`` (frames ``(kind, key, exit)`` — ``branch`` (if line, arm) ·
    ``loop`` · ``except`` (handler line) · ``after`` (a sibling ``if`` that leaves the function)), ``suppressed``,
    ``savepoint`` and the tries."""
    stack = ctx["stack"]
    for st in stmts:
        if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        here = dict(ctx, stack=stack)
        if isinstance(st, ast.If):
            visit(st.test, here, out)
            ek = _exit_kind(st.body)
            _walk(st.body, dict(here, stack=stack + (("branch", (st.lineno, 0), ek),)), out, visit)
            if st.orelse:
                _walk(st.orelse, dict(here, stack=stack + (("branch", (st.lineno, 1), _exit_kind(st.orelse)),)), out, visit)
            elif ek:
                stack = stack + (("after", st.lineno, ek),)
        elif isinstance(st, ast.Match):
            visit(st.subject, here, out)
            for i, case in enumerate(st.cases):
                _walk(case.body, dict(here, stack=stack + (("branch", (st.lineno, i), _exit_kind(case.body)),)), out, visit)
        elif isinstance(st, (ast.For, ast.AsyncFor, ast.While)):
            visit(st.test if isinstance(st, ast.While) else st.iter, here, out)
            _walk(st.body + st.orelse, dict(here, stack=stack + (("loop", st.lineno, None),)), out, visit)
        elif isinstance(st, (ast.With, ast.AsyncWith)):
            sup = any(P._leaf(it.context_expr) in F.SUPPRESSORS for it in st.items)
            nested = next((it.context_expr for it in st.items if P._leaf(it.context_expr) == "begin_nested"), None)
            for it in st.items:
                if P._leaf(it.context_expr) not in F.SUPPRESSORS:
                    visit(it.context_expr, here, out)
            inner = dict(here, suppressed=here["suppressed"] or sup)
            if nested is not None:
                inner["savepoint"] = nested.lineno
            _walk(st.body, inner, out, visit)
        elif isinstance(st, P._TRY):
            _walk(st.body, dict(here, tries=here["tries"] + (st,)), out, visit)
            for h in st.handlers:
                _walk(h.body, dict(here, stack=stack + (("except", h.lineno, _exit_kind(h.body)),), handler=(st, h)), out, visit)
            _walk(st.orelse, here, out, visit)
            _walk(st.finalbody, here, out, visit)
        elif isinstance(st, ast.Raise):
            if st.exc is not None:
                visit(st.exc, here, out)
            out.append({**here, "kind": "raise", "line": st.lineno, "node": st})
        elif isinstance(st, ast.Return):
            if st.value is not None:
                visit(st.value, here, out)
            out.append({**here, "kind": "return", "line": st.lineno, "node": st})
        else:
            if isinstance(st, (ast.Assign, ast.AugAssign)):
                for t in (st.targets if isinstance(st, ast.Assign) else [st.target]):
                    if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name):
                        out.append({**here, "kind": "attr", "line": st.lineno, "name": t.value.id})
            visit(st, here, out)


def _session_call(fn, call: ast.Call) -> bool:
    """A transaction verb or an unbound write is a session's when its receiver is named like one or annotated a Session."""
    recv = call.func.value if isinstance(call.func, ast.Attribute) else None
    name = P._leaf(recv) if recv is not None else None
    if name and _SESSION.search(name):
        return True
    ann = P._param_ann(fn, name) if isinstance(recv, ast.Name) else None
    return ann is not None and "Session" in ast.unparse(ann)


def _port_call(m, fn, call: ast.Call) -> bool:
    """A method call on a parameter annotated with a class the project defines, that no definition answers — a port."""
    f = call.func
    if not (isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name)):
        return False
    ann = P._param_ann(fn, f.value.id)
    name = PYDI._ann_name(ann) if ann is not None else None
    return bool(name and re.fullmatch(r"[A-Z]\w*", name) and (name in m.classes or (m.imports.get(name) or (None,))[0]))


def _abstract(r) -> bool:
    """A method of a ``Protocol`` or ``ABC`` class — the call reaches an implementation the source does not name."""
    cm, cq = r
    cls = cm.classes.get(cq.split(".")[0]) if "." in cq else None
    return cls is not None and any(P._leaf(b) in EF["abstract_bases"] for b in cls.bases)


_EVENTS: dict = {}


def effect_events(repo: Path, m, qual: str, fn, m2t: dict, widen: bool = True) -> list[dict]:
    """One function's events in source order: ``fx`` (``op`` · ``model`` · ``table`` · ``ord`` · ``widening`` ·
    ``bound`` · ``teardown``), ``call`` (a project function), ``unresolved`` (a method on a class-annotated parameter no
    definition answers), and ``raise``/``return`` markers — each with its ``stack``, ``tries``, ``suppressed``."""
    key = (m.rel, qual, widen)
    if key in _EVENTS:
        return _EVENTS[key]
    sym = _Symtab(repo, m, qual, fn, m2t, widen)
    out: list = []

    def visit(node, ctx, acc):
        for n in ast.walk(node):
            if not isinstance(n, ast.Call):
                continue
            bare = P._verb(m, n)                          # `_sel(Model)` after `from sqlalchemy import select as _sel` · `sa.update(Model)`
            attr = n.func.attr if isinstance(n.func, ast.Attribute) and bare is None else None   # a library verb is never a session method
            base = {**ctx, "line": n.lineno}
            if attr in EF["tx"] and _session_call(fn, n):
                acc.append({**base, "kind": "fx", "op": EF["tx"][attr]})
            elif attr in EF["write_m"] and n.args:
                many = widen and attr == "add_all" and isinstance(n.args[0], (ast.List, ast.Tuple))
                for a in (n.args[0].elts if many else [n.args[0]]):
                    model, wid = sym.model(a)
                    if model or _session_call(fn, n):
                        acc.append({**base, "kind": "fx", "op": EF["write_m"][attr], "model": model, "widening": "W4" if many else wid,
                                    "bound": isinstance(a, ast.Name)})
            elif bare in EF["write_core"] and n.args:
                for a in n.args:
                    if _root(a, m2t):
                        acc.append({**base, "kind": "fx", "op": EF["write_core"][bare], "model": _root(a, m2t)})
            elif bare == "select" or (attr in ("join", "select_from") and n.args) or \
                    (attr == "get" and n.args and isinstance(n.args[0], ast.Name) and n.args[0].id in m2t):
                direct = sorted({h for h in (_root(a, m2t) for a in (n.args if bare == "select" else n.args[:1])) if h})
                for model in direct:
                    acc.append({**base, "kind": "fx", "op": "read", "model": model})
                if bare == "select" and widen:
                    for model in sorted({x.id for x in ast.walk(n) if isinstance(x, ast.Name) and x.id in m2t} - set(direct)):
                        acc.append({**base, "kind": "fx", "op": "read", "model": model, "widening": "W3"})
            else:
                r = R.callee(repo, m, qual, fn, n)
                defined = r is not None and r[1] in r[0].defs
                if defined and not _abstract(r):
                    acc.append({**base, "kind": "call", "target": r, "node": n})
                elif defined or _port_call(m, fn, n):
                    acc.append({**base, "kind": "unresolved"})

    _walk(fn.body, {"stack": (), "suppressed": False, "savepoint": None, "tries": (), "handler": None}, out, visit)
    for e in out:
        if e["kind"] == "attr" and e["name"] in sym.map:
            e.update(kind="fx", op="update", model=sym.map[e["name"]], widening=sym.widened.get(e["name"]), bound=True)
    out = [e for e in out if e["kind"] != "attr"]
    out.sort(key=lambda e: (e["line"], 0 if e["kind"] == "fx" else 1))
    streamed = P._streamed_calls(fn)                       # §A4 V17: a generator the RESPONSE iterates runs after
    for e in out:                                          # the exit — a `with`-entered one does not
        if e["kind"] == "call" and id(e["node"]) in streamed:
            cm, cq = e["target"]
            if any(isinstance(n, (ast.Yield, ast.YieldFrom)) for n in _own(cm.defs[cq])):
                e["after_response"] = True
    first_yield = min((n.lineno for n in _own(fn) if isinstance(n, (ast.Yield, ast.YieldFrom))), default=None)
    ords: dict = {}
    for e in out:
        if e["kind"] != "fx":
            continue
        e["table"] = m2t.get(e.get("model"))
        k = (e["op"], e["table"] or e.get("model"))
        e["ord"] = ords[k] = ords.get(k, -1) + 1
        if first_yield is not None and e["line"] > first_yield:
            e["teardown"] = True
    _EVENTS[key] = out
    return out


# ── reading a function against a path ───────────────────────────────────────────────────────────────
def _rel(stack: tuple, target: tuple | None) -> str | None:
    """An event against the point a path leaves its function: None (it never ran on the path) · ``cond`` · ``on``.
    ``target`` is that point's stack, or None for a function that completed without raising."""
    if target is None:
        state = "on"
        for kind, _, ex in stack:
            if kind in _BLOCKS and ex == "raise":
                return None                               # a raising block did not run on a path that went on
            if not (kind == "after" and ex == "raise"):
                state = "cond"
        return state
    k = 0
    while k < min(len(stack), len(target)) and stack[k] == target[k]:
        k += 1
    rest = stack[k:]
    if not rest:
        return "on"
    first = rest[0]
    if k < len(target) and first[0] == "branch" == target[k][0] and first[1][0] == target[k][1][0]:
        return None                                       # the arm beside the one the path took
    if any(kind in _BLOCKS and ex for kind, _, ex in rest):
        return None                                       # running it leaves the function before the point
    return "cond"


def _point(evs: list, kind: str, line: int) -> tuple | None:
    """``(stack, last line)`` of the ``raise``/``return`` marker or the call at ``line``."""
    e = next((e for e in evs if e["kind"] == kind and e["line"] == line), None)
    if e is None:
        return None
    node = e.get("node")
    return e["stack"], max(line, getattr(node, "end_lineno", None) or line)


class _Steps:
    """Mints steps and reads functions against a path — callees to depth ``EFFECTS.depth`` (memoised, cycle-guarded; one
    level deeper counts into ``floor``)."""

    def __init__(self, repo: Path, m2t: dict, uq: dict, widen: bool) -> None:
        self.repo, self.m2t, self.uq, self.widen = repo, m2t, uq, widen
        self.steps: dict = {}
        self.floor = 0
        self.unresolved: set = set()
        self._memo: dict = {}

    def mint(self, fid: str, e: dict, cond: bool, suppressed: bool) -> str:
        rel = fid.partition("::")[0]
        row = {"fn": fid, "op": e["op"], "table": e.get("table"), "at": f"{rel}:{e['line']}", "cond": bool(cond)}
        for k in ("model", "widening"):
            if e.get(k):
                row[k] = e[k]
        if suppressed:
            row["suppressed"] = True
        if e.get("savepoint"):
            row["savepoint"] = f"{rel}:{e['savepoint']}"
        if e.get("teardown"):
            row["when"] = "teardown"
        sid = I.ident("st", [fid, row["op"], row["table"] or row.get("model"), e["ord"], row["cond"], bool(suppressed)])
        self.steps.setdefault(sid, row)
        return sid

    def take(self, fid: str, e: dict, cond: bool, suppressed: bool, depth: int, trail: frozenset, callee_point=None) -> list:
        """The steps one event contributes: itself, or a callee's steps read to ``callee_point`` (None = completion).
        Every pair's event carries ``tries`` and, aligned with it, ``try_fids`` — the function each try belongs to — so a
        try the path passes can be named whichever function's step sits inside it (§A4 V19)."""
        if e["kind"] == "fx":
            return [(self.mint(fid, e, cond, suppressed), {**e, "try_fids": (fid,) * len(e["tries"])})]
        if e["kind"] == "unresolved":
            self.unresolved.add(f"{fid.partition('::')[0]}:{e['line']}")
            return []
        if e["kind"] != "call":
            return []
        cm, cq = e["target"]
        if f"{cm.rel}::{cq}" in trail:
            return []
        force = callee_point == "cond"
        nest = callee_point if isinstance(callee_point, dict) else None   # {point, sites}: read to a call, and that callee on
        point = None if force else nest["point"] if nest else callee_point
        late = e.get("after_response", False)                 # §A4 V17: a generator the response streams runs later
        return [(sid, {**sub, "tries": e["tries"] + sub["tries"], "try_fids": (fid,) * len(e["tries"]) + sub["try_fids"],
                       **({"after_response": True} if late or sub.get("after_response") else {})})
                for sid, sub in self.of(cm, cq, depth + 1, trail | {fid}, point, cond or force, suppressed, sites=nest and nest["sites"])]

    def of(self, m, qual: str, depth: int = 0, trail: frozenset = frozenset(), point=None, cond: bool = False,
           suppressed: bool = False, sites: dict | None = None, tries_seen: list | None = None) -> list:
        """``[(step id, event)]`` in ``m::qual`` read to ``point`` (``(stack, last line)``) or to its completion.
        ``sites`` maps a call line to the point its callee is read to (``"cond"``: somewhere unknown). ``tries_seen``,
        when given, collects ``(try, fid)`` for EVERY event the path runs — a call with no step inside still sits in
        a try the path passes (§A4 V19: ``try: await delete_identity(uid) except Exception: log``)."""
        fid = f"{m.rel}::{qual}"
        node = m.defs.get(qual)
        if node is None:
            return []
        if depth > EF["depth"]:
            self.floor += 1
            return []
        key = None if sites else (fid, point, cond, suppressed, depth)
        if key is not None and key in self._memo:
            return self._memo[key]
        out = []
        evs = effect_events(self.repo, m, qual, node, self.m2t, self.widen)
        hline = next((k[1] for k in reversed(point[0]) if k[0] == "except"), None) if point else None
        T = next((t for t in ast.walk(node) if isinstance(t, P._TRY) and any(h.lineno == hline for h in t.handlers)), None) \
            if hline is not None else None                    # §A4 V9: the try whose except this path leaves through
        last_in_T = max((e["line"] for e in evs if e["kind"] == "fx" and T is not None and T in e["tries"]), default=None)
        for e in evs:
            if point is not None and e["line"] > point[1]:
                break
            if e["kind"] in ("raise", "return"):
                continue
            rel = _rel(e["stack"], point[0] if point else None)
            if rel is None:
                continue
            if tries_seen is not None and e["kind"] in ("fx", "call", "unresolved"):
                tries_seen += [(tr, fid) for tr in e["tries"]]
            in_T = T is not None and T in e["tries"]           # the exception interrupted T's body somewhere: every
            if in_T:                                          # step in it MAY have run, and a commit that ends the
                rel = "cond"                                  # body did NOT complete — it is what raised, or never ran
            failed = in_T and e["kind"] == "fx" and e["op"] == "commit" and e["line"] == last_in_T
            got = self.take(fid, e, cond or rel == "cond", suppressed or e["suppressed"], depth, trail,
                            (sites or {}).get(e["line"]) if e["kind"] == "call" else None)
            out += [(sid, {**ev, "failed": True}) for sid, ev in got] if failed else got
        if key is not None:
            self._memo[key] = out
        return out


def _qual(m, node) -> str:
    return next((q for q, n in m.defs.items() if n is node), node.name)


def _file(at) -> str:
    return str(at or "").rpartition(":")[0]


def _inside(m, qual: str, at) -> bool:
    node = m.defs.get(qual)
    return node is not None and _file(at) == m.rel and node.lineno <= I._line(at) <= (getattr(node, "end_lineno", None) or node.lineno)


# ── along a path ─────────────────────────────────────────────────────────────────────────────────────
def _dependency_state(p: dict, row: dict | None, fw_ok: bool) -> str:
    """``F.DEPENDENCY_ORDER``: which dependencies ran before this exit (verified at fastapi ≥ ``FRAMEWORK_MIN`` only)."""
    if not fw_ok:
        return "unknown"
    if p["phase"] in ("middleware", "security") or p.get("split") in ("body-parse", "dependency-params"):
        return "not-run"
    if p["phase"] == "dependency":
        return "unknown" if (row or {}).get("source") == "unverified" else "ran"
    return "ran"


def _handler_pairs(repo: Path, v: dict, m, fn, p: dict, S: _Steps) -> tuple[list, list]:
    """The handler's steps on a handler path: read to the exit's raise or return, or to the call that reached it — that
    callee read to its raise (the chain's hit gate sits at the CALLEE's raise for a translated row), a deciding callee
    to the arm the path took. An UNVERIFIED translation (the raise is deeper than the endpoint pass reads) reads the
    call it came through down to the one raise ``_a3_forms_catch.deep_raise`` finds, never past it → ``read_to``."""
    qual = _qual(m, fn)
    evs = effect_events(repo, m, qual, fn, S.m2t, S.widen)
    chain = p["chain"]
    returns = {r["id"]: r for r in v.get("returns") or []}
    sites: dict = {}
    for c in chain:                                        # a deciding call: its callee to the arm's return
        if c["kind"] == "branch" and c.get("hit"):
            b = next((b for b in v.get("branches") or [] if b["id"] == c["ref"]), None)
            rr = returns.get((b or {}).get("return"))
            ce = next((e for e in evs if e["kind"] == "call" and b and e["line"] == I._line(b["site"])), None)
            if ce is not None and rr is not None:
                cm, cq = ce["target"]
                cev = effect_events(repo, cm, cq, cm.defs[cq], S.m2t, S.widen)
                sites[ce["line"]] = _point(cev, "return", I._line(rr["at"])) if _inside(cm, cq, rr["at"]) else "cond"
    hit = next((c for c in reversed(chain) if c["kind"] == "gate" and c.get("hit")), None)
    read_to = None
    if p["exit"]["kind"] == "success":
        rr = returns.get(p["exit"]["id"])
        point = _point(evs, "return", I._line(rr["at"])) if rr and _file(rr["at"]) == m.rel else None
    elif hit is not None and _file(hit.get("at")) == m.rel and _point(evs, "raise", I._line(hit["at"])):
        point = _point(evs, "raise", I._line(hit["at"]))
        read_to = _deep_sites(repo, v, m, fn, qual, p, evs, I._line(hit["at"]), S, sites)
    else:
        site = next((c for c in reversed(chain) if c["kind"] in ("call", "collapsed") and _file(c.get("at")) == m.rel), None)
        point = _point(evs, "call", I._line(site["at"])) if site else None
        ce = next((e for e in evs if site and e["kind"] == "call" and e["line"] == I._line(site["at"])), None)
        if ce is not None and ce["line"] not in sites:
            cm, cq = ce["target"]
            cev = effect_events(repo, cm, cq, cm.defs[cq], S.m2t, S.widen)
            sites[ce["line"]] = (_point(cev, "raise", I._line(hit["at"])) or "cond") if hit and _inside(cm, cq, hit.get("at")) else "cond"
    seen: list = []
    if point is None:                                      # nowhere to stop: every step the handler could take, cond
        return S.of(m, qual, 0, cond=True, sites=sites or {0: None}, tries_seen=seen), seen, None
    return S.of(m, qual, 0, point=point, sites=sites or {0: None}, tries_seen=seen), seen, read_to


def _deep_sites(repo: Path, v: dict, m, fn, qual: str, p: dict, evs: list, line: int, S: _Steps, sites: dict) -> str | None:
    """An unverified translation raised in the handler at ``line``: when one raise two or more calls below the try is the
    only place the caught class can start (``CA.deep_raise``), the call it came through is read down to it — each call
    to the call below it, the last to that raise — and the raise site is returned. None leaves the call read whole."""
    row = next((r for r in v.get("produced") or [] if r.get("id") == p["exit"]["id"]), None)
    raise_ev = next((e for e in evs if e["kind"] == "raise" and e["line"] == line), None)
    if not row or row.get("source") != "unverified" or raise_ev is None or raise_ev.get("handler") is None:
        return None
    T, h = raise_ev["handler"]
    calls = [e for e in evs if e["kind"] == "call" and any(t is T for t in e["tries"])]
    deep = CA.deep_raise(repo, m, qual, fn, h, calls, EF["depth"])
    if deep is None:
        return None
    site, chain = deep
    cm, cq, ln = chain[-1]
    spec = _point(effect_events(repo, cm, cq, cm.defs[cq], S.m2t, S.widen), "raise", ln) or "cond"
    for cm, cq, ln in reversed(chain[:-1]):
        pt = _point(effect_events(repo, cm, cq, cm.defs[cq], S.m2t, S.widen), "call", ln)
        if pt is None:
            return None
        spec = {"point": pt, "sites": {ln: spec}}
    sites[site] = spec
    return f"{chain[-1][0].rel}:{chain[-1][2]}"


def _catch_pairs(repo: Path, p: dict, S: _Steps, through: list) -> list:
    """The handler bodies the path's exception passed (its ``catch`` entries, app handlers aside), each read to its own
    end; each try goes into ``through`` for ``failure{}``."""
    out = []
    for c in p["chain"]:
        if c["kind"] != "catch" or c.get("by") == "app handler":
            continue
        cm = P._mod(repo, _file(c.get("at")))
        fid = I.fn_at(repo, c.get("at"))
        cq = fid.partition("::")[2] if fid else None
        node = cm.defs.get(cq) if cm is not None and cq else None
        line = I._line(c.get("at"))
        pair = next(((t, h) for t in ast.walk(node) if isinstance(t, P._TRY) for h in t.handlers if h.lineno == line), None) if node is not None else None
        if pair is None:
            continue
        try_node, h = pair
        mine = []
        for e in effect_events(repo, cm, cq, node, S.m2t, S.widen):
            idx = next((i for i, f in enumerate(e["stack"]) if f[0] == "except" and f[1] == line), None)
            if idx is None or e["kind"] in ("raise", "return"):
                continue
            rel = _rel(e["stack"][idx + 1:], None)
            if rel is not None:
                mine += S.take(fid, e, rel == "cond", e["suppressed"], 0, frozenset())
        out += mine
        tries = sorted((t for t in ast.walk(node) if isinstance(t, P._TRY)), key=lambda t: t.lineno)
        through.append({"key": (fid, try_node.lineno, line), "try": try_node, "fid": fid, "at": c["at"],
                        "types": sorted(P._handler_types(h) or {"BaseException"}), "outcome": c["op"], "actions": CA.actions(h),
                        "ord": tries.index(try_node)})
    return out


def _rollup(steps: dict, seq: list, failed: set = frozenset()) -> dict:
    """Each write's last state along the path — ``committed`` · ``maybe_committed`` · ``rolled_back`` · ``uncommitted``;
    a conditional or suppressed commit or rollback may not have run, and a commit in ``failed`` — the one that raised
    into the except this path leaves through — committed nothing, so the rollback that follows it rolls back (§A4 V9).
    A step met twice on one path (a retry in an ``except``) keeps its strongest reading, in that order — a write
    committed once stays committed."""
    states = []
    for sid in seq:
        row = steps[sid]
        if row["op"] in EF["writes"]:
            states.append([sid, "pending"])
            continue
        if row["op"] not in ("commit", "rollback") or (row["op"] == "commit" and sid in failed):
            continue
        maybe = row["cond"] or row.get("suppressed")
        for s in states:
            if row["op"] == "commit":
                if s[1] == "pending":
                    s[1] = "maybe" if maybe else "committed"
                elif s[1] == "pending?":
                    s[1] = "maybe"
                elif s[1] == "maybe" and not maybe:
                    s[1] = "committed"
            elif s[1] in ("pending", "pending?"):
                s[1] = "pending?" if maybe else "rolled_back"
    out = {"committed": [], "maybe_committed": [], "rolled_back": [], "uncommitted": []}
    name = {"committed": "committed", "maybe": "maybe_committed", "rolled_back": "rolled_back", "pending": "uncommitted", "pending?": "uncommitted"}
    rank = ("committed", "maybe", "rolled_back", "pending", "pending?")
    best: dict = {}
    for sid, s in states:                                  # a step met twice (a retry in an except) keeps its strongest reading
        if sid not in best or rank.index(s) < rank.index(best[sid]):
            best[sid] = s
    for sid, _ in states:
        if sid in best:
            out[name[best.pop(sid)]].append(sid)
    return out


def _race_on_path(S: _Steps, pairs: list) -> None:
    """An add of a bound instance on a table with a unique key: ``handled`` when the first flush or commit after it on the
    path — in any function — sits in a try whose ``except IntegrityError`` returns or raises a new exception; a catch that
    re-raises does not count; otherwise ``uncaught``. The first path to meet a step keeps its reading."""
    for i, (sid, ev) in enumerate(pairs):
        row = S.steps[sid]
        if row["op"] != "add" or "race" in row or not ev.get("bound") or not S.uq.get(row.get("table")):
            continue
        nxt = next(((s2, e2) for s2, e2 in pairs[i + 1:] if S.steps[s2]["op"] in ("flush", "commit")), None)
        if nxt is None:
            continue
        state = "uncaught"
        for tr in reversed(nxt[1].get("tries") or ()):
            h = next((h for h in tr.handlers if "IntegrityError" in (P._handler_types(h) or set())), None)
            if h is not None:
                if any(a["op"] in ("return", "raise") and "in_handler" not in a for a in CA.actions(h)):
                    state = "handled"
                break
        row["race"] = {"state": state, "keys": [list(k) for k in S.uq[row["table"]]], "at": S.steps[nxt[0]]["at"]}


def endpoint_effects(repo: Path, key: str, v: dict, m, fn, dec, S: _Steps, stats: dict) -> dict:
    fw = P._framework(repo, m.rel)
    fw_ok = bool(fw and P._vt(fw[0]) >= P._vt(SH.FRAMEWORK_MIN))
    if not fw_ok:                                            # §A4 V21: a closed gate is a state, not a zero
        stats["dependency_gate"] = f"closed: fastapi {fw[0] if fw else 'unpinned'} < {SH.FRAMEWORK_MIN}"
    deps = [d for d in W._dep_order(repo, m, fn, dec) if d.get("node") is not None]
    dep_pairs = {d["fid"]: S.of(d["m"], _qual(d["m"], d["node"])) for d in deps}
    rows = {r.get("id"): r for r in v.get("produced") or []}
    commits: dict = {"endpoint": set(), "dependency": set()}
    refusal_own, refusal_inherited = [], []
    catches: dict = {}
    for p in v.get("paths") or []:
        row = rows.get(p["exit"]["id"])
        state = _dependency_state(p, row, fw_ok)
        before, after, through = [], [], []
        if state == "ran" and p["phase"] == "dependency":   # the dependencies before the raising one, then it to its raise
            raiser = next((d for d in deps if d["fid"] == (row or {}).get("dep")), None)
            for d in deps:
                if d is raiser:
                    hit = next((c for c in reversed(p["chain"]) if c["kind"] == "gate" and c.get("hit")), None)
                    dq = _qual(d["m"], d["node"])
                    dev = effect_events(repo, d["m"], dq, d["node"], S.m2t, S.widen)
                    pt = _point(dev, "raise", I._line(hit["at"])) if hit and _inside(d["m"], dq, hit.get("at")) else None
                    before += S.of(d["m"], dq, point=pt) if pt else S.of(d["m"], dq, cond=True)
                    break
                before += dep_pairs[d["fid"]]
        elif state == "ran":
            for d in deps:
                for pr in dep_pairs[d["fid"]]:
                    (after if pr[1].get("teardown") else before).append(pr)
        dep_n = len(before)
        body, passed, read_to = [], [], None
        if p["phase"] == "handler" and p["exit"]["kind"] in ("refusal", "success"):
            body, passed, read_to = _handler_pairs(repo, v, m, fn, p, S)
        body += _catch_pairs(repo, p, S, through)
        pairs = before + body + after
        origin = ["dependency"] * dep_n + ["endpoint"] * len(body) + ["dependency"] * len(after)
        late = [(sid, ev) for sid, ev in pairs if ev.get("after_response")]          # §A4 V17: streamed after the exit
        if late:
            keep = [i for i, (_, ev) in enumerate(pairs) if not ev.get("after_response")]
            pairs, origin = [pairs[i] for i in keep], [origin[i] for i in keep]
        _race_on_path(S, pairs)
        seq = [sid for sid, _ in pairs]
        failed = {sid for sid, ev in pairs if ev.get("failed")}                      # §A4 V9: the commit that raised
        eff = {"steps": [{"step": sid, "via": S.steps[sid]["fn"], **({"dependency": True} if o == "dependency" else {}),
                          **({"failed": True} if sid in failed else {})} for sid, o in zip(seq, origin)],
               **_rollup(S.steps, seq, failed), "dependency": state}
        if late:
            eff["after_response"] = [{"step": sid, "via": S.steps[sid]["fn"]} for sid, _ in late]
        if read_to:                                          # the raise an unverified translation was read to, calls below
            eff["read_to"] = read_to
        p["effects"] = eff
        for (sid, _), o in zip(pairs, origin):
            if S.steps[sid]["op"] == "commit":
                commits[o].add(sid)
        if p["exit"]["kind"] == "refusal":
            kept = set(eff["committed"]) | set(eff["maybe_committed"])
            own = {sid for (sid, _), o in zip(pairs, origin) if o == "endpoint" and sid in kept}
            if own:
                refusal_own.append(p["id"])
            elif kept:
                refusal_inherited.append(p["id"])
        seen_keys = {t["key"] for t in through}                # §A4 V19: every try the path's flow passes — a
        on_path = [(tr, tfid) for _, ev in pairs for tr, tfid in zip(ev.get("tries") or (), ev.get("try_fids") or ())] + passed
        for tr, tfid in on_path:                               # swallowing handler never minted an exit, so it was
            if True:                                           # never on the chain
                for h in tr.handlers:
                    key = (tfid, tr.lineno, h.lineno)
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)
                    om = P._mod(repo, tfid.partition("::")[0])
                    onode = om.defs.get(tfid.partition("::")[2]) if om is not None else None
                    if onode is None:
                        continue
                    ohev: dict = {}
                    for oe in P._events(onode):
                        if oe["handler"] is not None:
                            ohev.setdefault(id(oe["handler"][1]), []).append(oe)
                    tries = sorted((t for t in ast.walk(onode) if isinstance(t, P._TRY)), key=lambda t: t.lineno)
                    through.append({"key": key, "try": tr, "fid": tfid, "at": f"{om.rel}:{h.lineno}", "passed": True,
                                    "types": sorted(P._handler_types(h) or {"BaseException"}), "outcome": CA.classify(h, ohev),
                                    "actions": CA.actions(h), "ord": tries.index(tr)})
        for t in through:
            c = catches.setdefault(t["key"], {"id": I.ident("c", [t["fid"], t["types"], t["ord"]]), "fn": t["fid"], "at": t["at"],
                                              "types": t["types"], "outcome": t["outcome"], "actions": t["actions"],
                                              "writes": [], "commits": [], "answers": [], "paths": []})
            c["paths"].append(p["id"])
            if t["outcome"] in ("translate", "return") and not t.get("passed") and p.get("status") is not None \
                    and p["status"] not in c["answers"]:      # a try the path only PASSED answered nothing on it
                c["answers"].append(p["status"])
            for sid, ev in pairs:
                if any(tr is t["try"] for tr in ev.get("tries") or ()):
                    bucket = "commits" if S.steps[sid]["op"] == "commit" else "writes" if S.steps[sid]["op"] in EF["writes"] else None
                    if bucket and sid not in c[bucket]:
                        c[bucket].append(sid)
        stats["steps_on_paths"] += len(seq)
        stats["dependency"][state] = stats["dependency"].get(state, 0) + 1
    every = sorted(commits["endpoint"] | commits["dependency"])
    for p in v.get("paths") or []:
        if p["exit"]["kind"] == "uncaught":
            p["effects"]["may_follow_commits"] = every
    if catches:
        v["failure"] = {"state": "defined", "catches": [dict(c, answers=sorted(c["answers"]), paths=sorted(set(c["paths"])))
                                                         for _, c in sorted(catches.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2]))]}
        stats["catches"] += len(catches)
    return {"commits": commits, "refusal_own": refusal_own, "refusal_inherited": refusal_inherited}


def run(forms: dict, ctx: dict) -> dict:
    """The effects arm: ``steps{}``, ``paths[].effects``, ``failure{}`` and race facts; findings ``refusal-writes`` and
    ``safe-method-commits`` count the endpoint's own writes and commits — a dependency's are its form's
    ``dependency-commits``."""
    repo = Path(ctx["repo"])
    _EVENTS.clear()
    widen = bool(F.OPTIONS.get("effects_widenings", True))
    m2t, uq = models(repo, ctx["amap"])
    S = _Steps(repo, m2t, uq, widen)
    stats = {"steps": 0, "steps_on_paths": 0, "floor": 0, "unresolved": 0, "races": {}, "commit_sites": 0, "catches": 0,
             "dependency": {}, "widenings": {}, "findings": {}, "refusal_writes_inherited": 0, "safe_method_commits_inherited": 0}
    for key, v, m, fn, dec in MW._handlers(repo, forms):
        if not v.get("paths"):
            continue
        got = endpoint_effects(repo, key, v, m, fn, dec, S, stats)
        found = []
        if got["refusal_own"]:
            found.append({"id": "refusal-writes", "slot": "U9", "endpoint": key, "paths": sorted(got["refusal_own"])})
        elif got["refusal_inherited"]:
            stats["refusal_writes_inherited"] += 1
        if str(v.get("method") or "").upper() in EF["safe_methods"]:
            if got["commits"]["endpoint"]:
                found.append({"id": "safe-method-commits", "slot": "U9", "endpoint": key, "commits": sorted(got["commits"]["endpoint"])})
            elif got["commits"]["dependency"]:
                stats["safe_method_commits_inherited"] += 1
        for f in found:
            v.setdefault("arm_findings", {}).setdefault("effects", []).append(f)
            stats["findings"][f["id"]] = stats["findings"].get(f["id"], 0) + 1
    forms["steps"] = dict(sorted(S.steps.items()))
    for _, state in sorted({(r["at"], r["race"]["state"]) for r in S.steps.values() if "race" in r}):   # one add site, one race
        stats["races"][state] = stats["races"].get(state, 0) + 1
    for r in S.steps.values():
        if r.get("widening"):
            stats["widenings"][r["widening"]] = stats["widenings"].get(r["widening"], 0) + 1
    if str(stats.get("dependency_gate", "")).startswith("closed"):   # nothing inherited could be counted
        stats["refusal_writes_inherited"] = stats["safe_method_commits_inherited"] = "unknown"
    else:
        stats["dependency_gate"] = "open"
    stats.update(steps=len(S.steps), floor=S.floor, unresolved=len(S.unresolved),
                 commit_sites=len({r["at"] for r in S.steps.values() if r["op"] == "commit"}))
    return {"version": 1, "stats": stats, "options": {"depth": EF["depth"], "widenings": widen}}
