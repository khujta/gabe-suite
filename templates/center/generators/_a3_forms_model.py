"""Element forms — MODEL and MIGRATION short forms: the short arm's ``model`` and ``migration`` parts (amendment 1 §A2
Slice 10a · M1–M10).

``migrations{}`` — every alembic tree (``_a3_forms_migrate``): its revisions, head, raw operations and the tables it
leaves. ``models{"model:<Class>"}`` — what a table promises and what the code does with the promise: its constraints
(``__table_args__`` indexes, unique and check constraints), every column's type, foreign key and ``ondelete``, its
effective nullability (an explicit keyword, else a primary key, else the annotation — ``Mapped[X | None]`` is nullable
under SQLAlchemy ≥ 2.0; below it or unreadable ``unknown``), ``default`` and ``server_default``; the hooks on it
(``event.listens_for``, ``@validates``); ``guard_use`` — a select on exactly a unique column set followed by an exiting
``if``; its writers (``function_insight`` writes) and the constructor sites the map does not cover;
``default_overridden`` — a constructor that sets a defaulted column to another literal; M10, the Slice 6 race facts and
Slice 7 ``race-500`` findings on it, by reference; M8, its drift from the schema its migration tree leaves. Findings
``migration-drift`` (nag) and ``default-overridden`` (count).
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path

import _a3_code as C
import _a3_forms as F
import _a3_forms_migrate as M
import _a3_scope as SC
import _a3_graft as G

_LOCK_RX = {"uv.lock": r'name = "{pkg}"\s*\nversion = "([^"]+)"', "poetry.lock": r'name = "{pkg}"\s*\nversion = "([^"]+)"',
            "requirements.txt": r"(?im)^{pkg}(?:\[[^\]]*\])?\s*==\s*([\w.]+)"}
SQLA_ANNOTATION_MIN = (2, 0)
_TEST_RX = re.compile(r"(^|/)tests?/|(^|/)conftest\.py$|(^|/)test_[^/]*\.py$|_test\.py$")
_REPLAYS: dict = {}


def package_version(repo: Path, rel: str, pkg: str) -> tuple | None:
    """(version, lock file) of ``pkg`` from the nearest lock file above ``rel``."""
    d = (repo / rel).parent
    while True:
        for lf, rx in _LOCK_RX.items():
            p = d / lf
            if p.is_file():
                hit = re.search(rx.format(pkg=re.escape(pkg)), p.read_text(encoding="utf-8", errors="replace"))
                if hit:
                    return hit.group(1), os.path.relpath(p, repo)
        if d == repo or repo not in d.parents:
            return None
        d = d.parent


def _vt(v: str) -> tuple:
    return tuple(int(x) for x in re.findall(r"\d+", v)[:3])


def _exit_kind(stmts) -> str | None:
    for s in stmts:
        if isinstance(s, ast.Raise):
            return "raise"
        if isinstance(s, ast.Return):
            return "return"
    return None


def _optional(ann) -> bool:
    src = ast.unparse(ann)
    inner = src[len("Mapped["):-1] if src.startswith("Mapped[") else src
    return bool(re.search(r"\|\s*None\b|\bNone\s*\||Optional\[", inner))


def type_impls(tree: ast.Module) -> dict:
    """``{TypeDecorator subclass: the database type of its impl}`` for the classes a model module defines, through their bases."""
    classes = {n.name: n for n in tree.body if isinstance(n, ast.ClassDef)}

    def impl(name, seen=()):
        n = classes.get(name)
        if n is None or name in seen:
            return None
        for item in n.body:
            if isinstance(item, ast.Assign) and any(getattr(t, "id", None) == "impl" for t in item.targets):
                return M.norm_type(item.value)
        return next((r for b in n.bases if (r := impl(M._leaf(b), seen + (name,)))), None)
    return {name: r for name in classes if (r := impl(name))}


def imported_impls(repo: Path, rel: str, tree: ast.Module) -> dict:
    """The TypeDecorators a model module imports by name (``from onyx.db.pydantic_type import PydanticType``), one hop: the module
    file is looked for under each directory above the model file."""
    out = {}
    for n in tree.body:
        if not (isinstance(n, ast.ImportFrom) and n.module and n.level == 0):
            continue
        tail = Path(*n.module.split(".")).with_suffix(".py")
        src = next((repo / p / tail for p in Path(rel).parents if (repo / p / tail).is_file()), None)
        if src is None:
            continue
        try:
            impls = type_impls(ast.parse(src.read_text(encoding="utf-8", errors="replace")))
        except SyntaxError:
            continue
        out.update({a.asname or a.name: impls[a.name] for a in n.names if a.name in impls})
    return out


def _model_type(node, aliases: dict, impls: dict) -> str | None:
    """A column type through the model module's import aliases (``UUID as PGUUID``) and its own TypeDecorators' ``impl``."""
    leaf = M._leaf(node)
    if leaf in impls:
        return impls[leaf]
    if leaf in aliases:
        return M.norm_type(ast.parse(ast.unparse(node).replace(leaf, aliases[leaf], 1), mode="eval").body)
    return M.norm_type(node)


def columns(node: ast.ClassDef, annotations_ok: bool | None, consts: dict | None = None, aliases: dict | None = None,
            impls: dict | None = None) -> dict:
    """``{database column name: facts}`` — ``mapped_column("display_order", …)`` keys by the database name and keeps the
    attribute as ``attr``; a module constant default (``default=STATUS_X``) reads as its value."""
    consts, aliases, impls = consts or {}, aliases or {}, impls or {}

    def lit(n):
        if isinstance(n, ast.Name) and n.id in consts:
            return consts[n.id]
        if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and f"{n.value.id}.{n.attr}" in consts:
            return consts[f"{n.value.id}.{n.attr}"]
        return M._lit(n)
    out = {}
    for item in node.body:
        target = ann = call = None
        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name) and isinstance(item.value, ast.Call):
            target, ann, call = item.target.id, item.annotation, item.value
        elif isinstance(item, ast.Assign) and len(item.targets) == 1 and isinstance(item.targets[0], ast.Name) and isinstance(item.value, ast.Call):
            target, call = item.targets[0].id, item.value
        if call is None or M._leaf(call.func) not in ("mapped_column", "Column"):
            continue
        kw = {k.arg: k.value for k in call.keywords if k.arg}
        col_type, fk = None, None
        pos = list(call.args)
        db_name = lit(pos.pop(0)) if pos and isinstance(lit(pos[0]), str) else target
        for a in pos:
            if isinstance(a, ast.Call) and M._leaf(a.func) == "ForeignKey":
                fk = {"target": M._lit(a.args[0]) if a.args else None,
                      "ondelete": next((M._lit(k.value) for k in a.keywords if k.arg == "ondelete"), None)}
            elif col_type is None and not isinstance(a, ast.Constant):
                col_type = _model_type(a, aliases, impls)
        pk = M._lit(kw["primary_key"]) is True if "primary_key" in kw else False
        if "nullable" in kw:
            nullable, how = M._lit(kw["nullable"]), "keyword"
        elif pk:
            nullable, how = False, "primary key"
        elif ann is not None and annotations_ok:
            nullable, how = _optional(ann), "annotation"
        else:
            nullable, how = None, "unknown"
        facts = {"type": col_type, "nullable": nullable, "nullable_from": how, "primary_key": pk,
                 "server_default": M.norm_default(kw.get("server_default"), lit), "at": item.lineno}
        if db_name != target:
            facts["attr"] = target
        if "default" in kw:
            facts["default"] = lit(kw["default"]) if lit(kw["default"]) is not None else ast.unparse(kw["default"])[:60]
        if "onupdate" in kw:
            facts["onupdate"] = ast.unparse(kw["onupdate"])[:60]
        if M._lit(kw.get("unique")) is True if "unique" in kw else False:
            facts["unique"] = True
        if fk:
            facts["fk"] = fk
        out[db_name] = facts
    return out


def table_args(node: ast.ClassDef) -> dict:
    out = {"indexes": [], "uniques": [], "checks": []}
    for item in node.body:
        if not (isinstance(item, ast.Assign) and any(getattr(t, "id", None) == "__table_args__" for t in item.targets)):
            continue
        for e in item.value.elts if isinstance(item.value, (ast.Tuple, ast.List)) else []:
            if not isinstance(e, ast.Call):
                continue
            leaf, name = M._leaf(e.func), next((M._lit(k.value) for k in e.keywords if k.arg == "name"), None)
            if leaf == "Index":
                out["indexes"].append({"name": M._lit(e.args[0]) if e.args else None, "cols": [M._lit(a) for a in e.args[1:]],
                                       "unique": any(k.arg == "unique" and M._lit(k.value) is True for k in e.keywords), "at": e.lineno})
            elif leaf == "UniqueConstraint":
                out["uniques"].append({"name": name, "cols": [M._lit(a) for a in e.args], "at": e.lineno})
            elif leaf == "CheckConstraint":
                out["checks"].append({"name": name, "sql": M._lit(e.args[0]) if e.args else None, "at": e.lineno})
    return out


def _type_eq(a: str, b: str) -> bool:
    """Equal types, or the same type where one side states no arguments."""
    return a == b or (a.split("(", 1)[0] == b.split("(", 1)[0] and ("(" not in a or "(" not in b))


def _sql(text) -> str | None:
    return re.sub(r"\s+", " ", text).strip().lower() if isinstance(text, str) else None


def drift(model_cols: dict, mig: dict | None, model_checks: list = ()) -> list[dict]:
    """M8: a column only one side has, a normalised type both sides state differently, a nullability both sides state
    differently, a differing server default, a check
    constraint only one side has (the same name, or the same SQL when a side's name is unreadable). A table the replay only saw
    altered (created by raw SQL or a rename it cannot read) is ``partial``: its column set is unknown, so no column reads absent. A
    table a migration dropped
    while its model still maps it is drift of its own."""
    if mig is None:
        return []
    out = []

    def same(a, b):
        return bool(a["name"] and a["name"] == b["name"]) or bool(_sql(a["sql"]) and _sql(a["sql"]) == _sql(b["sql"]))
    mig_checks = mig.get("checks") or []
    for ck in model_checks:
        if not any(same(ck, c) for c in mig_checks):
            out.append({"constraint": ck["name"] or ck["sql"] or "unnamed check", "field": "check", "model": "present", "migration": "absent"})
    for c in mig_checks:
        if not any(same(ck, c) for ck in model_checks):
            out.append({"constraint": c["name"] or c["sql"] or "unnamed check", "field": "check", "model": "absent", "migration": "present"})
    mcols = mig.get("columns") or {}
    for name, c in sorted(model_cols.items()):
        m = mcols.get(name)
        if m is None:
            if not mig.get("partial"):
                out.append({"column": name, "field": "column", "model": "present", "migration": "absent"})
            continue
        if c["type"] and m.get("type") and not _type_eq(c["type"], m["type"]):
            out.append({"column": name, "field": "type", "model": c["type"], "migration": m["type"]})
        if isinstance(c["nullable"], bool) and isinstance(m["nullable"], bool) and c["nullable"] != m["nullable"]:
            out.append({"column": name, "field": "nullable", "model": c["nullable"], "migration": m["nullable"], "model_from": c["nullable_from"]})
        if (c["server_default"] or None) != (m["server_default"] or None):
            out.append({"column": name, "field": "server_default", "model": c["server_default"], "migration": m["server_default"]})
    for name in sorted(set(mcols) - set(model_cols)) if not mig.get("partial") else []:
        out.append({"column": name, "field": "column", "model": "absent", "migration": "present"})
    return out


def _own(fn):
    todo = list(fn.body)
    while todo:
        n = todo.pop()
        yield n
        todo += [c for c in ast.iter_child_nodes(n) if not isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda))]


def guard_uses(trees: dict, cls: str, unique_sets: list, repo: Path | None = None, memo: dict | None = None) -> list[dict]:
    """A ``select(Model)…where(Model.a == …)`` naming exactly a unique column set, bound to a name an exiting ``if`` tests.
    The ``select`` is the ORM verb rule's (``_a3_scope.verb``) — a project function named ``select`` is not one, a
    project facade that imports it from the library is (``repo``: followed one hop, ``_a3_code.verb_table``)."""
    sets = [frozenset(s) for s in unique_sets if s]
    out = []
    for f, t in sorted(trees.items()):
        scopes = SC.fn_scopes(t)
        table = C.verb_table(repo, f, t, memo if memo is not None else {}) if repo is not None else SC.module_imports(t)
        for fn in (n for n in ast.walk(t) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))):
            for body in [fn.body] + [getattr(n, a) for n in _own(fn) for a in ("body", "orelse") if isinstance(getattr(n, a, None), list)]:
                for i, st in enumerate(body):
                    if not (isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name)):
                        continue
                    if not any(isinstance(x, ast.Call) and SC.verb(scopes, x, table) == "select" and any(isinstance(a, ast.Name) and a.id == cls for a in x.args)
                               for x in ast.walk(st.value)):
                        continue
                    compared = frozenset(c.left.attr for c in ast.walk(st.value) if isinstance(c, ast.Compare) and isinstance(c.left, ast.Attribute)
                                         and isinstance(c.left.value, ast.Name) and c.left.value.id == cls)
                    if compared not in sets:
                        continue
                    nxt = next((s for s in body[i + 1:] if isinstance(s, ast.If)), None)
                    if nxt is not None and _exit_kind(nxt.body) and st.targets[0].id in {x.id for x in ast.walk(nxt.test) if isinstance(x, ast.Name)}:
                        out.append({"fn": f"{f}::{fn.name}", "at": f"{f}:{st.lineno}", "unique": sorted(compared), "exit_at": f"{f}:{nxt.lineno}"})
    return out


def _replays(repo: Path) -> tuple[list, dict]:
    key = str(repo)
    if key not in _REPLAYS:
        trees = M.find_trees(repo, G._is_center)
        _REPLAYS[key] = (trees, {t["versions"]: M.replay(repo, t["versions"]) for t in trees})
    return _REPLAYS[key]


def migration_part(repo: Path) -> tuple[dict, dict]:
    """``(migrations{versions dir: tree}, stats)``."""
    trees, replays = _replays(Path(repo))
    out = {}
    for t in trees:
        r = replays[t["versions"]]
        out[t["versions"]] = {"ini": t["ini"], "section": t["section"], "state": r["state"], "revisions": r["revisions"], "heads": r["heads"],
                              "raw_ops": r["raw_ops"], "tables": len(r["schema"]), "unreadable": r["unreadable"]}
    return out, {"trees": len(out), "revisions": sum(x["revisions"] for x in out.values()), "raw_ops": sum(x["raw_ops"] for x in out.values()),
                 "multi_head": sum(1 for x in out.values() if x["state"] != "defined")}


def _outside_sources(repo: Path, mapped: set) -> dict:
    """Every project .py the map does not cover (center, vendored and virtual-env directories skipped): {rel: source}."""
    out = {}
    for root, dirs, files in os.walk(repo):
        dirs[:] = sorted(d for d in dirs if d not in M.SKIP_DIRS and not d.startswith("."))
        rel_root = os.path.relpath(root, repo)
        if rel_root != "." and G._is_center(rel_root + "/"):
            dirs[:] = []
            continue
        for name in files:
            rel = os.path.normpath(os.path.join(rel_root, name)) if rel_root != "." else name
            if name.endswith(".py") and rel not in mapped and not G._is_center(rel):
                try:
                    out[rel] = (Path(root) / name).read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
    return out


def model_part(repo: Path, forms: dict, amap: dict) -> tuple[dict, dict, list]:
    """``(models{"model:<Class>": form}, stats, findings)``."""
    repo = Path(repo)
    trees, replays = _replays(repo)
    home: dict = {}
    for t in trees:
        for table, facts in replays[t["versions"]]["schema"].items():
            home.setdefault(table, (t["versions"], replays[t["versions"]]["state"], facts))
    gone = {table: (t["versions"], replays[t["versions"]]["state"]) for t in trees for table in replays[t["versions"]].get("dropped", [])}
    rows = [mdl for ent in (amap.get("entities") or {}).values() for mdl in ent.get("models") or []]
    rows += list(((amap.get("model_census") or {}).get("unclaimed")) or [])
    mapped = C._mapped_trees(repo)
    outside: dict | None = None
    vmemo: dict = {}                                               # verb_table's one-hop facade tables (guard_uses)
    fi = amap.get("function_insight") or {}
    writers: dict = {}
    for fid, sig in fi.items():
        for op in ((sig or {}).get("access") or {}).get("ops") or []:
            if op.get("rw") == "w":
                writers.setdefault(op.get("model"), set()).add(fid)
    steps = forms.get("steps") or {}
    race500 = [x for e in (forms.get("endpoints") or {}).values() for v in (e.get("variants") or [e])
               for x in (v.get("arm_findings") or {}).get("contract") or [] if x.get("id") == "race-500"]
    ctors: dict = {}
    hook_rows: dict = {}
    names: dict = {}
    for f, t in sorted(mapped.items()):                    # one walk of every mapped tree, indexed by class name
        seen = set()
        for n in ast.walk(t):
            if isinstance(n, ast.Name):
                seen.add(n.id)
            elif isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
                ctors.setdefault(n.func.id, []).append((f, n))
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for d in n.decorator_list:
                    if isinstance(d, ast.Call) and M._leaf(d.func) == "listens_for" and d.args and isinstance(d.args[0], ast.Name):
                        hook_rows.setdefault(d.args[0].id, []).append({"event": M._lit(d.args[1]) if len(d.args) > 1 else None,
                                                                         "fn": f"{f}::{n.name}", "at": f"{f}:{d.lineno}"})
        names[f] = seen
    parsed: dict = {}
    file_types: dict = {}
    members = {k: v for k, v in C._str_constants(mapped).items() if "." in k}    # Class.MEMBER literals, for an enum member's .value
    out, found = {}, []
    stats = {"models": 0, "checks": 0, "drift_models": 0, "drift_columns": 0, "no_migration": 0, "guard_use": 0, "hooks": 0,
             "overridden": 0, "writers_outside_map": 0, "tests_outside_map": 0, "nullable_unknown": 0, "types_unread": 0, "drift_checks": 0}
    for mdl in rows:
        cls, table, rel = mdl.get("cls"), mdl.get("table"), mdl.get("file")
        if not (cls and table and rel):
            continue
        if rel not in parsed:
            try:
                parsed[rel] = ast.parse((repo / rel).read_text(encoding="utf-8", errors="replace"))
            except (OSError, SyntaxError):
                parsed[rel] = None
        tree = parsed[rel]
        node = next((n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == cls), None) if tree is not None else None
        if node is None:
            continue
        ver = package_version(repo, rel, "sqlalchemy")
        if rel not in file_types:
            file_types[rel] = ({a.asname: a.name for n in tree.body if isinstance(n, ast.ImportFrom) for a in n.names if a.asname},
                               {**imported_impls(repo, rel, tree), **type_impls(tree)},
                               {k: v for k, v in C._str_constants({rel: tree}).items() if "." in k})
        aliases, impls, own_members = file_types[rel]
        consts = {**members, **own_members, **{t.id: M._lit(n.value) for n in tree.body if isinstance(n, ast.Assign) for t in n.targets
                                               if isinstance(t, ast.Name) and M._lit(n.value) is not None}}
        cols = columns(node, bool(ver and _vt(ver[0]) >= SQLA_ANNOTATION_MIN) if ver else None, consts, aliases, impls)
        by_attr = {c.get("attr", name): c for name, c in cols.items()}
        args = table_args(node)
        unique_sets = [u["cols"] for u in args["uniques"]] + [i["cols"] for i in args["indexes"] if i["unique"]] + [[c] for c, f in cols.items() if f.get("unique")]
        hooks = list(hook_rows.get(cls, []))
        hooks += [{"event": "validates", "cols": [M._lit(a) for a in d.args], "fn": f"{rel}::{cls}.{fn.name}", "at": f"{rel}:{d.lineno}"}
                  for fn in node.body if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef))
                  for d in fn.decorator_list if isinstance(d, ast.Call) and M._leaf(d.func) == "validates"]
        sites = ctors.get(cls, [])
        overridden = [{"column": k.arg, "default": by_attr[k.arg]["default"], "set": M._lit(k.value), "at": f"{f}:{k.value.lineno}"}
                      for f, n in sites for k in n.keywords if k.arg in by_attr and "default" in by_attr[k.arg]
                      and M._lit(k.value) is not None and M._lit(k.value) != by_attr[k.arg]["default"]]
        if outside is None:
            outside = _outside_sources(repo, set(mapped))
        outside_sites = sorted(f"{f}:{src[:m.start()].count(chr(10)) + 1}" for f, src in outside.items() if f"{cls}(" in src
                               for m in re.finditer(rf"\b{re.escape(cls)}\(", src))
        test_sites = [x for x in outside_sites if _TEST_RX.search(x.rsplit(":", 1)[0])]
        outside_sites = [x for x in outside_sites if x not in test_sites]
        mig = home.get(table)
        d = drift(cols, mig[2] if mig else None, args["checks"])
        if mig is None and table in gone:
            d = [{"field": "table", "model": "present", "migration": "dropped"}]
        form = {"cls": cls, "table": table, "file": rel, "at": f"{rel}:{node.lineno}", "sqlalchemy": ver[0] if ver else None,
                "columns": cols, "constraints": args, "hooks": hooks, "guard_use": guard_uses({f: t for f, t in mapped.items() if cls in names[f]}, cls, unique_sets, repo, vmemo) if unique_sets else [],
                "default_overridden": overridden, "writers": sorted(writers.get(cls, ())), "writers_outside_map": outside_sites[:20], "tests_outside_map": len(test_sites),
                "m10": {"races": [{"step": sid, "state": s["race"]["state"], "at": s["at"]} for sid, s in sorted(steps.items())
                                  if s.get("model") == cls and "race" in s],
                        "race_500": [{"endpoint": x["endpoint"], "claim": x["claim"]} for x in race500 if x.get("table") == table]},
                "migration": {"tree": mig[0], "state": mig[1]} if mig else
                ({"tree": gone[table][0], "state": gone[table][1], "table": "dropped"} if table in gone else {"state": "absent"}), "drift": d}
        key = f"model:{cls}" if f"model:{cls}" not in out else f"model:{rel}::{cls}"
        out[key] = form
        stats["models"] += 1
        stats["checks"] += len(args["checks"])
        stats["guard_use"] += len(form["guard_use"])
        stats["hooks"] += len(hooks)
        stats["overridden"] += len(overridden)
        stats["writers_outside_map"] += len(outside_sites)
        stats["tests_outside_map"] += len(test_sites)
        stats["nullable_unknown"] += sum(1 for c in cols.values() if c["nullable"] is None)
        stats["types_unread"] += sum(1 for c in cols.values() if not c["type"])
        stats["no_migration"] += 0 if mig or table in gone else 1
        if d:
            stats["drift_models"] += 1
            stats["drift_columns"] += len({x["column"] for x in d if "column" in x})
            stats["drift_checks"] += sum(1 for x in d if x["field"] == "check")
            fields: dict = {}
            for x in d:                                       # §A4 V25: 103 of 150 tier3 rows were server_default-only —
                fields[x["field"]] = fields.get(x["field"], 0) + 1   # the finding must say which field disagrees
            found.append({"id": "migration-drift", "slot": F.FINDINGS["migration-drift"]["slot"], "model": key,
                          "columns": sorted({x["column"] for x in d if "column" in x}), "checks": sorted(x["constraint"] for x in d if x["field"] == "check"),
                          "fields": dict(sorted(fields.items()))})
        for o in overridden:
            found.append({"id": "default-overridden", "slot": F.FINDINGS["default-overridden"]["slot"], "model": key, **o})
    return dict(sorted(out.items())), stats, found
