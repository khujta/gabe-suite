"""Element forms — SETTING short forms: the short arm's ``setting`` part (amendment 1 §A2 Slice 10b · F1–F8 · D23 · D24).

``settings{"setting:<field>"}`` — one form per field of every pydantic ``BaseSettings`` class in the project (a base
another settings class extends is read through its subclasses): its declaration (annotation, default, environment
variable and choices); F2 the values it can take (a bool, a ``Literal``, an ``Enum``'s members) and its bounds (``Field`` or
``Annotated`` constraints, a constrained type, a validator that compares and raises); F7 the startup rules that read it (a
``field_validator`` naming it, a ``model_validator`` reading ``self.<field>`` directly, through a one-return property or one
``self`` method hop); F5 its readers — a ``<receiver>.<field>`` read whose receiver is PROVEN a settings instance (a
parameter annotated with the class, a local or module name bound to a call that builds or returns it, a
``get_settings()`` call, ``self.<attr>`` that ``__init__`` bound to one); a read with a settings-named receiver the proof
cannot reach is ``readers_unverified``, and an assignment that only copies the value is a ``copies[]`` entry, never a
reader. ``effective[]`` pairs the field with a module constant read beside it (``FEAT`` and ``feat`` in one condition are
one flag — ``_a3_graph._fold_flag_aliases``' evidence rule, recomputed); F6 ``fallback[]`` the endpoint exits a reader's
condition decides; F4 ``environment`` what the tracked environment files say (a fixed filename allow-list, never ``.env``
or ``.env*.local``, secrets redacted — D24): ``defined`` when one sets a value, ``external`` when none does yet the repo
expects one from outside (a required field, a commented-out value, the declaration's own comment naming the variable —
D23), else ``default``; F8 ``tests`` the values tests give it or its paired constant (``_a3_test_asserts.setting_writes``).
Findings ``unbounded-number`` · ``startup-unchecked`` · ``env-unset`` · ``one-value-tested`` (count).
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path

import _a3_forms as F
import _a3_forms_migrate as MG
import _a3_forms_settings as S
import _a3_graft as G
import _a3_paths as P
import _a3_test_asserts as TA

ENV_FILE_RX = re.compile(r"^(\.env\.(example|sample|template|development|test)|docker-compose[^/]*\.ya?ml|railway\.json)$")
SECRET_RX = re.compile(r"KEY|SECRET|TOKEN|PASSW|DSN|CREDENTIAL|PRIVATE|URL|AUTH", re.I)
TEST_RX = re.compile(r"(^|/)tests?/|(^|/)conftest\.py$|(^|/)test_[^/]*\.py$|_test\.py$")
SETTINGS_NAME_RX = re.compile(r"^_?(settings|app_settings|config|cfg|conf|s)$")
NUMBER_TYPES = frozenset({"int", "float", "Decimal"})
BOUNDED_TYPES = frozenset({"PositiveInt", "NonNegativeInt", "NegativeInt", "NonPositiveInt", "PositiveFloat", "NonNegativeFloat",
                           "conint", "confloat", "condecimal"})
BOUND_KW = frozenset({"ge", "gt", "le", "lt", "multiple_of", "min_length", "max_length"})
ENUM_BASES = frozenset({"Enum", "StrEnum", "IntEnum", "Flag", "IntFlag"})
FALLBACK_SPAN = 6        # a refusal row decided by a reader sits at most this many lines below it


def _walk_repo(repo: Path):
    for root, dirs, files in os.walk(repo):
        rel_root = os.path.relpath(root, repo)
        if rel_root != "." and G._is_center(rel_root + "/"):
            dirs[:] = []
            continue
        dirs[:] = sorted(d for d in dirs if d not in MG.SKIP_DIRS and not d.startswith("."))
        for name in sorted(files):
            yield (name if rel_root == "." else os.path.normpath(os.path.join(rel_root, name))), Path(root) / name


def _read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _settings_classes(repo: Path, code: list) -> list[tuple]:
    found = []
    for rel, p in code:
        if "Settings" not in _read(p):
            continue
        m = P._mod(repo, rel)
        for node in (m.classes.values() if m else []):
            if S._is_settings(repo, m, node):
                found.append((m, node))
    extended = {(cm.rel, c.name) for m, node in found for cm, c in S._chain(repo, m, node)[1:]}
    return [(m, n) for m, n in found if (m.rel, n.name) not in extended]


def _decl(chain: list, name: str):
    for cm, c in chain:
        for it in c.body:
            if isinstance(it, ast.AnnAssign) and isinstance(it.target, ast.Name) and it.target.id == name:
                return cm, it
    return None


def _types(ann) -> tuple[list, bool, list | None, list]:
    """``(type names, nullable, Literal values, constraint calls)`` of an annotation."""
    names, meta, state = [], [], {"nullable": False, "literal": None}

    def visit(n):
        if isinstance(n, ast.BinOp) and isinstance(n.op, ast.BitOr):
            visit(n.left)
            visit(n.right)
        elif isinstance(n, ast.Constant) and n.value is None:
            state["nullable"] = True
        elif isinstance(n, ast.Subscript):
            head = P._leaf(n.value)
            elts = n.slice.elts if isinstance(n.slice, ast.Tuple) else [n.slice]
            if head == "Optional":
                state["nullable"] = True
                visit(elts[0])
            elif head == "Union":
                for e in elts:
                    visit(e)
            elif head == "Literal":
                state["literal"] = [MG._lit(e) for e in elts]
            elif head == "Annotated":
                visit(elts[0])
                meta.extend(e for e in elts[1:] if isinstance(e, ast.Call))
            else:
                names.append(head)
        elif isinstance(n, ast.Call):
            names.append(P._leaf(n.func))
            meta.append(n)
        else:
            names.append(P._leaf(n))
    visit(ann)
    return [n for n in names if n], state["nullable"], state["literal"], meta


def _enum_values(repo: Path, m, name: str | None):
    r = S._class(repo, m, name) if name else None
    if not r or not ({P._leaf(b) for b in r[1].bases} & ENUM_BASES):
        return None
    return [MG._lit(it.value) for it in r[1].body if isinstance(it, ast.Assign) and isinstance(it.targets[0], ast.Name)
            and MG._lit(it.value) is not None]


def _own(fn):
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        yield n
        todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))]


def _compare_raise(fn) -> str | None:
    for n in _own(fn):
        if isinstance(n, ast.If) and any(isinstance(x, ast.Compare) for x in ast.walk(n.test)) and any(isinstance(s, ast.Raise) for s in n.body):
            return ast.unparse(n.test)[:80]
    return None


def _self_read(chain: list, fn, field: str, hop: int = 1) -> int | None:
    """The first line of ``fn`` that reads ``self.<field>``, directly, through a one-return property, or one ``self`` call."""
    for n in sorted(_own(fn), key=lambda x: getattr(x, "lineno", 0)):
        if not (isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == "self"):
            continue
        if n.attr == field:
            return n.lineno
        target = S._lookup(chain, n.attr)
        ret = S._one_return(target)
        if ret is not None and any(isinstance(x, ast.Attribute) and getattr(x.value, "id", None) == "self" and x.attr == field for x in ast.walk(ret)):
            return n.lineno
        if hop and target is not None and ret is None and _self_read(chain, target, field, hop - 1):
            return n.lineno
    return None


def _rules(chain: list, field: str) -> list[dict]:
    out = []
    for cm, c in chain:
        for fn in (it for it in c.body if isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef))):
            decos = {P._leaf(d.func if isinstance(d, ast.Call) else d): d for d in fn.decorator_list}
            named = next((d for k, d in decos.items() if k in ("field_validator", "validator")), None)
            where = f"{cm.rel}::{c.name}.{fn.name}"
            if isinstance(named, ast.Call) and ({MG._lit(a) for a in named.args} & {field, "*"}):
                out.append({"fn": where, "kind": "field_validator", "at": f"{cm.rel}:{fn.lineno}", **({"bound": b} if (b := _compare_raise(fn)) else {})})
            elif decos.keys() & {"model_validator", "root_validator"} and (line := _self_read(chain, fn, field)):
                out.append({"fn": where, "kind": "model_validator", "at": f"{cm.rel}:{line}"})
    return out


def _assign_line(m, name: str) -> int | None:
    for st in m.tree.body:
        targets = st.targets if isinstance(st, ast.Assign) else [st.target] if isinstance(st, ast.AnnAssign) else []
        if any(isinstance(t, ast.Name) and t.id == name for t in targets):
            return st.lineno
    return None


def _call_class(repo: Path, m, v):
    """``Settings()`` / ``get_settings()`` / ``settings or get_settings()`` → ``(rel, Class)`` of the project class it yields."""
    calls = [x for x in v.values if isinstance(x, ast.Call)] if isinstance(v, ast.BoolOp) else [v]
    for call in calls:
        if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Name)):
            continue
        r = P._resolve(repo, m, call.func.id, at=call)
        if r and r[1] in r[0].classes:
            return r[0].rel, r[1]
        if r and r[1] in r[0].defs and r[0].defs[r[1]].returns is not None:
            c = P._class_of(repo, r[0], r[0].defs[r[1]].returns)
            if c:
                return c[0].rel, c[1]
    return None


def _named(repo: Path, m, fn, name: str):
    """A name inside ``fn`` (or at module level when ``fn`` is None) → ``((rel, Class), line, how)``."""
    if fn is not None:
        params = fn.args.posonlyargs + fn.args.args + fn.args.kwonlyargs
        arg = next((p for p in params if p.arg == name), None)
        if arg is not None:
            c = P._class_of(repo, m, arg.annotation) if arg.annotation is not None else None
            return ((c[0].rel, c[1]), f"{m.rel}:{arg.lineno}", "parameter") if c else None
        st = next((s for s in _own(fn) if isinstance(s, (ast.Assign, ast.AnnAssign)) and any(
            isinstance(t, ast.Name) and t.id == name for t in (s.targets if isinstance(s, ast.Assign) else [s.target]))), None)
        if st is not None:
            held = S._typed_local(repo, m, fn, name)
            return ((held[0].rel, held[1].name), f"{m.rel}:{st.lineno}", "local") if held else None
    r = P._resolve(repo, m, name)
    if r and r[1] in r[0].assigns:
        k = _call_class(repo, r[0], r[0].assigns[r[1]])
        return (k, f"{r[0].rel}:{_assign_line(r[0], r[1])}", "module") if k else None
    return None


def _receiver(repo: Path, m, fn, cls_name: str | None, recv):
    if isinstance(recv, ast.Call):
        k = _call_class(repo, m, recv)
        return (k, f"{m.rel}:{recv.lineno}", "call") if k else None
    if isinstance(recv, ast.Name):
        return _named(repo, m, fn, recv.id)
    if isinstance(recv, ast.Attribute) and isinstance(recv.value, ast.Name) and recv.value.id == "self" and cls_name:
        init = m.defs.get(f"{cls_name}.__init__")
        found = S._self_assigns(init, recv.attr) if init is not None else []
        if len(found) != 1 or found[0][1] or found[0][0] is None:
            return None
        v = found[0][0]
        got = _named(repo, m, init, v.id) if isinstance(v, ast.Name) else (_call_class(repo, m, v), None, None)
        line = next((s.lineno for s in _own(init) if isinstance(s, (ast.Assign, ast.AnnAssign)) and any(
            isinstance(t, ast.Attribute) and t.attr == recv.attr for t in (s.targets if isinstance(s, ast.Assign) else [s.target]))), init.lineno)
        return (got[0], f"{m.rel}:{line}", "self") if got and got[0] else None
    return None


def _scopes(m):
    for qual, fn in m.defs.items():
        yield qual, fn, (qual.split(".")[0] if "." in qual else None)
    yield "<module>", None, None


def _env_rows(env_files: list, names: list) -> list[dict]:
    rows = []
    for rel, lines in env_files:
        for i, line in enumerate(lines, 1):
            for name in names:
                if not re.search(rf"(?<![A-Za-z0-9_]){re.escape(name)}(?![A-Za-z0-9_])", line):
                    continue
                hit = re.search(rf"{re.escape(name)}[\"']?\s*[:=]\s*[\"']?([^\"'\s,#}}]*)", line)
                value = hit.group(1) if hit else None
                if value and SECRET_RX.search(name):
                    value = "<redacted>"
                rows.append({"file": rel, "line": i, "name": name, "value": value, **({"commented": True} if line.lstrip().startswith("#") else {})})
    return rows


def _canon(v) -> str | None:
    """One spelling per value, so ``True`` · ``"true"`` and ``15`` · ``"15"`` · ``15.0`` compare equal; ``"?"`` is unreadable."""
    if v is None or v == "?":
        return None
    t = str(v).strip().strip("'\"").lower()
    if t in ("true", "false"):
        return t
    try:
        return repr(float(t))
    except ValueError:
        return t


def _default(text):
    try:
        return ast.literal_eval(text) if text is not None else None
    except (ValueError, SyntaxError):
        return text


def _props(chain: list, fields: set) -> dict:
    """``{property: fields}`` for a settings class's one-return properties, through one other property."""
    reads = {}
    for _, c in chain:
        for it in c.body:
            ret = S._one_return(it) if isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)) else None
            if ret is not None:
                reads.setdefault(it.name, {x.attr for x in ast.walk(ret) if isinstance(x, ast.Attribute) and getattr(x.value, "id", None) == "self"})
    return {prop: got for prop, rs in reads.items() if (got := {f for r in rs for f in ({r} & fields or reads.get(r, set()) & fields)})}


def setting_part(repo: Path, forms: dict) -> tuple[dict, dict, list]:
    """``(settings{"setting:<field>": form}, stats, findings)``."""
    if F.OPTIONS.get("setting_constants", "paired") != "paired":
        raise ValueError(f"setting_constants={F.OPTIONS['setting_constants']!r}: only 'paired' is built")
    repo = Path(repo)
    files = [(rel, p) for rel, p in _walk_repo(repo)]
    code = [(rel, p) for rel, p in files if rel.endswith(".py") and not TEST_RX.search(rel)]
    classes = _settings_classes(repo, code)
    decls, owners, chains = {}, {}, {}
    for m, node in classes:
        chain = S._chain(repo, m, node)
        chains[(m.rel, node.name)] = chain
        flds = S.fields(repo, m, node)
        for name, row in flds.items():
            got = _decl(chain, name)
            if got:
                decls[(m.rel, node.name, name)] = (m, node, got[0], got[1], row)
                owners.setdefault(name, []).append(((m.rel, node.name), name, None))
        for prop, got in _props(chain, set(flds)).items():
            if prop not in flds:
                owners.setdefault(prop, []).extend(((m.rel, node.name), f, prop) for f in sorted(got))
    in_chain = {k: {(cm.rel, c.name) for cm, c in ch} for k, ch in chains.items()}
    readers: dict = {}
    unverified: dict = {}
    copies: dict = {}
    effective: dict = {}
    field_rx = re.compile(r"\.(" + "|".join(sorted(map(re.escape, owners))) + r")\b") if owners else None
    for rel, p in code:
        if field_rx is None or not field_rx.search(_read(p)):
            continue
        m = P._mod(repo, rel)
        if m is None:
            continue
        for qual, fn, cls_name in _scopes(m):
            if cls_name and any((rel, cls_name) in ks for ks in in_chain.values()):
                continue                                          # a settings class reading itself is a startup rule
            nodes = list(ast.walk(fn)) if fn is not None else [n for st in m.tree.body if not isinstance(
                st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) for n in ast.walk(st)]
            parents = {c: n for n in nodes for c in ast.iter_child_nodes(n)}
            for a in nodes:
                if not (isinstance(a, ast.Attribute) and isinstance(a.ctx, ast.Load) and a.attr in owners):
                    continue
                got = _receiver(repo, m, fn, cls_name, a.value)
                hits = [(o, f, via) for o, f, via in owners[a.attr] if got and got[0] in in_chain[o]]
                site = {"fn": f"{rel}::{qual}", "at": f"{rel}:{a.lineno}"}
                if not hits:
                    last = a.value.attr if isinstance(a.value, ast.Attribute) else getattr(a.value, "id", "")
                    if SETTINGS_NAME_RX.match(last or ""):
                        for o, f, via in owners[a.attr]:
                            unverified.setdefault((*o, f), []).append({**site, **({"via": via} if via else {})})
                    continue
                site.update({"receiver": got[2], "receiver_at": got[1]})
                parent = parents.get(a)
                for o, f, via in hits:
                    key, here = (*o, f), {**site, **({"via": via} if via else {})}
                    if isinstance(parent, (ast.Assign, ast.AnnAssign)) and parent.value is a:
                        target = parent.targets[0] if isinstance(parent, ast.Assign) else parent.target
                        copies.setdefault(key, []).append({**here, "to": ast.unparse(target)[:80]})
                        continue
                    readers.setdefault(key, []).append(here)
                    if via:
                        continue
                    node, op = a, "same line"
                    while node in parents and not isinstance(node, ast.stmt):
                        node = parents[node]
                        if isinstance(node, ast.BoolOp):
                            op = "or" if isinstance(node.op, ast.Or) else "and"
                            break
                    scope = node if isinstance(node, ast.BoolOp) else None
                    names = [x for x in (ast.walk(scope) if scope is not None else nodes)
                             if isinstance(x, ast.Name) and x.id == f.upper() and (scope is not None or x.lineno == a.lineno)]
                    for x in names[:1]:
                        r = P._resolve(repo, m, x.id)
                        if not (r and r[1] in r[0].assigns):
                            continue
                        e = effective.setdefault(key, {}).setdefault((r[0].rel, r[1]), {
                            "constant": r[1], "at": f"{r[0].rel}:{_assign_line(r[0], r[1])}", "value": MG._lit(r[0].assigns[r[1]]), "op": set(), "sites": []})
                        e["op"].add(op)
                        e["sites"].append(site["at"])
    rows_by_file: dict = {}
    for ek, e in (forms.get("endpoints") or {}).items():
        for v in (e.get("variants") or [e]):
            for r in v.get("produced") or []:
                text, at = f"{r.get('pred') or ''} {r.get('when') or ''}", str(r.get("at") or "")
                if at.rpartition(":")[2].isdigit() and text.strip():
                    rows_by_file.setdefault(at.rpartition(":")[0], []).append((int(at.rpartition(":")[2]), ek, r, text))
    env_files = [(rel, _read(p).splitlines()) for rel, p in files if ENV_FILE_RX.match(os.path.basename(rel))]
    wf = repo / ".github" / "workflows"
    env_files += [(os.path.relpath(p, repo), _read(p).splitlines()) for p in sorted(wf.glob("*.y*ml"))] if wf.is_dir() else []
    writes_by_name: dict = {}
    writes_by_env: dict = {}
    for rel, p in files:
        if not (rel.endswith(".py") and TEST_RX.search(rel)):
            continue
        src = _read(p)
        if not any(t in src for t in ("setattr", "Settings(", "setenv", "patch.object", "settings.")):
            continue
        for name, rec in sorted(TA.setting_writes(src).items()):
            for w in rec["writes"]:
                entry = {"test": f"{rel}::{name}", "at": f"{rel}:{w['line']}", "value": w["value"], "via": w["via"], **({"autouse": True} if rec["autouse"] else {})}
                if "env" in w:
                    writes_by_env.setdefault(w["env"], []).append(entry)
                else:
                    writes_by_name.setdefault(w["name"], []).append((w, entry))
    out, found = {}, []
    stats = {"classes": len(classes), "settings": 0, "numbers": 0, "unbounded": 0, "startup_rules": 0, "readers": 0,
             "readers_unverified": 0, "copies": 0, "effective": 0, "fallback": 0, "environment": {}, "env_files": len(env_files),
             "tested": 0, "one_value": 0}
    for key in sorted(decls):
        m, node, dm, decl, row = decls[key]
        rel, cls, field = key
        chain = chains[(rel, cls)]
        names, nullable, literal, meta = _types(decl.annotation)
        base = names[0] if names else None
        allowed = {"values": literal} if literal is not None else {"values": [False, True]} if base == "bool" else None
        if allowed is None and (ev := _enum_values(repo, dm, base)) is not None:
            allowed = {"values": ev, "enum": base}
        calls = ([decl.value] if isinstance(decl.value, ast.Call) and P._leaf(decl.value.func) == "Field" else []) + meta
        bounds = {k.arg: MG._lit(k.value) for c in calls for k in c.keywords if k.arg in BOUND_KW}
        if base in BOUNDED_TYPES:
            bounds["type"] = base
        rules = _rules(chain, field)
        mine_readers = sorted(readers.get(key, []), key=lambda s: s["at"])
        pairs = [{**e, "op": sorted(e["op"]), "sites": sorted(set(e["sites"]))} for _, e in sorted((effective.get(key) or {}).items())]
        const_names = [e["constant"] for e in pairs]
        fallback, seen = [], set()
        for s in mine_readers:
            file, line = s["at"].rpartition(":")[0], int(s["at"].rpartition(":")[2])
            for rline, ek, r, text in rows_by_file.get(file, []):
                if 0 <= rline - line <= FALLBACK_SPAN and (f".{field}" in text or any(c in text for c in const_names)) and (ek, r.get("id")) not in seen:
                    seen.add((ek, r.get("id")))
                    fallback.append({"endpoint": ek, "exit": r.get("id"), "status": r.get("status"), "at": r.get("at")})
        env_names = row.get("env_choices") or [row["env"]]
        rows = _env_rows(env_files, env_names)
        src_lines = dm.tree and _read(repo / dm.rel).splitlines()
        above, i = [], decl.lineno - 2
        while src_lines and i >= 0 and src_lines[i].lstrip().startswith("#"):
            above.append(src_lines[i])
            i -= 1
        named_above = any(n in line for line in above for n in env_names)
        if any(not x.get("commented") and x["value"] for x in rows):
            env = {"state": "defined"}
        elif row.get("required") or (other := [x for x in rows if x.get("commented") and x["value"] and x["value"] != "<redacted>"
                                               and _canon(x["value"]) != _canon(_default(row.get("default")))]) or named_above:
            env = {"state": "external", "because": "required" if row.get("required") else "declaration comment" if named_above else "commented value"}
        else:
            env = {"state": "default"}
        env["files"] = rows[:20]
        class_names = {c.name for _, c in chain}
        sets = [e for w, e in writes_by_name.get(field, []) if (w["via"] != "constructor" or w.get("callee") in class_names)
                and (w["via"] != "assign" or SETTINGS_NAME_RX.match(w.get("recv") or ""))]
        sets += [e for c in const_names for w, e in writes_by_name.get(c, []) if w["via"] != "constructor"]
        sets += [e for n in env_names for e in writes_by_env.get(n, [])]
        values = sorted({v for e in sets if (v := _canon(e["value"])) is not None})
        default_runs = bool(sets) and not any(e.get("autouse") for e in sets) and row.get("default") is not None
        ran = set(values) | ({d} if default_runs and (d := _canon(_default(row["default"]))) is not None else set())
        number = base in NUMBER_TYPES
        form = {"cls": cls, "file": dm.rel, "at": f"{dm.rel}:{decl.lineno}", "annotation": row["annotation"], "type": base, "nullable": nullable,
                "default": row.get("default"), "env": row["env"], **({"env_choices": row["env_choices"]} if row.get("env_choices") else {}),
                **({"required": True} if row.get("required") else {}), "allowed": allowed, "bounds": bounds or None, "startup": rules,
                "readers": mine_readers, "readers_unverified": sorted(unverified.get(key, []), key=lambda s: s["at"])[:20],
                "copies": sorted(copies.get(key, []), key=lambda s: s["at"]), "effective": pairs, "fallback": fallback, "environment": env,
                "tests": {"values": values, "default_runs": default_runs, "sets": sorted(sets, key=lambda e: e["at"])[:20]}}
        sid = f"setting:{field}" if f"setting:{field}" not in out else f"setting:{cls}.{field}"
        out[sid] = form
        stats["settings"] += 1
        stats["numbers"] += number
        stats["startup_rules"] += len(rules)
        stats["readers"] += len(mine_readers)
        stats["readers_unverified"] += len(unverified.get(key, []))
        stats["copies"] += len(form["copies"])
        stats["effective"] += len(pairs)
        stats["fallback"] += len(fallback)
        stats["environment"][env["state"]] = stats["environment"].get(env["state"], 0) + 1
        stats["tested"] += bool(values)
        checks = [("unbounded-number", number and not bounds and not any(r.get("bound") for r in rules), {"type": base}),
                  ("startup-unchecked", (number or bool(fallback)) and not rules and not bounds, {"fallback": len(fallback)}),
                  ("env-unset", env["state"] == "external", {"env": row["env"], "because": env.get("because")}),
                  ("one-value-tested", bool(sets) and len(ran) == 1 and all(_canon(e["value"]) is not None for e in sets),
                   {"value": sorted(ran)[0] if ran else None})]
        for fid, fire, extra in checks:
            if fire:
                stats["unbounded"] += fid == "unbounded-number"
                stats["one_value"] += fid == "one-value-tested"
                found.append({"id": fid, "slot": F.FINDINGS[fid]["slot"], "setting": sid, **extra})
    stats["environment"] = dict(sorted(stats["environment"].items()))
    return dict(sorted(out.items())), stats, found
