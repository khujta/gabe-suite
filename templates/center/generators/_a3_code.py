#!/usr/bin/env python3
"""A3 Code tab — the machine-derived technical decode of one entity.

Everything here is parsed from source with `ast`, never hand-listed (the
anti-curation guardrail applied to code documentation): endpoints from the
FastAPI decorators + their real docstrings, the data model from the SQLAlchemy
`Mapped[...]` columns + table args, and the code map from the files on disk
with their measured line counts. The card contributes only the section intro
prose; if a file moves or an endpoint is added, the next regen shows it
without anyone editing a doc.
"""

from __future__ import annotations

import ast
import glob as _glob
from pathlib import Path

import _center_data as _cd
from _a3_render import E, legend, lines_grade, sechead, subnav, table, xtable

# The layers a code map is organized by, in render order. Semantic names, not
# paths: api=endpoints (FastAPI), models=SQLAlchemy, schemas=Pydantic, the rest
# are file globs. Declared in center.config.json `code_layers`.
_CODE_LAYERS = _cd.CFG.get("code_layers",
                           ["api", "services", "models", "schemas", "web", "mobile"])

# Icons (feather-style) + colors for the tab's generated section banners.
_IC_ZAP = '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
_IC_FOLDER = ('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 '
              '2-2h5l2 3h9a2 2 0 0 1 2 2z"/>')
_IC_DB = ('<ellipse cx="12" cy="5" rx="9" ry="3"/>'
          '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>'
          '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>')

_METHOD_CLS = {"GET": "m-get", "POST": "m-post", "PATCH": "m-mut",
               "PUT": "m-mut", "DELETE": "m-del"}
# Type families for the data-model Type column: one hue per family, and within
# a family the WIDER type renders deeper (int plain → float/Decimal deep). A
# token absent here is a domain type or alias and stays uncolored on purpose.
_TYPE_CLS = {
    "int": "ty-num1", "float": "ty-num2", "Decimal": "ty-num2",
    "Numeric": "ty-num2", "date": "ty-tim1", "time": "ty-tim1",
    "datetime": "ty-tim2", "str": "ty-str1", "Text": "ty-str2",
    "bytes": "ty-str2", "bool": "ty-bool", "dict": "ty-json",
    "list": "ty-json", "Any": "ty-json", "JSON": "ty-json",
    "Literal": "ty-json", "UUID": "ty-id", "uuid": "ty-id",
    "None": "ty-null",
}
_LAYER_CLS = {"api": "l-api", "services": "l-services", "models": "l-models",
              "schemas": "l-schemas", "web": "l-web", "mobile": "l-mobile"}

# Which source files make up an entity, by layer, and which model classes to
# document — read from center.config.json `entities.<slug>.code` /
# `.models`. Paths are repo-relative; web/mobile/test entries are globs. This is
# the ONE editorial mapping and it lives in config, not in this file, so the
# generator source stays project-agnostic (everything rendered from it is
# measured, not asserted).
_ENTITIES = _cd.CFG.get("entities", {})
ENTITY_CODE = {slug: e["code"] for slug, e in _ENTITIES.items() if e.get("code")}
# Entity classes to document from the model files (absent = all classes found).
ENTITY_MODELS = {slug: e["models"] for slug, e in _ENTITIES.items() if e.get("models")}


def _first_sentence(doc: str | None) -> str:
    """The docstring's SUMMARY PARAGRAPH (up to the first blank line), joined —
    wrapped source lines are one sentence, not one line each.

    Returns it WHOLE. It used to cut at 170 chars here, and then `purpose_cell`
    built a ⊕ expander whose "full" span was that already-truncated string — a
    reader who clicked to finish the sentence still could not finish it. One
    truncator per value; this is not it."""
    if not doc:
        return "—"
    return " ".join(doc.strip().split("\n\n")[0].split())


def parse_endpoints(repo: Path, files: list[str]) -> list[dict]:
    """FastAPI surface via ast: decorator method+path, router prefix, the
    handler's REAL docstring, response_model and status_code when literal."""
    out: list[dict] = []
    for rel in files:
        path = repo / rel
        if not path.exists():
            continue
        tree = ast.parse(path.read_text())
        prefix = ""
        for node in ast.walk(tree):
            if (isinstance(node, ast.Call)
                    and getattr(node.func, "id", "") == "APIRouter"):
                for kw in node.keywords:
                    if kw.arg == "prefix" and isinstance(kw.value, ast.Constant):
                        prefix = kw.value.value
        for node in ast.walk(tree):
            if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            for dec in node.decorator_list:
                if not (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)):
                    continue
                method = dec.func.attr
                if method not in ("get", "post", "put", "patch", "delete"):
                    continue
                has_path = dec.args and isinstance(dec.args[0], ast.Constant)
                sub = dec.args[0].value if has_path else ""
                resp = status = None
                for kw in dec.keywords:
                    if kw.arg == "response_model":
                        resp = ast.unparse(kw.value)
                    if kw.arg == "status_code":
                        status = ast.unparse(kw.value).rsplit(".", 1)[-1]
                # Every bare name the handler's body touches — intersected later
                # with model/schema class names to derive endpoint↔type links.
                refs = {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}
                out.append({
                    "method": method.upper(), "path": (prefix + sub) or "/",
                    "fn": node.name, "file": rel, "refs": refs,
                    "doc": _first_sentence(ast.get_docstring(node)),
                    "resp": (resp or "—").removeprefix("PaginatedResponse[").removesuffix("]"),
                    "status": status or "200",
                })
    return out


def parse_schemas(repo: Path, files: list[str]) -> list[dict]:
    """Pydantic request/response shapes — the classes the Returns column names.
    Same honesty rule: parsed from source, never listed by hand."""
    out: list[dict] = []
    for rel in files:
        path = repo / rel
        if not path.exists():
            continue
        for node in ast.parse(path.read_text()).body:
            if not isinstance(node, ast.ClassDef):
                continue
            fields = [(i.target.id, ast.unparse(i.annotation))
                      for i in node.body
                      if isinstance(i, ast.AnnAssign) and isinstance(i.target, ast.Name)]
            if fields:
                out.append({"cls": node.name, "file": rel, "fields": fields,
                            "doc": _first_sentence(ast.get_docstring(node))})
    return out


def _anchor(kind: str, slug: str, name: str) -> str:
    import re as _re
    return f"{kind}-{slug}-{_re.sub(r'[^A-Za-z0-9]+', '-', name).strip('-')}"


def parse_defines(repo: Path, rel: str) -> list[str]:
    """What a file DEFINES, parsed per language: python -> top-level classes +
    public functions (ast); ts/tsx -> exported symbols (export grammar)."""
    import re as _re
    path = repo / rel
    if not path.exists():
        return []
    if rel.endswith(".py"):
        names = []
        for node in ast.parse(path.read_text()).body:
            if isinstance(node, ast.ClassDef):
                names.append(node.name)
            elif (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                  and not node.name.startswith("_")):
                names.append(f"{node.name}()")
        return names
    src = path.read_text()
    names = _re.findall(
        r"export\s+(?:default\s+)?(?:async\s+)?"
        r"(?:function|const|class|interface|type)\s+([A-Za-z_]\w*)", src)
    return list(dict.fromkeys(names))


# Example values are SYNTHETIC — derived from Literal values when the type
# carries them, else from field-name/type heuristics. Labeled as such.
_NAME_EXAMPLES = [
    ("currency", '"CLP"'), ("country", '"CL"'), ("city", '"Concepción"'),
    ("merchant", '"Jumbo Bio Bío"'), ("alias", '"Jumbo"'),
    ("term_total", "12"), ("term_current", "3"), ("share_count", "2"),
    ("confidence", "0.93"), ("fx_rate", "0.00106"), ("qty", "2"),
    ("_minor", "12990"), ("_ms", "840"), ("tokens", "1250"),
    ("label", '"cuota 3 de 12"'), ("name", '"Pan integral"'),
    ("image_url", '"/transactions/{id}/images/{id}"'),
    ("thumbnail_url", '"data:image/webp;…"'), ("payload", '{"merchant": "…"}'),
    ("signals", '[{"kind": "total_mismatch"}]'), ("sort_order", "1"),
]


def _example(name: str, typ: str) -> str:
    import re as _re
    lit = _re.search(r'Literal\[\s*[\'"]([^\'"]+)[\'"]', typ)
    if lit:
        return f'"{lit.group(1)}"'
    low = name.lower()
    t = typ.lower()
    # Type-shaped checks FIRST where the type is unambiguous — a *_user_edited_at
    # datetime must never inherit the merchant string example by name-match.
    if "datetime" in t or low.endswith("_at"):
        return '"2026-07-20T14:32:00Z"'
    if "uuid" in t:
        return '"b7e2a1c4-5d68-4f2e-9a3b-1c2d3e4f5a6b"'
    for frag, ex in _NAME_EXAMPLES:
        if frag in low:
            return ex
    if t.startswith("date"):
        return '"2026-07-20"'
    if t.startswith("time"):
        return '"14:32"'
    if "bool" in t:
        return "true"
    if "decimal" in t or "float" in t:
        return "0.93"
    if "int" in t:
        return "3"
    if t.startswith("list"):
        return "[…]"
    if "dict" in t:
        return "{…}"
    return '"…"'


# Stable per-file font colors for the endpoints table's file links.
_FILE_PALETTE = ["#4f46e5", "#0f766e", "#b45309", "#7c3aed",
                 "#0d7a84", "#c2410c", "#8a6d1a", "#d1443c"]
_VERB_FONT = {"GET": "fm-get", "POST": "fm-post", "PATCH": "fm-mut",
              "PUT": "fm-mut", "DELETE": "fm-del"}


def parse_models(repo: Path, files: list[str], only: list[str] | None) -> list[dict]:
    """SQLAlchemy entities via ast: table name, Mapped[...] columns with their
    annotations, unique constraints, and the class docstring."""
    out: list[dict] = []
    for rel in files:
        path = repo / rel
        if not path.exists():
            continue
        tree = ast.parse(path.read_text())
        for node in tree.body:
            if not isinstance(node, ast.ClassDef):
                continue
            if only and node.name not in only:
                continue
            tab = None
            cols: list[tuple[str, str]] = []
            fks: dict[str, str] = {}
            rels: list[dict] = []
            uqs: list[str] = []
            for item in node.body:
                if (isinstance(item, ast.Assign) and
                        getattr(item.targets[0], "id", "") == "__tablename__"):
                    tab = item.value.value
                if (isinstance(item, ast.Assign) and
                        getattr(item.targets[0], "id", "") == "__table_args__"):
                    uqs = [ast.unparse(e)[:90] for e in getattr(item.value, "elts", [])
                           if "UniqueConstraint" in ast.unparse(e)]
                if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                    ann = ast.unparse(item.annotation)
                    if not ann.startswith("Mapped["):
                        continue
                    inner = ann[7:-1]
                    call = item.value if isinstance(item.value, ast.Call) else None
                    fn = ""
                    if call is not None:
                        fn = getattr(call.func, "id", getattr(call.func, "attr", ""))
                    if fn == "relationship":
                        # An ORM NAVIGATION property — not a stored column. The
                        # only stored direction is the ForeignKey column.
                        many = inner.startswith("list[")
                        target = (inner[5:-1] if many else inner)
                        target = target.split("|")[0].strip().strip("\"'")
                        kw = {k.arg: ast.unparse(k.value).strip("'\"")
                              for k in call.keywords if k.arg}
                        rels.append({"name": item.target.id, "target": target,
                                     "many": many,
                                     "back": kw.get("back_populates", ""),
                                     "cascade": kw.get("cascade", "")})
                        continue
                    cols.append((item.target.id, inner))
                    if call is not None:
                        for sub in ast.walk(call):
                            if (isinstance(sub, ast.Call)
                                    and getattr(sub.func, "id", "") == "ForeignKey"
                                    and sub.args
                                    and isinstance(sub.args[0], ast.Constant)):
                                fks[item.target.id] = sub.args[0].value
            if tab:
                out.append({"cls": node.name, "table": tab, "file": rel,
                            "doc": _first_sentence(ast.get_docstring(node)),
                            "cols": cols, "fks": fks, "rels": rels, "uqs": uqs})
    return out


def code_map(repo: Path, layers: dict) -> list[tuple[str, str, int]]:
    """(layer, file, measured line count) for every file the mapping names —
    globs expanded against disk, so a moved file drops out visibly."""
    rows: list[tuple[str, str, int]] = []
    for layer in _CODE_LAYERS:
        for pat in layers.get(layer, []):
            for f in sorted(_glob.glob(str(repo / pat))):
                p = Path(f)
                if p.is_file() and ".test." not in p.name:
                    rows.append((layer, str(p.relative_to(repo)),
                                 len(p.read_text().splitlines())))
    return rows


def collect_entity_map(slug: str, repo: Path) -> dict | None:
    """The entity's architecture map, gathered ONCE per build: endpoints (with
    the documented types each handler touches), models (columns/FKs/relationship
    edges), schemas, files-with-lines, and per-file defines.

    This object is BOTH the Code tab's input and the serialized archmap.json —
    the committed, machine-derived reference map the operator asked for: later
    sessions (or any tool) read the map instead of re-analyzing the codebase,
    and a PR diff of the map IS the architecture change, reviewable."""
    layers = ENTITY_CODE.get(slug)
    if not layers:
        return None
    eps = parse_endpoints(repo, layers.get("api", []))
    models = parse_models(repo, layers.get("models", []), ENTITY_MODELS.get(slug))
    schemas = parse_schemas(repo, layers.get("schemas", []))
    files = code_map(repo, layers)
    documented = {m["cls"] for m in models} | {s["cls"] for s in schemas}
    for e in eps:
        e["touches"] = sorted(e.pop("refs") & documented)
    return {
        "endpoints": eps, "models": models, "schemas": schemas,
        "files": [[layer, f, n] for layer, f, n in files],
        "defines": {f: parse_defines(repo, f)
                    for layer, f, _ in files if layer != "api"},
    }


def build_code_tab(slug: str, repo: Path, intro_html: str) -> str:
    """The Code tab: endpoints · code map · data model. Returns "" for entities
    with no ENTITY_CODE mapping yet — rendered as a named gap by the caller."""
    amap = collect_entity_map(slug, repo)
    if not amap:
        return ""
    eps, models, schemas = amap["endpoints"], amap["models"], amap["schemas"]
    files = [tuple(row) for row in amap["files"]]

    # The link graph: file colors, endpoint↔file, endpoint↔type — every id is
    # derived so the three tables cross-reference without hand-kept indexes.
    file_color = {f: _FILE_PALETTE[i % len(_FILE_PALETTE)]
                  for i, f in enumerate(dict.fromkeys(e["file"] for e in eps))}
    model_names = {m["cls"] for m in models}
    schema_names = {s["cls"] for s in schemas}
    eps_by_file: dict[str, list[dict]] = {}
    for e in eps:
        eps_by_file.setdefault(e["file"], []).append(e)

    # The longest path segment every endpoint shares — the router's own prefix,
    # derived rather than the literal "/transactions" this used to carry.
    _paths = [e["path"] for e in eps]
    _common = ""
    if _paths:
        head = _paths[0].split("/")
        for i in range(1, len(head) + 1):
            cand = "/".join(head[:i])
            if cand and all(p == cand or p.startswith(cand + "/") for p in _paths):
                _common = cand

    def ep_chip(e: dict) -> str:
        """Font-colored, background-free endpoint link back to its row."""
        short = (e["path"].removeprefix(_common) if _common else e["path"]) or "/"
        return (f'<a class="{_VERB_FONT.get(e["method"], "")}" '
                f'href="#{_anchor("ep", slug, e["fn"])}">{E(e["method"])} '
                f"{E(short)}</a>")

    def purpose_cell(doc: str) -> str:
        if doc == "—" or len(doc) <= 76:
            return E(doc)
        cut = doc[:76].rsplit(" ", 1)[0].rstrip(" ,;·")
        return (f'<details class="pmore"><summary><span class="cut">{E(cut)}…</span>'
                f'<span class="full">{E(doc)}</span><i></i></summary></details>')

    def returns_cell(e: dict) -> str:
        import re as _re
        parts = []
        for tok in dict.fromkeys(_re.findall(r"[A-Za-z_]\w+", e["resp"])):
            if tok in schema_names:
                parts.append(f'<a class="dlink" href="#{_anchor("dm", slug, tok)}">'
                             f"{E(tok)}</a>")
        body = " ".join(parts) or f'<code>{E(e["resp"])}</code>'
        return f'{body}<br><small>{E(e["status"])}</small>'

    # --- Endpoints ---------------------------------------------------------
    html = subnav([("sec-code-endpoints", "Endpoints", _IC_ZAP),
                   ("sec-code-map", "Code map", _IC_FOLDER),
                   ("sec-code-model", "Data model", _IC_DB)])
    html += sechead(
        "Code", "Endpoints", "#4f46e5", _IC_ZAP,
        sub="the HTTP surface, parsed from the FastAPI decorators",
        id_="sec-code-endpoints",
        info=legend("Verb colors:", [
            ("m-get", "GET", "reads — no state change ·"),
            ("m-post", "POST", "creates ·"),
            ("m-mut", "PATCH/PUT", "modifies ·"),
            ("m-del", "DELETE", "removes")])
        + '<div class="leg">Links: the file name jumps to its code-map row; '
          'a violet return type jumps to its definition in the data model. '
          '⊕ expands a cut-off purpose.</div>')
    html += table(
        ["Endpoint", "Purpose", "Returns"],
        [[f'<span id="{_anchor("ep", slug, e["fn"])}" class="tag '
          f'{_METHOD_CLS.get(e["method"], "")}">{E(e["method"])}</span> '
          f'<code>{E(e["path"])}</code><br><small>{E(e["fn"])} · '
          f'<a class="flink" style="color:{file_color[e["file"]]}" '
          f'href="#{_anchor("cm", slug, e["file"])}">'
          f'{E(e["file"].rsplit("/", 1)[-1])}</a></small>',
          purpose_cell(e["doc"]), returns_cell(e)]
         for e in eps],
        note=f"{len(eps)} endpoint(s) — method, path, docstring, response model "
             f"and handler are read from source at build time, never hand-listed.")

    # --- Code map: one table PER LAYER, each with an honest Defines column --
    _map_info = ('<div class="leg">Defines per layer: api → its endpoints '
                 "(verb-colored, clickable) · models/schemas → their classes "
                 "(violet links into the data model) · services → public "
                 "functions · web/mobile → exported symbols.</div>")
    layer_desc = {"api": "HTTP routes", "services": "business logic",
                   "models": "DB tables", "schemas": "request/response shapes",
                   "web": "browser UI", "mobile": "native app"}
    documented = model_names | schema_names

    def defines_cell(layer: str, f: str) -> str:
        if layer == "api":
            return " · ".join(ep_chip(e) for e in eps_by_file.get(f, [])) or "—"
        names = amap["defines"].get(f, [])
        if not names:
            return "—"
        shown, extra = names[:8], len(names) - 8
        chips = []
        for n in shown:
            if n in documented:
                chips.append(f'<a class="dlink" href="#{_anchor("dm", slug, n)}">'
                             f"{E(n)}</a>")
            else:
                chips.append(f"<code>{E(n)}</code>")
        return (" · ".join(chips)
                + (f" · <small>+{extra} more</small>" if extra > 0 else ""))

    over = sum(1 for _, _, n in files if n > 800)
    html += sechead(
        "Code", "Code map", "#0f766e", _IC_FOLDER,
        sub="every file this entity lives in, measured on disk",
        id_="sec-code-map",
        info=_map_info + legend("Lines encode the 800-line budget:", [
            ("s-ok", "≤ 800", "within budget ·"),
            ("s-med", "801+", "refactor candidate — red deepens toward 2,000 ·"),
            ("s-high", "≥ 2000", "most intense red")]))
    html += table(
        ["Layer", "File", "Lines", "Defines"],
        [[f'<span class="tag {_LAYER_CLS.get(layer, "")}" '
          f'title="{E(layer_desc.get(layer, ""))}">{E(layer)}</span>',
          f'<code id="{_anchor("cm", slug, f)}">{E(f)}</code>', lines_grade(n),
          defines_cell(layer, f)] for layer, f, n in files],
        num={2},
        note=f"{len(files)} file(s) · {sum(n for _, _, n in files):,} lines measured "
             f"on disk this build · {over} file(s) over the 800-line budget. "
             f"A moved file drops out of this table visibly.")

    # --- Data model: header-table cards; compositions LINK, never repeat ----
    def link_types(typ: str) -> str:
        """A field typed with another documented class links to that class's
        card instead of repeating its structure — composition by reference.
        Every OTHER identifier is colored by its type family (see _TYPE_CLS):
        one pass over the tokens, so a documented class is never re-matched
        inside the markup a previous pass inserted."""
        import re as _re

        def one(m: _re.Match) -> str:
            tok = m.group(0)
            if tok in documented:
                return (f'<a class="dlink" href="#{_anchor("dm", slug, tok)}">'
                        f"{tok}</a>")
            cls = _TYPE_CLS.get(tok)
            return f'<span class="ty {cls}">{tok}</span>' if cls else tok

        # Quoted segments are Literal VALUES, not type names — split them out
        # first so an enum value like 'date' is never colored as a type.
        return "".join(
            E(part) if i % 2 else _re.sub(r"[A-Za-z_]\w*", one, E(part))
            for i, part in enumerate(_re.split(r"('[^']*')", typ[:60])))

    by_cls = {m["cls"]: m for m in models}

    def rel_rows(cls: str, rels: list[dict]) -> str:
        """ORM navigation properties, rendered APART from columns — with the
        one stored direction (the ForeignKey) named for each. A back_populates
        pair is two views of one FK, never circular storage."""
        if not rels:
            return ""
        rows = ""
        for r in rels:
            tgt = by_cls.get(r["target"])
            link = (f'<a class="dlink" href="#{_anchor("dm", slug, r["target"])}">'
                    f'{E(r["target"])}</a>')
            if r["many"]:
                kind = "one → many"
                via = next((f'{r["target"]}.{c} → {t2}'
                            for c, t2 in (tgt["fks"].items() if tgt else [])
                            if by_cls.get(cls) and t2.split(".")[0] == by_cls[cls]["table"]),
                           "—")
            else:
                kind = "many → one"
                me = by_cls.get(cls)
                via = next((f'{cls}.{c} → {t2}'
                            for c, t2 in (me["fks"].items() if me else [])
                            if tgt and t2.split(".")[0] == tgt["table"]), "—")
            back = (f'back_populates=<code>{E(r["back"])}</code>' if r["back"] else "—")
            casc = f' · cascade <code>{E(r["cascade"])}</code>' if r["cascade"] else ""
            rows += (f"<tr><td><code>{E(r['name'])}</code></td><td>{link} "
                     f"<small>{kind}</small></td>"
                     f"<td><code>{E(via)}</code></td><td>{back}{casc}</td></tr>")
        return (f'<p class="sub" style="margin-top:10px">Relationships — ORM '
                f"navigation, not stored columns; each is a view over ONE "
                f"ForeignKey:</p>"
                f'<table class="tbl"><thead><tr><th>Attribute</th><th>Target</th>'
                f"<th>Stored as (the FK)</th><th>Paired via</th></tr></thead>"
                f"<tbody>{rows}</tbody></table>")

    def _dm_detail(cls: str, fields: list[tuple[str, str]], extra_html: str = "",
                   rels: list[dict] | None = None) -> str:
        """The in-place expansion for one class: its columns (Column/Type/
        Example), then relationships, then any UNIQUE constraints."""
        body = "".join(
            f"<tr><td><code>{E(n)}</code></td><td>{link_types(t)}</td>"
            f"<td><code>{E(_example(n, t))}</code></td></tr>"
            for n, t in fields)
        return (f'<table class="tbl"><thead><tr><th>Column</th><th>Type</th>'
                f"<th>Example (synthetic)</th></tr></thead>"
                f"<tbody>{body}</tbody></table>"
                f"{rel_rows(cls, rels or [])}{extra_html}")

    _DM_W = ["1.5fr", "1.4fr", "1.8fr", "2fr"]

    html += sechead(
        "Code", "Data model", "#7c3aed", _IC_DB,
        sub="DB entities and API shapes — each names its file and "
            "the endpoints that touch it", id_="sec-code-model",
        info='<div class="leg">A field typed with another documented class LINKS '
             "to it (violet) instead of repeating its structure. Examples are "
             "synthetic — derived from Literal values and field-name heuristics, "
             "never real user data.</div>"
             + '<div class="leg">Type colors — one hue per family, deeper = the '
               'wider type: <span class="ty ty-num1">int</span> '
               '<span class="ty ty-num2">float · Decimal</span> numeric · '
               '<span class="ty ty-tim1">date · time</span> '
               '<span class="ty ty-tim2">datetime</span> temporal · '
               '<span class="ty ty-str1">str</span> '
               '<span class="ty ty-str2">bytes · Text</span> textual · '
               '<span class="ty ty-bool">bool</span> · '
               '<span class="ty ty-json">list · dict · Literal</span> '
               'structured · <span class="ty ty-id">UUID</span> identity · '
               '<span class="ty ty-null">None</span> nullable. An uncolored '
               "token is a domain alias (an enum defined in this codebase).</div>")
    html += (f'<p class="sub"><span class="tag l-models">models</span> '
             f"{len(models)} DB entity class(es) — click a row to open its "
             f"columns:</p>")
    _mrows = []
    for m in models:
        uq = "".join(f'<p class="sub">UNIQUE: <code>{E(u)}</code></p>' for u in m["uqs"])
        cells = [f'<b>{E(m["cls"])}</b>',
                 f'<code>{E(m["table"])}</code> <small>table</small>',
                 f'<code>{E(m["file"])}</code>',
                 " · ".join(ep_chip(e) for e in eps if m["cls"] in e["touches"]) or "—"]
        _mrows.append((cells, _dm_detail(m["cls"], m["cols"], uq, m["rels"]),
                       _anchor("dm", slug, m["cls"])))
    html += xtable(["Class", "Kind", "File", "Touched by"], _mrows, widths=_DM_W)
    html += (f'<p class="sub" style="margin-top:14px">'
             f'<span class="tag l-schemas">schemas</span> {len(schemas)} API '
             f"schema(s) — the shapes the Returns column links to:</p>")
    _srows = []
    for s_ in schemas:
        cells = [f'<b>{E(s_["cls"])}</b>', "<small>API schema</small>",
                 f'<code>{E(s_["file"])}</code>',
                 " · ".join(ep_chip(e) for e in eps
                            if s_["cls"] in e["resp"] or s_["cls"] in e["touches"])
                 or "—"]
        _srows.append((cells, _dm_detail(s_["cls"], s_["fields"]),
                       _anchor("dm", slug, s_["cls"])))
    html += xtable(["Class", "Kind", "File", "Used by"], _srows, widths=_DM_W)

    # Methodology prose LAST — the reader meets the tables first, the "how this
    # page is built" explanation after (operator: intros at the end).
    if intro_html:
        html += f'<h3>About this section</h3>{intro_html}'
    return html
