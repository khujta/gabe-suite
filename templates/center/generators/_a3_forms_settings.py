"""Element forms — the SETTINGS resolver the generation arms share (amendment 1).

A refusal's condition often reads a setting through an object: ``if not self._enabled`` in a middleware whose
``__init__`` did ``s = settings or get_settings()`` then ``self._enabled = s.rate_limit_active``, where
``rate_limit_active`` is a one-return ``@property`` on the pydantic ``BaseSettings`` class. This module follows that
chain to the real fields — ``settings.rate_limit_enabled or settings.is_production`` — expands every one-return
property it meets, each once and transitively (``expands``), names any property it cannot expand (``unresolved``), and
reads each field's annotation, default and environment variable (the class and its project bases; ``env_prefix`` ·
``alias`` / ``validation_alias`` / ``AliasChoices`` · ``case_sensitive``). An attribute assigned on a branch or more than
once stays ``opaque`` with its assignments listed. It also resolves module constants (``EXEMPT_PATHS`` →
``("/healthz",)``), splits a condition into resolved terms, and simplifies it three-valued once some terms are known.
Anything it cannot prove stays verbatim as ``kind: "opaque"``.
"""
from __future__ import annotations

import ast
import copy
import keyword
import re
from pathlib import Path

import _a3_paths as P
from _a3_stacks_pydi import _ann_name

_SETTINGS_BASES = frozenset({"BaseSettings"})
_CHAIN_DEPTH = 4          # base classes read, nearest first
_EXPAND_CAP = 16          # properties expanded for one attribute


def _class(repo: Path, m, name: str | None, at=None):
    r = P._resolve(repo, m, name, at=at)
    return (r[0], r[0].classes[r[1]]) if r and r[1] in r[0].classes else None


def _chain(repo: Path, m, node: ast.ClassDef) -> list[tuple]:
    """The class and its project-resolvable bases, nearest first, each class once."""
    out, todo, seen = [], [(m, node, 0)], set()
    while todo:
        cm, c, depth = todo.pop(0)
        if (cm.rel, c.name) in seen:
            continue
        seen.add((cm.rel, c.name))
        out.append((cm, c))
        if depth < _CHAIN_DEPTH:
            for b in c.bases:
                got = _class(repo, cm, P._leaf(b))
                if got:
                    todo.append((got[0], got[1], depth + 1))
    return out


def _is_settings(repo: Path, cm, node: ast.ClassDef) -> bool:
    return (any({P._leaf(b) for b in c.bases} & _SETTINGS_BASES for _, c in _chain(repo, cm, node))
            or bool(P._bases(repo, cm, node.name) & _SETTINGS_BASES))


def _lookup(chain: list[tuple], attr: str):
    for cm, c in chain:
        node = cm.defs.get(f"{c.name}.{attr}")
        if node is not None:
            return node
    return None


def _one_return(node) -> ast.AST | None:
    """The value of a ``@property`` whose body (docstring aside) is exactly one ``return``."""
    if node is None or not any(P._leaf(d) == "property" for d in node.decorator_list):
        return None
    body = [s for s in node.body if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
    return body[0].value if len(body) == 1 and isinstance(body[0], ast.Return) and body[0].value is not None else None


class _Rename(ast.NodeTransformer):
    def __init__(self, subject: str) -> None:
        self.subject = subject

    def visit_Name(self, node: ast.Name):
        return ast.copy_location(ast.Name(id=self.subject, ctx=node.ctx), node) if node.id == "self" else node


def _renamed(expr, subject: str) -> str:
    return ast.unparse(_Rename(subject).visit(ast.parse(ast.unparse(expr), mode="eval").body))


def _const(v):
    return v.value if isinstance(v, ast.Constant) else None


def _str(v) -> str | None:
    c = _const(v)
    return c if isinstance(c, str) else None


def _config(chain: list[tuple]) -> tuple[str, bool]:
    """``(env_prefix, case_sensitive)`` from ``model_config = SettingsConfigDict(…)`` / ``{…}`` or pydantic v1's
    ``class Config`` — the nearest class that sets a key wins."""
    found: dict = {}
    keys = ("env_prefix", "case_sensitive")
    for _, c in chain:
        for it in c.body:
            if isinstance(it, ast.ClassDef) and it.name == "Config":
                for s in it.body:
                    if isinstance(s, ast.Assign):
                        for t in s.targets:
                            if isinstance(t, ast.Name) and t.id in keys:
                                found.setdefault(t.id, _const(s.value))
                continue
            tgt = it.targets[0] if isinstance(it, ast.Assign) and it.targets else it.target if isinstance(it, ast.AnnAssign) else None
            if getattr(tgt, "id", None) != "model_config":
                continue
            if isinstance(it.value, ast.Call):
                for kw in it.value.keywords:
                    if kw.arg in keys:
                        found.setdefault(kw.arg, _const(kw.value))
            elif isinstance(it.value, ast.Dict):
                for k, v in zip(it.value.keys, it.value.values):
                    if _str(k) in keys:
                        found.setdefault(_str(k), _const(v))
    prefix = found.get("env_prefix")
    return (prefix if isinstance(prefix, str) else ""), found.get("case_sensitive") is True


def _is_classvar(ann) -> bool:
    return P._leaf(ann.value if isinstance(ann, ast.Subscript) else ann) == "ClassVar"


def fields(repo, cm, node: ast.ClassDef) -> dict[str, dict]:
    """Every annotated field of a settings class and its project bases: ``{name: {annotation, default, env, …}}`` —
    ``required`` when there is no default, ``default_factory`` when one builds it, ``env`` from ``alias`` /
    ``validation_alias`` (the prefix never applies) else ``env_prefix + name``, upper-cased unless ``case_sensitive``;
    ``env_choices`` lists an ``AliasChoices``. ``ClassVar`` names are not fields."""
    chain = _chain(Path(repo), cm, node)
    prefix, case_sensitive = _config(chain)
    out: dict[str, dict] = {}
    for _, c in reversed(chain):                          # bases first; the class itself overrides
        for it in c.body:
            if not (isinstance(it, ast.AnnAssign) and isinstance(it.target, ast.Name)) or it.target.id == "model_config":
                continue
            if _is_classvar(it.annotation):
                continue
            row: dict = {"annotation": P._unp(it.annotation)}
            default, alias = it.value, None
            if isinstance(default, ast.Call) and P._leaf(default.func) == "Field":
                call = default
                default = next((k.value for k in call.keywords if k.arg == "default"), call.args[0] if call.args else None)
                factory = next((k.value for k in call.keywords if k.arg == "default_factory"), None)
                if factory is not None:
                    row["default_factory"] = P._unp(factory)
                for name in ("validation_alias", "alias"):
                    a = next((k.value for k in call.keywords if k.arg == name), None)
                    if _str(a):
                        alias = [_str(a)]
                    elif isinstance(a, ast.Call) and P._leaf(a.func) == "AliasChoices":
                        alias = [_str(x) for x in a.args if _str(x)] or None
                    if alias:
                        break
            if isinstance(default, ast.Constant) and default.value is Ellipsis:
                default = None
            if default is None and "default_factory" not in row:
                row["required"] = True
            row["default"] = P._unp(default) if default is not None else None
            names = alias or [prefix + it.target.id]
            names = names if case_sensitive else [n.upper() for n in names]
            row["env"] = names[0]
            if len(names) > 1:
                row["env_choices"] = names
            out[it.target.id] = row
    return out


def _typed_local(repo: Path, m, init, name: str):
    """The class a local of ``__init__`` holds: its annotation, else ``s = settings or get_settings()`` → the parameter's
    annotation, a constructor call, or the called function's return annotation. None when nothing names a project class."""
    ann = value = None
    for st in ast.walk(init):
        if isinstance(st, ast.AnnAssign) and getattr(st.target, "id", None) == name:
            ann, value = st.annotation, st.value
            break
        if isinstance(st, ast.Assign) and any(getattr(t, "id", None) == name for t in st.targets):
            value = st.value
            break
    if ann is not None:
        got = _class(repo, m, _ann_name(ann))
        if got:
            return got
    if value is None:
        return _class(repo, m, _ann_name(P._param_ann(init, name)))
    for c in (value.values if isinstance(value, ast.BoolOp) else [value]):
        got = None
        if isinstance(c, ast.Name):
            got = _class(repo, m, _ann_name(P._param_ann(init, c.id)))
        elif isinstance(c, ast.Call):
            got = _class(repo, m, P._leaf(c.func), at=c)           # a constructor: Settings()
            if got is None:
                r = P._resolve(repo, m, P._leaf(c.func), at=c)
                got = _class(repo, r[0], _ann_name(r[0].defs[r[1]].returns)) if r and r[1] in r[0].defs else None
        if got:
            return got
    return None


def _self_assigns(init, attr: str) -> list[tuple]:
    """Every ``self.<attr>`` write in ``__init__``, in source order: ``(value | None for an augmented write, conditional)``."""
    out: list[tuple] = []

    def hit(t) -> bool:
        return isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "self" and t.attr == attr

    def visit(stmts, cond: bool) -> None:
        for st in stmts:
            if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            if isinstance(st, ast.Assign) and any(hit(t) for t in st.targets):
                out.append((st.value, cond))
            elif isinstance(st, ast.AnnAssign) and st.value is not None and hit(st.target):
                out.append((st.value, cond))
            elif isinstance(st, ast.AugAssign) and hit(st.target):
                out.append((None, cond))
            if isinstance(st, (ast.If, ast.For, ast.AsyncFor, ast.While)):
                visit(st.body, True)
                visit(st.orelse, True)
            elif isinstance(st, (ast.With, ast.AsyncWith)):
                visit(st.body, cond)
            elif isinstance(st, P._TRY):
                visit(st.body, cond)
                for h in st.handlers:
                    visit(h.body, True)
                visit(st.orelse, cond)
                visit(st.finalbody, cond)
            elif isinstance(st, ast.Match):
                for case in st.cases:
                    visit(case.body, True)

    visit(init.body, False)
    return out


def _expand(chain: list[tuple], expr: str, subject: str, flds: dict) -> tuple[dict, set, set]:
    """Expand every one-return property ``expr`` reaches, each once, to a fixed point → ``(expands, field leaves, unresolved)``."""
    expands: dict[str, str] = {}
    leaves: set[str] = set()
    unresolved: set[str] = set()
    todo = [expr]
    while todo:
        src = todo.pop(0)
        for n in ast.walk(ast.parse(src, mode="eval")):
            if not (isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == subject):
                continue
            key = f"{subject}.{n.attr}"
            if n.attr in flds:
                leaves.add(n.attr)
            elif key not in expands and key not in unresolved:
                ret = _one_return(_lookup(chain, n.attr)) if len(expands) < _EXPAND_CAP else None
                if ret is None:
                    unresolved.add(key)
                else:
                    expands[key] = _renamed(ret, subject)
                    todo.append(expands[key])
    return expands, leaves, unresolved


def resolve_self_attr(repo, m, cls_name: str, attr: str) -> dict:
    """``self.<attr>`` inside ``cls_name`` → ``{kind, expr, settings_class?, expands?, fields?, unresolved?, reason?}``."""
    repo = Path(repo)
    opaque = {"kind": "opaque", "expr": f"self.{attr}"}
    r = _class(repo, m, cls_name)
    if r is None:
        return {**opaque, "reason": "class not found"}
    cm, cls = r
    init = cm.defs.get(f"{cls.name}.__init__")
    found = _self_assigns(init, attr) if init is not None else []
    if not found:
        return {**opaque, "reason": "not assigned in __init__"}
    last = max((i for i, (_, cond) in enumerate(found) if not cond), default=None)
    if last is None or found[last][0] is None or any(cond for _, cond in found[last + 1:]):
        return {**opaque, "reason": "assigned conditionally or more than once in __init__",
                "assignments": [P._unp(v, 160) if v is not None else "augmented" for v, _ in found]}
    value = found[last][0]
    if not (isinstance(value, ast.Attribute) and isinstance(value.value, ast.Name)):
        return {**opaque, "expr": P._unp(value, 160), "reason": "not a settings attribute"}
    held = _typed_local(repo, cm, init, value.value.id)
    if held is None or not _is_settings(repo, *held):
        return {**opaque, "expr": P._unp(value, 160), "reason": "the receiver is not a settings class"}
    sm, scls = held
    chain = _chain(repo, sm, scls)
    subject = scls.name.lower()
    if keyword.iskeyword(subject):
        subject += "_"
    flds = fields(repo, sm, scls)
    if value.attr in flds:
        expr = f"{subject}.{value.attr}"
    else:
        ret = _one_return(_lookup(chain, value.attr))
        if ret is None:
            return {**opaque, "expr": f"{subject}.{value.attr}",
                    "reason": "a method, a property with more than one return, or not declared on the class or its bases"}
        expr = _renamed(ret, subject)
    expands, leaves, unresolved = _expand(chain, expr, subject, flds)
    out = {"kind": "expr", "expr": expr, "settings_class": f"{sm.rel}::{scls.name}"}
    if expands:
        out["expands"] = dict(sorted(expands.items()))
    used = {k: flds[k] for k in sorted(leaves)}
    if used:
        out["fields"] = used
    if unresolved:
        out["unresolved"] = sorted(unresolved)
    return out


def resolve_const(repo, m, name: str):
    """A module constant by name, following one import: ``EXEMPT_PATHS`` → ``("/healthz",)``; None when unknown or when
    the module reassigns it to something else (``X = X + (…)``, ``X += …``)."""
    r = P._resolve(Path(repo), m, name)
    if not r:
        return None
    mod, local = r
    v = mod.consts.get(local)
    if v is None or P._literal(mod.assigns.get(local)) != v:
        return None
    if any(isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name) and n.target.id == local for n in mod.tree.body):
        return None
    return v


def _helper_subject(repo: Path, m, call: ast.Call, at=None) -> str | None:
    """``is_hot(request.url.path)`` whose one-return body is ``path.startswith(…)`` → ``request.url.path``: the startswith
    receiver with the helper's parameter replaced by the argument bound to it. None when it cannot be proven. ``at``: where
    the guard is written (the text carries no position) — a helper the method imports in its own body."""
    if not isinstance(call.func, ast.Name):
        return None
    r = P._resolve(repo, m, call.func.id, at=at)
    fn = r[0].defs.get(r[1]) if r else None
    if fn is None:
        return None
    body = [s for s in fn.body if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
    ret = body[0].value if len(body) == 1 and isinstance(body[0], ast.Return) else None
    if not (isinstance(ret, ast.Call) and isinstance(ret.func, ast.Attribute) and ret.func.attr == "startswith"):
        return None
    bind = dict(zip([a.arg for a in fn.args.posonlyargs + fn.args.args], call.args))
    bind.update({k.arg: k.value for k in call.keywords if k.arg})
    root = ret.func.value
    while isinstance(root, ast.Attribute):
        root = root.value
    if not (isinstance(root, ast.Name) and root.id in bind):
        return None

    class _Bind(ast.NodeTransformer):
        def visit_Name(self, node: ast.Name):
            return bind[node.id] if node.id == root.id else node

    return ast.unparse(_Bind().visit(copy.deepcopy(ret.func.value)))


def terms(repo, m, cls_name: str | None, src: str, at=None) -> list[dict]:
    """Each leaf term of a condition, resolved where the source proves it — ``not`` · ``and`` · ``or`` are walked, never a
    term: ``self.<attr>`` → :func:`resolve_self_attr` · ``x in CONST`` / ``x not in CONST`` → the constant's values ·
    ``x.startswith(CONST)``, directly or through a one-return helper (``_a3_paths._path_prefixes``) → the prefixes, with
    the tested expression as ``subject`` · anything else ``opaque``, verbatim. ``at``: where the condition is written in
    ``m`` (a node, line or site) — a helper it calls is read there (``_a3_paths_read``'s scoped-import rule)."""
    repo = Path(repo)
    try:
        node = ast.parse(src, mode="eval").body
    except SyntaxError:
        return [{"src": src, "kind": "opaque", "reason": "unparseable"}]

    def leaf(n) -> dict:
        s = ast.unparse(n)
        if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == "self" and cls_name:
            return {"src": s, **{k: v for k, v in resolve_self_attr(repo, m, cls_name, n.attr).items() if k != "expr" or v != s}}
        if isinstance(n, ast.Compare) and len(n.ops) == 1 and isinstance(n.ops[0], (ast.In, ast.NotIn)):
            right = n.comparators[0]
            vals = resolve_const(repo, m, right.id) if isinstance(right, ast.Name) else P._literal(right)
            if vals is not None:
                return {"src": s, "kind": "not-in" if isinstance(n.ops[0], ast.NotIn) else "in", "subject": ast.unparse(n.left),
                        "values": list(vals) if isinstance(vals, tuple) else [vals]}
        if isinstance(n, ast.Call):
            prefixes = P._path_prefixes(s, m, repo, at=at)
            direct = isinstance(n.func, ast.Attribute) and n.func.attr == "startswith" and bool(n.args)
            if prefixes is None and direct and isinstance(n.args[0], ast.Name):
                v = resolve_const(repo, m, n.args[0].id)          # an imported constant — _path_prefixes reads local ones
                prefixes = (v,) if isinstance(v, str) else v if isinstance(v, tuple) else None
            if prefixes is not None:
                subject = ast.unparse(n.func.value) if direct else _helper_subject(repo, m, n, at=at)
                return {"src": s, "kind": "startswith", "subject": subject, "values": list(prefixes)}
        return {"src": s, "kind": "opaque"}

    out: list[dict] = []

    def walk(n) -> None:
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.Not):
            walk(n.operand)
        elif isinstance(n, ast.BoolOp):
            for v in n.values:
                walk(v)
        else:
            out.append(leaf(n))

    walk(node)
    return out


def evaluate(src: str, known: dict) -> tuple:
    """Three-valued simplification of a boolean condition: ``known`` maps a term's source to True/False; returns
    ``(True | False | None, residual source)``. ``not`` · ``and`` · ``or`` fold; every other term is looked up whole."""
    def ev(node):
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            v, r = ev(node.operand)
            if v is not None:
                return (not v), None
            return None, (r.operand if isinstance(r, ast.UnaryOp) and isinstance(r.op, ast.Not) else ast.UnaryOp(op=ast.Not(), operand=r))
        if isinstance(node, ast.BoolOp):
            is_or = isinstance(node.op, ast.Or)
            rest = []
            for val in node.values:
                v, r = ev(val)
                if v is (True if is_or else False):
                    return v, None
                if v is None:
                    rest.append(r)
            if not rest:
                return (not is_or), None
            return None, (rest[0] if len(rest) == 1 else ast.BoolOp(op=node.op, values=rest))
        key = ast.unparse(node)
        return (known[key], None) if key in known and known[key] is not None else (None, node)
    try:
        v, r = ev(ast.parse(src, mode="eval").body)
    except SyntaxError:
        return None, src
    return v, (ast.unparse(r) if r is not None else None)


PATH_SUBJECTS = frozenset({"request.url.path", "scope['path']", 'scope["path"]'})


def locals_once(fn) -> dict[str, str]:
    """``{name: source}`` for each local ``fn`` assigns exactly once — ``path = request.url.path``."""
    seen: dict[str, list] = {}
    for st in ast.walk(fn):
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            seen.setdefault(st.targets[0].id, []).append(st.value)
    return {k: ast.unparse(v[0]) for k, v in seen.items() if len(v) == 1}


def is_path(subject: str | None, subst: dict | None = None) -> bool:
    """Whether a tested expression is the request path — written out, or through a local assigned once."""
    s = (subst or {}).get(subject or "", subject or "")
    return s in PATH_SUBJECTS or s.endswith(".url.path")


def path_match(full_path: str | None, kind: str, values) -> bool | None:
    """Whether a request on the route ``full_path`` passes ``in`` (exact) or ``startswith`` against ``values``. A route
    is a TEMPLATE — ``/orders/{oid}`` answers True or False only when every value of its parameters answers the same,
    otherwise None."""
    fp = full_path or ""
    vals = [v for v in (values or ()) if isinstance(v, str)]
    if "{" not in fp:
        return any(fp.startswith(v) for v in vals) if kind == "startswith" else fp in vals
    head = fp.split("{", 1)[0]
    if kind == "startswith":
        if any(head.startswith(v) for v in vals):
            return True
        return None if any(v.startswith(head) for v in vals) else False
    rx = "".join(("[^/]+" if ":path}" not in seg else ".+") if seg.startswith("{") else re.escape(seg)
                 for seg in re.split(r"(\{[^}]*\})", fp))
    return None if any(re.fullmatch(rx, v) for v in vals) else False
