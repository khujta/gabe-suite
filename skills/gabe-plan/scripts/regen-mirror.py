#!/usr/bin/env python3
"""Regenerate .kdbp/PLAN.json from .kdbp/PLAN.md per plan-spec Step 4b.

Mechanical: Phases table (ids, names, tier, complexity, cells — incl. an in-table Types column)
PLUS each phase's Phase Details block (types YAML or `- **Types:**` bullet, `- **Proof:**` line,
`proof_type:` YAML, `- **Cases:**` line). Grouped detail headings (`### Phases 19–29 — …`) apply
to every numeric id in the range. Run from the repo root. Prints a drift summary vs the existing
mirror.

Preservation rule (dry-run hardened): `proof` / `proof_type` / `cases` are OVERWRITTEN only when
the .md provides a value; when the .md is silent AND the old mirror has one (e.g. /gabe-execute
wrote `proof` straight into PLAN.json per execute-spec), the old value is PRESERVED and printed —
regeneration must never wipe recorded evidence into null (that would also blind the
plan-proof-guard, which skips null proofs).
"""
import json
import re
import sys
from pathlib import Path

GLYPH = {"⬜": "todo", "🔄": "in_progress", "✅": "done", "⏸": "deferred", "⚰️": "obsolete", "⚰": "obsolete"}
CELL_COLS = ("red", "exec", "review", "commit", "push", "center")

md = Path(".kdbp/PLAN.md").read_text(encoding="utf-8")
notes = []

def comment(tag, default):
    m = re.search(rf"<!--\s*{tag}:\s*(\S+)\s*-->", md)
    return m.group(1) if m else default

def context_field(label):
    m = re.search(rf"-\s*\*\*{label}:\*\*\s*([^\n]+)", md)
    return m.group(1).strip() if m else None

def section(name):
    m = re.search(rf"^## {re.escape(name)}\n(.*?)(?=^## |\Z)", md, re.M | re.S)
    return m.group(1) if m else ""

def split_cells(line):
    # markdown-escaped pipes (\|) are cell CONTENT, not boundaries (real gastify row 25)
    cells = re.split(r"(?<!\\)\|", line.strip())
    return [c.strip().replace("\\|", "|").replace("️", "") for c in cells[1:-1]] if len(cells) >= 3 else []

# --- Phases table ---
phases_txt = section("Phases")
rows, header = [], None
for line in phases_txt.splitlines():
    if not line.lstrip().startswith("|"):
        continue
    cells = split_cells(line)
    if not cells:
        continue
    if header is None:
        low = [c.lower() for c in cells]
        if "#" in low and "phase" in low:  # a stray |-line must not masquerade as the header
            header = low
        else:
            notes.append(f"note: skipped pre-header |-line: {line.strip()[:60]!r}")
        continue
    if all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c):
        continue  # separator (any cell count — real twins ship malformed ones)
    rows.append(cells)
if header is None:
    sys.exit("BREAK: no Phases table header (needs '#' and 'Phase' columns) found")

def col(name):
    return header.index(name) if name in header else None

idx = {name: col(name) for name in ("#", "phase", "tier", "complexity", "types", *CELL_COLS)}

# --- Phase Details blocks (single and grouped/plural range headings) ---
details_txt = section("Phase Details")
blocks = {}
for m in re.finditer(r"^### Phases? ([\w.]+)(?:\s*[–—-]\s*([\w.]+))?\s+—[^\n]*\n(.*?)(?=^### |\Z)",
                     details_txt, re.M | re.S):
    first, last, body = m.group(1), m.group(2), m.group(3)
    if last and first.isdigit() and last.isdigit():
        for pid in range(int(first), int(last) + 1):
            blocks[str(pid)] = body  # grouped heading applies to every id in range
    else:
        blocks[first] = body

def detail(pid, key):
    b = blocks.get(pid, "")
    m = re.search(rf"^- \*\*{key}:\*\*\s*(.+)$", b, re.M)
    return m.group(1).strip() if m else None

def detail_types(pid):
    b = blocks.get(pid, "")
    m = re.search(r"^types:\s*\[([^\]]*)\]", b, re.M)  # YAML form
    if m:
        return [t.strip() for t in m.group(1).split(",") if t.strip()]
    bullet = detail(pid, "Types")  # `- **Types:** \`a\`, \`b\`` bullet form
    if bullet:
        return [t.strip(" `") for t in bullet.split(",") if t.strip(" `")]
    return []

def detail_proof_type(pid):
    m = re.search(r"^proof_type:\s*(\S+)", blocks.get(pid, ""), re.M)
    return None if not m or m.group(1) in ("null", "~") else m.group(1)

# --- old mirror (drift + preservation source) ---
old_path = Path(".kdbp/PLAN.json")
old_by_id = {}
if old_path.exists():
    try:
        old = json.loads(old_path.read_text())
        old_by_id = {str(p.get("id")): p for p in old.get("phases", []) if isinstance(p, dict)}
    except Exception as e:
        notes.append(f"old mirror unreadable ({e}) — regenerating fresh")

phases = []
for cells in rows:
    def cell(name):
        i = idx[name]
        return cells[i] if i is not None and i < len(cells) else None
    pid = cell("#")
    old_ph = old_by_id.get(str(pid), {})
    types = detail_types(pid) or [t.strip(" `") for t in (cell("types") or "").split(",") if t.strip(" `[]")]
    proof = detail(pid, "Proof")
    proof_type = detail_proof_type(pid)
    cases = detail(pid, "Cases")
    for field, mdval in (("proof", proof), ("proof_type", proof_type), ("cases", cases)):
        if mdval is None and old_ph.get(field) is not None:
            notes.append(f"preserved phase {pid} {field} from old mirror (no .md source): {str(old_ph[field])[:60]!r}")
    proof = proof if proof is not None else old_ph.get("proof")
    proof_type = proof_type if proof_type is not None else old_ph.get("proof_type")
    cases = cases if cases is not None else old_ph.get("cases")
    ph = {
        "id": pid,
        "name": cell("phase"),
        # the Tier cell may carry compact override notation "mvp (obs→ent)" — mirror wants the base
        "tier": (cell("tier") or "").split(" ")[0] or None,
        "complexity": cell("complexity"),
        "types": types,
        "cells": {},
        "proof": proof,
        "proof_type": proof_type,
        "cases": cases,
    }
    for cname in CELL_COLS:
        glyph = cell(cname)
        if glyph is None or glyph == "—":
            continue  # column absent, or render-only dash → omit the key
        if glyph == "":
            notes.append(f"warn: phase {pid} {cname} cell is BLANK — recorded as todo (fill it in PLAN.md)")
            ph["cells"][cname] = "todo"
            continue
        if glyph not in GLYPH:
            sys.exit(f"BREAK: phase {pid} {cname} cell {glyph!r} is not a known glyph")
        ph["cells"][cname] = GLYPH[glyph]
    phases.append(ph)

cur_sec = section("Current Phase")
cur = re.search(r"Phase\s+([A-Za-z0-9][\w.]*)", cur_sec)  # tolerates narrative like "(Phase 24), …"
goal = section("Goal").strip().split("\n\n")[0].replace("\n", " ")

plan = {
    "version": 1,
    "status": comment("status", "active"),
    "project_type": comment("project_type", "code"),
    "goal": goal,
    "maturity": context_field("Maturity"),
    "created": context_field("Created"),
    "last_updated": (context_field("Last Updated") or "").split(" ")[0],
    "current_phase": cur.group(1).rstrip(".,)") if cur else None,
    "phases": phases,
}

if old_by_id:
    new_ids = [p["id"] for p in phases]
    added = [i for i in new_ids if i not in old_by_id]
    dropped = sorted(set(old_by_id) - set(map(str, new_ids)))
    print(f"drift: rows added to mirror: {added or 'none'} · rows dropped: {dropped or 'none'}")
for n in notes:
    print(n)

old_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote .kdbp/PLAN.json: {len(phases)} phases, current_phase={plan['current_phase']!r}")
