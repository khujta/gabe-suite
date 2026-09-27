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
``update``; a name bound to a project definition (a project import, a ``def``, a ``class``) is that function, never a
verb — a project function literally named ``delete`` is followed as the project's — unless the module it imports names
binds that symbol to the library itself (a facade, one hop, through the reader's ``follow``); a name the function binds
to some other value reads as its written verb only when the file takes that verb from the library (a compat ``try`` that
catches ImportError included — for the verb rule that import still happened).

Pure ``ast``: no repo, no module resolution — a reader that has a repo hands ``module_imports`` its own one-hop
``follow``. Each reader turns the statement and alias this rule picks into its own binding shape (a file and symbol, a
dotted module string, a module file).
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


class Scope(tuple):
    """One ``fn_scopes`` row ``(first line, last line, rows)``, and ``body``: the ``(line, col)`` its body starts at — so a
    region a function, lambda or comprehension nested in it owns (``Table.owned``) is told from its own body's."""
    body: tuple | None = None


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
            sc = Scope((fn.lineno, getattr(fn, "end_lineno", None) or fn.lineno, sorted(rows, key=lambda r: r[0])))
            sc.body = (fn.body[0].lineno, fn.body[0].col_offset)
            out.append(sc)
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
    best = _importer(scopes, name, p)
    if best is None:
        return None
    return [r for r in best[1] if r[0] <= p] or SHADOWED


def _importer(scopes: list, name: str | None, p: tuple | None):
    """``(scope, its rows importing name)`` of the innermost function around ``p`` that imports ``name`` in its own body;
    None when there is none."""
    if p is None or not name:
        return None
    best = None
    for sc in scopes:
        start, end, rows = sc
        if start <= p[0] <= end:
            mine = [r for r in rows if r[1] == name]
            if mine and (best is None or start > best[0][0]):
                best = (sc, mine)
    return best


def local(scopes: list, name: str | None, p: tuple | None) -> tuple | None:
    """The ONE row that binds ``name`` at ``p`` — the latest ``visible`` one; ``(p, name, SHADOWED, None)`` for a use
    before the function's first import of it; None when the module table decides."""
    v = visible(scopes, name, p)
    return None if v is None else (p, name, SHADOWED, None) if v is SHADOWED else v[-1]


LIBS = frozenset({"sqlalchemy", "sqlmodel"})                  # the ORM libraries whose verbs ``verb`` reads through an alias
VERBS = frozenset({"select", "insert", "update", "delete"})    # what a library module's attribute call reads as (``sa.update(M)``)
MODULE = "<module>"                                            # ``module_imports``' mark for a library MODULE binding
_COMPS = (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)
_DEFS = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


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


def _binds(fn) -> tuple[set, set]:
    """``(defs, others)`` — the names a function or lambda binds itself: ``defs`` by a nested ``def`` or ``class``,
    ``others`` by its parameters and what its own body stores or catches (a comprehension's targets are the
    comprehension's; its walrus is the function's) — both less what it declares ``global``. Its own imports are left to
    ``local``, which reads them at their point."""
    a = fn.args
    got = {x.arg for x in a.posonlyargs + a.args + a.kwonlyargs + [a.vararg, a.kwarg] if x is not None}
    defs: set = set()
    glob: set = set()
    todo = [fn.body] if isinstance(fn, ast.Lambda) else list(fn.body)
    while todo:
        n = todo.pop()
        if isinstance(n, _DEFS):
            defs.add(n.name)
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
    return defs - glob, got - glob


def _span(n) -> tuple:
    return (n.lineno, n.col_offset), (n.end_lineno or n.lineno, n.end_col_offset or 0)


def _shadows(tree, keys: set) -> dict:
    """``{name: [(start, end, kind)]}`` — for each of ``keys``, the regions where a function, lambda or comprehension binds
    it itself: a function's body (its defaults and decorators run outside it), a lambda's body, a comprehension's element,
    conditions and every iterable after its first (the first runs outside it). ``kind``: ``def`` when a function binds
    the name only by a nested ``def``/``class`` (a project definition), ``other`` for any other binding."""
    out: dict = {}
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            defs, others = _binds(n)
            hit = (defs | others) & keys
            if hit:
                body = [n.body] if isinstance(n, ast.Lambda) else n.body
                reg = ((body[0].lineno, body[0].col_offset), _span(n)[1])
                for k in hit:
                    out.setdefault(k, []).append((*reg, "other" if k in others else "def"))
        elif isinstance(n, _COMPS):
            hit = {x for g in n.generators for t in ast.walk(g.target) for x in _stored(t)} & keys
            if hit:
                parts = ([n.key, n.value] if isinstance(n, ast.DictComp) else [n.elt]) + \
                        [c for g in n.generators for c in g.ifs] + [g.iter for g in n.generators[1:]]
                for k in hit:
                    out.setdefault(k, []).extend((*_span(x), "other") for x in parts)
    return out


class Table(dict):
    """``module_imports``' result: ``{bound name: (what, shadows)}`` — the module's ORM-library bindings — and, as
    attributes, the rest the verb rule reads: ``project`` (the names whose latest module-level binding is a DEFINITION
    that is not the ORM library's — a ``def``, a ``class``, an import from any other package), ``via`` (of those, the
    ones an import binds → its ``(statement, alias)``, for ``follow``), ``follow`` (the reader's one-hop resolver, or
    None), ``libverbs`` (the ``VERBS`` the file takes from the library anywhere, at any level and under any alias — a
    star import of the library imports them all, a compat ``try`` that catches ImportError still imports, an attribute
    ``sa.select`` of a library module names it; only ``if TYPE_CHECKING:`` never runs) and ``owned`` (``_shadows`` of
    every name the rule can read as a verb). A plain dict of the old shape still works: it carries no project names, no
    library verbs and no owned regions."""
    project: frozenset = frozenset()
    via: dict = {}
    follow = None
    libverbs: frozenset = frozenset()
    owned: dict = {}


def _type_checking(n) -> bool:
    return isinstance(n, ast.If) and _leaf(n.test) == "TYPE_CHECKING"


def _libverbs(tree) -> frozenset:
    got, mods, todo = set(), set(), list(tree.body)
    while todo:
        n = todo.pop()
        if _type_checking(n):
            continue
        if isinstance(n, ast.ImportFrom) and lib(n, None):
            for a in n.names:
                got.update(VERBS if a.name == "*" else {a.name} & VERBS)
            continue
        if isinstance(n, ast.Import):
            mods.update(name for name, a in names(n) if lib(n, a))
            continue
        todo += [c for c in ast.iter_child_nodes(n) if isinstance(c, (ast.stmt, ast.excepthandler, ast.match_case))]
    got.update(x.attr for x in ast.walk(tree) if isinstance(x, ast.Attribute) and x.attr in VERBS
               and isinstance(x.value, ast.Name) and x.value.id in mods)
    return frozenset(got)


def _compat(n) -> dict:
    """A module-level ``try`` that catches ImportError → ``{bound name: [(statement, alias)]}``: every import its body,
    handlers and ``else`` make, and every name they assign (``(None, None)`` — ``rq = None`` in the handler) — the
    alternatives one of which binds the name."""
    alts: dict = {}
    for blk in [n.body, n.orelse] + [h.body for h in n.handlers]:
        for st in blk:
            if isinstance(st, (ast.Import, ast.ImportFrom)):
                for name, a in names(st):
                    alts.setdefault(name, []).append((st, a))
            elif isinstance(st, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
                for t in (st.targets if isinstance(st, ast.Assign) else [st.target]):
                    for x in ast.walk(t):
                        if isinstance(x, ast.Name):
                            alts.setdefault(x.id, []).append((None, None))
    return alts


def module_imports(tree, follow=None) -> Table:
    """The module's own bindings for ``verb``: ``{bound name: (what, shadows)}`` — ``what`` is the name a ``from <lib>
    import y [as z]`` imports (a ``from <lib> import *`` imports every one of ``VERBS``), or ``MODULE`` for ``import
    <lib>[.x] [as z]``; ``shadows`` are the regions where a function, lambda or comprehension binds the name itself
    (``_shadows``), so there it is theirs. Its DIRECT statements in source order (never a function's, a class body's or
    ``if TYPE_CHECKING:``), the latest binding winning: a later ``def``, ``class`` or import from any other package
    rebinds the name to a definition that is not the library's (``Table.project``), a later assignment to a value the
    rule does not read — either way it leaves the library table. Two module-level forms keep a library binding: a compat
    ``try`` that catches ImportError whose every alternative imports the name from the library (one ``what``), and an
    alias assignment of a library binding (``select = sa.select`` · ``select = _sel``). ``follow``: the reader's resolver
    of a project import one hop (``verb``). See ``Table`` for the other attributes."""
    out: dict = {}
    project: set = set()
    via: dict = {}

    def unbind(name):
        out.pop(name, None)
        project.discard(name)
        via.pop(name, None)

    for n in tree.body:
        if isinstance(n, (ast.Import, ast.ImportFrom)):
            if isinstance(n, ast.ImportFrom) and lib(n, None) and any(a.name == "*" for a in n.names):
                for v in VERBS:
                    unbind(v)
                    out[v] = v
            for name, a in names(n):
                unbind(name)
                if lib(n, a):
                    out[name] = a.name if isinstance(n, ast.ImportFrom) else MODULE
                else:
                    project.add(name)
                    via[name] = (n, a)
            continue
        if isinstance(n, TRY) and unread(n):
            for name, alts in _compat(n).items():
                whats = {a.name if isinstance(st, ast.ImportFrom) else MODULE for st, a in alts if st is not None}
                unbind(name)
                if len(whats) == 1 and all(st is not None and lib(st, a) for st, a in alts):
                    out[name] = whats.pop()
            continue
        if isinstance(n, _DEFS):
            unbind(n.name)
            project.add(n.name)
            continue
        bound = ([t.id for t in (n.targets if isinstance(n, ast.Assign) else [n.target]) if isinstance(t, ast.Name)]
                 if isinstance(n, (ast.Assign, ast.AugAssign)) or (isinstance(n, ast.AnnAssign) and n.value is not None) else [])
        v = getattr(n, "value", None) if not isinstance(n, ast.AugAssign) else None
        what = (v.attr if isinstance(v, ast.Attribute) and v.attr in VERBS and isinstance(v.value, ast.Name)
                and out.get(v.value.id) == MODULE else out.get(v.id) if isinstance(v, ast.Name) else None)
        for name in bound:
            unbind(name)
            if what:
                out[name] = what
    keys = set(out) | VERBS | set(via) | {name for x in ast.walk(tree) if isinstance(x, (ast.Import, ast.ImportFrom))
                                            for name, _a in names(x)}
    owned = _shadows(tree, keys)
    t = Table((k, (v, tuple(r[:2] for r in owned.get(k, ())))) for k, v in out.items())
    t.project, t.via, t.follow, t.libverbs, t.owned = frozenset(project), via, follow, _libverbs(tree), owned
    return t


def _followed(module, stmt, alias) -> tuple:
    """A project import one hop on: when the module it names binds the imported symbol to an ORM-library import of its
    own (a facade: ``app/db.py`` does ``from sqlalchemy import select`` and ``from app.db import select`` reads it), the
    library binding ``("lib", y | MODULE)``; else ``("def", None)`` — a definition, a class, a further import, or a
    module the reader cannot resolve. Only ``from x import y`` names a symbol; ``follow`` is the reader's (a repo)."""
    fol = getattr(module, "follow", None)
    if fol is None or not isinstance(stmt, ast.ImportFrom):
        return "def", None
    tgt = fol(stmt, alias)
    got = tgt.get(alias.name) if tgt is not None else None
    return ("lib", got[0]) if got else ("def", None)


def _binding(scopes: list, name: str, p: tuple | None, module) -> tuple:
    """What binds ``name`` at ``p`` → ``(kind, what)``: ``("lib", y | MODULE)`` an ORM-library import (or a project import
    of a module that binds it so — ``_followed``) · ``("def", None)`` a definition that is not the library's (an import
    from any other package, a ``def``, a ``class``) · ``("other", None)`` a binding whose value the rule does not read (a
    parameter, an assignment, a loop/with/except/comprehension target, a use before the function's own import) ·
    ``(None, None)`` nothing the tables know. The innermost decides: of a function-local import (``local``) and a
    function, lambda or comprehension that binds the name itself (``Table.owned``), the deeper — a region nested inside
    the importing function's body is deeper, the importing function's own body or an enclosing one is not — then the
    module's own bindings."""
    inner = None
    if module is not None and p is not None:
        inner = max((x for x in getattr(module, "owned", {}).get(name, ()) if x[0] <= p <= x[1]), key=lambda x: x[0], default=None)
        if inner is None and name in module:                      # a plain dict of the old shape: its shadows, kind unknown
            inner = next(((a, b, "other") for a, b in module[name][1] if a <= p <= b), None)
    r = local(scopes, name, p)
    if r is not None:
        sc = _importer(scopes, name, p)[0]
        body = getattr(sc, "body", None) or (sc[0] + 1, 0)
        if inner is None or inner[0] <= body:
            if r[2] is SHADOWED:
                return "other", None
            if not lib(r[2], r[3]):
                return _followed(module, r[2], r[3])
            return "lib", r[3].name if isinstance(r[2], ast.ImportFrom) else MODULE
    if inner is not None:
        return inner[2], None
    if module is None:
        return None, None
    if name in module:
        return "lib", module[name][0]
    if name in getattr(module, "via", {}):
        return _followed(module, *module.via[name])
    return ("def", None) if name in getattr(module, "project", ()) else (None, None)


def verb(scopes: list, call, module: dict | None = None) -> str | None:
    """A call's name as a reader that matches the ORM library's verbs by name reads it (``select`` · ``insert`` ·
    ``update`` · ``delete``) — ONE rule for the effects arm, the code map's ``_orm_access``, the contract arm's idioms and
    the model arm's guard-use check. A bare call reads as the library name ``y`` a ``from <lib> import y [as z]`` binds at
    the call (``_binding``: the innermost of a function-local import and a function, lambda or comprehension around the
    call that binds the name itself, else the module's own) — or a project import of a module that binds the name so,
    one hop (``Table.follow``: ``from app.db import select`` where ``app/db.py`` imports it from the library). A name
    bound to a definition that is not the library's — a ``def`` or ``class`` here or in an enclosing function, an import
    from the project (or any other package) at either level that lands on anything else — is that function, never a
    verb: a project function literally named ``delete`` is followed as the project's. A name bound to something the rule
    does not read (a parameter, an assignment such as ``insert = pg_insert if pg else sqlite_insert``, a loop target), or
    bound by nothing, reads as the written name only when that name is one of ``VERBS`` and the file takes it from the
    library somewhere (``Table.libverbs``): unresolved, and imported from the library. Without a module table (a
    function parsed on its own) that evidence is unknown and the written verb name stands. An attribute call on a bare
    name bound to the library (``sa.update(M)`` after ``import sqlalchemy as sa``): its attribute when that is one of
    ``VERBS``. None for any other call."""
    f = call.func
    if isinstance(f, ast.Name):
        name, attr = f.id, None
    elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.attr in VERBS:
        name, attr = f.value.id, f.attr
    else:
        return None
    kind, what = _binding(scopes, name, point(call), module)
    if attr is not None:
        return attr if kind == "lib" else None
    if kind == "lib":
        return None if what == MODULE else what
    if kind == "def" or name not in VERBS:
        return None
    return name if module is None or name in getattr(module, "libverbs", VERBS) else None
