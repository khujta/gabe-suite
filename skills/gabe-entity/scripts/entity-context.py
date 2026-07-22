#!/usr/bin/env python3
"""gabe-entity — entity-context reader.

Assembles ONE application entity's slice into a context pack from the command
center's committed data — WITHOUT re-reading the codebase:

  <center>/archmap.json       -> code slice (endpoints/models/schemas/files/defines)
  <center>/adoption.json      -> registry row (rank/status/checklist/signals/walk)
  <center>/center.config.json -> bindings (test_rx/proofs/models/code globs)

The three join on the entity SLUG. This is a pure DATA consumer of the
archmap.json contract produced by templates/center/generators/ (collect_entity_map
+ build_center_a3) — it never runs the generator or re-analyzes source. That is
the point: the read-once map is the cache; the reader indexes it (E4 reuse-first).

Usage:
  entity-context.py <slug> [--center DIR] [--json]
  entity-context.py list   [--center DIR]
"""
import argparse
import json
import sys
from pathlib import Path

CENTER_DEFAULT = "docs/site/center"


def fail(msg, code=2):
    """Missing-anchor / not-found stop (E6). Writes to stderr, exits non-zero."""
    sys.stderr.write("gabe-entity: STOP — %s\n" % msg)
    sys.exit(code)


def locate_center(explicit):
    """Return the center dir, or STOP. center.config.json is the anchor file."""
    if explicit:
        d = Path(explicit)
        if (d / "center.config.json").is_file():
            return d
        fail("no center.config.json under --center %s" % d)
    here = Path.cwd()
    for base in (here, *here.parents):
        d = base / CENTER_DEFAULT
        if (d / "center.config.json").is_file():
            return d
    fail("no command center found (looked for %s/center.config.json up from CWD).\n"
         "This project has no built center — run /gabe-adopt first." % CENTER_DEFAULT)


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        fail("%s is not valid JSON: %s" % (path, exc))


def config_entities(cfg):
    """(canonical?, {slug: bindings}, {slug: label}) — tolerates the old list shape."""
    ents = (cfg or {}).get("entities")
    if isinstance(ents, dict):                       # canonical (promoted) shape
        return True, ents, {k: k for k in ents}
    if isinstance(ents, list):                       # legacy live shape: [{id,label,color}]
        return False, {}, {e.get("id"): e.get("label", e.get("id"))
                           for e in ents if e.get("id")}
    return False, {}, {}


def adoption_row(adoption, slug):
    for row in (adoption or {}).get("sections", []):
        if row.get("entity") == slug:
            return row
    return None


def table_to_slug(archmap):
    """{table_name: slug} across every mapped entity's models — for FK resolution."""
    index = {}
    for slug, sl in (archmap or {}).get("entities", {}).items():
        for model in (sl or {}).get("models", []):
            if model.get("table"):
                index[model["table"]] = slug
    return index


def relations(code, tbl2slug, self_slug):
    """FK edges out of this entity's models -> related entities / unmapped tables."""
    edges, related = [], set()
    for model in (code or {}).get("models", []):
        for col, ref in (model.get("fks") or {}).items():
            target_table = ref.split(".")[0]
            target_slug = tbl2slug.get(target_table)
            edges.append({"from_model": model.get("cls"), "col": col,
                          "target_table": target_table, "target_entity": target_slug})
            if target_slug and target_slug != self_slug:
                related.add(target_slug)
    unresolved = sorted({e["target_table"] for e in edges if not e["target_entity"]})
    return edges, sorted(related), unresolved


def code_counts(code):
    files = code.get("files", [])
    return {"endpoints": len(code.get("endpoints", [])),
            "models": len(code.get("models", [])),
            "schemas": len(code.get("schemas", [])),
            "files": len(files),
            "lines": sum(f[2] for f in files if len(f) > 2)}


def build_pack(slug, center, cfg, archmap, adoption):
    canonical, cfg_ents, labels = config_entities(cfg)
    code = (archmap or {}).get("entities", {}).get(slug)
    row = adoption_row(adoption, slug)
    bindings = cfg_ents.get(slug) if canonical else None

    if code is None and row is None:
        known = sorted(set((archmap or {}).get("entities", {}))
                       | {s.get("entity") for s in (adoption or {}).get("sections", [])})
        fail("entity '%s' not found in archmap.json or adoption.json.\n"
             "Registered entities: %s" % (slug, ", ".join(known) or "(none)"))

    fk_out, related, unresolved = relations(code, table_to_slug(archmap), slug)
    checklist = (row or {}).get("checklist") or {}

    return {
        "slug": slug,
        "display_name": ((row or {}).get("display_name") or (row or {}).get("label")
                        or labels.get(slug) or slug),
        "source": {"archmap_head": (archmap or {}).get("head"),
                   "archmap_generated": (archmap or {}).get("generated"),
                   "center": str(center)},
        "registry": None if row is None else {
            "rank": row.get("rank"), "status": row.get("status"),
            "checklist": checklist,
            "checklist_done": sum(1 for v in checklist.values() if v),
            "checklist_total": len(checklist),
            "signals": row.get("signals"), "approved_walk": row.get("approved_walk"),
            "notes": row.get("notes")},
        "code": None if code is None else {**code, "counts": code_counts(code)},
        "relations": {"fk_out": fk_out, "related_entities": related,
                      "unresolved_tables": unresolved},
        "bindings": None if not bindings else {
            "test_rx": bindings.get("test_rx"), "proofs": bindings.get("proofs", []),
            "models_allowlist": bindings.get("models", []),
            "code_globs": bindings.get("code", {})},
        "availability": {"archmap": code is not None, "adoption": row is not None,
                         "config_canonical": canonical},
    }


def tick(flag):
    return "✓" if flag else "—"


def render_md(p):
    out = ["# Entity context — %s  (slug: %s)" % (p["display_name"], p["slug"])]
    a = p["availability"]
    out.append("_availability: archmap %s · adoption %s · canonical config %s_"
               % (tick(a["archmap"]), tick(a["adoption"]), tick(a["config_canonical"])))
    if p["source"]["archmap_head"]:
        out.append("_code map @ %s · %s_"
                   % (p["source"]["archmap_head"], p["source"]["archmap_generated"]))
    out.append("")

    r = p["registry"]
    out.append("## Registry (adoption.json)")
    if r:
        out.append("- rank **%s** · status **%s** · checklist %d/%d · walk %s"
                   % (r["rank"], r["status"], r["checklist_done"], r["checklist_total"],
                      r["approved_walk"] or "—"))
        if r["signals"]:
            out.append("- signals: %s" % r["signals"])
    else:
        out.append("- _not registered in adoption.json_")
    out.append("")

    c = p["code"]
    out.append("## Code (archmap.json)")
    if c:
        n = c["counts"]
        out.append("- **%d files** (%s lines) · %d endpoints · %d models · %d schemas"
                   % (n["files"], "{:,}".format(n["lines"]), n["endpoints"], n["models"], n["schemas"]))
        out.append("")
        out.append("### Endpoints")
        out += ["- `%s %s` → %s()" % (e.get("method"), e.get("path"), e.get("fn"))
                for e in c["endpoints"]]
        out.append("")
        out.append("### Models")
        out += ["- **%s** `[%s]` — %d cols, %d fks"
                % (m.get("cls"), m.get("table"), len(m.get("cols", [])), len(m.get("fks", {})))
                for m in c["models"]]
        if c["schemas"]:
            out.append("")
            out.append("### Schemas")
            out.append(", ".join("`%s`" % s.get("cls") for s in c["schemas"]))
        out.append("")
        out.append("### Files by layer")
        by_layer = {}
        for f in c["files"]:
            if len(f) > 2:
                agg = by_layer.setdefault(f[0], [0, 0])
                agg[0] += 1
                agg[1] += f[2]
        for layer in sorted(by_layer):
            cnt, lines = by_layer[layer]
            out.append("- %s: %d files (%s lines)" % (layer, cnt, "{:,}".format(lines)))
    else:
        out.append("- _not mapped in archmap.json (registered but not built, or unmapped)_")
    out.append("")

    rel = p["relations"]
    out.append("## Relations (via model FKs)")
    if rel["related_entities"]:
        out.append("- related entities: %s"
                   % ", ".join("`%s`" % s for s in rel["related_entities"]))
    if rel["unresolved_tables"]:
        out.append("- FK targets in unmapped entities: %s" % ", ".join(rel["unresolved_tables"]))
    if not rel["fk_out"]:
        out.append("- _no foreign keys in this entity's models_")
    out.append("")

    b = p["bindings"]
    out.append("## Bindings (center.config.json)")
    if b:
        out.append("- test_rx: `%s`" % b["test_rx"])
        out.append("- %d proof sets · models allowlist [%d]"
                   % (len(b["proofs"]), len(b["models_allowlist"])))
    else:
        out.append("- _canonical config bindings unavailable (legacy-shape or absent config)_")
    return "\n".join(out)


def render_list(archmap, adoption):
    mapped = set((archmap or {}).get("entities", {}))
    rows = (adoption or {}).get("sections", [])
    out = ["# Registered entities (adoption.json)"]
    if not rows:
        out.append("_none registered_")
    for s in rows:
        slug = s.get("entity")
        out.append("- `%s` — %s · rank %s · status %s · %s"
                   % (slug, s.get("display_name") or s.get("label") or slug,
                      s.get("rank"), s.get("status"),
                      "mapped" if slug in mapped else "unmapped"))
    only_map = sorted(mapped - {s.get("entity") for s in rows})
    if only_map:
        out.append("")
        out.append("_in archmap but not adoption: %s_" % ", ".join(only_map))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(prog="gabe-entity", description="Entity-context reader.")
    ap.add_argument("slug", help="entity slug, or 'list' to enumerate registered entities")
    ap.add_argument("--center", help="center dir (default: %s found up from CWD)" % CENTER_DEFAULT)
    ap.add_argument("--json", action="store_true", help="emit the JSON pack instead of the brief")
    args = ap.parse_args()

    center = locate_center(args.center)
    cfg = load_json(center / "center.config.json")
    archmap = load_json(center / "archmap.json")
    adoption = load_json(center / "adoption.json")

    if archmap is None and adoption is None:
        fail("neither archmap.json nor adoption.json exists under %s.\n"
             "Build the center first — /gabe-adopt or /gabe-feature." % center)

    if args.slug == "list":
        print(render_list(archmap, adoption))
        return
    pack = build_pack(args.slug, center, cfg, archmap, adoption)
    print(json.dumps(pack, indent=2, ensure_ascii=False) if args.json else render_md(pack))


if __name__ == "__main__":
    main()
