"""Element forms — the CONTRACT arm: what a client can rely on at an endpoint (amendment 1 §A2 Slice 7 · A12).

``repeat{}`` (U12) — the idempotency key the handler reads (a header, or ``request.state`` a middleware set from one),
the refusal that requires it, and the inserts it CLAIMS: the key argument followed into callees by position or keyword
(``CONTRACT.follow_depth``) to ``Model(col=<key>)`` on a unique column, with the Slice 6 race fact, the exiting arms on
the claim's result and the idioms around it; an uncaught race is the finding ``race-500``.
``auth{}`` (K2) — the security schemes and their carrier, the gate dependencies, the refusals a method of a gate's return
class raises, and what the dependencies provision (the writes their commits keep). ``rate{}`` (K3) — each limiter a 429
row names, its constructor arguments resolved to settings defaults (``state: default`` — the environment can override),
the switch and the exempt paths from the conditions, and a third-party ``@limiter.limit("n/unit")``. ``responses{}``
(K4) — each exit's media type, body and headers. The arm reads the in-memory feed (``steps{}``, conditions, rows) and
imports no arm.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import _a3_forms as F
import _a3_forms_carrier as CR
import _a3_forms_reach as R
import _a3_forms_settings as S
import _a3_paths as P
import _a3_stacks_pydi as PYDI

CT = F.CONTRACT
_KEY = re.compile(CT["key_name"])
_WRITES = frozenset(F.EFFECTS["writes"])


# ── shared reading ───────────────────────────────────────────────────────────────────────────────────
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


def _own(fn):
    """Every node of ``fn`` outside its nested defs, classes and lambdas."""
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        yield n
        todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda))]


def _qual(m, node) -> str:
    return next((q for q, n in m.defs.items() if n is node), node.name)


_text = CR.text                                         # a string argument: a literal, or a module constant through one import


def _exit_kind(stmts) -> str | None:
    for s in stmts:
        if isinstance(s, ast.Raise):
            return "raise"
        if isinstance(s, ast.Return):
            return "return"
    return None


def _literal(src):
    try:
        return ast.literal_eval(src)
    except (ValueError, SyntaxError, TypeError):
        return src


# ── models and unique keys ───────────────────────────────────────────────────────────────────────────
def uniques(repo: Path, amap: dict) -> tuple[dict, dict]:
    """``{Model: table}`` and ``{table: [{cols, name}]}`` — the archmap's ``uqs`` read with ``ast``, the class's
    ``Index(name, …, unique=True)`` and its ``unique=True`` columns."""
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
                call = ast.parse(str(u), mode="eval").body
            except SyntaxError:
                continue
            if isinstance(call, ast.Call):
                found.append((call.args, next((k.value.value for k in call.keywords if k.arg == "name" and isinstance(k.value, ast.Constant)), None)))
        mm = P._mod(repo, mdl.get("file")) if mdl.get("file") else None
        cls = mm.classes.get(mdl["cls"]) if mm is not None else None
        for n in ast.walk(cls) if cls is not None else ():
            unique = isinstance(n, ast.Call) and any(k.arg == "unique" and isinstance(k.value, ast.Constant) and k.value.value is True for k in n.keywords)
            if unique and P._leaf(n.func) == "Index":
                found.append((n.args[1:], n.args[0].value if n.args and isinstance(n.args[0], ast.Constant) else None))
        for n in cls.body if cls is not None else ():
            val = n.value if isinstance(n, (ast.Assign, ast.AnnAssign)) else None
            tgt = (n.targets[0] if isinstance(n, ast.Assign) else n.target) if val is not None else None
            if isinstance(val, ast.Call) and isinstance(tgt, ast.Name) and P._leaf(val.func) in F.EFFECTS["column_calls"] and \
                    any(k.arg == "unique" and isinstance(k.value, ast.Constant) and k.value.value is True for k in val.keywords):
                found.append(([ast.Constant(tgt.id)], None))
        for args, name in found:
            cols = tuple(a.value if isinstance(a, ast.Constant) else a.attr for a in args
                         if (isinstance(a, ast.Constant) and isinstance(a.value, str)) or isinstance(a, ast.Attribute))
            if cols and all(u["cols"] != cols for u in uq.get(mdl["table"], [])):
                uq.setdefault(mdl["table"], []).append({"cols": cols, "name": name})
    return m2t, uq


# ── U12 · the key and what it claims ─────────────────────────────────────────────────────────────────
def _read(repo: Path, m, node) -> dict:
    """A key read inside ``node``: ``request.headers.get(X)`` / ``request.headers[X]`` → header; ``request.state.<attr>`` /
    ``getattr(request.state, "attr", …)`` → state."""
    for n in ast.walk(node):                                # the WALK ORDER is this arm's: the first hit is what repeat{} says
        got = CR.hit(repo, m, n)
        if got:
            return got
    return {}


def _state_setter(repo: Path, amap: dict, attr: str) -> dict | None:
    """The app middleware that writes ``request.state.<attr>``, and the header the written value came from."""
    for mw in amap.get("app_middleware") or []:
        r = P._resolve(repo, P._mod(repo, mw.get("file")), mw.get("cls"), at=f"{mw.get('file')}:{mw.get('line')}")
        if not r or r[1] not in r[0].classes:
            continue
        cm, cls = r
        node = cm.defs.get(f"{cls}.dispatch") or cm.defs.get(f"{cls}.__call__")
        if node is None:
            continue
        held = {}
        for n in _own(node):
            if isinstance(n, (ast.Assign, ast.AnnAssign)) and n.value is not None:
                got = _read(repo, cm, n.value)
                for t in (n.targets if isinstance(n, ast.Assign) else [n.target]):
                    if isinstance(t, ast.Name) and got.get("header"):
                        held[t.id] = got["header"]
        for n in _own(node):
            if isinstance(n, ast.Assign) and any(CR.state_target(t) == attr for t in n.targets):
                header = _read(repo, cm, n.value).get("header") or (held.get(n.value.id) if isinstance(n.value, ast.Name) else None)
                return {"header": header, "set_at": f"{cm.rel}:{n.lineno}", "via": cls}
    return None


def _key(repo: Path, amap: dict, m, fn) -> dict | None:
    """The handler local that holds an idempotency key: read directly, or through a helper that reads it."""
    for st in sorted((n for n in _own(fn) if isinstance(n, ast.Assign)), key=lambda n: n.lineno):
        if len(st.targets) != 1 or not isinstance(st.targets[0], ast.Name):
            continue
        val = st.value.value if isinstance(st.value, ast.Await) else st.value
        if not isinstance(val, ast.Call):
            continue
        got = _read(repo, m, val)
        if not got:
            r = R.callee(repo, m, _qual(m, fn), fn, val)
            got = _read(repo, r[0], r[0].defs[r[1]]) if r and r[1] in r[0].defs else {}
        if not got:
            continue
        out = {"local": st.targets[0].id, "read_at": f"{m.rel}:{st.lineno}"}
        if got.get("header"):
            out.update(name=got["header"], carrier="header")
        else:
            setter = _state_setter(repo, amap, got["state"])
            out.update(name=(setter or {}).get("header"), carrier="header" if (setter or {}).get("header") else "state",
                       through=f"request.state.{got['state']}")
            if setter:
                out["set_at"] = setter["set_at"]
        if _KEY.search(str(out.get("name") or got.get("state") or "")):
            return out
    return None


def _bodies(fn):
    for n in [fn] + list(_own(fn)):
        for field in ("body", "orelse", "finalbody"):
            stmts = getattr(n, field, None)
            if isinstance(stmts, list) and stmts and isinstance(stmts[0], ast.stmt):
                yield stmts
        for h in getattr(n, "handlers", None) or []:
            yield h.body


def _arms(m, fn, call) -> list:
    """The consecutive exiting ``if`` statements that test the name the claim call's result is bound to."""
    for stmts in _bodies(fn):
        for i, st in enumerate(stmts):
            val = st.value if isinstance(st, (ast.Assign, ast.AnnAssign)) else None
            if val is None or not any(x is call for x in ast.walk(val)):
                continue
            names = {t.id for t in (st.targets if isinstance(st, ast.Assign) else [st.target]) if isinstance(t, ast.Name)}
            out = []
            for nxt in stmts[i + 1:]:
                if not (isinstance(nxt, ast.If) and _exit_kind(nxt.body) and names & {x.id for x in ast.walk(nxt.test) if isinstance(x, ast.Name)}):
                    break
                out.append({"pred": P._unp(nxt.test, 160), "exit": _exit_kind(nxt.body), "at": f"{m.rel}:{nxt.lineno}"})
            return out
    return []


def _idioms(fn, model: str, line: int) -> list:
    found = {n.func.attr for n in _own(fn) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in CT["claim_idioms"]}
    if any(isinstance(n, ast.Call) and n.lineno < line and (P._leaf(n.func) == "select" or (isinstance(n.func, ast.Attribute) and n.func.attr == "get"))
           and any(isinstance(x, ast.Name) and x.id == model for x in ast.walk(n)) for n in _own(fn)):
        found.add("get-or-create")
    return sorted(found)


def _params(node, call: ast.Call) -> list[tuple]:
    """``(parameter, argument)`` pairs a call binds — by position, then keyword."""
    names = [a.arg for a in node.args.posonlyargs + node.args.args]
    if names and names[0] in ("self", "cls") and isinstance(call.func, ast.Attribute):
        names = names[1:]
    out = [(names[i], a) for i, a in enumerate(call.args) if i < len(names) and not isinstance(a, ast.Starred)]
    return out + [(k.arg, k.value) for k in call.keywords if k.arg]


def _claims(repo: Path, forms: dict, m2t: dict, uq: dict, m, fn, local: str, depth: int, trail: frozenset, caller=None) -> list:
    """Inserts keyed by ``local``: ``Model(col=<local>)`` on a unique column here, or in a callee the key is passed to."""
    out = []
    qual = _qual(m, fn)
    fid = f"{m.rel}::{qual}"
    steps = forms.get("steps") or {}
    for n in sorted((n for n in _own(fn) if isinstance(n, ast.Call)), key=lambda n: (n.lineno, n.col_offset)):
        leaf = P._leaf(n.func)
        if leaf in m2t and isinstance(n.func, ast.Name):
            for k in n.keywords:
                keys = [u for u in uq.get(m2t[leaf], []) if k.arg in u["cols"]] if isinstance(k.value, ast.Name) and k.value.id == local else []
                if not keys:
                    continue
                race = next((s["race"] for s in steps.values() if s["fn"] == fid and s["op"] == "add" and s.get("model") == leaf and "race" in s), None)
                row = {"model": leaf, "table": m2t[leaf], "column": k.arg, "unique": list(keys[0]["cols"]), "at": f"{m.rel}:{n.lineno}", "fn": fid,
                       "race": race["state"] if race else "unknown", "arms": _arms(*caller) if caller else [],
                       "idioms": sorted(set(_idioms(fn, leaf, n.lineno)) | (set(_idioms(caller[1], leaf, 10 ** 9)) - {"get-or-create"} if caller else set()))}
                if keys[0].get("name"):
                    row["constraint"] = keys[0]["name"]
                if race:
                    row["race_at"] = race["at"]
                out.append(row)
            continue
        if depth >= CT["follow_depth"] or not any(isinstance(a, ast.Name) and a.id == local for a in list(n.args) + [k.value for k in n.keywords]):
            continue
        r = R.callee(repo, m, qual, fn, n)
        if not r or r[1] not in r[0].defs or f"{r[0].rel}::{r[1]}" in trail:
            continue
        node = r[0].defs[r[1]]
        for pname, a in _params(node, n):
            if isinstance(a, ast.Name) and a.id == local:
                out += _claims(repo, forms, m2t, uq, r[0], node, pname, depth + 1, trail | {fid}, (m, fn, n))
    return out


def _repeat(repo: Path, forms: dict, amap: dict, m2t: dict, uq: dict, v: dict, m, fn) -> dict:
    key = _key(repo, amap, m, fn)
    if key is None:
        return {"state": "missing" if str(v.get("method") or "").upper() in F.MUTATING_METHODS else "n/a"}
    local = key.pop("local")
    need = next((g for g in v.get("preconditions") or [] if not g.get("via") and g.get("pred") in (f"{local} is None", f"not {local}")), None)
    claims = _claims(repo, forms, m2t, uq, m, fn, local, 0, frozenset())
    return {"state": "defined", "key": key, "required": {"exit": need.get("exit"), "status": need.get("status"), "at": need.get("at")} if need else None,
            "claims": claims}


# ── K2 · auth ────────────────────────────────────────────────────────────────────────────────────────
def _alias_fn(repo: Path, m, fn, name: str):
    """A gate the archmap named by its function but whose module the endpoint never imports: the handler's parameter
    annotations name an ``Annotated[…, Depends(<name>)]`` alias, and the alias's own module resolves the function
    (§A4 V22a — gastify's 47 gates all arrive through ``CurrentCtx``)."""
    if fn is None:
        return None
    for a in fn.args.posonlyargs + fn.args.args + fn.args.kwonlyargs:
        ann = a.annotation
        ann = ann.value if isinstance(ann, ast.Attribute) else ann
        if not isinstance(ann, ast.Name):
            continue
        r = P._resolve(repo, m, ann.id)
        if not r or r[1] in r[0].defs:
            continue
        am, q = r
        val = am.assigns.get(q)
        for n in ast.walk(val) if val is not None else ():
            if isinstance(n, ast.Call) and P._leaf(n.func) == "Depends" and n.args and P._leaf(n.args[0]) == name:
                got = P._resolve(repo, am, P._leaf(n.args[0]))
                if got and got[1] in got[0].defs:
                    return f"{got[0].rel}::{got[1]}"
    return None


def _auth(repo: Path, v: dict, ep: dict | None, steps: dict, m, fn=None) -> dict:
    rows = [r for r in v.get("produced") or [] if r.get("applies") is not False]
    schemes = []
    for r in rows:
        if r.get("phase") == "security":
            cls, _, name = str(r.get("via") or "").partition(" ")
            carrier = CT["carriers"].get(cls) or [None, None]
            schemes.append({"scheme": cls, "name": name or None, "carrier": carrier[0], "header": carrier[1], "exit": r.get("id"),
                            "status": r.get("status"), "state": r.get("state"), "at": r.get("at")})
    gates, methods = [], set()
    for g in (ep or {}).get("middleware") or []:
        if not g.get("gate"):
            continue
        r = P._resolve(repo, m, g.get("name")) if not g.get("fn") else None     # the archmap names the gate's fn only after its build pass
        fid = g.get("fn") or (f"{r[0].rel}::{r[1]}" if r and r[1] in r[0].defs else None) or _alias_fn(repo, m, fn, g.get("name"))
        gates.append({"name": g.get("name"), "fn": fid})
        rel, _, q = str(fid or "").partition("::")
        gm = P._mod(repo, rel) if rel else None
        node = gm.defs.get(q) if gm is not None else None
        got = S._class(repo, gm, PYDI._ann_name(node.returns)) if node is not None and node.returns is not None else None
        if got:
            methods |= {q2 for q2 in got[0].defs if q2.startswith(f"{got[1].name}.")}
    requires = []
    for r in rows:
        hit = re.match(r"call (\S+) @", str(r.get("via") or ""))
        if hit and hit.group(1) in methods:
            requires.append({"method": hit.group(1), "exit": r.get("id"), "status": r.get("status"), "pred": r.get("pred"), "at": r.get("at")})
    provisions = []
    path = next((p for p in v.get("paths") or [] if (p.get("effects") or {}).get("dependency") == "ran" and p["exit"]["kind"] == "success"),
                next((p for p in v.get("paths") or [] if (p.get("effects") or {}).get("dependency") == "ran"), None))
    if path is not None:
        eff = path["effects"]
        kept = {**{s: "committed" for s in eff["committed"]}, **{s: "maybe_committed" for s in eff["maybe_committed"]}}
        entries = eff["steps"]
        for i, x in enumerate(entries):
            row = steps.get(x["step"]) or {}
            if not x.get("dependency") or row.get("op") not in _WRITES or x["step"] not in kept:
                continue
            commit = next((steps[y["step"]]["at"] for y in entries[i + 1:] if y.get("dependency") and steps[y["step"]]["op"] == "commit"), None)
            if not any(pv["step"] == x["step"] for pv in provisions):
                provisions.append({"table": row.get("table"), "op": row["op"], "cond": row["cond"], "state": kept[x["step"]], "at": row["at"],
                                   "committed_at": commit, "step": x["step"]})
    return {"state": "defined" if schemes or gates else "none", "schemes": schemes, "gates": gates, "requires": requires, "provisions": provisions}


# ── K3 · rate ────────────────────────────────────────────────────────────────────────────────────────
def _field_at(repo: Path, held, attr: str) -> str | None:
    for cm, c in S._chain(repo, *held):
        for n in c.body:
            if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name) and n.target.id == attr:
                return f"{cm.rel}:{n.lineno}"
    return None


def _arg(repo: Path, cm, init, param: str | None, node) -> dict:
    out = {"param": param, "expr": P._unp(node, 120)}
    if isinstance(node, ast.Constant):
        return {**out, "value": node.value, "state": "defined"}
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and init is not None:
        held = S._typed_local(repo, cm, init, node.value.id)
        fld = S.fields(repo, *held).get(node.attr) if held and S._is_settings(repo, *held) else None
        if fld:
            return {**out, "value": _literal(fld.get("default")), "setting": node.attr, "env": fld.get("env"), "state": "default",
                    "at": _field_at(repo, held, node.attr)}
    return {**out, "state": "unknown"}


def _rate(repo: Path, forms: dict, v: dict, m, fn) -> dict:
    limits, switch, exempt = [], None, []
    for r in v.get("produced") or []:
        if r.get("phase") != "middleware" or r.get("status") != 429 or r.get("applies") is False:
            continue
        rel = str(r.get("site") or r.get("at") or "").rpartition(":")[0]
        cm = P._mod(repo, rel) if rel else None
        cls = str(r.get("via") or "")
        lim = {"exit": r.get("id"), "via": cls, "at": r.get("site") or r.get("at"), "state": "unknown"}
        hit = re.match(r"^not\s+self\.(\w+)\.\w+\((.*)\)$", str(r.get("pred") or ""))
        if hit and cm is not None and cls in cm.classes:
            lim["limiter"] = hit.group(1)
            init = cm.defs.get(f"{cls}.__init__")
            found = S._self_assigns(init, hit.group(1)) if init is not None else []
            val = found[-1][0] if found else None
            if isinstance(val, ast.Call):
                lc = S._class(repo, cm, P._leaf(val.func), at=val)
                li = lc[0].defs.get(f"{lc[1].name}.__init__") if lc else None
                params = [a.arg for a in li.args.args[1:]] if li is not None else []
                lim.update({"class": P._leaf(val.func), "init_at": f"{cm.rel}:{val.lineno}",
                            "args": [_arg(repo, cm, init, params[i] if i < len(params) else None, a) for i, a in enumerate(val.args)]
                            + [_arg(repo, cm, init, k.arg, k.value) for k in val.keywords]})
                lim["state"] = "default" if lim["args"] and all(a["state"] != "unknown" for a in lim["args"]) else "unknown"
            try:
                first = ast.parse(f"f({hit.group(2)})", mode="eval").body.args[:1]
            except SyntaxError:
                first = []
            dispatch = cm.defs.get(f"{cls}.dispatch")
            if first and isinstance(first[0], ast.Name) and dispatch is not None:
                lim["key"] = S.locals_once(dispatch).get(first[0].id, first[0].id)
        limits.append(lim)
        cond = (forms.get("conditions") or {}).get(f"{rel}::{cls}: {r.get('when')}") or {}
        for t in cond.get("terms") or []:
            if t.get("kind") == "expr" and switch is None:
                switch = t.get("expr")
            elif t.get("kind") in ("in", "startswith") and S.is_path(t.get("subject")):
                exempt += [x for x in t.get("values") or [] if x not in exempt]
    for d in fn.decorator_list:                            # a third-party limiter on the route
        if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in CT["rate_idioms"] and d.args:
            spec = d.args[0].value if isinstance(d.args[0], ast.Constant) and isinstance(d.args[0].value, str) else None
            hit = re.match(CT["rate_idioms"][d.func.attr], spec or "")
            limits.append({"idiom": P._unp(d.func, 60), "at": f"{m.rel}:{d.lineno}", "state": "defined" if hit else "unknown",
                           **({"limit": int(hit.group(1)), "per": hit.group(2)} if hit else {"expr": P._unp(d, 120)})})
    state = "missing" if not limits else ("unknown" if all(x["state"] == "unknown" for x in limits) else "defined")
    out = {"state": state, "limits": limits}
    if switch:
        out["switch"] = switch
    if exempt:
        out["exempt"] = exempt
    return out


# ── K4 · responses ───────────────────────────────────────────────────────────────────────────────────
def _response_literal(repo: Path, at) -> dict | None:
    rel, _, ln = str(at or "").rpartition(":")
    mm = P._mod(repo, rel) if rel and ln.isdigit() else None
    call = next((n for n in ast.walk(mm.tree) if isinstance(n, ast.Call) and n.lineno == int(ln) and str(P._leaf(n.func)).endswith("Response")), None) if mm else None
    if call is None:
        return None
    leaf = P._leaf(call.func)
    shape = {"media": CT["media"].get(leaf, "unknown"), "source": f"{rel}:{call.lineno}"}
    content = next((k.value for k in call.keywords if k.arg == "content"), call.args[0] if call.args else None)
    if isinstance(content, ast.Dict):
        shape["body"] = {k.value: "…" for k in content.keys if isinstance(k, ast.Constant)}
    headers = next((k.value for k in call.keywords if k.arg == "headers"), None)
    if isinstance(headers, ast.Name):                        # §A4 V24: `headers=_SSE_HEADERS` — one hop, or say so
        headers = mm.assigns.get(headers.id) if isinstance(mm.assigns.get(headers.id), ast.Dict) else {"name": headers.id}
    if isinstance(headers, ast.Dict):
        shape["headers"] = {k.value: "…" for k in headers.keys if isinstance(k, ast.Constant)}
    elif isinstance(headers, dict):
        shape["headers"] = {"state": "unresolved", "name": headers["name"]}
    return shape


def _success(repo: Path, m, v: dict, rr: dict, stream: bool) -> dict:
    lit = _response_literal(repo, rr.get("at"))
    if stream:                                               # §A4 V24: a stream still carries the headers it was built with
        return {**CT["bodies"]["stream"], **({"headers": lit["headers"]} if lit and lit.get("headers") else {})}
    if lit:
        return lit
    rm = (v.get("declared") or {}).get("response_model") or {}
    model = rm.get("name")
    if model == "None" or rr.get("status") == 204:            # §A4 V24: nothing is serialized — no body, no media
        return {"media": "n/a", "body": "none", "source": rr.get("at")}
    got = S._class(repo, m, model) if model else None
    if got:
        fields = [n.target.id for _, c in S._chain(repo, *got) for n in c.body if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name)]
        return {"media": "application/json", "model": model, "fields": list(dict.fromkeys(fields)), "source": f"{got[0].rel}:{got[1].lineno}"}
    return {"media": "application/json", "body": "unknown"}


def _responses(repo: Path, m, v: dict, ep: dict | None) -> dict:
    out = {}
    bodies = CT["bodies"]
    for r in v.get("produced") or []:
        if r.get("applies") is False or not r.get("id"):
            continue
        ph = r.get("phase")
        if ph in ("uncaught", "validation"):
            shape = dict(bodies[ph])
        elif ph == "security":
            shape = dict(bodies["security"])
            cls = str(r.get("via") or "").split(" ")[0]
            if cls in CT["www_authenticate"]:
                shape["headers"] = {"WWW-Authenticate": CT["www_authenticate"][cls]}
        else:
            shape = _response_literal(repo, r.get("at")) or dict(bodies["http-exception"])
        out[r["id"]] = {"status": r.get("status"), **shape}
    for x in v.get("framework_exits") or []:
        if x.get("id"):
            out[x["id"]] = {"status": x.get("status"), **dict(bodies["validation" if x.get("status") == 422 else "http-exception"]), "source": x.get("source")}
    for rr in v.get("returns") or []:
        if rr.get("depth") == 0 and rr.get("id"):
            out[rr["id"]] = {"status": rr.get("status"), **_success(repo, m, v, rr, bool((ep or {}).get("stream")))}
    return dict(sorted(out.items()))


# ── the arm ──────────────────────────────────────────────────────────────────────────────────────────
def run(forms: dict, ctx: dict) -> dict:
    """The contract arm: ``repeat{}`` · ``auth{}`` · ``rate{}`` · ``responses{}`` per endpoint; finding ``race-500``."""
    repo = Path(ctx["repo"])
    amap = ctx["amap"]
    m2t, uq = uniques(repo, amap)
    eps = {(ep.get("file"), ep.get("fn"), str(ep.get("method") or "").upper()): ep
           for ent in (amap.get("entities") or {}).values() for ep in ent.get("endpoints") or []}
    steps = forms.get("steps") or {}
    stats = {"endpoints": 0, "repeat": {}, "auth": {}, "rate": {}, "responses": 0, "claims": 0, "races": {}, "idioms": {}, "findings": {}}
    for key, v, m, fn, dec in _handlers(repo, forms):
        ep = eps.get((m.rel, fn.name, str(v.get("method") or "").upper()))
        v["repeat"] = _repeat(repo, forms, amap, m2t, uq, v, m, fn)
        v["auth"] = _auth(repo, v, ep, steps, m, fn)
        v["rate"] = _rate(repo, forms, v, m, fn)
        v["responses"] = _responses(repo, m, v, ep)
        stats["endpoints"] += 1
        for block in ("repeat", "auth", "rate"):
            stats[block][v[block]["state"]] = stats[block].get(v[block]["state"], 0) + 1
        stats["responses"] += len(v["responses"])
        for c in v["repeat"].get("claims") or []:
            stats["claims"] += 1
            stats["races"][c["race"]] = stats["races"].get(c["race"], 0) + 1
            for i in c["idioms"]:
                stats["idioms"][i] = stats["idioms"].get(i, 0) + 1
            if c["race"] == "uncaught":
                f = {"id": "race-500", "slot": "U12", "endpoint": key, "claim": c["at"], "table": c["table"], "race_at": c.get("race_at")}
                v.setdefault("arm_findings", {}).setdefault("contract", []).append(f)
                stats["findings"]["race-500"] = stats["findings"].get("race-500", 0) + 1
    return {"version": 1, "stats": stats, "options": {"follow_depth": CT["follow_depth"]}}
