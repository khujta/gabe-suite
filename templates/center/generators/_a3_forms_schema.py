"""Element forms — the SHORT arm's SCHEMA form and the 422 cases (amendment 1 §A2 Slice 4 · A6 · critic gap G2).

A request schema decides which bodies FastAPI refuses with 422, and pydantic names every refusal: a missing field, a
string too long, an unknown extra key, a validator's ``ValueError``. This part reads every request schema — the ones the
archmap lists and every class a handler or a nested field names (``claimed: false``) — into ``schemas{}``, keyed
``schema:<Cls>`` (same-named classes in different files become ``variants``), then turns every validation row into
``cases[]``: one per rule a request can break, with the pydantic error type (``_a3_forms_short``), the full ``loc`` by
each field's validation alias, and the line that holds the rule. Parameters are located the way FastAPI's
``analyze_param`` does; a dependency's own parameters are read too (FastAPI validates them before the handler), a
dependency factory's Python arguments are named ``unread``. A validator that calls a repo helper is followed ONE level
with the call-site keywords substituted, so a guard or an early return those keywords decide drops its rule; an
allow-list read at runtime reads ``allowed: unknown``. Per-annotation type errors collapse to ``types: "collapsed"``.
It also builds the body-parse ``framework_exits[]`` FastAPI answers before any dependency runs.
"""
from __future__ import annotations

import ast
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_falsify as _FAL  # the shared falsification leaf (§A4 RC-A)
import _a3_forms_ids as I
import _a3_forms_model as MD  # the model and migration parts (Slice 10a)
import _a3_forms_mirror as MR  # the mirror part (Slice 10c)
import _a3_forms_setting as ST  # the setting part (Slice 10b)
import _a3_forms_mw as MW
import _a3_forms_short as SH
import _a3_paths as P

PARTS = ("schema", "model", "migration", "setting", "mirror")
_ENUM_BASES = frozenset({"Enum", "StrEnum", "IntEnum"})
_VALIDATORS = frozenset({"field_validator", "validator", "model_validator", "root_validator"})
_SEQ = {"list": "list", "List": "list", "Sequence": "list", "set": "set", "Set": "set", "frozenset": "frozenset",
        "tuple": "tuple", "Tuple": "tuple", "dict": "dict", "Dict": "dict", "Mapping": "dict"}
_SCALARS = frozenset({"str", "int", "float", "bool", "bytes", "UUID", "date", "datetime", "time", "timedelta", "Decimal"})
_COMPLEX = frozenset({"list", "set", "frozenset", "tuple", "dict", "model", "upload"})


# ── constants ────────────────────────────────────────────────────────────────────────────────────────
def const_value(repo: Path, m, node, depth: int = 0):
    """An int/float/str scalar or a tuple of them — a literal, ``frozenset({…})``, or a module constant one import away."""
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float, str)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant) \
            and isinstance(node.operand.value, (int, float)):
        return -node.operand.value
    if isinstance(node, (ast.Tuple, ast.List, ast.Set)):
        vals = [const_value(repo, m, e, depth + 1) for e in node.elts]
        return tuple(vals) if vals and all(v is not None for v in vals) else None
    if isinstance(node, ast.Call) and P._leaf(node.func) in ("frozenset", "set", "tuple", "list") and len(node.args) == 1:
        return const_value(repo, m, node.args[0], depth + 1)
    if isinstance(node, ast.Name) and m is not None and depth < 4:
        r = P._resolve(repo, m, node.id)
        if r and r[1] in r[0].assigns:
            return const_value(repo, r[0], r[0].assigns[r[1]], depth + 1)
    return None


def _class_attr(repo: Path, chain: list, attr: str):
    """``cls.CODES`` / ``Model.CODES`` → the class-body constant, nearest class first."""
    for cm, c in chain:
        for it in c.body:
            tgt = it.targets[0] if isinstance(it, ast.Assign) and len(it.targets) == 1 else it.target if isinstance(it, ast.AnnAssign) else None
            if isinstance(tgt, ast.Name) and tgt.id == attr and getattr(it, "value", None) is not None:
                return const_value(repo, cm, it.value)
    return None


# ── classes ──────────────────────────────────────────────────────────────────────────────────────────
def _base_refs(repo: Path, m, node: ast.ClassDef) -> list[tuple]:
    """Each base of ``node`` → ``(original name, (module, qual) | None)`` through an import alias (``BaseModel as PM``) and
    a module attribute (``b.Base``); a generic base (``Page[T]``) reads its class."""
    out = []
    for b in node.bases:
        b = b.value if isinstance(b, ast.Subscript) else b
        if isinstance(b, ast.Name):
            imp = m.imports.get(b.id)
            name, r = (imp[1] if imp and imp[1] else b.id), P._resolve(repo, m, b.id)
        elif isinstance(b, ast.Attribute) and isinstance(b.value, ast.Name):
            imp = m.imports.get(b.value.id)
            name = b.attr
            r = P._resolve(repo, P._mod(repo, imp[0]), b.attr) if imp and imp[0] and imp[1] is None else None
        else:
            continue
        out.append((name, r if r and r[1] in r[0].classes else None))
    return out


def _chain(repo: Path, m, node: ast.ClassDef) -> list[tuple]:
    """``node`` and its project bases, nearest first, each class once."""
    out, todo, seen = [], [(m, node)], set()
    while todo and len(out) < 16:
        cm, c = todo.pop(0)
        if (cm.rel, c.name) in seen:
            continue
        seen.add((cm.rel, c.name))
        out.append((cm, c))
        todo += [(r[0], r[0].classes[r[1]]) for _, r in _base_refs(repo, cm, c) if r]
    return out


def _is_model(repo: Path, m, node: ast.ClassDef) -> bool:
    return any(name in SH.MODEL_BASES for cm, c in _chain(repo, m, node) for name, _ in _base_refs(repo, cm, c))


def _model_config(repo: Path, chain: list) -> dict:
    """``extra`` (+ its line) and ``alias_generator`` from ``class X(BaseModel, extra=…)``, ``model_config = ConfigDict(…)``
    / ``{…}`` / a named ConfigDict constant, or ``class Config``; nearest class first."""
    out: dict = {}

    def word(v):
        if isinstance(v, ast.Constant) and isinstance(v.value, str):
            return v.value
        return v.attr if isinstance(v, ast.Attribute) else v.id if isinstance(v, ast.Name) else None

    def take(key, v, at):
        if key == "extra" and "extra" not in out and word(v):
            out["extra"], out["extra_at"] = word(v), at
        elif key == "alias_generator" and "alias_generator" not in out and P._leaf(v) in SH.ALIAS_GENERATORS:
            out["alias_generator"] = P._leaf(v)

    for cm, c in chain:
        for kw in c.keywords:
            take(kw.arg, kw.value, f"{cm.rel}:{c.lineno}")
        for it in c.body:
            if isinstance(it, ast.ClassDef) and it.name == "Config":
                for s in it.body:
                    if isinstance(s, ast.Assign) and isinstance(s.targets[0], ast.Name):
                        take(s.targets[0].id, s.value, f"{cm.rel}:{s.lineno}")
                continue
            tgt = it.targets[0] if isinstance(it, ast.Assign) and it.targets else it.target if isinstance(it, ast.AnnAssign) else None
            if getattr(tgt, "id", None) != "model_config" or getattr(it, "value", None) is None:
                continue
            val = it.value
            if isinstance(val, ast.Name):
                r = P._resolve(repo, cm, val.id)
                val = r[0].assigns.get(r[1]) if r else None
            if isinstance(val, ast.Call):
                for kw in val.keywords:
                    take(kw.arg, kw.value, f"{cm.rel}:{it.lineno}")
            elif isinstance(val, ast.Dict):
                for k, v in zip(val.keys, val.values):
                    if isinstance(k, ast.Constant):
                        take(k.value, v, f"{cm.rel}:{it.lineno}")
    return out


def _alias_of(name: str, generator: str | None) -> str | None:
    style = SH.ALIAS_GENERATORS.get(generator or "")
    parts = name.split("_")
    if style == "camel":
        return parts[0] + "".join(p.title() for p in parts[1:])
    if style == "pascal":
        return "".join(p.title() for p in parts)
    return None


# ── annotations ──────────────────────────────────────────────────────────────────────────────────────
def _constraints(repo: Path, m, call: ast.Call) -> dict:
    """The rule keywords of a Field / Query / constr / StringConstraints call; a keyword the registry does not know keeps
    its source and becomes a ``type: unknown`` case."""
    out = {}
    for kw in call.keywords:
        if not kw.arg or kw.arg in SH.NON_RULE_KEYWORDS:
            continue
        name = SH.V1_KEYWORDS.get(kw.arg, kw.arg)
        if name == "allow_inf_nan" and not (isinstance(kw.value, ast.Constant) and kw.value.value is False):
            continue
        val = const_value(repo, m, kw.value)
        out[name] = val if val is not None else ast.unparse(kw.value)
    return out


def _alias_kw(call: ast.Call) -> str | None:
    for name in ("validation_alias", "alias"):
        v = next((k.value for k in call.keywords if k.arg == name), None)
        if isinstance(v, ast.Constant) and isinstance(v.value, str):
            return v.value
        if isinstance(v, ast.Call) and P._leaf(v.func) == "AliasChoices" and v.args and isinstance(v.args[0], ast.Constant):
            return v.args[0].value
    return None


def annotation(repo: Path, m, node) -> dict:
    """``{family, optional, complex, item?, literal?, model?: (module, qual), enum?, upload?, constraints, marker?, alias?,
    has_default?, depends?}`` of one annotation — through ``Annotated`` metadata, a module alias and a ``NewType``."""
    out: dict = {"family": None, "optional": False, "complex": False, "constraints": {}}

    def fam(f: str) -> None:
        out["family"] = out["family"] or f
        out["complex"] = out["complex"] or f in _COMPLEX

    def walk(n, mm, depth: int) -> None:
        if depth > 6 or n is None:
            return
        if isinstance(n, ast.Constant) and n.value is None:
            out["optional"] = True
            return
        if isinstance(n, ast.BinOp) and isinstance(n.op, ast.BitOr):
            walk(n.left, mm, depth + 1)
            walk(n.right, mm, depth + 1)
            return
        if isinstance(n, ast.Subscript):
            base = P._leaf(n.value)
            elts = n.slice.elts if isinstance(n.slice, ast.Tuple) else [n.slice]
            if base == "Optional":
                out["optional"] = True
                walk(elts[0], mm, depth + 1)
            elif base == "Union":
                for e in elts:
                    walk(e, mm, depth + 1)
            elif base == "Annotated":
                walk(elts[0], mm, depth + 1)
                for meta in elts[1:]:
                    if not isinstance(meta, ast.Call):
                        continue
                    leaf = P._leaf(meta.func)
                    if leaf in SH.CONSTRAINT_METADATA or leaf in SH.PARAM_LOCATIONS:
                        out["constraints"].update(_constraints(repo, mm, meta))
                        out["alias"] = out.get("alias") or _alias_kw(meta)
                        if any(k.arg in ("default", "default_factory") for k in meta.keywords):
                            out["has_default"] = True
                        if leaf in SH.PARAM_LOCATIONS:
                            out["marker"] = meta
                    elif leaf in F.DEPENDS:
                        out["depends"] = True
            elif base == "Literal":
                out["family"] = "literal"
                out["literal"] = [const_value(repo, mm, e) for e in elts]
            elif base in _SEQ:
                fam(_SEQ[base])
                if elts:
                    out["item"] = annotation(repo, mm, elts[-1] if _SEQ[base] == "dict" else elts[0])
                    out["upload"] = out.get("upload") or bool(out["item"].get("upload"))
            else:
                walk(n.value, mm, depth + 1)
            return
        if isinstance(n, ast.Call) and P._leaf(n.func) in SH.CONSTRAINED_TYPES:
            fam(SH.CONSTRAINED_TYPES[P._leaf(n.func)])
            out["constraints"].update(_constraints(repo, mm, n))
            return
        leaf = P._leaf(n)
        if leaf in _SCALARS:
            fam(leaf)
            return
        if leaf in _SEQ:
            fam(_SEQ[leaf])
            return
        if leaf in SH.UPLOAD_TYPES:
            fam("upload")
            out["upload"] = True
            return
        r = P._resolve(repo, mm, leaf) if leaf and isinstance(n, (ast.Name, ast.Attribute)) else None
        if r and r[1] in r[0].classes:
            cls = r[0].classes[r[1]]
            if _is_model(repo, r[0], cls):
                fam("model")
                out["model"] = r
            elif any(name in _ENUM_BASES for c2m, c2 in _chain(repo, r[0], cls) for name, _ in _base_refs(repo, c2m, c2)):
                out["family"], out["enum"] = "enum", f"{r[0].rel}::{cls.name}"
            return
        if r and r[1] in r[0].assigns:                     # `Name = Annotated[str, Field(…)]` · `Nm = NewType("Nm", str)`
            val = r[0].assigns[r[1]]
            if isinstance(val, ast.Call) and P._leaf(val.func) == "NewType" and len(val.args) > 1:
                walk(val.args[1], r[0], depth + 1)
            elif isinstance(val, (ast.Subscript, ast.BinOp, ast.Name, ast.Attribute)):
                walk(val, r[0], depth + 1)
            return
        if leaf and leaf not in ("None", "Any"):
            out["family"] = out["family"] or leaf

    walk(node, m, 0)
    return out


def _etype(kw: str, family: str | None) -> str:
    table = SH.PYDANTIC_ERRORS.get(kw)
    if table is None:
        return "unknown"
    return table.get(family if family in table else "*", "unknown")


def _fields(repo: Path, chain: list, config: dict) -> list[dict]:
    out: dict = {}
    for cm, c in reversed(chain):                         # bases first; the class itself overrides
        for it in c.body:
            if not (isinstance(it, ast.AnnAssign) and isinstance(it.target, ast.Name)) or it.target.id == "model_config":
                continue
            name = it.target.id
            if name.startswith("_") or P._leaf(it.annotation.value if isinstance(it.annotation, ast.Subscript) else it.annotation) == "ClassVar":
                continue                                  # a private attribute or a class variable is not a field
            a = annotation(repo, cm, it.annotation)
            row = {"name": name, "at": f"{cm.rel}:{it.lineno}", "annotation": P._unp(it.annotation), "_ann": a,
                   "constraints": dict(a["constraints"])}
            default, required = it.value, it.value is None and not a.get("has_default")
            alias = a.get("alias")
            if isinstance(default, ast.Call) and P._leaf(default.func) == "Field":
                row["constraints"].update(_constraints(repo, cm, default))
                dflt = next((k.value for k in default.keywords if k.arg == "default"), default.args[0] if default.args else None)
                factory = any(k.arg == "default_factory" for k in default.keywords)
                required = not factory and (dflt is None or (isinstance(dflt, ast.Constant) and dflt.value is Ellipsis))
                alias = _alias_kw(default) or alias
            alias = alias or _alias_of(name, config.get("alias_generator"))
            if alias and alias != name:
                row["alias"] = alias
            row["required"] = required
            out[name] = row
    return list(out.values())


# ── validators ───────────────────────────────────────────────────────────────────────────────────────
_bound = _FAL.bind                                           # the shared falsification leaf (§A4 RC-A): one binder …


def _bval(repo: Path, m, bm, entry):
    expr, origin = entry
    return const_value(repo, bm if origin == "caller" else m, expr) if expr is not None else None


def _truth(pred: str, bound: dict):
    """A guard's truth once the bound keywords are known. Literal-only by design: a validator rule is dropped when the
    CALL SITE decides its guard, never when a module constant elsewhere might."""
    return _FAL.truth(pred, bound)


def _allowed(repo: Path, m, bm, fn, pred: str, bound: dict, chain: list) -> dict | None:
    """The allow-list a guard tests against: ``{values}`` from a constant (a module, call-site or class constant),
    ``{state: unknown, reason}`` from a runtime call or an unresolved name."""
    try:
        node = ast.parse(pred, mode="eval").body
    except SyntaxError:
        return None
    local = {}
    for st in ast.walk(fn):
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            local.setdefault(st.targets[0].id, st.value)
    tests = []
    for n in ast.walk(node):
        if isinstance(n, ast.Compare) and len(n.ops) == 1 and isinstance(n.ops[0], ast.NotIn):
            tests.append(n.comparators[0])
        elif isinstance(n, ast.Name) and isinstance(local.get(n.id), ast.ListComp):
            for gen in local[n.id].generators:
                tests += [cond.comparators[0] for cond in gen.ifs
                          if isinstance(cond, ast.Compare) and len(cond.ops) == 1 and isinstance(cond.ops[0], ast.NotIn)]
    for t in tests:
        if isinstance(t, ast.Name) and t.id in bound and bound[t.id][0] is not None:
            expr, origin = bound[t.id]
            if isinstance(expr, ast.Call):
                return {"state": "unknown", "reason": f"runtime: {ast.unparse(expr)}"}
            vals = _bval(repo, m, bm, bound[t.id])
        elif isinstance(t, ast.Name) and t.id in local:
            if isinstance(local[t.id], ast.Call):
                return {"state": "unknown", "reason": f"runtime: {ast.unparse(local[t.id])}"}
            vals = const_value(repo, m, local[t.id])
        elif isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name):
            vals = _class_attr(repo, chain, t.attr) if chain else None
            if vals is None:
                return {"state": "unknown", "reason": f"not a constant: {ast.unparse(t)}"}
        elif isinstance(t, ast.Call):
            return {"state": "unknown", "reason": f"runtime: {ast.unparse(t)}"}
        else:
            vals = const_value(repo, m, t)
        if vals is not None:
            return {"values": list(vals) if isinstance(vals, tuple) else [vals]}
    return None


def _render(repo: Path, m, bm, node, bound: dict) -> str | None:
    """A message expression → its text with every constant filled in (format specs and conversions applied); a value only
    known at runtime stays ``{…}``."""
    def fill(expr):
        if isinstance(expr, ast.Name) and expr.id in bound:
            return _bval(repo, m, bm, bound[expr.id])
        if isinstance(expr, ast.Call) and P._leaf(expr.func) in ("list", "sorted", "tuple") and len(expr.args) == 1:
            got = fill(expr.args[0])
            if isinstance(got, tuple):
                return sorted(got) if P._leaf(expr.func) == "sorted" else list(got) if P._leaf(expr.func) == "list" else got
            return None
        return const_value(repo, m, expr) if isinstance(expr, (ast.Name, ast.Constant)) else None

    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        parts = []
        for v in node.values:
            if isinstance(v, ast.Constant):
                parts.append(str(v.value))
                continue
            val = fill(v.value)
            if val is None:
                parts.append("{" + ast.unparse(v.value) + "}")
                continue
            val = {"r": repr, "s": str, "a": ascii}.get(chr(v.conversion), lambda x: x)(val) if v.conversion > 0 else val
            spec = "".join(str(s.value) for s in v.format_spec.values if isinstance(s, ast.Constant)) if isinstance(v.format_spec, ast.JoinedStr) else ""
            try:
                parts.append(format(val, spec))
            except (TypeError, ValueError):
                parts.append(str(val))
        return "".join(parts)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        a, b = _render(repo, m, bm, node.left, bound), _render(repo, m, bm, node.right, bound)
        return a + b if a is not None and b is not None else ast.unparse(node)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "join" \
            and isinstance(node.func.value, ast.Constant) and len(node.args) == 1:
        got = fill(node.args[0])
        if isinstance(got, (tuple, list)):
            return node.func.value.value.join(str(x) for x in got)
    got = fill(node) if isinstance(node, ast.Name) else None
    return str(got) if got is not None else ast.unparse(node)


def _message(repo: Path, m, bm, exc, bound: dict) -> str | None:
    if not isinstance(exc, ast.Call) or not exc.args:
        return None
    if P._leaf(exc.func) == "PydanticCustomError":       # PydanticCustomError(type, message_template, context)
        if len(exc.args) < 2:
            return None
        text = _render(repo, m, bm, exc.args[1], bound)
        ctx = exc.args[2] if len(exc.args) > 2 and isinstance(exc.args[2], ast.Dict) else None
        for k, v in (zip(ctx.keys, ctx.values) if ctx is not None and text else ()):
            val = const_value(repo, m, v)
            if isinstance(k, ast.Constant) and val is not None:
                text = text.replace("{" + str(k.value) + "}", str(val))
        return text
    return _render(repo, m, bm, exc.args[0], bound)


def _range(repo: Path, m, bm, pred: str, bound: dict) -> dict | None:
    """``lo <= value <= hi`` → ``{range: [lo, hi], band}``: ``accepted`` under a ``not`` (outside is refused), ``refused``
    when the band itself raises; the ends read through the call-site keywords too."""
    try:
        node = ast.parse(pred, mode="eval").body
    except SyntaxError:
        return None
    negated = {id(n.operand) for n in ast.walk(node) if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.Not)}
    for n in ast.walk(node):
        if isinstance(n, ast.Compare) and len(n.ops) == 2 and all(isinstance(o, (ast.Lt, ast.LtE)) for o in n.ops):
            ends = []
            for e in (n.left, n.comparators[-1]):
                ends.append(_bval(repo, m, bm, bound[e.id]) if isinstance(e, ast.Name) and e.id in bound else const_value(repo, m, e))
            if all(isinstance(x, (int, float)) for x in ends):
                return {"range": ends, "band": "accepted" if id(n) in negated else "refused"}
    return None


def _raise_type(repo: Path, m, exc) -> str | None:
    cls = P._leaf(exc.func) if isinstance(exc, ast.Call) else exc.id if isinstance(exc, ast.Name) else None
    if not cls:
        return None
    if cls not in SH.RAISE_ERRORS:
        base = next((b for b in sorted(P._bases(repo, m, cls, at=exc)) if b in SH.RAISE_ERRORS and SH.RAISE_ERRORS[b]), None)
        return SH.RAISE_ERRORS[base] if base else None
    if SH.RAISE_ERRORS[cls] is None:
        first = exc.args[0] if isinstance(exc, ast.Call) and exc.args else None
        return first.value if isinstance(first, ast.Constant) and isinstance(first.value, str) else "unknown"
    return SH.RAISE_ERRORS[cls]


def _asserts(fn) -> list[tuple]:
    """``[(assert, [enclosing guards])]`` — ``_a3_paths._walk`` reads raises, not asserts."""
    out = []

    def visit(stmts, guards):
        for st in stmts:
            if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            if isinstance(st, ast.Assert):
                out.append((st, list(guards)))
            elif isinstance(st, ast.If):
                t = ast.unparse(st.test)
                visit(st.body, guards + [t])
                visit(st.orelse, guards + [f"not ({t})"])
            else:
                for field in ("body", "orelse", "finalbody"):
                    visit(getattr(st, field, None) or [], guards)
                for h in getattr(st, "handlers", None) or []:
                    visit(h.body, guards)
    visit(fn.body, [])
    return out


def _hop(repo: Path, m, fn, call, chain: list):
    r = P._callee(repo, m, fn, call)
    if r and r[1] in r[0].defs:
        return r
    f = call.func
    if chain and isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id in ("cls", "self"):
        return next(((cm, f"{c.name}.{f.attr}") for cm, c in chain if f"{c.name}.{f.attr}" in cm.defs), None)
    return None


def _rules(repo: Path, m, fn, bound: dict | None = None, hop: bool = True, bm=None, chain: list | None = None) -> tuple:
    """A validator (or the helper it calls, one hop) → ``(rules, normalisers, unread calls)``; ``bm`` is the caller's
    module the call-site keywords are read in."""
    bound, bm = bound or {}, bm or m
    rules, unread = [], []
    norms = sorted({n.func.attr for n in ast.walk(fn) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                    and n.func.attr in SH.NORMALISERS})
    hev: dict = {}
    for e in P._events(fn):
        if e["handler"] is not None:
            hev.setdefault(id(e["handler"][1]), []).append(e)

    def rule_of(etype, at, pred, guards, after, msg):
        if any(_truth(g, bound) is False for g in guards) or any(_truth(a, bound) is False for a in after):
            return None                                   # the call site's keywords make this branch unreachable
        rule = {"type": etype, "at": at, "msg": msg}
        if pred:
            rule["pred"] = pred
            rng = _range(repo, m, bm, pred, bound)
            if rng:
                rule.update(rng)
            allowed = _allowed(repo, m, bm, fn, pred, bound, chain or [])
            if allowed:
                rule["allowed"] = allowed
        consts = {k: _bval(repo, m, bm, v) for k, v in bound.items()}
        if bound:
            rule["bound"] = {k: v for k, v in sorted(consts.items()) if v is not None}
        return rule

    for e in P._events(fn):
        if e["kind"] == "raise":
            exc = e["node"].exc
            etype = _raise_type(repo, m, exc) if exc is not None else None
            if etype is None:
                continue
            cls = P._leaf(exc.func) if isinstance(exc, ast.Call) else exc.id
            if P._climb(cls, P._bases(repo, m, cls, at=e["node"]) | {"Exception"}, e["tries"], hev)[0] != "escape":
                continue                                  # the validator catches its own raise: pydantic never sees it
            guards = [g for g, _ in e["guards"]]
            rule = rule_of(etype, f"{m.rel}:{e['line']}", " and ".join(guards) or None, guards, e["after"], _message(repo, m, bm, exc, bound))
            if rule:
                rules.append(rule)
        elif e["kind"] == "call":
            r = _hop(repo, m, fn, e["node"], chain or [])
            if r is None:
                continue
            if not hop:
                unread.append(f"{r[1]} @ {m.rel}:{e['line']}")
                continue
            if P._climb("ValueError", {"Exception"}, e["tries"], hev)[0] != "escape":
                continue                                  # a helper's refusal the validator catches never reaches pydantic
            sub, sub_norms, sub_unread = _rules(repo, r[0], r[0].defs[r[1]], _bound(r[0].defs[r[1]], e["node"]), hop=False, bm=m, chain=chain)
            for rule in sub:
                rule["via"] = f"{r[1]} @ {m.rel}:{e['line']}"
            rules += sub
            unread += sub_unread
            norms = sorted(set(norms) | set(sub_norms))
    for st, guards in _asserts(fn):
        msg = _render(repo, m, bm, st.msg, bound) if st.msg is not None else None
        pred = f"not ({ast.unparse(st.test)})"
        rule = rule_of("assertion_error", f"{m.rel}:{st.lineno}", " and ".join(guards + [pred]), guards, [], msg)
        if rule:
            rules.append(rule)
    return rules, norms, unread


def _validators(repo: Path, chain: list, flds: list) -> list[dict]:
    """Every validator the model runs — the nearest definition of each method name only (an override replaces the base's)."""
    out, seen = [], set()
    names = [f["name"] for f in flds]
    for cm, c in chain:
        for it in c.body:
            if not isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)) or it.name in seen:
                continue
            seen.add(it.name)
            dec = next((d for d in it.decorator_list if P._leaf(d.func if isinstance(d, ast.Call) else d) in _VALIDATORS), None)
            if dec is None:
                continue
            kind = P._leaf(dec.func if isinstance(dec, ast.Call) else dec)
            fields, unresolved = [], []
            for a in (dec.args if isinstance(dec, ast.Call) else []):
                if isinstance(a, ast.Constant) and isinstance(a.value, str):
                    fields += names if a.value == "*" else [a.value]
                elif isinstance(a, ast.Starred):
                    got = const_value(repo, cm, a.value)
                    fields += list(got) if isinstance(got, tuple) else []
                    if not isinstance(got, tuple):
                        unresolved.append(ast.unparse(a))
            rules, norms, unread = _rules(repo, cm, it, chain=chain)
            row = {"name": it.name, "kind": kind, "fields": fields if kind in ("field_validator", "validator") else ["__model__"],
                   "at": f"{cm.rel}:{it.lineno}", "defined": f"{cm.rel}::{c.name}.{it.name}", "rules": rules, "normalises": norms}
            if unread:
                row["unread_calls"] = unread
            if unresolved:
                row["fields_unresolved"] = unresolved
            out.append(row)
    return out


def schema_form(repo: Path, m, node: ast.ClassDef) -> dict:
    chain = _chain(repo, m, node)
    cfg = _model_config(repo, chain)
    flds = _fields(repo, chain, cfg)
    for cm, c in chain:                                   # RootModel[X] validates X at the body itself
        root = next((b.slice for b in c.bases if isinstance(b, ast.Subscript) and P._leaf(b.value) == "RootModel"), None)
        if root is not None:
            a = annotation(repo, cm, root)
            flds = [{"name": "root", "at": f"{cm.rel}:{c.lineno}", "annotation": P._unp(root), "_ann": a,
                     "constraints": dict(a["constraints"]), "required": True, "root": True}]
            break
    form = {"cls": node.name, "file": m.rel, "at": f"{m.rel}:{node.lineno}", "extra": cfg.get("extra") or "ignore",
            "extra_state": "defined" if cfg.get("extra") else "default", "extra_at": cfg.get("extra_at"),
            "fields": flds, "validators": _validators(repo, chain, flds)}
    if cfg.get("alias_generator"):
        form["alias_generator"] = cfg["alias_generator"]
    return form


# ── cases ────────────────────────────────────────────────────────────────────────────────────────────
def _form_for(repo: Path, mod, node: ast.ClassDef, reg: dict) -> dict:
    """The schema form of THIS class (keyed by its file and name): the claimed one, else one formed now and KEPT
    (``claimed: false``), so no case ever names a schema ``schemas{}`` lacks."""
    sid = (mod.rel, node.name)
    if sid not in reg:
        reg[sid] = schema_form(repo, mod, node)
    return reg[sid]


def _join(prefix: str, name: str) -> str:
    return f"{prefix}.{name}" if prefix and name else prefix or name


def _path(loc: str, tail: str = "") -> str:
    rel = loc.split(".", 1)[1] if "." in loc else ""
    return _join(rel, tail) or "__root__"


def _rule_cases(repo: Path, ann: dict, cons: dict, loc: str, base_id: str, extra: dict) -> list[dict]:
    """The constraint · Literal · Enum cases of one annotation at ``loc`` (and of its items at ``loc.[]`` / ``loc.{}``)."""
    fam = ann.get("family")
    out = [{"id": f"{base_id}/{_etype(kw, fam)}", "loc": loc, "type": _etype(kw, fam), "rule": f"{kw}={val}", **extra}
           for kw, val in cons.items()]
    if "max_digits" in cons and "decimal_places" in cons:
        out.append({"id": f"{base_id}/{SH.DECIMAL_WHOLE_DIGITS}", "loc": loc, "type": SH.DECIMAL_WHOLE_DIGITS,
                    "rule": f"max_digits={cons['max_digits']},decimal_places={cons['decimal_places']}", **extra})
    if ann.get("literal"):
        out.append({"id": f"{base_id}/literal_error", "loc": loc, "type": "literal_error", "allowed": {"values": ann["literal"]}, **extra})
    if ann.get("enum"):
        out.append({"id": f"{base_id}/enum", "loc": loc, "type": "enum", "enum": ann["enum"], **extra})
    if SH.OPTIONS["s_type_cases"] == "each" and fam in SH.TYPE_ERRORS:
        out.append({"id": f"{base_id}/{SH.TYPE_ERRORS[fam]}", "loc": loc, "type": SH.TYPE_ERRORS[fam], **extra})
    item = ann.get("item")
    if item and not item.get("model"):
        mark = "{}" if fam == "dict" else "[]"
        out += _rule_cases(repo, item, dict(item["constraints"]), f"{loc}.{mark}", f"{base_id}.{mark}", extra)
    return out


def cases_of(repo: Path, form: dict, prefix: str, reg: dict, seen: frozenset, depth: int, notes: dict) -> list[dict]:
    """Every case one schema (and, recursively, the models its fields and items hold) contributes at ``prefix``."""
    cls, sid = form["cls"], (form["file"], form["cls"])
    notes["visited"].add(sid)
    tag = {"schema": f"schema:{cls}", "_sid": sid}
    out = []
    if form["extra"] == "forbid":
        out.append({"id": f"case:schema:{cls}/{_path(prefix, '__model__')}/extra_forbidden", "loc": prefix, "type": "extra_forbidden",
                    "rule": 'extra="forbid"', "at": form["extra_at"], **tag})
    by_name = {f["name"]: f for f in form["fields"]}
    for f in form["fields"]:
        loc = prefix if f.get("root") else _join(prefix, f.get("alias") or f["name"])
        base, a, extra = f"case:schema:{cls}/{_path(loc)}", f["_ann"], {"at": f["at"], **tag}
        if f["required"] and not f.get("root"):
            out.append({"id": f"{base}/missing", "loc": loc, "type": "missing", **extra})
        out += _rule_cases(repo, a, f["constraints"], loc, base, extra)
        for model, mloc in ((a.get("model"), loc), ((a.get("item") or {}).get("model"), f"{loc}.{'{}' if a.get('family') == 'dict' else '[]'}")):
            if not model:
                continue
            msid = (model[0].rel, model[1])
            if msid in seen:
                notes["cycles"].append(mloc)
            elif depth + 1 > SH.OPTIONS["nest_depth"]:
                notes["nest_cut"].append(mloc)
            else:
                sub = _form_for(repo, model[0], model[0].classes[model[1]], reg)
                out += cases_of(repo, sub, mloc, reg, seen | {msid}, depth + 1, notes)
    for v in form["validators"]:
        for n, rule in enumerate(v["rules"]):
            for fld in v["fields"]:
                loc = prefix if fld == "__model__" else _join(prefix, (by_name.get(fld) or {}).get("alias") or fld)
                case = {"id": f"case:schema:{cls}/{_path(loc, '__model__' if fld == '__model__' else '')}/{rule['type']}/{v['name']}.{n}",
                        "loc": loc, "type": rule["type"], "at": rule["at"], "validator": v["defined"], **tag}
                for k in ("msg", "pred", "allowed", "range", "band", "bound", "via"):
                    if rule.get(k) is not None:
                        case[k] = rule[k]
                if v["normalises"]:
                    case["normalises"] = v["normalises"]
                out.append(case)
    return out


# ── parameters ───────────────────────────────────────────────────────────────────────────────────────
def _param(repo: Path, m, p: ast.arg, dflt, path_names: set) -> dict:
    """How FastAPI reads one parameter (``analyze_param``): ``{kind: depends|injected|param, loc, form, a, call, required,
    alias, embed}``."""
    ann = p.annotation
    a = annotation(repo, m, ann) if ann is not None else {"family": None, "optional": False, "complex": False, "constraints": {}}
    if P._is_depends(dflt) or a.get("depends"):
        return {"kind": "depends"}
    base = ann.slice.elts[0] if isinstance(ann, ast.Subscript) and P._leaf(ann.value) == "Annotated" and isinstance(ann.slice, ast.Tuple) else ann
    if P._leaf(base) in F.INJECTED_TYPES:
        return {"kind": "injected"}
    call = dflt if isinstance(dflt, ast.Call) and P._leaf(dflt.func) in SH.PARAM_LOCATIONS else a.get("marker")
    if p.arg in path_names:
        loc = "path"
    elif call is not None:
        loc = SH.PARAM_LOCATIONS[P._leaf(call.func)]
    else:
        loc = "form" if a.get("upload") else "body" if a.get("complex") else "query"
    if dflt is None or (isinstance(dflt, ast.Constant) and dflt.value is Ellipsis):
        required = True
    elif dflt is call:
        first = call.args[0] if call.args else next((k.value for k in call.keywords if k.arg == "default"), None)
        required = (first is None or (isinstance(first, ast.Constant) and first.value is Ellipsis)) \
            and not any(k.arg == "default_factory" for k in call.keywords)
    else:
        required = False
    alias = _alias_kw(call) if call is not None else None
    if alias is None and call is not None and P._leaf(call.func) == "Header" and not any(
            k.arg == "convert_underscores" and isinstance(k.value, ast.Constant) and k.value.value is False for k in call.keywords):
        alias = p.arg.replace("_", "-")
    embed = call is not None and any(k.arg == "embed" and isinstance(k.value, ast.Constant) and k.value.value is True for k in call.keywords)
    return {"kind": "param", "loc": "body" if loc in ("body", "form") else loc, "form": loc == "form", "a": a, "call": call,
            "required": required, "alias": alias, "embed": embed}


def _defaults(fn) -> dict:
    a = fn.args
    pos = list(a.posonlyargs) + list(a.args)
    out = dict(zip([p.arg for p in pos[len(pos) - len(a.defaults):]], a.defaults))
    out.update({p.arg: d for p, d in zip(a.kwonlyargs, a.kw_defaults) if d is not None})
    return out


def _path_names(v: dict) -> set:
    return {seg.strip("{}").split(":")[0] for key in ("path", "full_path") for seg in str(v.get(key) or "").split("/") if seg.startswith("{")}


def _dependency_params(repo: Path, m, fn, dec, path_names: set) -> dict:
    """``{"<dep fn name>.<param>": {m, info, factory}}`` over the dependency chain FastAPI flattens into the request; a
    factory's (``Depends(require_permission(P))``) own arguments are Python values, not request parameters."""
    out: dict = {}

    def walk(mm, node, d_dec, depth: int, seen: frozenset) -> None:
        if depth > P._DEP_MAX:
            return
        aliases = C._dep_aliases(repo, mm.rel, mm.tree)
        for d in MW._dep_params(node, d_dec, aliases, C._dep_alias_meta(mm.rel)):
            r = P._dep_target(repo, mm, d.get("callee") or d["name"], d.get("_decl"))
            called = str(d["name"]).rstrip().endswith(")")
            got = P._dep_node(repo, r[0], r[1], called=called) if r else None
            if not got or got[1] is None or f"{got[0].rel}::{got[2]}" in seen:
                continue
            nm, dn, nq, kind = got
            factory = called and kind == "function"
            dflts = _defaults(dn)
            for p in list(dn.args.posonlyargs) + list(dn.args.args) + list(dn.args.kwonlyargs):
                if p.arg not in ("self", "cls"):
                    out.setdefault(f"{dn.name}.{p.arg}", {"m": nm, "factory": factory, "info": _param(repo, nm, p, dflts.get(p.arg), path_names)})
            if not factory:
                walk(nm, dn, None, depth + 1, seen | {f"{nm.rel}::{nq}"})

    walk(m, fn, dec, 0, frozenset())
    return out


def _param_cases(repo: Path, m, label: str, loc: str, info: dict) -> list[dict]:
    cons = dict(info["a"]["constraints"])
    if info["call"] is not None:
        cons.update(_constraints(repo, m, info["call"]))
    out = _rule_cases(repo, info["a"], cons, loc, f"case:param:{label}", {"param": label})
    if info["required"] and info["loc"] != "path":        # a path segment is there or the route does not match (404)
        out.append({"id": f"case:param:{label}/missing", "loc": loc, "type": "missing", "param": label})
    return out


def endpoint_cases(repo: Path, v: dict, m, fn, dec, reg: dict, apph: dict) -> dict:
    """For each validation row of one endpoint: ``cases[]``, ``schemas[]``, ``types``, ``unread``, ``embed``, cut markers."""
    names = _path_names(v)
    dflts = _defaults(fn)
    own = {p.arg: _param(repo, m, p, dflts.get(p.arg), names)
           for p in list(fn.args.posonlyargs) + list(fn.args.args) + list(fn.args.kwonlyargs) if p.arg not in ("self", "cls")}
    deps = _dependency_params(repo, m, fn, dec, names)
    written = {"rows": 0, "cases": 0, "unread": 0, "truncated": 0}
    for row in v.get("produced") or []:
        if row.get("phase") != "validation":
            continue
        infos, unread = [], []
        for p in row.get("params") or []:
            if "." not in p:
                if (own.get(p) or {}).get("kind") == "param":
                    infos.append((p, p, own[p], m))
                continue
            d = deps.get(p)
            if d is None:
                unread.append({"param": p, "reason": "dependency parameter: not resolved"})
            elif d["factory"]:
                unread.append({"param": p, "reason": "a dependency factory's argument — a Python value, not a request parameter"})
            elif d["info"]["kind"] == "param":
                infos.append((p, p.split(".", 1)[1], d["info"], d["m"]))
        body = [x for x in infos if x[2]["loc"] == "body"]
        embed = len({x[1] for x in body}) > 1 or any(x[2]["embed"] for x in body) or \
            (len(body) == 1 and body[0][2]["form"] and not body[0][2]["a"].get("model"))
        cases, notes = [], {"visited": set(), "nest_cut": [], "cycles": []}
        for label, name, info, mm in infos:
            prefix = "body" if info["loc"] == "body" and not embed else f"{info['loc']}.{info['alias'] or name}"
            model = info["a"].get("model")
            if model and info["loc"] == "body":
                form = _form_for(repo, model[0], model[0].classes[model[1]], reg)
                got = cases_of(repo, form, prefix, reg, frozenset({(model[0].rel, model[1])}), 0, notes)
                for c in got:
                    c["param"] = label
                cases += got
                if info["required"]:
                    cases.append({"id": f"case:framework:{label}/missing", "loc": prefix, "type": "missing", "state": "default",
                                  "param": label, "source": "fastapi/dependencies/utils.py request_body_to_args"})
            else:
                cases += _param_cases(repo, mm, label, prefix, info)
        cap = SH.OPTIONS["case_cap"]
        if len(cases) > cap:
            row["cases_truncated"] = len(cases) - cap
            written["truncated"] += 1
            cases = cases[:cap]
        row["cases"], row["_sids"] = cases, set(notes["visited"])
        row["types"] = SH.OPTIONS["s_type_cases"]
        for key in ("nest_cut", "cycles"):
            if notes[key]:
                row[key] = sorted(set(notes[key]))
        if embed and body:
            row["embed"] = SH.BODY_EMBED_SRC
        if unread:
            row["unread"] = unread
        if "RequestValidationError" in apph:              # S9 — the app reshapes every 422 this row lists
            row["answered_by"] = {"via": "app handler RequestValidationError", **{k: apph["RequestValidationError"][k] for k in ("status", "state", "at") if k in apph["RequestValidationError"]}}
        written["rows"] += 1
        written["cases"] += len(cases)
        written["unread"] += len(unread)
    return written


def schema_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, dict, list]:
    reg: dict = {}
    claimed: set = set()
    for slug in sorted(amap.get("entities") or {}):
        for sd in ((amap["entities"].get(slug) or {}).get("schemas") or []):
            m = P._mod(repo, sd.get("file"))
            node = m.classes.get(sd.get("cls")) if m else None
            if node is not None and _is_model(repo, m, node):
                _form_for(repo, m, node, reg)
                claimed.add((m.rel, node.name))
    hosts = [(key, v) for key, e in sorted((forms.get("endpoints") or {}).items()) for v in (e.get("variants") or [e])]
    files = sorted({str(v.get("handler") or "").partition("::")[0] for _, v in hosts} - {""})
    apph = P._app_handlers(repo, files) if files else {}
    stats = {"schemas": 0, "schemas_unclaimed": 0, "rows": 0, "cases": 0, "unread": 0, "truncated": 0, "runtime_allowlist": 0,
             "unknown": {}, "deferred": list(SH.DEFERRED)}
    consumers: dict = {}
    rows: list = []
    for key, v in hosts:
        file, _, name = str(v.get("handler") or "").partition("::")
        m = P._mod(repo, file) if file else None
        fn, dec = P._find_handler(m, {"fn": name, "method": v.get("method"), "path": v.get("path")}) if m else (None, None)
        if fn is None:
            continue
        got = endpoint_cases(repo, v, m, fn, dec, reg, apph)
        for s in ("rows", "cases", "unread", "truncated"):
            stats[s] += got[s]
        for row in v.get("produced") or []:
            if "_sids" in row:
                rows.append(row)
                for sid in row["_sids"]:
                    consumers.setdefault(sid, set()).add(key)
    by_name: dict = {}
    for sid in reg:
        by_name.setdefault(sid[1], []).append(sid)
    runtime = set()
    for row in rows:
        for c in row["cases"]:
            sid = c.pop("_sid", None)
            if sid and len(by_name[sid[1]]) > 1:
                c["schema_file"] = sid[0]
            if (c.get("allowed") or {}).get("state") == "unknown":
                runtime.add((c.get("validator"), c.get("at")))
            if c.get("type") == "unknown":
                kw = str(c.get("rule") or "?").split("=")[0]
                stats["unknown"][kw] = stats["unknown"].get(kw, 0) + 1
        row["schemas"] = sorted({f"schema:{sid[1]}" for sid in row.pop("_sids")})
    stats["runtime_allowlist"] = len(runtime)
    if "RequestValidationError" in apph:
        stats["validation_answered_by"] = apph["RequestValidationError"].get("at")
    out, findings = {}, []
    for cls, sids in sorted(by_name.items()):
        entries = []
        for sid in sorted(sids):
            form = reg[sid]
            clean = {k: val for k, val in form.items() if k != "fields"}
            clean["fields"] = [{k: val for k, val in f.items() if k != "_ann"} for f in form["fields"]]
            clean["consumers"] = len(consumers.get(sid, ()))
            if sid not in claimed:
                clean["claimed"] = False
            if clean["consumers"] and form["extra_state"] == "default":
                findings.append({"id": "extra-ignored", "slot": "S6", "subject": f"schema:{cls}", "file": sid[0], "consumers": clean["consumers"]})
            entries.append(clean)
        out[f"schema:{cls}"] = entries[0] if len(entries) == 1 else {"variants": entries}
    stats["schemas"] = len(reg)
    stats["schemas_unclaimed"] = len(set(reg) - claimed)
    return out, stats, findings


# ── the body-parse framework exits (paths.framework) ────────────────────────────────────────────────
def reads_body(repo: Path, m, fn, dec=None, v: dict | None = None) -> str | None:
    """``json`` · ``form`` · None — whether FastAPI reads a request body for this handler, counting the body parameters
    of its dependency chain (FastAPI flattens them); any Form or File parameter makes it a form request."""
    names = _path_names(v or {})
    dflts = _defaults(fn)
    infos = [_param(repo, m, p, dflts.get(p.arg), names)
             for p in list(fn.args.posonlyargs) + list(fn.args.args) + list(fn.args.kwonlyargs) if p.arg not in ("self", "cls")]
    infos += [d["info"] for d in _dependency_params(repo, m, fn, dec, names).values() if not d["factory"]]
    kinds = {"form" if i["form"] else "json" for i in infos if i.get("kind") == "param" and i["loc"] == "body"}
    return ("form" if "form" in kinds else "json") if kinds else None


def framework_exits(repo: Path, forms: dict) -> dict:
    """The exits FastAPI answers before any dependency runs on every endpoint whose handler reads a body — a JSON body's
    422 json_invalid + 400, a form body's two 400s — gated on the framework version they were read on."""
    entries, hosts = [], []
    for key in sorted(forms.get("endpoints") or {}):
        e = forms["endpoints"][key]
        for v in e.get("variants") or [e]:
            file, _, name = str(v.get("handler") or "").partition("::")
            m = P._mod(repo, file) if file else None
            fn, dec = P._find_handler(m, {"fn": name, "method": v.get("method"), "path": v.get("path")}) if m else (None, None)
            kind = reads_body(repo, m, fn, dec, v) if fn is not None else None
            if kind is None:
                continue
            fw = P._framework(repo, file)
            rows = [dict(x) for x in (SH.FRAMEWORK_FORM_EXITS if kind == "form" else SH.FRAMEWORK_BODY_EXITS)]
            if not (fw and P._vt(fw[0]) >= P._vt(SH.FRAMEWORK_MIN)):
                for r in rows:
                    r["state"], r["status"] = "unknown", None
                    r["reason"] = "framework version unreadable" if not fw else f"fastapi {fw[0]} predates the verified {SH.FRAMEWORK_MIN}"
            for r in rows:
                r["body"] = kind
                entries.append(([r["phase"], r["status"], v.get("handler"), None, None, None, r["detail"], r.get("source")], ()))
            hosts.append((v, rows))
    audit: dict = {}
    ids = I.ranked("x", entries, audit)
    it = iter(ids)
    for v, rows in hosts:
        for r in rows:
            r["id"] = next(it)
        v["framework_exits"] = rows
    if isinstance(forms.get("ids"), dict) and forms["ids"].get("present") and entries:
        produced = {r.get("id") for e in (forms.get("endpoints") or {}).values() for v in (e.get("variants") or [e]) for r in v.get("produced") or []}
        forms["ids"]["framework_x"] = len(set(ids))
        forms["ids"]["collisions"] = forms["ids"].get("collisions", 0) + audit.get("x", 0) + len(set(ids) & produced)
    return {"framework_endpoints": len(hosts), "framework_form": sum(1 for _, rows in hosts if rows[0]["body"] == "form")}


def run(forms: dict, ctx: dict) -> dict:
    """The short arm: ``schema`` (Slice 4 — schemas{} + cases on validation rows), ``migration`` and ``model`` (Slice 10a —
    migrations{} and models{}), ``setting`` (Slice 10b — settings{}), ``mirror`` (Slice 10c — mirrors{}, after the setting part it reads)."""
    repo, parts = Path(ctx["repo"]), ctx["parts"]
    stats: dict = {}
    if "schema" in parts:
        forms["schemas"], stats, findings = schema_part(repo, forms, ctx["amap"])
        if findings:
            forms["arm_findings"].setdefault("short", []).extend(findings)
            stats["findings"] = {"extra-ignored": len(findings)}
    if "migration" in parts:
        forms["migrations"], stats["migration"] = MD.migration_part(repo)
    if "model" in parts:
        forms["models"], stats["model"], found = MD.model_part(repo, forms, ctx["amap"])
        if found:
            forms["arm_findings"].setdefault("short", []).extend(found)
            counts = stats.setdefault("findings", {})
            for f in found:
                counts[f["id"]] = counts.get(f["id"], 0) + 1
    absent = {}
    if "setting" in parts:
        settings, got, found = ST.setting_part(repo, forms)
        if not got["classes"]:
            absent["setting"] = "no BaseSettings class in the project"
        else:
            forms["settings"], stats["setting"] = settings, got
        if found:
            forms["arm_findings"].setdefault("short", []).extend(found)
            counts = stats.setdefault("findings", {})
            for f in found:
                counts[f["id"]] = counts.get(f["id"], 0) + 1
    if "mirror" in parts:
        forms["mirrors"], stats["mirror"], found = MR.mirror_part(repo, forms)
        if found:
            forms["arm_findings"].setdefault("short", []).extend(found)
            counts = stats.setdefault("findings", {})
            for f in found:
                counts[f["id"]] = counts.get(f["id"], 0) + 1
    return {"version": 1, "stats": stats, "options": dict(SH.OPTIONS), **({"absent": absent} if absent else {})}


run.parts = PARTS
