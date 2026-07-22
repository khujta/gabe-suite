"""Testing Command Center — data layer (stdlib only).

Machine-derived sources ONLY (anti-curation guardrail): PLAN.md, PENDING.md,
LEDGER.md, .pre-commit-config.yaml + .github/workflows/*.yml (parsed, never
hand-listed), junit XML, run-history.jsonl, coverage JSON. The single editorial
overlay is docs/site/center/center.config.json — the ONE file that carries a
project's bindings (identity, paths, corpora, per-entity code/test/proof maps)
out of the generator source; adoption.json is the entity registry.

This module holds the DURABLE layer: KDBP documents, gate configs, the lens-card
parser, and the config/path resolution every other module reads. The RUN-RESULT
loaders (junit, coverage, run-history) live in _results_ingest.py (the P165
split seam) and are re-exported here so callers keep using `D.load_junit`.

Every source parses GRACEFULLY ABSENT so the pages render a named gap until the
step that turns the source on lands.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import re
from pathlib import Path

# --------------------------------------------------------------------------- #
# Config + path resolution — the ONE place project bindings enter the loaders.
# center.config.json lives at the center dir (default docs/site/center); every
# other path (kdbp, results, proof) is resolved from its `paths` block, so a
# project retargets the loaders by editing config, never this file.
# --------------------------------------------------------------------------- #

# GABE_REPO_ROOT lets a lab driver point the loaders at another project's tree
# (read-only) without moving the scripts. Default = the two-up convention.
REPO_ROOT = (Path(os.environ["GABE_REPO_ROOT"]).resolve()
             if os.environ.get("GABE_REPO_ROOT")
             else Path(__file__).resolve().parent.parent)
CENTER_DIR = REPO_ROOT / "docs" / "site" / "center"


def load_center_config() -> dict:
    """The center.config.json bindings, or {} when absent (pre-adoption).
    GABE_CONFIG overrides the source path (a lab driver feeding a project's data
    a config it does not carry yet)."""
    p = (Path(os.environ["GABE_CONFIG"]) if os.environ.get("GABE_CONFIG")
         else CENTER_DIR / "center.config.json")
    if not p.exists():
        return {}
    return json.loads(p.read_text())


CFG = load_center_config()
_PATHS = CFG.get("paths", {})


def _rel(key: str, default: str) -> Path:
    return REPO_ROOT / _PATHS.get(key, default)


# CENTER_DIR is where config lives, so it cannot itself come from config; the
# rest are config-driven with the conventional defaults.
if _PATHS.get("center"):
    CENTER_DIR = REPO_ROOT / _PATHS["center"]
KDBP = _rel("kdbp", ".kdbp")
RESULTS_DIR = _rel("results", "tests/results")
PROOF_DIR = _rel("proof", "tests/web-e2e/proof")

NOW = _dt.datetime.now(_dt.timezone.utc)


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #

def rel_age(iso: str | None) -> str:
    """Mono freshness stamp: 'T-2h' style (never fabricated)."""
    if not iso:
        return "never"
    try:
        ts = _dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return "?"
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=_dt.timezone.utc)
    delta = NOW - ts
    mins = int(delta.total_seconds() // 60)
    if mins < 0:
        return "future?"  # clock skew / hand-edited record — never render as fresh
    if mins < 60:
        return f"T−{max(mins, 1)}m"
    hours = mins // 60
    if hours < 48:
        return f"T−{hours}h"
    return f"T−{hours // 24}d"


# --------------------------------------------------------------------------- #
# KDBP layer
# --------------------------------------------------------------------------- #

_CELL_MARK = {"✅": "done", "🔄": "in_progress", "⬜": "todo"}


def _plan_columns(lines: list[str]) -> dict[str, int] | None:
    """Map PLAN.md phase-table column NAME -> index from the header row.

    Positional slicing is a trap: the table has gained columns over time (Red,
    Center), and a hardcoded cells[5:9] silently read [Red, Exec, Review,
    Commit] — making every shipped phase look like it owed `exec`. Resolve by
    name so a future column cannot shift the data again.
    """
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = [c.strip().lower() for c in line.strip().strip("|").split("|")]
        if "phase" in cells and "exec" in cells:
            return {name: i for i, name in enumerate(cells) if name}
    return None


def _at(cells: list[str], i: int | None) -> str:
    """Bounds-safe cell read (missing/absent column -> empty, never IndexError)."""
    return cells[i] if i is not None and 0 <= i < len(cells) else ""


def load_plan() -> dict:
    """The machine truth for phases is .kdbp/PLAN.md's phase table. Columns are
    resolved BY HEADER NAME (see _plan_columns), so Red/Center additions never
    shift the cells. Parsed, never interpreted: cells map ✅/🔄/⬜ verbatim;
    current_phase = first phase in table order with any of exec/review/commit/
    push not done. When a PLAN.json mirror is present it carries the AUTHORED
    current phase — reported alongside, so a drift between them is visible."""
    path = KDBP / "PLAN.md"
    lines = path.read_text().splitlines()
    cols = _plan_columns(lines)
    phases: list[dict] = []

    def _idx(name: str, fallback: int | None) -> int | None:
        return cols.get(name, fallback) if cols else fallback

    i_tier, i_cplx = _idx("tier", 3), _idx("complexity", 4)
    i_marks = [_idx(k, d) for k, d in
               (("exec", 5), ("review", 6), ("commit", 7), ("push", 8))]
    i_red, i_center = _idx("red", None), _idx("center", None)

    for line in lines:
        if not line.startswith("|") or line.startswith("|--") or line.startswith("|---"):
            continue
        guarded = line.strip().strip("|").replace("\\|", "\x00")
        cells = [c.strip().replace("\x00", "|") for c in guarded.split("|")]
        if len(cells) < 9 or not cells[0] or cells[0] in ("#",):
            continue
        marks = [_at(cells, i) for i in i_marks]
        if not any(m in _CELL_MARK for m in marks):
            continue
        pid, _, pname = (cells[1].partition("·"))
        phases.append({
            "num": cells[0],
            "id": pid.strip() or cells[0], "name": pname.strip() or cells[1],
            "tier": _at(cells, i_tier), "complexity": _at(cells, i_cplx),
            "types": [],
            "cells": {k: _CELL_MARK.get(m, "todo")
                      for k, m in zip(("exec", "review", "commit", "push"), marks)},
            "red": _CELL_MARK.get(_at(cells, i_red)) if i_red is not None else None,
            "center": _CELL_MARK.get(_at(cells, i_center)) if i_center is not None else None,
            "proof": "",
        })
    first_owed = next((p["id"] for p in phases
                       if any(v != "done" for v in p["cells"].values())),
                      phases[-1]["id"] if phases else "—")
    authored = None
    jpath = KDBP / "PLAN.json"
    if jpath.exists():
        try:
            raw = str(json.loads(jpath.read_text()).get("current_phase") or "").strip()
            if raw:
                match = next((p for p in phases if p["num"] == raw or p["id"] == raw), None)
                authored = f'{raw} · {match["id"]}' if match else raw
        except (OSError, json.JSONDecodeError):
            authored = None
    return {"version": "PLAN.md", "status": "active", "goal": "", "maturity": "",
            "created": "", "last_updated": "",
            "current_phase": authored or first_owed,
            "authored_phase": authored, "first_owed": first_owed,
            "phases": phases}


def load_maturity() -> str:
    """The project's declared maturity tier from `.kdbp/BEHAVIOR.md`'s
    `maturity:` line (mvp | enterprise | scale), lowercased. Returns "" when the
    file or the line is absent — the caller renders an HONEST "not declared", it
    never fabricates a tier or a provenance for one. This is the single read of
    the value the Action Ledger's ripe-now/later split is computed against."""
    path = KDBP / "BEHAVIOR.md"
    if not path.exists():
        return ""
    for ln in path.read_text().splitlines():
        m = re.match(r"\s*maturity\s*:\s*([A-Za-z]+)", ln, re.I)
        if m:
            return m.group(1).lower()
    return ""


def load_pending() -> list[dict]:
    """Tolerant PENDING.md row parser. A row is open when its Status cell
    CONTAINS 'open' (status strings carry suffixes like 'open — parked: …')."""
    rows: list[dict] = []
    path = KDBP / "PENDING.md"
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        if not line.startswith("|") or line.startswith("|--") or line.startswith("| #"):
            continue
        guarded = line.strip().strip("|").replace("\\|", "\x00")
        cells = [c.strip().replace("\x00", "|") for c in guarded.split("|")]
        if len(cells) < 10 or not cells[0]:
            continue
        rows.append({
            "num": cells[0], "date": cells[1], "source": cells[2],
            "finding": cells[3], "file": cells[4], "scale": cells[5],
            "priority": cells[6].lower(), "impact": cells[7],
            "deferred": cells[8], "status": cells[9],
            "open": "open" in cells[9].lower(),
            "parked": "parked" in cells[9].lower() or "far" in cells[9].lower(),
        })
    return rows


def load_ledger(n: int = 5) -> list[list[str]]:
    """Latest N LEDGER table rows, cells verbatim (newest first in the file)."""
    rows: list[list[str]] = []
    path = KDBP / "LEDGER.md"
    if not path.exists():
        return rows
    for line in path.read_text().splitlines():
        if not line.startswith("|") or line.startswith("|--") or "| Date |" in line:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 5:
            rows.append(cells[:5])
        if len(rows) >= n:
            break
    return rows


# --------------------------------------------------------------------------- #
# Gates layer — parsed from the REAL configs, never hand-listed
# --------------------------------------------------------------------------- #

def load_precommit_hooks() -> list[str]:
    path = REPO_ROOT / ".pre-commit-config.yaml"
    if not path.exists():
        return []
    return re.findall(r"^\s*-\s*id:\s*(\S+)", path.read_text(), re.M)


def load_ci_jobs() -> dict[str, list[dict]]:
    """{workflow-file: [{id, name, main_gated}]} — regex-parsed job map."""
    out: dict[str, list[dict]] = {}
    wf_dir = REPO_ROOT / ".github" / "workflows"
    if not wf_dir.is_dir():
        return out
    for wf in sorted(wf_dir.glob("*.yml")):
        text = wf.read_text()
        jobs: list[dict] = []
        jobs_m = re.search(r"^jobs:\s*$", text, re.M)
        if jobs_m:
            body = text[jobs_m.end():]
            keys = [(m.start(), m.group(1)) for m in
                    re.finditer(r"^  ([A-Za-z0-9_-]+):\s*$", body, re.M)]
            for i, (pos, jid) in enumerate(keys):
                end = keys[i + 1][0] if i + 1 < len(keys) else len(body)
                block = body[pos:end]
                name_m = re.search(r"^\s+name:\s*(.+)$", block, re.M)
                jobs.append({
                    "id": jid,
                    "name": (name_m.group(1).strip() if name_m else jid),
                    "main_gated": "refs/heads/main" in block,
                })
        out[wf.name] = jobs
    return out


# --------------------------------------------------------------------------- #
# Lens-card parser — the ONE authored source on a feature page. The card MAPs
# and TRANSLATEs; it may never assert results (those come from junit at build).
# --------------------------------------------------------------------------- #

CARD_SECTIONS = ("HANDLE", "WHAT & WHY", "FOR WHOM", "FLOWS",
                 "IS", "IS NOT", "DECIDED")


def parse_card(path: Path) -> dict[str, list[str]]:
    """cards/<slug>.md -> {SECTION: [lines]} — every CARD_SECTIONS heading
    required and non-empty; anything else fails LOUD (config-typo doctrine)."""
    sections: dict[str, list[str]] = {}
    current: str | None = None
    in_comment = False
    for line in path.read_text().splitlines():
        # HTML comments (scaffold facts etc.) are card metadata, never section
        # content — swallowing them into a DIAGRAM section breaks its mermaid.
        if "<!--" in line:
            in_comment = "-->" not in line
            continue
        if in_comment:
            in_comment = "-->" not in line
            continue
        if line.startswith("# "):
            current = line[2:].strip().upper()
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line.rstrip())
    missing = [s for s in CARD_SECTIONS if not sections.get(s)]
    if missing:
        raise SystemExit(f"lens card {path.name} is missing section(s): {missing}")
    return sections


# --------------------------------------------------------------------------- #
# Run-result loaders (the P165 seam) live in _results_ingest and are re-exported
# so callers keep `D.load_junit` / `D.load_history` / `D.load_coverage`.
# Imported LAST: _results_ingest reads the constants defined above.
# --------------------------------------------------------------------------- #

from _results_ingest import load_coverage, load_history, load_junit  # noqa: E402,F401
