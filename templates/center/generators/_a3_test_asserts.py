"""Test assertions — what each python test function CALLS and ASSERTS, and the role each call plays (amendment 1 §A2
Slice 9). Pure extraction with no forms knowledge, so the model and schema slices reuse it (S11 · F8).

Per test function, a statement walk in source order records every HTTP call (``client.<verb>(path, …)``: method, the
literal or f-string path, the header keys it sends — ``None`` when a header dict cannot be read — and whether it sends a
JSON body), the name the response is bound to, the helper functions it calls (one hop: a helper's own HTTP calls), the
service calls made inside ``pytest.raises(X)``, and every assertion made on a response: ``status`` (``==`` or ``in``),
``detail`` and ``code`` literals, ``is_success``, and any other attribute read (``attrs``). Roles, first match wins:
R1 a helper's call → ``arrange`` · R2 never asserted → ``arrange`` · R3 a status-only 2xx assertion followed by an
asserted call → ``arrange-checked`` · R4 otherwise → ``act``. A ``pytest.raises`` root the test imports in its own body
carries that import as ``imp`` (``_a3_scope``'s rule — ``null`` for a use before it); the module's ``imports`` decide
the rest.
"""
from __future__ import annotations

import ast
import re

import _a3_scope as S

VERBS = frozenset({"get", "post", "put", "patch", "delete", "head", "options"})
DETAIL_KEYS = frozenset({"detail", "message", "error"})
CODE_KEYS = frozenset({"code", "error_code", "reason", "type"})
CID_RX = re.compile(r"(?:^|_)C(\d{1,6})(?=$|_|\[)")


def _dict_keys(node, aliases: dict):
    """The string keys a header dict literal carries (``**X`` spreads resolved through ``aliases``), or None."""
    if isinstance(node, ast.Name):
        return set(aliases[node.id]) if node.id in aliases else None
    if not isinstance(node, ast.Dict):
        return None
    keys: set = set()
    for k, v in zip(node.keys, node.values):
        if k is None:
            sub = _dict_keys(v, aliases)
            if sub is None:
                return None
            keys |= sub
        elif isinstance(k, ast.Constant) and isinstance(k.value, str):
            keys.add(k.value)
        else:
            return None
    return keys


def _path(node) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value.startswith("/"):
        return node.value
    if isinstance(node, ast.JoinedStr):
        raw = "".join(str(p.value) if isinstance(p, ast.Constant) else "{*}" for p in node.values)
        return raw if raw.startswith("/") else None
    return None


def _http(node):
    """The HTTP call an expression is (``await`` unwrapped), or None."""
    node = node.value if isinstance(node, ast.Await) else node
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr in VERBS and node.args and _path(node.args[0]):
        return node
    return None


def _record(call: ast.Call, aliases: dict) -> dict:
    kw = {k.arg: k.value for k in call.keywords if k.arg}
    sends = _dict_keys(kw["headers"], aliases) if "headers" in kw else set()
    return {"line": call.lineno, "method": call.func.attr.upper(), "path": _path(call.args[0]),
            "sends": sorted(sends) if sends is not None else None, "json": "json" in kw,
            "asserts": {"status": [], "detail": [], "code": [], "attrs": [], "is_success": False}}


def _subscript_key(node) -> str | None:
    s = node.slice
    return s.value if isinstance(s, ast.Constant) and isinstance(s.value, str) else None


def _json_key(node, json_of: dict, by_var: dict):
    """``resp.json()["k"]`` / ``body["k"]`` (``body = resp.json()``) → (the response's record, "k")."""
    if not isinstance(node, ast.Subscript):
        return None, None
    base, key = node.value, _subscript_key(node)
    if isinstance(base, ast.Call) and isinstance(base.func, ast.Attribute) and base.func.attr == "json" and isinstance(base.func.value, ast.Name):
        return by_var.get(base.func.value.id), key
    if isinstance(base, ast.Name) and base.id in json_of:
        return by_var.get(json_of[base.id]), key
    return None, None


def _ints(node) -> list | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, int):
        return [node.value]
    if isinstance(node, (ast.Tuple, ast.List, ast.Set)) and all(isinstance(e, ast.Constant) and isinstance(e.value, int) for e in node.elts):
        return [e.value for e in node.elts]
    return None


def _assert(test, by_var: dict, json_of: dict) -> None:
    if isinstance(test, ast.BoolOp):
        for v in test.values:
            _assert(v, by_var, json_of)
        return
    touched = set()
    if isinstance(test, ast.Compare) and len(test.ops) == 1:
        left, op, right = test.left, test.ops[0], test.comparators[0]
        if isinstance(left, ast.Attribute) and left.attr == "status_code" and isinstance(left.value, ast.Name) and left.value.id in by_var:
            vals = _ints(right)
            if vals and isinstance(op, (ast.Eq, ast.In)):
                by_var[left.value.id]["asserts"]["status"] += vals
                touched.add(left.value.id)
        for side, other in ((left, right), (right, left)):
            rec, key = _json_key(side, json_of, by_var)
            if rec is not None and isinstance(other, ast.Constant) and isinstance(other.value, str):
                if key in DETAIL_KEYS:
                    rec["asserts"]["detail"].append(other.value)
                    touched.add(id(rec))
                elif key in CODE_KEYS:
                    rec["asserts"]["code"].append(other.value)
                    touched.add(id(rec))
    if isinstance(test, ast.Attribute) and test.attr == "is_success" and isinstance(test.value, ast.Name) and test.value.id in by_var:
        by_var[test.value.id]["asserts"]["is_success"] = True
        return
    for n in ast.walk(test):
        name = n.id if isinstance(n, ast.Name) else None
        rec = by_var.get(name) if name in by_var else (by_var.get(json_of[name]) if name in json_of else None)
        if rec is not None and name not in touched and id(rec) not in touched:
            snippet = ast.unparse(test)[:120]
            if snippet not in rec["asserts"]["attrs"] and not (isinstance(test, ast.Compare) and "status_code" in snippet and not rec["asserts"]["attrs"] and len(test.ops) == 1 and _ints(test.comparators[0])):
                rec["asserts"]["attrs"].append(snippet)
            touched.add(id(rec))


def _walk(stmts, ctx: dict) -> None:
    for st in stmts:
        if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            name, val = st.targets[0].id, st.value
            keys = _dict_keys(val, ctx["aliases"]) if isinstance(val, ast.Dict) else None
            if keys is not None:
                ctx["aliases"][name] = keys
            inner = val.value if isinstance(val, ast.Await) else val
            if isinstance(inner, ast.Call) and isinstance(inner.func, ast.Attribute) and inner.func.attr == "json" \
                    and isinstance(inner.func.value, ast.Name) and inner.func.value.id in ctx["by_var"]:
                ctx["json_of"][name] = inner.func.value.id
        value = st.value if isinstance(st, (ast.Assign, ast.Expr, ast.AnnAssign)) and getattr(st, "value", None) is not None else None
        call = _http(value) if value is not None else None
        if call is not None:
            rec = _record(call, ctx["aliases"])
            if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
                ctx["by_var"][st.targets[0].id] = rec
            ctx["calls"].append(rec)
        for n in ast.walk(st) if not isinstance(st, (ast.With, ast.AsyncWith, ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try)) else ():
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ctx["helpers"] and n.func.id not in ctx["seen_helpers"]:
                ctx["seen_helpers"].add(n.func.id)
                sub = {"aliases": dict(ctx["module_aliases"]), "by_var": {}, "json_of": {}, "calls": [], "helpers": {}, "seen_helpers": set(),
                       "module_aliases": ctx["module_aliases"], "raises": [], "in_raises": None}
                _walk(ctx["helpers"][n.func.id].body, sub)
                for c in sub["calls"]:
                    c["helper"] = n.func.id
                    ctx["calls"].append(c)
        if isinstance(st, ast.Assert):
            _assert(st.test, ctx["by_var"], ctx["json_of"])
        if isinstance(st, (ast.With, ast.AsyncWith)):
            raised = next((P for it in st.items for P in [it.context_expr] if isinstance(P, ast.Call) and isinstance(P.func, ast.Attribute)
                           and P.func.attr == "raises" and P.args), None)
            if raised is not None:
                cls = ast.unparse(raised.args[0]).rsplit(".", 1)[-1]
                for n in ast.walk(ast.Module(body=st.body, type_ignores=[])):
                    if isinstance(n, ast.Call) and not _http(n) and not (isinstance(n.func, ast.Attribute) and n.func.attr in ("raises",)):
                        root = n.func
                        while isinstance(root, ast.Attribute):
                            root = root.value
                        ctx["raises"].append({"raises": cls, "call": ast.unparse(n.func)[:80], "line": n.lineno,
                                              "root": root.id if isinstance(root, ast.Name) else None})
                        break
            _walk(st.body, ctx)
        elif isinstance(st, (ast.If, ast.For, ast.AsyncFor, ast.While)):
            _walk(st.body, ctx)
            _walk(st.orelse, ctx)
        elif isinstance(st, ast.Try):
            _walk(st.body, ctx)
            for h in st.handlers:
                _walk(h.body, ctx)
            _walk(st.orelse, ctx)
            _walk(st.finalbody, ctx)


def _roles(calls: list) -> None:
    for i, c in enumerate(calls):
        a = c["asserts"]
        asserted = bool(a["status"] or a["detail"] or a["code"] or a["attrs"] or a["is_success"])
        if c.get("helper"):
            c["role"] = "arrange"
        elif not asserted:
            c["role"] = "arrange"
        elif a["status"] and not (a["detail"] or a["code"] or a["attrs"]) and all(200 <= s < 300 for s in a["status"]) and \
                any(not x.get("helper") and (x["asserts"]["status"] or x["asserts"]["detail"] or x["asserts"]["code"] or x["asserts"]["attrs"])
                    for x in calls[i + 1:]):
            c["role"] = "arrange-checked"
        else:
            c["role"] = "act"


def _local_imp(scopes: list, root: str | None, line: int):
    """``(True, [module, name] | None)`` when a function-local import binds ``root`` at ``line`` — the same ``[module,
    name]`` shape as the module's ``imports`` (None: used before its import, or a relative import no module string
    names) — else ``(False, None)``."""
    r = S.local(scopes, root, (line, S.FAR)) if root else None
    if r is None:
        return False, None
    stmt, a = r[2], r[3]
    if stmt is S.SHADOWED:
        return True, None
    if isinstance(stmt, ast.Import):
        return True, [a.name if a.asname else a.name.split(".")[0], None]
    return True, ([stmt.module, a.name] if stmt.module else None)


def extract(src: str) -> dict:
    """``{"tests": {function name: {line, calls[], raises[]}}, "overrides": bool, "imports": {alias: [module, name]}}`` for one
    test module."""
    tree = ast.parse(src)
    module_aliases = {}
    for n in tree.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and isinstance(n.value, ast.Dict):
            keys = _dict_keys(n.value, module_aliases)
            if keys is not None:
                module_aliases[n.targets[0].id] = keys
    helpers = {n.name: n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and not n.name.startswith("test")}
    defs = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name.startswith("test")]
    defs += [m for c in tree.body if isinstance(c, ast.ClassDef) and c.name.startswith("Test")
             for m in c.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)) and m.name.startswith("test")]
    imports = {}
    for n in tree.body:
        if isinstance(n, ast.Import):
            for a in n.names:
                imports[a.asname or a.name.split(".")[0]] = [a.name if a.asname else a.name.split(".")[0], None]
        elif isinstance(n, ast.ImportFrom) and n.module:
            for a in n.names:
                imports[a.asname or a.name] = [n.module, a.name]
    out = {"tests": {}, "overrides": "dependency_overrides" in src, "imports": imports}
    scopes = S.fn_scopes(tree)
    for fn in defs:
        ctx = {"aliases": dict(module_aliases), "by_var": {}, "json_of": {}, "calls": [], "helpers": helpers, "seen_helpers": set(),
               "module_aliases": module_aliases, "raises": [], "in_raises": None}
        _walk(fn.body, ctx)
        for r in ctx["raises"]:
            hit, imp = _local_imp(scopes, r["root"], r["line"])
            if hit:
                r["imp"] = imp
        _roles(ctx["calls"])
        out["tests"][fn.name] = {"line": fn.lineno, "calls": ctx["calls"], "raises": ctx["raises"]}
    return out


def _sw_leaf(node) -> str | None:
    while isinstance(node, ast.Call):
        node = node.func
    return node.attr if isinstance(node, ast.Attribute) else node.id if isinstance(node, ast.Name) else None


def _sw_value(node):
    try:
        return ast.literal_eval(node)
    except (ValueError, SyntaxError, TypeError):
        return ast.unparse(node)[:60] if isinstance(node, ast.Attribute) else "?"


def setting_writes(src: str) -> dict:
    """``{function: {line, fixture, autouse, writes[]}}`` for every test function and fixture in one test file that gives a
    setting a value: a ``*Settings(...)`` constructor's keywords (``callee``), ``setattr`` / ``patch.object`` of a named
    attribute (``monkeypatch.setattr(mod, "NAME", v)`` and the one-string ``setattr("pkg.mod.NAME", v)``), ``setenv`` of
    a variable (``env``), an assignment to an attribute (``recv`` names its receiver). Lambdas count — a
    ``dependency_overrides[...] = lambda: Settings(...)`` is the test's own. A value that is not a literal reads ``"?"``
    (an enum member reads its dotted name). Pure extraction: no forms knowledge."""
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return {}
    out = {}
    for fn in (n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))):
        fixture = [d for d in fn.decorator_list if _sw_leaf(d) == "fixture"]
        if not (fn.name.startswith("test") or fixture):
            continue
        autouse = any(isinstance(d, ast.Call) and any(k.arg == "autouse" and isinstance(k.value, ast.Constant) and k.value.value is True
                                                      for k in d.keywords) for d in fixture)
        writes, todo = [], list(fn.body)
        while todo:
            n = todo.pop()
            todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))]
            if isinstance(n, ast.Call):
                leaf, args = _sw_leaf(n.func), n.args
                if leaf in ("setattr", "object") and len(args) >= 3 and isinstance(args[1], ast.Constant) and isinstance(args[1].value, str):
                    writes.append({"name": args[1].value, "value": _sw_value(args[2]), "line": n.lineno, "via": "setattr" if leaf == "setattr" else "patch.object"})
                elif leaf == "setattr" and len(args) == 2 and isinstance(args[0], ast.Constant) and isinstance(args[0].value, str):
                    writes.append({"name": args[0].value.rsplit(".", 1)[-1], "value": _sw_value(args[1]), "line": n.lineno, "via": "setattr"})
                elif leaf == "setenv" and len(args) >= 2 and isinstance(args[0], ast.Constant) and isinstance(args[0].value, str):
                    writes.append({"env": args[0].value, "value": _sw_value(args[1]), "line": n.lineno, "via": "setenv"})
                elif leaf and leaf.endswith("Settings") and isinstance(n.func, (ast.Name, ast.Attribute)):
                    writes += [{"name": k.arg, "value": _sw_value(k.value), "line": n.lineno, "via": "constructor", "callee": leaf} for k in n.keywords if k.arg]
            elif isinstance(n, ast.Assign):
                for t in n.targets:
                    if isinstance(t, ast.Attribute):
                        recv = t.value.attr if isinstance(t.value, ast.Attribute) else getattr(t.value, "id", None)
                        writes.append({"name": t.attr, "value": _sw_value(n.value), "line": n.lineno, "via": "assign", "recv": recv})
        if writes or autouse:
            out[fn.name] = {"line": fn.lineno, "fixture": bool(fixture), "autouse": autouse,
                            "writes": sorted(writes, key=lambda w: (w["line"], w.get("name") or w.get("env")))}
    return out

