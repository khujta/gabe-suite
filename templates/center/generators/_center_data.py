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

# pure: takes the kdbp dir, reads nothing at import; split_row is the ONE guarded
# row split md_tables, load_plan and the LEDGER all read through, sha_tokens the
# ONE sha tokenizer the spine and the done-card chips share
from _kdbp_ledger import (ledger_rows as _ledger_rows, sha_tokens as _sha_tokens,
                          split_row as _split_row)

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

# No clock here (D-062): the data layer reads no wallclock. A distance from today is the PAGE's to count when it
# opens (assets/a3-days.js over an absolute date — _a3_render.counted_day); the build's one clock read is its own
# regen stamp (build_center_a3.STAMP).


# --------------------------------------------------------------------------- #
# Markdown-table layer — the ONE table reader every KDBP source goes through.
#
# Two rules, both learned the hard way against real twin data:
#
#   1. Resolve columns BY HEADER NAME. The twins do not share a schema — one
#      PLAN carries a `Types` column and a `Verified`, the other neither; one
#      writes phase ids `P1`, the other `1`. A position-keyed parser reads one
#      project perfectly and returns NOTHING for the other, which is the worst
#      failure mode available: a clean exit and an empty page.
#   2. A header is a row FOLLOWED BY a `|---|` separator — nothing else is a
#      reliable signal. Ending a table at the first non-table line broke
#      PENDING.md at row 45 of 85 (its rows are interleaved with HTML comments)
#      and promoted the row after the comment to a header.
# --------------------------------------------------------------------------- #

def md_tables(text: str) -> list[tuple[list[str], list[dict]]]:
    """Every markdown table in `text` as (headers, [row-dicts])."""
    lines = text.split("\n")

    def _is_row(i: int) -> bool:
        s = lines[i].strip()
        return s.startswith("|") and s.endswith("|") and len(s) > 1

    def _is_sep(i: int) -> bool:
        if not (0 <= i < len(lines)) or not _is_row(i):
            return False
        cells = lines[i].strip().strip("|").split("|")
        return all(c.strip() and set(c.strip()) <= set("-:") for c in cells)

    tables: list[tuple[list[str], list[dict]]] = []
    hdr: list[str] | None = None
    rows: list[dict] = []
    for i in range(len(lines)):
        if not _is_row(i) or _is_sep(i):
            continue
        cells = _split_row(lines[i])
        if _is_sep(i + 1):
            if hdr:
                tables.append((hdr, rows))
            hdr, rows = cells, []
            continue
        if hdr is None:
            continue
        d = dict(zip(hdr, cells + [""] * (len(hdr) - len(cells))))
        # zip drops every cell past the header; `_cells` keeps the raw split for a
        # POSITIONAL reader (a PENDING row whose Status a raw pipe displaced). No
        # header is spelled `_cells`, so col() never selects it.
        d["_cells"] = cells
        rows.append(d)
    if hdr:
        tables.append((hdr, rows))
    return tables


def pick_table(text: str, *required: str) -> list[dict]:
    """Rows of the first table whose header carries every required column."""
    for hdr, rows in md_tables(text):
        low = [h.strip().lower() for h in hdr]
        if all(r.lower() in low for r in required):
            return rows
    return []


def col(row: dict, *names: str) -> str:
    """First present column among `names` — the same table is spelled
    `ID | Name | Depends-on` in a folded SCOPE and `# | Phase | Depends on` in a
    standalone ROADMAP, and both are current in the wild."""
    for n in names:
        for k, v in row.items():
            if k.strip().lower() == n.lower():
                return v.strip()
    return ""


def as_date(stamp) -> _dt.date | None:
    """The first ISO date inside `stamp`, whatever prose surrounds it."""
    if not stamp:
        return None
    m = re.search(r"(20\d\d)-(\d\d)-(\d\d)", str(stamp))
    if not m:
        return None
    try:
        return _dt.date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError:
        return None


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
    # Gracefully absent like every other source: a project with no PLAN yet
    # (mid-adoption, or plan archived) gets an empty board, not a dead build.
    lines = path.read_text().splitlines() if path.exists() else []
    cols = _plan_columns(lines)
    phases: list[dict] = []

    def _idx(name: str, fallback: int | None) -> int | None:
        return cols.get(name, fallback) if cols else fallback

    i_tier, i_cplx = _idx("tier", 3), _idx("complexity", 4)
    i_marks = [_idx(k, d) for k, d in
               (("exec", 5), ("review", 6), ("commit", 7), ("push", 8))]
    i_red, i_center = _idx("red", None), _idx("center", None)
    # `_idx(...) or -1` would be wrong here: column 0 is falsy, and _at() must
    # receive None (not -1) to mean "absent column" rather than "last cell".
    i_desc, i_types = _idx("description", None), _idx("types", None)

    for line in lines:
        if not line.startswith("|") or line.startswith("|--") or line.startswith("|---"):
            continue
        cells = _split_row(line)
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
            # Description and Types were previously dropped. The board's phase
            # panel renders the description verbatim (it is where a phase's
            # founder rulings and file inventories actually live), and Types
            # is the only signal saying whether a phase is web or api work.
            "desc": re.sub(r"[`*]", "", _at(cells, i_desc)),
            "types": [t.strip() for t in _at(cells, i_types).split(",") if t.strip()],
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
            jdoc = json.loads(jpath.read_text())
            raw = str(jdoc.get("current_phase") or "").strip()
            if raw:
                match = next((p for p in phases if p["num"] == raw or p["id"] == raw), None)
                authored = f'{raw} · {match["id"]}' if match else raw
            # Declared entities/scope live ONLY in the mirror (Phase Details
            # bullets, ruling 2026-08-07) — the table has no such column. Join
            # by id; an absent key stays absent (honest blank, never a guess).
            by_id = {str(jp.get("id")): jp for jp in jdoc.get("phases", []) or []
                     if isinstance(jp, dict)}
            for p in phases:
                jp = by_id.get(p["id"]) or by_id.get(p["num"])
                if jp:
                    if "entities" in jp:
                        p["entities"] = jp["entities"]
                    if "scope" in jp:
                        p["scope"] = jp["scope"]
        except (OSError, json.JSONDecodeError):
            authored = None
    return {"version": "PLAN.md", "status": "active", "goal": "", "maturity": "",
            "created": "", "last_updated": "",
            "current_phase": authored or first_owed,
            "authored_phase": authored, "first_owed": first_owed,
            "phases": phases}


LIFECYCLE = ("red", "exec", "review", "commit", "push", "center")


def phase_cells(phase: dict) -> dict:
    """A phase's lifecycle cells, ALL of them, in order.

    load_plan keeps `red` and `center` at the phase top level because they
    arrived after the original four and `cells` is what several call sites
    iterate for "is this phase done". That split is a trap: `next_feature.py`
    asked for `cells["center"]`, got nothing for every phase, and its Center
    queue could never report an owed cell — it printed "queue clear" while a
    served phase's Center was todo (gustify #148). The board hit the same edge
    independently.

    Read cells THROUGH here. Columns a project's table does not carry are
    omitted, so `"center" in phase_cells(p)` still distinguishes "no Center
    column" from "Center owed" — the distinction next_feature.py needs.
    """
    out = {}
    for k in LIFECYCLE:
        v = phase.get(k) if k in ("red", "center") else (phase.get("cells") or {}).get(k)
        if v is not None:
            out[k] = v
    return out


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


_CLOSERS = ("CLOSED", "RESOLVED", "FIXED", "WONT-DO", "WON'T-DO", "SUPERSEDED")   # FIXED: backported from gustify (11 LEDGER + 5 PENDING rows use it)


def _verdict_closed(status: str) -> bool:
    """Is this Status cell's VERDICT a closing one?

    The verdict is the LEADING token, not any token anywhere. A reconciled row
    records its history inline —

        RESOLVED @ 19f1e220 2026-07-23 — … · prior: STILL-REAL @ e37dccc5 …

    — so a substring test sees both verdicts and has to guess. Two real rows
    (#101, #47) were shipped-and-verified yet still counted as open debt
    because their history clause mentioned STILL-REAL. Read the head of the
    cell; the tail is provenance.

    Projects still on the older lowercase vocabulary ("open — parked: …") have
    no leading all-caps verdict, so they fall through to the substring rule
    that vocabulary was written for. An empty Status is NOT closed.
    """
    su = (status or "").strip().upper()
    if not su:
        return False
    m = re.match(r"^[^A-Z]*([A-Z][A-Z\-']*)", su)
    verdict = m[1] if m else ""
    if verdict:
        # Prefix, not equality: real cells carry compounds. RESOLVED-OBSOLETE
        # is closed; PART-RESOLVED is not, and only a prefix test separates
        # them. Anything else — STILL-REAL, ACCEPTED-TRADEOFF, FOUNDER-GATED,
        # or a verdict this vocabulary has not met — stays OPEN. Closing a row
        # on a token we do not recognise hides live work; leaving it open only
        # costs a card. (An explicit open-verdict list lived here briefly and
        # was removed: no such verdict starts with a closer, so the branch
        # could never change an outcome and no fixture could make it fail.)
        return any(verdict.startswith(t) for t in _CLOSERS)
    # Older lowercase vocabulary ("open — parked: …") has no leading verdict.
    return "OPEN" not in su and any(t in su for t in _CLOSERS)


def _positional(r: dict) -> tuple[str, str, int, list[str]]:
    """A PENDING row's Status and Verified read BY POSITION, and the shas it names.

    A raw pipe inside a code span ends its cell there (only `\\|` stays inside),
    so every cell after it — Status included — sits one or two to the right,
    and a header read takes an Impact or a Times Deferred for the verdict.
    Times Deferred is a count, so it anchors the row: when its header cell
    holds something else, the next number before the last cell is where it
    went, and Status moved by the same `shift`. A count left BLANK is still
    the count's position: with no number to find, the first empty cell there
    is the anchor — only when the count's header cell holds something and the
    row is longer than its header, so a blank count in place, or a `—` on a
    row of header length, moves nothing. Cells past the header are kept
    too (a Verified the header never declared), then the shas, Status FIRST —
    it names the commit that closed the row, a Verified is often an older
    reconcile — Verified next, the overflow last; `sha_tokens` spells each
    commit once. A closure comment's sha is not read."""
    cells, hdr = r["_cells"], [k for k in r if k != "_cells"]
    idx = {h.strip().lower(): i for i, h in enumerate(hdr)}
    i_def, i_st, i_ver = (idx.get(k) for k in ("times deferred", "status", "verified"))
    shift = 0
    if i_def is not None and not re.fullmatch(r"\d+", cells[i_def] if i_def < len(cells) else ""):
        rest = range(i_def + 1, len(cells) - 1)
        j = next((k for k in rest if re.fullmatch(r"\d+", cells[k])), None)
        if j is None and len(cells) > len(hdr) and cells[i_def]:
            j = next((k for k in rest if not cells[k]), None)   # the moved count, left blank
        shift = j - i_def if j is not None else 0

    def at(i: int | None) -> str:
        return cells[i + shift] if i is not None and i + shift < len(cells) else ""

    status, verified = at(i_st), at(i_ver)
    last = max(x for x in (i_st, i_ver, len(hdr) - 1) if x is not None)
    overflow = [c for c in cells[last + shift + 1:] if c]
    return status, verified, shift, _sha_tokens(" ".join([status, verified] + overflow))


def load_pending_rows(include_archive: bool = True) -> list[dict]:
    """Every deferred-finding row the project keeps — OPEN and CLOSED alike.

    Header-resolved, and closure-aware in BOTH conventions the twins use:
    a verdict token in the `Status` cell, or an HTML comment on the line after
    the row (`<!-- P1 resolved 2026-06-11: obsolete … -->`) for projects whose
    Status cell stays empty. An empty Status therefore means NOT CLOSED, never
    "unknown, skip it".

    Resolved rows are lifted out of the live file into
    `.kdbp/archive/PENDING-resolved_*.md`, so reading only the live file
    undercounts finished work badly — one twin showed 11 closed instead of 64.

    Status and Verified are read BY POSITION (`_positional`), so a row a raw
    pipe shifted is judged on its own verdict; `shas` (Status first) and `sha`
    feed the board's done-card chips, `shift` says how far the row moved.
    `closed_on` keeps the HEADER read of Verified (O7, by plan): on a shifted
    row that cell holds the displaced Status or count, so the date comes from
    the Status (its next fallback), never from the moved Verified.
    """
    out: list[dict] = []
    seen: set[str] = set()

    def _harvest(text: str, src: str, archived: bool) -> None:
        # gate ids come from the optional index table; absent = ungated
        gates = {}
        for r in pick_table(text, "#", "Gate", "Finding"):
            g = col(r, "Gate")
            gates[col(r, "#").lstrip("#")] = g if g not in ("—", "-", "") else ""
        resolved = {}
        for m in re.finditer(
                r"<!--\s*([A-Za-z]?\d+)\s+(?:resolved|closed|done)\b([^>]*)-->",
                text, re.I):
            resolved[m[1]] = as_date(m[2])
        for r in pick_table(text, "#", "Finding", "Priority"):
            num = col(r, "#").lstrip("#")
            if not re.match(r"^[A-Za-z]?\d+$", num) or num in seen:
                continue
            seen.add(num)
            status, verified, shift, shas = _positional(r)
            closed = bool(archived or num in resolved
                          or _verdict_closed(status))
            closed_on = (as_date(col(r, "Verified")) if closed else None) \
                or (as_date(status) if closed else None) \
                or (resolved.get(num) if closed else None) \
                or (as_date(src) if closed else None)
            out.append({
                "num": num, "date": col(r, "Date"), "source": col(r, "Source"),
                "finding": col(r, "Finding"), "file": col(r, "File"),
                "scale": col(r, "Scale"), "priority": col(r, "Priority").lower(),
                "impact": col(r, "Impact"),
                "deferred": col(r, "Times Deferred"), "status": status,
                "verified": verified, "gate": gates.get(num, ""),
                "shas": shas, "sha": shas[0] if shas else "", "shift": shift,
                "open": not closed, "closed": closed,
                "closed_on": closed_on.isoformat() if closed_on else "",
                "parked": "parked" in status.lower() or "far" in status.lower(),
                "origin_file": src,
            })

    live = KDBP / "PENDING.md"
    if live.exists():
        _harvest(live.read_text(), ".kdbp/PENDING.md", archived=False)
    if include_archive and (KDBP / "archive").is_dir():
        for p in sorted((KDBP / "archive").glob("PENDING-resolved*.md")):
            _harvest(p.read_text(), f".kdbp/archive/{p.name}", archived=True)
    return out


def load_pending() -> list[dict]:
    """The OPEN deferred rows — the shape every existing station consumes.

    Openness is now decided by the closure verdict, not by whether the Status
    prose happens to contain the substring "open" (a row reading "reopened" or
    "no longer open" scored the same as a live one). Delegating to the one
    parser also keeps the center from carrying two readers that disagree."""
    return [r for r in load_pending_rows(include_archive=False) if r["open"]]


def load_ledger(n: int = 5) -> list[list[str]]:
    """Latest N dated LEDGER rows of the live file, cells verbatim, newest first
    BY DATE — the twins write opposite orders (gastify appends, gustify is
    mixed), so file position decides nothing; _kdbp_ledger holds the rule."""
    return [r["cells"][:5] for r in _ledger_rows(KDBP) if len(r["cells"]) >= 5][:n]


def load_ledger_events() -> list[dict]:
    """Every dated LEDGER row, live file + archived halves, newest first.

    PLAN.md records what a phase IS and which cells are ticked; it records no
    dates anywhere. LEDGER.md is the only per-phase clock either twin keeps —
    one dated row per command checkpoint, many of them naming their phase."""
    return [{"date": r["date"], "kind": r["entry"], "text": " ".join(r["cells"][2:4])}
            for r in _ledger_rows(KDBP, include_archive=True)]


def phase_clock(events: list[dict] | None = None) -> dict[str, dict]:
    """phase id -> {'first','last'} activity dates, from the ledger's own words.
    Ids are matched in both twin styles (`P4` and bare `4`)."""
    clock: dict[str, dict] = {}
    for ev in (events if events is not None else load_ledger_events()):
        for m in re.finditer(r"\b(?:Phase\s+)?(P\d+(?:\.\d+)?|\b\d{1,2}(?:\.\d+)?\b)",
                             ev["text"]):
            slot = clock.setdefault(m[1], {"first": ev["date"], "last": ev["date"]})
            slot["first"] = min(slot["first"], ev["date"])
            slot["last"] = max(slot["last"], ev["date"])
    return clock


def load_guard_proofs() -> list[dict]:
    """Mutation-proof verdicts written by skills/gabe-red/scripts/prove-guard.py.

    Absent for any project that has not run it — which is the common case and
    renders as `named`, not as a gap. A guard is only `proven` once a mutation
    of the code it names was observed to turn it red."""
    path = KDBP / "guard-proofs.jsonl"
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except ValueError:
            continue          # a hand-edited line must not kill the build
    return out


def load_walks() -> list[dict]:
    """The human verification record — who looked, when, what they concluded.
    adoption.json says an entity is approved; walks.jsonl says who approved it."""
    path = KDBP / "walks.jsonl"
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except ValueError:
            continue          # a hand-edited line must not kill the build
    return out


def load_scope_arc() -> tuple[list[dict], str]:
    """The long-horizon phase arc + the file it came from.

    Lives in SCOPE.md §Phases once a project folds its roadmap in, and in a
    standalone ROADMAP.md until then. Both are current across the twins, so
    read whichever exists rather than reporting "no long horizon" for the older
    shape."""
    scope = KDBP / "SCOPE.md"
    text, src = "", ""
    if scope.exists() and "## Phases" in scope.read_text():
        text = scope.read_text().split("## Phases", 1)[1]
        src = ".kdbp/SCOPE.md §Phases"
    elif (KDBP / "ROADMAP.md").exists():
        text, src = (KDBP / "ROADMAP.md").read_text(), ".kdbp/ROADMAP.md"
    if not text:
        return [], ""
    rows = []
    for r in pick_table(text, "Status"):
        aid = col(r, "ID", "#").lstrip("P")
        if not re.match(r"^[\d.]+$", aid):
            continue
        rows.append({
            "id": aid,
            "name": re.sub(r"[*`]", "", col(r, "Name", "Phase")),
            "status": col(r, "Status").lower(),
            "depends": col(r, "Depends-on", "Depends on") or "—",
            "parallel": col(r, "Parallel-with", "Parallel with") or "—",
            "reqs": len(re.findall(r"REQ-\d+", col(r, "Covers REQs", "REQs"))),
        })
    return rows, src


# --------------------------------------------------------------------------- #
# Gates layer — parsed from the REAL configs, never hand-listed
# --------------------------------------------------------------------------- #

def load_precommit_hooks() -> list[tuple[str, str]]:
    """[(hook id, its own `name:` when the config declares one)] — the
    yaml's words, machine-read, so a local hook can describe itself."""
    path = REPO_ROOT / ".pre-commit-config.yaml"
    if not path.exists():
        return []
    text = path.read_text()
    out: list[tuple[str, str]] = []
    for m in re.finditer(r"^\s*-\s*id:\s*(\S+)", text, re.M):
        block = text[m.end():]
        nxt = re.search(r"^\s*-\s*(?:id|repo):", block, re.M)
        if nxt:
            block = block[:nxt.start()]
        nm = re.search(r"^\s*name:\s*(.+)$", block, re.M)
        out.append((m.group(1),
                    nm.group(1).strip().strip("'\"") if nm else ""))
    return out


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

from _results_ingest import load_coverage, load_history, load_junit, run_stamp  # noqa: E402,F401
