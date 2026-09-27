"""The scoped-import rule — which import statement binds a name at a point inside a function. ONE rule for every reader
that resolves a name written in a function: the element forms' resolver (``_a3_paths_read``), the code map's dispatch and
module-call tables (``_a3_code``) and the tests arm's ``pytest.raises`` roots (``_a3_test_asserts``).

An import in a function's OWN body binds its names in that function and in the defs nested in it. The innermost function
that imports the name decides: its latest import of the name at or before the point binds it there, and shadows whatever
the module binds. Python makes the name local to that whole function, so a use BEFORE its first import binds nothing
(Python raises UnboundLocalError), never the module's binding. A nested def's or class body's imports are its own. An
import under ``if TYPE_CHECKING:`` (never runs) or in a ``try`` that catches ImportError (may not have happened) is read
at neither level — the module table reads only the module's direct statements, so it never sees them either. A reader
that matches the ORM library's verbs by name (``verb``) reads an ORM-library import at BOTH levels as what it imports:
``from sqlalchemy import delete as sa_delete`` is ``delete``, ``import sqlalchemy as sa`` makes ``sa.update(M)`` an
``update``; a project import never is, and a name the function binds itself is its own.

Pure ``ast``: no repo, no module resolution. Each reader turns the statement and alias this rule picks into its own
binding shape (a file and symbol, a dotted module string, a module file).
"""
from __future__ import annotations

import ast

SCOPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)   # a body whose imports are its own
TRY = (ast.Try,) + ((ast.TryStar,) if hasattr(ast, "TryStar") else ())
IMPORT_ERRORS = frozenset({"ImportError", "ModuleNotFoundError"})
FAR = 1 << 30                                                # a line-only lookup point: past every column on its line


def _leaf(e) -> str | None:
    return e.id if isinstance(e, ast.Name) else e.attr if isinstance(e, ast.Attribute) else None


def unread(n) -> bool:
    """A block whose imports no table reads: ``if TYPE_CHECKING:`` and a ``try`` that catches ImportError."""
    if isinstance(n, ast.If):
        return _leaf(n.test) == "TYPE_CHECKING"
    if isinstance(n, TRY):
        for h in n.handlers:
            els = h.type.elts if isinstance(h.type, ast.Tuple) else [h.type] if h.type is not None else []
            if {_leaf(e) for e in els} & IMPORT_ERRORS:
                return True
    return False


def names(node) -> list[tuple]:
    """``[(bound name, alias)]`` for one import statement — the name Python binds: ``from x import y as z`` → ``z`` ·
    ``import a.b as c`` → ``c`` · ``import a.b`` → ``a``. A star import binds nothing this rule can name."""
    if isinstance(node, ast.ImportFrom):
        return [(a.asname or a.name, a) for a in node.names if a.name != "*"]
    return [(a.asname or a.name.split(".")[0], a) for a in node.names]


def fn_scopes(tree) -> list:
    """Every function of ``tree`` that imports in its OWN body → ``[(first line, last line, [((line, col), name, statement,
    alias)])]``, rows in source order."""
    out = []
    for fn in ast.walk(tree):
        if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        rows, todo = [], list(fn.body)
        while todo:
            n = todo.pop()
            if isinstance(n, SCOPES) or unread(n):
                continue
            if isinstance(n, (ast.Import, ast.ImportFrom)):
                rows += [((n.lineno, n.col_offset), name, n, a) for name, a in names(n)]
            else:
                todo += [c for c in ast.iter_child_nodes(n) if isinstance(c, (ast.stmt, ast.excepthandler, ast.match_case))]
        if rows:
            out.append((fn.lineno, getattr(fn, "end_lineno", None) or fn.lineno, sorted(rows, key=lambda r: r[0])))
    return out


def point(at, rel: str | None = None) -> tuple | None:
    """A lookup point → ``(line, col)``: a node (its own position), a line, or a ``rel:line`` site of the file ``rel``.
    None for a site in another file, or a node parsed from text — those read the module table only."""
    if isinstance(at, bool) or at is None:
        return None
    if isinstance(at, int):
        return at, FAR
    if isinstance(at, str):
        f, _, ln = at.rpartition(":")
        return (int(ln), FAR) if rel is not None and f == rel and ln.isdigit() else None
    ln = getattr(at, "lineno", None)
    return (ln, getattr(at, "col_offset", 0) or 0) if isinstance(ln, int) else None


SHADOWED = "shadowed"                                        # the statement slot of a use before the function's first import


def visible(scopes: list, name: str | None, p: tuple | None):
    """The rows that bind ``name`` at ``p``, in source order: of the functions around ``p`` that import ``name`` in their
    own body, the innermost; its imports of ``name`` at or before ``p``. ``SHADOWED`` when that function imports it only
    later (the name is its local, still unbound); None when no function around ``p`` imports ``name`` — the module
    table decides."""
    if p is None or not name:
        return None
    best = None
    for start, end, rows in scopes:
        if start <= p[0] <= end:
            mine = [r for r in rows if r[1] == name]
            if mine and (best is None or start > best[0]):
                best = (start, mine)
    if best is None:
        return None
    return [r for r in best[1] if r[0] <= p] or SHADOWED


def local(scopes: list, name: str | None, p: tuple | None) -> tuple | None:
    """The ONE row that binds ``name`` at ``p`` — the latest ``visible`` one; ``(p, name, SHADOWED, None)`` for a use
    before the function's first import of it; None when the module table decides."""
    v = visible(scopes, name, p)
    return None if v is None else (p, name, SHADOWED, None) if v is SHADOWED else v[-1]


LIBS = frozenset({"sqlalchemy", "sqlmodel"})                  # the ORM libraries whose verbs ``verb`` reads through an alias
VERBS = frozenset({"select", "insert", "update", "delete"})    # what a library module's attribute call reads as (``sa.update(M)``)
MODULE = "<module>"                                            # ``module_imports``' mark for a library MODULE binding
_COMPS = (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)


def lib(stmt, alias) -> bool:
    """Whether one alias of an import statement binds something of an ORM library (``LIBS``): ``from sqlalchemy[.x] import
    y`` (absolute) or ``import sqlalchemy[.x] [as z]``. A project import — relative, or any other package — never does, so
    ``from app.crud import delete as remove_tag`` stays ``remove_tag`` and its call is followed as the project's."""
    if isinstance(stmt, ast.ImportFrom):
        return not stmt.level and (stmt.module or "").split(".")[0] in LIBS
    return isinstance(stmt, ast.Import) and alias.name.split(".")[0] in LIBS


def _stored(n) -> list[str]:
    """The names one node binds in the scope it sits in: a Store/Del name (an assignment, a ``for``/``with`` target), an
    ``except … as`` name, a match capture."""
    if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)):
        return [n.id]
    if isinstance(n, ast.ExceptHandler) or isinstance(n, (ast.MatchAs, ast.MatchStar)):
        return [n.name] if n.name else []
    if isinstance(n, ast.MatchMapping):
        return [n.rest] if n.rest else []
    return []


def _binds(fn) -> set:
    """The names a function or lambda binds itself — its parameters, and what its own body stores, defines or catches (a
    comprehension's targets are the comprehension's; its walrus is the function's) — less what it declares ``global``.
    Its own imports are left to ``local``, which reads them at their point."""
    a = fn.args
    got = {x.arg for x in a.posonlyargs + a.args + a.kwonlyargs + [a.vararg, a.kwarg] if x is not None}
    glob: set = set()
    todo = [fn.body] if isinstance(fn, ast.Lambda) else list(fn.body)
    while todo:
        n = todo.pop()
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            got.add(n.name)
            continue
        if isinstance(n, ast.Lambda):
            continue
        if isinstance(n, _COMPS):
            got.update(x.target.id for x in ast.walk(n) if isinstance(x, ast.NamedExpr) and isinstance(x.target, ast.Name))
            continue
        if isinstance(n, ast.Global):
            glob.update(n.names)
            continue
        got.update(_stored(n))
        todo.extend(ast.iter_child_nodes(n))
    return got - glob


def _span(n) -> tuple:
    return (n.lineno, n.col_offset), (n.end_lineno or n.lineno, n.end_col_offset or 0)


def _shadows(tree, keys: set) -> dict:
    """``{name: [(start, end)]}`` — for each of ``keys``, the regions where a function, lambda or comprehension binds it
    itself: a function's body (its defaults and decorators run outside it), a lambda's body, a comprehension's element,
    conditions and every iterable after its first (the first runs outside it)."""
    out: dict = {}
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            hit = _binds(n) & keys
            if hit:
                body = [n.body] if isinstance(n, ast.Lambda) else n.body
                reg = ((body[0].lineno, body[0].col_offset), _span(n)[1])
                for k in hit:
                    out.setdefault(k, []).append(reg)
        elif isinstance(n, _COMPS):
            hit = {x for g in n.generators for t in ast.walk(g.target) for x in _stored(t)} & keys
            if hit:
                parts = ([n.key, n.value] if isinstance(n, ast.DictComp) else [n.elt]) + \
                        [c for g in n.generators for c in g.ifs] + [g.iter for g in n.generators[1:]]
                for k in hit:
                    out.setdefault(k, []).extend(_span(x) for x in parts)
    return out


def module_imports(tree) -> dict:
    """The module's own ORM-library bindings for ``verb`` → ``{bound name: (what, shadows)}``: ``what`` is the name a
    ``from <lib> import y [as z]`` imports, or ``MODULE`` for ``import <lib>[.x] [as z]``; ``shadows`` are the regions
    where a function, lambda or comprehension binds the name itself (``_shadows``), so there it is theirs. Its DIRECT
    statements in source order (never a function's, a class body's, ``if TYPE_CHECKING:`` or a ``try`` — the module
    table's reach), the latest binding winning: any later binding of the name — a project import, a ``def``, a
    ``class``, an assignment — rebinds it, so it leaves the table."""
    out: dict = {}
    for n in tree.body:
        if isinstance(n, (ast.Import, ast.ImportFrom)):
            for name, a in names(n):
                if lib(n, a):
                    out[name] = a.name if isinstance(n, ast.ImportFrom) else MODULE
                else:
                    out.pop(name, None)
            continue
        bound = ([n.name] if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
                 else [t.id for t in (n.targets if isinstance(n, ast.Assign) else [n.target]) if isinstance(t, ast.Name)]
                 if isinstance(n, (ast.Assign, ast.AugAssign)) or (isinstance(n, ast.AnnAssign) and n.value is not None) else [])
        for name in bound:
            out.pop(name, None)
    if not out:
        return {}
    sh = _shadows(tree, set(out))
    return {k: (v, tuple(sh.get(k, ()))) for k, v in out.items()}


def verb(scopes: list, call, module: dict | None = None) -> str | None:
    """A call's name as a reader that matches the ORM library's verbs by name reads it (``select`` · ``insert`` ·
    ``update`` · ``delete``). A bare call: the imported name ``y`` when a ``from <lib> import y [as z]`` binds the written
    name at the call — a function-local import first (``local``), else the module's own (``module``, from
    ``module_imports``) unless a function, lambda or comprehension around the call binds the name itself — and the
    written name otherwise (a project import, a use before the function's own import, no import at all). An attribute
    call on a bare name bound the same way to the library (``sa.update(M)`` after ``import sqlalchemy as sa``): its
    attribute when that is one of ``VERBS``. None for any other call."""
    f = call.func
    if isinstance(f, ast.Name):
        name, attr = f.id, None
    elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.attr in VERBS:
        name, attr = f.value.id, f.attr
    else:
        return None
    p = point(call)
    r = local(scopes, name, p)
    if r is not None:
        what = (None if r[2] is SHADOWED or not lib(r[2], r[3])
                else r[3].name if isinstance(r[2], ast.ImportFrom) else MODULE)
    else:
        row = (module or {}).get(name)
        what = None if row is None or (p is not None and any(a <= p <= b for a, b in row[1])) else row[0]
    if attr is not None:
        return attr if what is not None else None
    return name if what in (None, MODULE) else what
