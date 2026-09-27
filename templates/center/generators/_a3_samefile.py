"""Same-file call confirmation — whether a function's OWN body calls another function of its file the way the language
would reach it (D-060 review F3).

The levels rule that draws a drawn function's calls into its own file (``_a3_levels`` rule 3b3) takes its edges from
graft, the third-party call index — never patched. graft resolves an attribute call by the bare method name and
prefers a class in the same file, so on tier3 ``logger.error(...)`` landed on a same-file ``ThreadContextResult.error``,
a dict's ``.get()`` on ``GitbookApiClient.get``, and the openai client's ``.create`` on ``CloudEmbedding.create``
(117 of 1,392 same-file edges had no call behind them). This leaf keeps a same-file edge only when the caller names the
callee itself:

* a module-level function — a bare call ``f(...)``;
* a function nested in the caller, or in a function around it — a bare call of its name;
* a method ``K.m`` — ``self.m(...)`` / ``cls.m(...)`` / ``type(self).m(...)`` inside a class related to ``K`` (``K``,
  a same-file base, or a same-file subclass), ``super().m(...)`` below a same-file base ``K``, ``K.m(...)``, or ``v.m(...)``
  / ``self.v.m(...)`` where ``v`` holds a ``K`` (or a class related to it) — ``v = K(...)`` · ``v = make()`` with
  ``def make() -> K`` · ``v: K`` · a parameter annotated ``K`` — bound at the module's top level, in the caller's own
  body, or on ``self`` by the class or a same-file base (gustify's ``bus = EventBus()`` then
  ``bus.register_once(...)``);
* a constructor ``K.__init__`` — ``K(...)``.

Python is read from its AST (graft's ids are qualnames: ``fn`` · ``Class.method`` · ``outer.inner``); TypeScript and
JavaScript from the caller's source lines (graft's ``span``) with the same rules spelled for them (``f(`` · ``this.m(`` ·
``K.m(`` · ``super.m(`` · ``new K(``) — a text read, so a call written in a comment or a string also confirms. An edge
whose file cannot be read confirms nothing. Pure: no graft, no repo layout, no clock.
"""
from __future__ import annotations

import ast
import re
from collections import deque
from pathlib import Path

_DEFS = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
_TEXT = (".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs")


def _quals(tree) -> dict[str, list]:
    """``{qualname: [def nodes]}`` the way graft names them, in source order (a name defined twice keeps both)."""
    out: dict[str, list] = {}
    todo = deque([(tree, "")])
    while todo:
        node, prefix = todo.popleft()
        for c in ast.iter_child_nodes(node):
            if isinstance(c, _DEFS):
                q = prefix + c.name
                out.setdefault(q, []).append(c)
                todo.append((c, q + "."))
            elif isinstance(c, (ast.stmt, ast.excepthandler, ast.match_case)):
                todo.append((c, prefix))
    return out


def _own_calls(fn):
    """The calls a def's OWN body makes — a nested def's or class's body is its own, its decorators and defaults run here."""
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        if isinstance(n, _DEFS):
            todo.extend(n.decorator_list)
            todo.extend(n.bases + [k.value for k in n.keywords] if isinstance(n, ast.ClassDef)
                        else n.args.defaults + [d for d in n.args.kw_defaults if d is not None])
            continue
        if isinstance(n, ast.Call):
            yield n
        todo.extend(ast.iter_child_nodes(n))


def _is_class(quals: dict, q: str) -> bool:
    return any(isinstance(n, ast.ClassDef) for n in quals.get(q, ()))


def _is_fn(quals: dict, q: str) -> bool:
    return any(isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) for n in quals.get(q, ()))


class _File:
    """One parsed file: its defs by qualname, its classes by bare name, and what its module-level names hold."""

    def __init__(self, tree):
        self.quals = _quals(tree)
        self.by_name = {q.rpartition(".")[2]: q for q in self.quals if _is_class(self.quals, q)}
        self.returns = {q: k for q in self.quals if "." not in q and _is_fn(self.quals, q)
                        for k in [self.ann(self.quals[q][0].returns)] if k}
        self._anc: dict[str, set] = {}
        self._attrs: dict[str, dict] = {}
        self.top = self.instances(tree.body)

    def ann(self, a) -> str | None:
        """The same-file class an annotation names: ``K`` · ``"K"`` · ``K | None`` · ``Optional[K]``."""
        if isinstance(a, ast.Constant) and isinstance(a.value, str):
            try:
                a = ast.parse(a.value, mode="eval").body
            except SyntaxError:
                return None
        if isinstance(a, ast.Name):
            return self.by_name.get(a.id)
        if isinstance(a, ast.BinOp) and isinstance(a.op, ast.BitOr):
            hits = {x for x in (self.ann(a.left), self.ann(a.right)) if x}
            return hits.pop() if len(hits) == 1 else None
        if isinstance(a, ast.Subscript) and isinstance(a.value, ast.Name) and a.value.id == "Optional":
            return self.ann(a.slice)
        return None

    def value(self, v) -> str | None:
        """The same-file class a value is an instance of: ``K(...)``, or a call of a module-level function ``-> K``."""
        if isinstance(v, ast.Await):
            v = v.value
        if isinstance(v, ast.Call) and isinstance(v.func, ast.Name):
            return self.by_name.get(v.func.id) or self.returns.get(v.func.id)
        return None

    def instances(self, stmts, attrs: bool = False) -> dict[str, set[str]]:
        """``{name: {class quals}}`` the statements bind to a same-file class (``v = K(...)`` · ``v = make_k()`` ·
        ``v: K``) — with ``attrs``, the ``self.<name>`` they bind instead."""
        out: dict[str, set[str]] = {}
        for n in stmts:
            if isinstance(n, ast.Assign):
                k, ts = self.value(n.value), n.targets
            elif isinstance(n, ast.AnnAssign):
                k, ts = self.ann(n.annotation) or (self.value(n.value) if n.value is not None else None), [n.target]
            else:
                continue
            for t in ts if k else ():
                if not attrs and isinstance(t, ast.Name):
                    out.setdefault(t.id, set()).add(k)
                elif attrs and isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "self":
                    out.setdefault(t.attr, set()).add(k)
        return out

    def ancestors(self, k: str) -> set[str]:
        """The same-file classes ``k`` inherits from, by the bare base names its ``class`` statements write."""
        if k not in self._anc:
            seen: set[str] = set()
            todo = [k]
            while todo:
                for n in self.quals.get(todo.pop(), ()):
                    for b in getattr(n, "bases", ()):
                        q = self.by_name.get(b.id) if isinstance(b, ast.Name) else None
                        if q and q not in seen:
                            seen.add(q)
                            todo.append(q)
            seen.discard(k)
            self._anc[k] = seen
        return self._anc[k]

    def related(self, a: str, b: str) -> bool:
        """The same class, or one inherits from the other (a call on an ``a`` can run ``b``'s method)."""
        return a == b or b in self.ancestors(a) or a in self.ancestors(b)

    def class_of(self, q: str) -> str | None:
        """The nearest class around the def ``q`` (a method's class, or the class of the method a nested def sits in)."""
        parts = q.split(".")
        for i in range(len(parts) - 1, 0, -1):
            p = ".".join(parts[:i])
            if _is_class(self.quals, p):
                return p
        return None

    def self_attrs(self, cls: str) -> dict[str, set[str]]:
        """``{attr: {class quals}}`` — what ``self.<attr>`` holds in ``cls`` or a same-file base: set in any of their
        methods (``self.x = K(...)`` · ``self.x: K``) or annotated in the class body (``x: K``)."""
        if cls in self._attrs:
            return self._attrs[cls]
        out: dict[str, set[str]] = self._attrs.setdefault(cls, {})
        for c in [cls, *sorted(self.ancestors(cls))]:
            for node in self.quals.get(c, ()):
                for k, v in self.instances([x for x in node.body if isinstance(x, ast.AnnAssign)]).items():
                    out.setdefault(k, set()).update(v)
                for m in node.body:
                    if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        for k, v in self.instances(ast.walk(m), attrs=True).items():
                            out.setdefault(k, set()).update(v)
        return out

    def calls(self, sq: str, tq: str) -> bool:
        tparent, _, tname = tq.rpartition(".")
        cls = self.class_of(sq)
        for fn in self.quals.get(sq, ()):
            if isinstance(fn, ast.ClassDef):
                continue
            mine = {**self.top, **self.instances(ast.walk(fn))}
            a = fn.args
            for p in a.posonlyargs + a.args + a.kwonlyargs:
                k = self.ann(p.annotation)
                if k:
                    mine[p.arg] = {k}
            held = None
            for c in _own_calls(fn):
                f = c.func
                if isinstance(f, ast.Name):
                    if f.id == tname and (not tparent and _is_fn(self.quals, tq) or tparent and _is_fn(self.quals, tparent)
                                          and (sq == tparent or sq.startswith(tparent + "."))):
                        return True
                    if tname == "__init__" and _is_class(self.quals, tparent) and f.id == tparent.rpartition(".")[2]:
                        return True
                elif isinstance(f, ast.Attribute) and f.attr == tname and _is_class(self.quals, tparent):
                    v = f.value
                    selfish = (isinstance(v, ast.Name) and v.id in ("self", "cls")) or \
                              (isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "type" and v.args
                               and isinstance(v.args[0], ast.Name) and v.args[0].id == "self")
                    if selfish and cls is not None and self.related(cls, tparent):
                        return True
                    if isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == "super" and cls is not None \
                            and tparent in self.ancestors(cls):
                        return True
                    if isinstance(v, ast.Name) and (v.id == tparent.rpartition(".")[2]
                                                    or any(self.related(k, tparent) for k in mine.get(v.id, ()))):
                        return True
                    if isinstance(v, ast.Attribute) and isinstance(v.value, ast.Name) and v.value.id == "self" and cls is not None:
                        held = self.self_attrs(cls) if held is None else held
                        if any(self.related(k, tparent) for k in held.get(v.attr, ())):
                            return True
        return False


def _text_calls(lines: list[str], span: tuple[int, int] | None, sq: str, tq: str) -> bool:
    if span is None:
        return False
    body = "\n".join(lines[span[0] - 1:span[1]])
    tparent, _, tname = tq.rpartition(".")
    n = re.escape(tname)
    call = r"\s*(?:<[^()]*?>)?\s*\("
    if not tparent or sq == tparent or sq.startswith(tparent + "."):
        if re.search(r"(?:(?<=\.\.\.)|(?<![\w$.]))(?<!function )" + n + call, body):   # f(…) · ...f(…) — a module function, or one nested around
            return True
    if tparent:
        k = re.escape(tparent.rpartition(".")[2])
        if (sq == tparent or sq.startswith(tparent + ".")) and re.search(r"\bthis\s*\.\s*" + n + call, body):
            return True
        if re.search(r"(?<![\w$.])" + k + r"\s*\.\s*" + n + call, body) or re.search(r"\bsuper\s*\.\s*" + n + call, body):
            return True
        if tname == "constructor" and re.search(r"\bnew\s+" + k + r"\b", body):
            return True
    return False


def confirm(root, calls, spans: dict | None = None) -> list[list[str]]:
    """The same-file plain ``calls`` (no ``rel``) that the caller's own source confirms → sorted ``[[s, t], …]``.
    ``spans`` maps a graft id to its ``(first line, last line)`` — the text read for TypeScript/JavaScript."""
    root = Path(root)
    want: dict[str, list] = {}
    for c in calls:
        if c.get("rel", "calls") != "calls":
            continue
        sf, _, sq = c["s"].partition("#")
        tf, _, tq = c["t"].partition("#")
        if sf == tf and sq and tq:
            want.setdefault(sf, []).append((c["s"], c["t"], sq, tq))
    out = []
    for f, pairs in sorted(want.items()):
        try:
            text = (root / f).read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if f.endswith(".py"):
            try:
                tree = ast.parse(text)
            except (SyntaxError, ValueError):
                continue
            fl = _File(tree)
            out += [[s, t] for s, t, sq, tq in pairs if fl.calls(sq, tq)]
        elif f.endswith(_TEXT):
            lines = text.splitlines()
            out += [[s, t] for s, t, sq, tq in pairs if _text_calls(lines, (spans or {}).get(s), sq, tq)]
    return sorted(out)


def spans_of(wiring: dict) -> dict:
    """graft's ``span`` (``"L50-L57"``) per node id → ``(50, 57)``; a node without one is left out."""
    out = {}
    for n in wiring.get("nodes") or []:
        m = re.fullmatch(r"L(\d+)-L(\d+)", str(n.get("span") or ""))
        if m:
            out[n["id"]] = (int(m.group(1)), int(m.group(2)))
    return out
