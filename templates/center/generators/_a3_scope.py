"""The scoped-import rule — which import statement binds a name at a point inside a function. ONE rule for every reader
that resolves a name written in a function: the element forms' resolver (``_a3_paths_read``), the code map's dispatch and
module-call tables (``_a3_code``) and the tests arm's ``pytest.raises`` roots (``_a3_test_asserts``).

An import in a function's OWN body binds its names in that function and in the defs nested in it. The innermost function
that imports the name decides: its latest import of the name at or before the point binds it there, and shadows whatever
the module binds. Python makes the name local to that whole function, so a use BEFORE its first import binds nothing
(Python raises UnboundLocalError), never the module's binding. A nested def's or class body's imports are its own. An
import under ``if TYPE_CHECKING:`` (never runs) or in a ``try`` that catches ImportError (may not have happened) is read
at neither level — the module table reads only the module's direct statements, so it never sees them either.

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


def verb(scopes: list, call) -> str | None:
    """A bare call's name as a reader that matches library verbs by name reads it (the ORM ``select`` · ``insert`` ·
    ``update`` · ``delete``): the written name, or — when a function-local ``from x import y as z`` binds it at the
    call — the imported name ``y``. A module-level alias stays the written name (a ruling of its own). None for a call
    that is not a bare name."""
    if not isinstance(call.func, ast.Name):
        return None
    r = local(scopes, call.func.id, point(call))
    return r[3].name if r is not None and isinstance(r[2], ast.ImportFrom) else call.func.id
