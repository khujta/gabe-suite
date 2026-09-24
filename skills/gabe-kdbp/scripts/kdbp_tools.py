#!/usr/bin/env python3
"""kdbp_tools — the KDBP-STATE readers served by the gabe-kdbp MCP server (sibling of gabe-map).

READ-ONLY over a project's `.kdbp/` (PLAN.md · PLAN.json · PENDING.md · LEDGER.md · BEHAVIOR.md ·
DECISIONS.md) plus git. The two "writers" the analysis scored `next` — a PENDING row and a LEDGER row —
ship as PREVIEWS: they return the exact row text to paste and write NOTHING (the D7 lie-block hooks watch
Write/Edit/Bash, not mcp__*; a writer tool is that bypass institutionalized — open ruling, design D14).
Parsers are HEADER-RESOLVED (PENDING/PLAN/LEDGER schemas diverge across twins) and closure-aware (a
verdict token in Status OR a `<!-- P<n> resolved -->` comment closes a row). Honest-empty: no `.kdbp/`
→ `present:false` + reason; a missing file → a `reason`, never a crash. Contract: references/kdbp-spec.md.
"""
from __future__ import annotations
import datetime as _dt
import fnmatch
import json
import os
import re
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS_DIR = os.environ.get("GABE_SKILLS_DIR") or os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(SKILLS_DIR, "gabe-map", "scripts"))
import mapquery as mq  # noqa: E402  (root resolution · sh · MapStop · caps)

CAP = mq.CAP
CLOSERS = ("CLOSED", "RESOLVED", "WONT-DO", "WON'T-DO", "SUPERSEDED", "DONE", "FIXED")
DONE_CELLS = ("✅", "done", "complete", "completed")
ACTIVE_CELLS = ("🔄", "wip", "in-progress", "in progress", "doing")
TODO_CELLS = ("⬜", "todo", "pending", "")


def _ctx(args: dict, roots) -> tuple[str, str, Path | None]:
    root, source = mq.resolve_root(args.get("root"), roots)
    kd = Path(root) / ".kdbp"
    return root, source, (kd if kd.is_dir() else None)


def _absent(root: str, source: str) -> dict:
    return {"present": False, "root": root, "root_source": source,
            "reason": "no .kdbp/ under %s — not a KDBP project (run /gabe-init to create one)" % root}


def _read(kd: Path, name: str) -> str | None:
    p = kd / name
    try:
        return p.read_text(encoding="utf-8", errors="replace") if p.is_file() else None
    except OSError:
        return None


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


_SEP = re.compile(r"^\s*\|[\s:|.-]+\|?\s*$")


def _is_header(lines: list[str], i: int, keyword: str) -> bool:
    """A real markdown header: a `|` line carrying the keyword whose NEXT line is a `|---|` separator (K3 —
    a data row that merely contains the word is not a header, so gastify's headerless LEDGER reads honest-empty)."""
    ln = lines[i]
    return (ln.lstrip().startswith("|") and keyword.lower() in ln.lower()
            and i + 1 < len(lines) and bool(_SEP.match(lines[i + 1])))


def _table(text: str, header_must_have: str) -> tuple[list[str], list[tuple[list[str], int]]]:
    """The BEST markdown table whose header carries `header_must_have` → (header cells, [(row cells, line_no)]).

    Among every real header (K3: separator required), pick the one with the MOST columns (K1/F2 — on a twin
    that keeps a 3-column production-gate map beside the 11-column canonical PENDING table, the canonical wins;
    ties → first). Rows skip blank lines and HTML comments (K2 — twins group rows with blank lines) and end
    only at the NEXT real header or the first non-table prose line."""
    lines = text.splitlines()
    heads = [i for i in range(len(lines)) if _is_header(lines, i, header_must_have)]
    if not heads:
        return [], []
    other_heads = {i for i in range(len(lines))
                   for kw in ("|",) if lines[i].lstrip().startswith("|") and i + 1 < len(lines) and _SEP.match(lines[i + 1])}
    best = max(heads, key=lambda i: (len(_cells(lines[i])), -i))
    hdr = _cells(lines[best])
    rows: list[tuple[list[str], int]] = []
    for j in range(best + 2, len(lines)):
        l2 = lines[j]
        if not l2.strip() or l2.lstrip().startswith("<!--"):     # blank rows / closure comments never end the table
            continue
        if not l2.lstrip().startswith("|"):
            break                                                # first prose line after the table ends it
        if j in other_heads:                                      # a new table starts
            break
        if _SEP.match(l2):                                        # a stray separator (defensive)
            continue
        rows.append((_cells(l2), j))
    return hdr, rows


def _col(hdr: list[str], *names: str) -> int | None:
    low = [h.lower() for h in hdr]
    for n in names:
        if n.lower() in low:
            return low.index(n.lower())
    for i, h in enumerate(low):
        if any(n.lower() in h for n in names):
            return i
    return None


def _at(cells: list[str], i: int | None) -> str:
    return cells[i] if i is not None and 0 <= i < len(cells) else ""


# ── PLAN ───────────────────────────────────────────────────────────────────────
def plan_rows(text: str) -> list[dict]:
    hdr, rows = _table(text, "Exec")
    if not hdr:
        return []
    low = [h.lower() for h in hdr]
    if "#" in low:
        # `#` is the id; the short title is Name/Title, else the "Phase" column (gustify: | # | Phase | Description |),
        # and Description only as a last resort — it is the long text, not the name
        id_col, name_col = low.index("#"), _col(hdr, "Name", "Title", "Phase", "Description")
    else:
        id_col, name_col = _col(hdr, "Phase", "ID", "Id"), _col(hdr, "Name", "Title", "Description")
    ci = {"id": id_col, "name": name_col, "tier": _col(hdr, "Tier"),
          "red": _col(hdr, "Red"), "exec": _col(hdr, "Exec"), "review": _col(hdr, "Review"), "commit": _col(hdr, "Commit"),
          "push": _col(hdr, "Push"), "center": _col(hdr, "Center")}
    out = []
    for cells, ln in rows:
        rid = _at(cells, ci["id"]).strip("*` ")
        if not rid or set(rid) <= set("-: "):
            continue
        out.append({"id": rid, "name": _at(cells, ci["name"]), "tier": _at(cells, ci["tier"]),
                    "cells": {k: _at(cells, ci[k]) for k in ("red", "exec", "review", "commit", "push", "center") if ci[k] is not None},
                    "line": ln + 1})
    return out


def _state(cell: str) -> str:
    c = (cell or "").strip().lower()
    if any(t in c for t in ("✅",)) or c in DONE_CELLS: return "done"
    if any(t in c for t in ("🔄",)) or c in ACTIVE_CELLS: return "active"
    if c.startswith("skip") or "⏸" in c or "n/a" in c: return "skipped"
    return "todo"


def plan_json(kd: Path) -> dict | None:
    try:
        return json.loads((kd / "PLAN.json").read_text(encoding="utf-8")) if (kd / "PLAN.json").is_file() else None
    except json.JSONDecodeError:
        return None


def plan_floor(kd: Path) -> tuple[str | None, str]:
    """The active plan's Created date — LEDGER rows dated before it belong to an EARLIER plan whose phase ids
    repeat ("Phase 1" in every plan). PLAN.json `created` first, then the PLAN.md `**Created:**` line."""
    c = str((plan_json(kd) or {}).get("created") or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", c):
        return c, "PLAN.json created"
    m = re.search(r"\*\*Created:\*\*\s*(\d{4}-\d{2}-\d{2})", _read(kd, "PLAN.md") or "")
    if m:
        return m.group(1), "PLAN.md **Created:**"
    return None, "none — the plan carries no Created date, so every plan's rows naming this phase id match"


def phase_section(text: str, phase_id: str) -> str:
    m = re.search(r"### Phase %s\b.*?(?=\n### Phase |\n## |\Z)" % re.escape(phase_id), text, re.S)
    return m.group(0) if m else ""


_RECORD = re.compile(r"^\s*-\s*\*\*(Cases|Reach|Class|Proof|Searched):\*\*\s*(.+)$", re.M)


def phase_records(section: str) -> dict:
    return {m.group(1).lower(): m.group(2).strip() for m in _RECORD.finditer(section)}


# ── PENDING ────────────────────────────────────────────────────────────────────
def pending_rows(text: str) -> tuple[list[dict], list[str]]:
    hdr, rows = _table(text, "Finding")
    if not hdr:
        return [], hdr
    ci = {"id": _col(hdr, "#", "ID"), "finding": _col(hdr, "Finding"), "file": _col(hdr, "File"), "priority": _col(hdr, "Priority", "Severity"),
          "status": _col(hdr, "Status"), "times": _col(hdr, "Times Deferred", "TD"), "date": _col(hdr, "Date"), "source": _col(hdr, "Source", "Gate"),
          "verified": _col(hdr, "Verified")}
    lines = text.splitlines()
    out = []
    for cells, ln in rows:
        rid = _at(cells, ci["id"]).strip("*` ")
        if not rid or set(rid) <= set("-: "):
            continue
        status = _at(cells, ci["status"])
        closed = any(status.upper().startswith(t) for t in CLOSERS)
        nxt = lines[ln + 1] if ln + 1 < len(lines) else ""
        num = re.sub(r"^[#P]+", "", rid)
        if re.match(r"\s*<!--\s*(?:#|P)?%s\b.*(resolved|closed|won'?t-do|superseded)" % re.escape(num), nxt, re.I):
            closed = True
        out.append({"id": rid, "finding": _at(cells, ci["finding"])[:120], "file": _at(cells, ci["file"]), "priority": _at(cells, ci["priority"]),
                    "status": status, "times_deferred": _at(cells, ci["times"]), "date": _at(cells, ci["date"]), "source": _at(cells, ci["source"]),
                    "verified": _at(cells, ci["verified"]), "open": not closed, "line": ln + 1})
    return out, hdr


# ── LEDGER ─────────────────────────────────────────────────────────────────────
_LED_ROW = re.compile(r"^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*[A-Z][A-Z-]{1,}\s*\|")
_LED_CANON = ["Date", "Entry", "Theme / scope", "Commits", "Gates / results"]


def _ledger_headerless(text: str) -> tuple[list[dict], list[str]]:
    """A twin (gastify) keeps 100+ thin-index rows with NO `| Date | Entry |` header/separator — a legacy
    LEDGER whose header got separated. Rather than lose them (honest-empty) or fabricate a header from prose
    (the old first-keyword bug, K3), parse ONLY lines matching the exact thin-index shape (a date, then an
    ALLCAPS entry tag) with the canonical 5-column order. Newest-first is enforced by ledger_rows' sort."""
    lines = text.splitlines()
    rows = [(_cells(l), i) for i, l in enumerate(lines) if _LED_ROW.match(l)]
    if not rows:
        return [], []
    return ([{"date": _at(cells, 0), "entry": _at(cells, 1), "theme": _at(cells, 2),
              "commits": _at(cells, 3), "gates": _at(cells, 4), "line": ln + 1, "headerless": True}
             for cells, ln in rows], _LED_CANON)


def ledger_rows(text: str, n: int = 5) -> tuple[list[dict], list[str]]:
    hdr, rows = _table(text, "Entry")
    if not hdr:
        out, hdr = _ledger_headerless(text)              # gastify: headerless legacy thin-index
    else:
        ci = {"date": _col(hdr, "Date"), "entry": _col(hdr, "Entry"), "theme": _col(hdr, "Theme"), "commits": _col(hdr, "Commits"), "gates": _col(hdr, "Gates")}
        out = [{k: _at(cells, v) for k, v in ci.items()} | {"line": ln + 1} for cells, ln in rows]
    # newest-first by the Date cell (K4: twins disagree on append order — some newest-at-top, some at-bottom).
    # Stable: same-date rows keep file order; an unparsable date sinks to the end.
    out.sort(key=lambda r: (r.get("date") or "0000", r["line"]), reverse=True)
    return out[:n], hdr
    return out, hdr


# ── BEHAVIOR ───────────────────────────────────────────────────────────────────
def verify_commands_section(text: str) -> dict:
    m = re.search(r"## Verify Commands\s*\n(.*?)(?=\n## |\Z)", text, re.S)
    if not m:
        return {}
    out, results = {}, []
    for ln in m.group(1).splitlines():
        mm = re.match(r"\s*-\s*(lint|types|typecheck|tests?|results_out)\s*:\s*(.*)$", ln.strip(), re.I)
        if mm:
            key = mm.group(1).lower().rstrip("s") if mm.group(1).lower() in ("tests", "test") else mm.group(1).lower()
            key = {"typecheck": "types", "test": "tests"}.get(key, key)
            val = mm.group(2).strip()
            if key == "results_out":
                results += [v.strip(" `") for v in re.split(r"[·,]", val) if v.strip(" `")]
            else:
                out[key] = [c.strip() for c in re.findall(r"`([^`]+)`", val)] or ([val] if val else [])
        elif results is not None and re.match(r"\s*-\s*`?[^`\s]+\.(xml|json)`?", ln):
            results.append(ln.strip(" -`"))
    if results:
        out["results_out"] = results
    return out


def behavior_facts(text: str) -> dict:
    out = {}
    for key, rx in (("maturity", r"\*{0,2}Maturity:?\*{0,2}\s*[:|]?\s*`?([a-z-]+)"), ("mode", r"\*{0,2}Mode:?\*{0,2}\s*[:|]?\s*`?([a-z-]+)"),
                    ("project_type", r"\*{0,2}Project[ _]type:?\*{0,2}\s*[:|]?\s*`?([a-z-]+)")):
        m = re.search(rx, text, re.I)
        if m:
            out[key] = m.group(1)
    return out


# ── tools ──────────────────────────────────────────────────────────────────────
def t_kdbp_snapshot(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    out = {"present": True, "root": root, "root_source": source}
    rc, br, _ = mq.sh(["git", "-C", root, "branch", "--show-current"])
    g = {"branch": br.strip() if rc == 0 else None}
    rc, ab, _ = mq.sh(["git", "-C", root, "rev-list", "--left-right", "--count", "@{upstream}...HEAD"])
    if rc == 0 and ab.strip():
        behind, ahead = ab.split()
        g["ahead"], g["behind"] = int(ahead), int(behind)
    else:
        g["upstream"] = "none"
    rc, st, _ = mq.sh(["git", "-C", root, "status", "--porcelain"])
    if rc == 0:
        ls = st.splitlines()
        g["dirty"] = {"modified": sum(1 for l in ls if l[:2].strip() in ("M", "AM", "MM")), "untracked": sum(1 for l in ls if l.startswith("??")), "total": len(ls)}
    rc, lg, _ = mq.sh(["git", "-C", root, "log", "-8", "--format=%h %s"])
    g["recent_commits"] = [l[:100] for l in lg.splitlines()] if rc == 0 else []
    out["git"] = g
    pj = plan_json(kd)
    pm = _read(kd, "PLAN.md") or ""
    rows = plan_rows(pm)
    out["plan"] = {"present": bool(pm or pj), "status": (pj or {}).get("status"), "current_phase": (pj or {}).get("current_phase"),
                   "goal": ((pj or {}).get("goal") or "")[:200], "phases": [{"id": r["id"], "name": r["name"][:60], "cells": {k: _state(v) for k, v in r["cells"].items()}} for r in rows[:CAP]],
                   "phases_note": ("+%d more" % (len(rows) - CAP)) if len(rows) > CAP else None,
                   "mirror": "PLAN.json present" if pj else "no PLAN.json mirror"}
    pend = _read(kd, "PENDING.md")
    if pend is None:
        out["pending"] = {"reason": "no PENDING.md"}
    else:
        prow, hdr = pending_rows(pend)
        op = [r for r in prow if r["open"]]
        def prio(r):
            p = r["priority"].lower()
            return (0 if "crit" in p else 1 if "high" in p else 2 if "med" in p else 3, -int(re.sub(r"\D", "", r["times_deferred"] or "0") or 0))
        op.sort(key=prio)
        out["pending"] = {"open": len(op), "closed": len(prow) - len(op), "columns": hdr,
                          "top": [{k: r[k] for k in ("id", "finding", "file", "priority", "times_deferred")} for r in op[:10]],
                          "note": "closure = Status verdict token or a `<!-- P<n> resolved -->` comment; archive rows not counted here"}
    led = _read(kd, "LEDGER.md")
    out["ledger"] = {"last": ledger_rows(led, 5)[0]} if led else {"reason": "no LEDGER.md"}
    dec = _read(kd, "DECISIONS.md")
    out["decisions"] = {"rows": len([l for l in dec.splitlines() if l.startswith("|") and not l.startswith("|--") and "| #" not in l and "| ID" not in l]) if dec else None,
                        "reason": None if dec else "no DECISIONS.md"}
    out["files"] = sorted(p.name for p in kd.iterdir() if p.is_file())[:CAP]
    return out


def t_phase_context(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    pj = plan_json(kd)
    pm = _read(kd, "PLAN.md") or ""
    rows = plan_rows(pm)
    pid = (args.get("phase") or (pj or {}).get("current_phase") or (rows[0]["id"] if rows else "")).strip()
    out = {"present": True, "root": root, "root_source": source, "phase": pid, "warnings": []}
    if not pid:
        out["warnings"].append("no active plan — PLAN.json has no current_phase and PLAN.md has no phase table")
        return out
    rec = next((p for p in (pj or {}).get("phases") or [] if p.get("id") == pid), None)
    row = next((r for r in rows if r["id"] == pid), None)
    out["plan_json"] = {k: rec.get(k) for k in ("id", "name", "tier", "complexity", "types", "cells", "proof", "proof_type", "cases", "scope", "entities") if rec and k in rec} if rec else {"reason": "phase %s not in PLAN.json" % pid}
    out["plan_md_row"] = {"cells": {k: _state(v) for k, v in row["cells"].items()}, "raw": row["cells"], "line": row["line"]} if row else {"reason": "phase %s not in the PLAN.md table" % pid}
    sec = phase_section(pm, pid)
    out["records"] = phase_records(sec) if sec else {}
    out["details_excerpt"] = sec[:2000] if sec else None
    if row and "red" in row["cells"] and _state(row["cells"]["red"]) == "todo" and "skip" not in row["cells"]["red"].lower():
        out["warnings"].append("Red is unstarted for %s — /gabe-red declares cases before any source edit (red-entry-guard warns on writes)" % pid)
    if row and _state(row["cells"].get("exec", "")) == "done":
        out["warnings"].append("Exec is already ✅ for %s" % pid)
    beh = _read(kd, "BEHAVIOR.md") or ""
    out["behavior"] = behavior_facts(beh) | {"verify_commands": verify_commands_section(beh) or {"reason": "no ## Verify Commands section"}}
    scope = (rec or {}).get("scope") or []
    pend = _read(kd, "PENDING.md")
    if pend and scope:
        prow, _ = pending_rows(pend)
        hits = [r for r in prow if r["open"] and any(fnmatch.fnmatch(r["file"], g) or r["file"] == g or r["file"].startswith(g.rstrip("*")) for g in scope)]
        out["pending_in_scope"] = [{k: r[k] for k in ("id", "finding", "file", "priority")} for r in hits[:CAP]]
    else:
        out["pending_in_scope"] = {"reason": "no PENDING.md" if not pend else "phase declares no scope"}
    ents = (rec or {}).get("entities") or []
    if ents:
        try:
            import tools as map_tools  # gabe-map's bodies (same skills dir)
            out["entities"] = {}
            for slug in ents[:8]:
                r = map_tools.call("entity_context", {"slug": slug, "detail": "brief", "root": root}, roots)[0]
                out["entities"][slug] = r.get("entity") or r.get("stop") or r.get("reason")
        except Exception as exc:  # gabe-map unavailable → say so
            out["entities"] = {"reason": "gabe-map entity_context unavailable: %s" % exc}
    else:
        out["entities"] = {"reason": "phase declares no entities (PLAN.json entities: [])"}
        out["warnings"].append("no declared entities — context A cannot be assembled; owner_of on the scope globs is the fallback")
    return out


COMMIT_ENTRIES = {"RED", "EXEC", "COMMIT"}


def t_review_target(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    pm = _read(kd, "PLAN.md") or ""
    rows = plan_rows(pm)
    want = (args.get("phase") or "").strip()
    cand = [r for r in rows if (r["id"] == want if want else (_state(r["cells"].get("review", "")) == "todo" and _state(r["cells"].get("exec", "")) in ("done", "active")))]
    out = {"present": True, "root": root, "root_source": source}
    if not cand:
        out.update({"target": None, "reason": "no PLAN row with Review ⬜ and Exec ∈ {✅, 🔄}" + (" matching %s" % want if want else ""),
                    "fallback": "git diff HEAD (uncommitted work) — the spec's fallback when no KDBP context resolves"})
        rc, names, _ = mq.sh(["git", "-C", root, "diff", "--name-only", "HEAD"])
        out["changed_files"] = sorted(l.strip() for l in names.splitlines() if l.strip())[:CAP] if rc == 0 else []
        out["base"] = "HEAD"
        return out
    r = cand[0]
    led = _read(kd, "LEDGER.md") or ""
    lrows, _ = ledger_rows(led, 400)
    pid_rx = re.compile(r"(Phase|phase:?)\s*%s\b" % re.escape(r["id"]))
    floor, floor_src = plan_floor(kd)
    shas: list[str] = []
    skipped = {"before_floor": 0, "not_a_commit_entry": 0}
    for lr in lrows:
        if not (pid_rx.search(lr.get("theme", "") or "") or pid_rx.search(lr.get("entry", "") or "")):
            continue
        date = (lr.get("date") or "").strip()
        if floor and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date) and date < floor:
            skipped["before_floor"] += 1          # an earlier plan's phase of the same id
            continue
        etype = (re.match(r"[A-Za-z]+", (lr.get("entry") or "").strip()) or [""])[0].upper()
        if etype and etype not in COMMIT_ENTRIES:
            skipped["not_a_commit_entry"] += 1    # HANDOFF/PLAN/PUSH/… rows cite bookkeeping shas, not the phase's work
            continue
        shas += re.findall(r"\b[0-9a-f]{7,40}\b", lr.get("commits", "") or "")
    files, resolved = set(), []
    for sha in dict.fromkeys(shas):
        rc, o, _ = mq.sh(["git", "-C", root, "show", "--name-status", "--format=", sha])
        if rc != 0:
            continue
        resolved.append(sha)
        for l in o.splitlines():
            parts = l.split("\t")
            if len(parts) >= 2 and parts[0][:1] in ("A", "M", "R", "C"):
                files.add(parts[-1])
    base = None
    if resolved:
        def _depth(sha):                       # topological position: fewer ancestors = earlier
            rc, n, _ = mq.sh(["git", "-C", root, "rev-list", "--count", sha])
            return int(n.strip()) if rc == 0 and n.strip().isdigit() else 10**9
        earliest = min(resolved, key=_depth)
        rc, b, _ = mq.sh(["git", "-C", root, "rev-parse", "--short", "%s^" % earliest])
        base = b.strip() if rc == 0 else None
    if not files:
        rc, names, _ = mq.sh(["git", "-C", root, "diff", "--name-only", "HEAD"])
        files = {l.strip() for l in names.splitlines() if l.strip()} if rc == 0 else set()
        base, src = "HEAD", "git diff HEAD (no LEDGER rows resolved for the phase)"
    else:
        src = "LEDGER rows for phase %s → %d commit(s)" % (r["id"], len(resolved))
    out.update({"target": {"phase": r["id"], "name": r["name"], "cells": {k: _state(v) for k, v in r["cells"].items()}},
                "floor": floor, "floor_source": floor_src, "skipped_rows": skipped,
                "commits": resolved[:CAP], "base": base, "changed_files": sorted(files)[:CAP], "changed_more": max(0, len(files) - CAP), "source": src,
                "banner": "REVIEW · Phase %s — %s" % (r["id"], r["name"])})
    return out


def t_next_beat(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    script = os.path.join(SKILLS_DIR, "gabe-next", "scripts", "next.mjs")
    out = {"present": True, "root": root, "root_source": source}
    if not os.path.isfile(script):
        out["reason"] = "gabe-next's next.mjs not installed beside gabe-kdbp"
        return out
    rc, o, err = mq.sh(["node", script, "--json"], cwd=root, timeout=30)
    out["exit"] = rc
    try:
        out["decision"] = json.loads(o.strip().splitlines()[-1]) if o.strip() else None
    except json.JSONDecodeError:
        out["decision"], out["raw"] = None, o[:600]
    out["meaning"] = {0: "decision printed", 1: "no decision (see decision.reason)", 2: "PLAN.json unusable (mirror refused)", 127: "node not found"}.get(rc, "unexpected exit")
    if err.strip():
        out["stderr"] = err.strip()[:300]
    return out


def t_verify_commands(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    out = {"present": True, "root": root, "root_source": source, "probed": False,
           "note": "commands are RESOLVED, never run here — the gate runs them (gate-spec Step 2.0); a checker that cannot fail is non-evidence"}
    beh = _read(kd, "BEHAVIOR.md") or ""
    a = verify_commands_section(beh)
    if a:
        out.update({"source": "a: BEHAVIOR.md ## Verify Commands", "commands": a})
        return out
    cands: dict = {}
    pk = Path(root) / "package.json"
    if pk.is_file():
        try:
            scripts = (json.loads(pk.read_text(encoding="utf-8")).get("scripts") or {})
            for k in ("lint", "typecheck", "type-check", "tsc", "test", "test:unit"):
                if k in scripts:
                    cands.setdefault({"typecheck": "types", "type-check": "types", "tsc": "types", "test": "tests", "test:unit": "tests"}.get(k, k), []).append("npm run %s" % k)
        except json.JSONDecodeError:
            pass
    for sub in ("apps/web", "apps/api", "web", "api"):
        p2 = Path(root) / sub / "package.json"
        if p2.is_file():
            try:
                scripts = (json.loads(p2.read_text(encoding="utf-8")).get("scripts") or {})
                for k in ("lint", "typecheck", "test"):
                    if k in scripts:
                        cands.setdefault({"typecheck": "types", "test": "tests"}.get(k, k), []).append("cd %s && npm run %s" % (sub, k))
            except json.JSONDecodeError:
                pass
    for py in (Path(root) / "pyproject.toml", Path(root) / "apps/api/pyproject.toml"):
        if py.is_file():
            t = py.read_text(encoding="utf-8", errors="replace")
            if "pytest" in t:
                cands.setdefault("tests", []).append(("cd %s && " % py.parent.relative_to(root) if py.parent != Path(root) else "") + "pytest")
            if "ruff" in t:
                cands.setdefault("lint", []).append("ruff check .")
    mk = Path(root) / "Makefile"
    if mk.is_file():
        for tgt in re.findall(r"^([a-zA-Z_-]+):", mk.read_text(encoding="utf-8", errors="replace"), re.M):
            if tgt in ("lint", "test", "tests", "typecheck", "types"):
                cands.setdefault({"test": "tests", "typecheck": "types"}.get(tgt, tgt), []).append("make %s" % tgt)
    out.update({"source": "b: package.json / pyproject / Makefile (candidates — not yet bound)" if cands else "none: no BEHAVIOR binding and no manifests found",
                "commands": cands or {"reason": "nothing resolvable — bind ## Verify Commands in .kdbp/BEHAVIOR.md"},
                "offer": "write the chosen binding into .kdbp/BEHAVIOR.md ## Verify Commands so it is never re-derived" if cands else None})
    return out


def t_pending_row_preview(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    flag = args.get("flag") or {}
    if not isinstance(flag, dict) or not flag.get("description"):
        raise mq.MapStop("flag must be an object with at least description (and ideally dimension, entity, severity, fix, source, file)")
    pend = _read(kd, "PENDING.md")
    rows, hdr = pending_rows(pend) if pend else ([], [])
    ids = [int(re.sub(r"\D", "", r["id"]) or 0) for r in rows]
    arch = kd / "archive"
    if arch.is_dir():
        for f in arch.glob("PENDING-resolved*.md"):
            for r in pending_rows(f.read_text(encoding="utf-8", errors="replace"))[0]:
                ids.append(int(re.sub(r"\D", "", r["id"]) or 0))
    next_id = (max(ids) + 1) if ids else 1
    rc, sha, _ = mq.sh(["git", "-C", root, "rev-parse", "--short", "HEAD"])
    today = _dt.date.today().isoformat()
    canon = ["#", "Date", "Source", "Finding", "File", "Scale", "Priority", "Impact", "Times Deferred", "Status", "Verified"]
    cols = hdr or canon
    # the file's own id style: the prefix most of its rows carry (#N · PN · DN · bare N); P for an empty file
    prefs = [m.group(1) for m in (re.match(r"^([A-Za-z#]*)\d", r["id"]) for r in rows) if m]
    prefix = max(dict.fromkeys(prefs), key=prefs.count) if prefs else "P"
    vals = {"#": "%s%d" % (prefix, next_id), "Date": today,
            "Source": str(flag.get("source") or flag.get("dimension") or "review"), "Gate": str(flag.get("source") or "review"),
            "Finding": "[%s] %s" % (flag.get("dimension") or "finding", flag["description"]) if flag.get("dimension") else str(flag["description"]),
            "File": str(flag.get("file") or ""), "Scale": str(flag.get("scale") or ""), "Priority": str(flag.get("severity") or flag.get("priority") or "medium"),
            "Impact": str(flag.get("impact") or flag.get("fix") or ""), "Times Deferred": "1", "Status": "", "Verified": "@%s %s" % (sha.strip(), today) if rc == 0 else today}
    row = "| " + " | ".join(vals.get(c, "") for c in cols) + " |"
    recurring = [r["id"] for r in rows if r["open"] and flag.get("file") and r["file"] == flag.get("file")
                 and len(set(re.findall(r"[a-zA-Z0-9]{3,}", r["finding"].lower())) & set(re.findall(r"[a-zA-Z0-9]{3,}", str(flag["description"]).lower()))) >= 3]
    disp = Path(root) / "scripts" / "disposition.py"
    return {"present": True, "root": root, "root_source": source, "preview": True, "writes": "nothing — paste the row under the header, newest first",
            "row": row, "columns": cols, "next_id": next_id, "recurring_candidates": recurring[:5],
            "recurring_note": "same File + overlapping Finding → bump Times Deferred on the existing row instead (disposition.py's rule)" if recurring else None,
            "writer": ("scripts/disposition.py --defer exists in this project — the sanctioned deterministic writer" if disp.is_file() else "no scripts/disposition.py here; the row is authored by hand")}


def t_ledger_row_preview(args: dict, roots) -> dict:
    root, source, kd = _ctx(args, roots)
    if not kd:
        return _absent(root, source)
    entry = (args.get("entry") or "").strip().upper()
    if entry not in ("PLAN", "RED", "EXEC", "REVIEW", "COMMIT", "PUSH", "CENTER", "HANDOFF", "SCOPE", "ASSESS"):
        raise mq.MapStop("entry must be one of PLAN RED EXEC REVIEW COMMIT PUSH CENTER HANDOFF SCOPE ASSESS")
    theme = (args.get("theme") or "").strip()
    if not theme:
        raise mq.MapStop("theme is required (the 'Theme / scope' cell)")
    led = _read(kd, "LEDGER.md") or ""
    _, hdr = ledger_rows(led, 1)
    cols = hdr or ["Date", "Entry", "Theme / scope", "Commits", "Gates / results"]
    vals = {"Date": _dt.date.today().isoformat(), "Entry": entry, "Theme / scope": theme, "Theme": theme,
            "Commits": (args.get("commits") or "—").strip(), "Gates / results": (args.get("gates") or "").strip(), "Gates": (args.get("gates") or "").strip()}
    row = "| " + " | ".join(next((vals[k] for k in vals if k.lower() in c.lower()), "") for c in cols) + " |"
    return {"present": True, "root": root, "root_source": source, "preview": True, "writes": "nothing — insert directly under the header (newest first)",
            "row": row, "columns": cols, "gates_note": "the Gates cell is copied verbatim, never composed",
            "header_found": bool(hdr), "reason": None if hdr else "no LEDGER table header found — the canonical 5 columns are assumed"}


# ── registry ───────────────────────────────────────────────────────────────────
def _schema(props: dict, required: list[str] | None = None) -> dict:
    s = {"type": "object", "properties": props, "additionalProperties": False}
    if required:
        s["required"] = required
    return s


ROOT_PROP = {"root": {"type": "string", "description": "Project root (defaults to the session's project; normalized to the git toplevel)."}}
RO = {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False}

TOOLS = [
    {"name": "kdbp_snapshot", "fn": t_kdbp_snapshot, "annotations": RO,
     "description": "Where does this project stand: git branch/ahead/behind/dirty, PLAN current phase + table states, PENDING open rows (top 10), last LEDGER rows, DECISIONS count — under 1k tokens instead of ~60k of files.",
     "inputSchema": _schema({**ROOT_PROP})},
    {"name": "phase_context", "fn": t_phase_context, "annotations": RO,
     "description": "Execute's preflight for one phase: PLAN.json record + PLAN.md row states, Cases:/Reach: records, Verify Commands, PENDING rows in scope, declared entities' briefs (via gabe-map), warnings (Red unstarted…).",
     "inputSchema": _schema({"phase": {"type": "string", "description": "Phase id (default: PLAN.json current_phase)."}, **ROOT_PROP})},
    {"name": "review_target", "fn": t_review_target, "annotations": RO,
     "description": "What is pending review: the PLAN row with Review ⬜ and Exec ✅/🔄, its LEDGER commits → changed files + a base ref; git-diff fallback when no KDBP context resolves.",
     "inputSchema": _schema({"phase": {"type": "string", "description": "Force a phase id."}, **ROOT_PROP})},
    {"name": "next_beat", "fn": t_next_beat, "annotations": RO,
     "description": "The lifecycle router's decision (gabe-next's next.mjs --json): which beat is next, why, and the NOW/NEXT lines — exit codes mapped to fields.",
     "inputSchema": _schema({**ROOT_PROP})},
    {"name": "verify_commands", "fn": t_verify_commands, "annotations": RO,
     "description": "The lint/types/tests commands the gate should run: BEHAVIOR.md ## Verify Commands first, else candidates from package.json/pyproject/Makefile — resolved, never run, never a guessed reporter flag.",
     "inputSchema": _schema({**ROOT_PROP})},
    {"name": "pending_row_preview", "fn": t_pending_row_preview, "annotations": RO,
     "description": "PREVIEW a PENDING.md deferral row in this file's own column order with the next id in its own prefix (#N · PN · DN) and Verified anchor; flags recurring rows. Writes nothing — you paste it.",
     "inputSchema": _schema({"flag": {"type": "object", "description": "{dimension, entity, severity, description, fix, source, file}", "additionalProperties": True}, **ROOT_PROP}, ["flag"])},
    {"name": "ledger_row_preview", "fn": t_ledger_row_preview, "annotations": RO,
     "description": "PREVIEW a LEDGER.md row (Date · Entry · Theme · Commits · Gates verbatim) in this file's header order. Writes nothing — you insert it newest-first.",
     "inputSchema": _schema({"entry": {"type": "string", "description": "PLAN · RED · EXEC · REVIEW · COMMIT · PUSH · CENTER · HANDOFF"}, "theme": {"type": "string"},
                             "commits": {"type": "string"}, "gates": {"type": "string", "description": "Copied verbatim into the Gates / results cell."}, **ROOT_PROP}, ["entry", "theme"])},
]
BY_NAME = {t["name"]: t for t in TOOLS}

INSTRUCTIONS = """gabe-kdbp: the project's .kdbp/ lifecycle state as read-only tools (siblings of gabe-map; PREVIEW tools write nothing).
When a project has .kdbp/, ask these BEFORE re-reading PLAN/PENDING/LEDGER by hand:
- where does the project stand (branch, phase table, open debt, last beats) → mcp__gabe-kdbp__kdbp_snapshot
- everything execute needs for the current phase (record, Cases/Reach, verify commands, scope debt, entities) → mcp__gabe-kdbp__phase_context
- what is pending review + its changed files and base → mcp__gabe-kdbp__review_target
- which beat is next → mcp__gabe-kdbp__next_beat · which lint/types/tests commands bind → mcp__gabe-kdbp__verify_commands
- the exact PENDING / LEDGER row to paste → mcp__gabe-kdbp__pending_row_preview · mcp__gabe-kdbp__ledger_row_preview (previews only)
Writes to .kdbp stay on the harness's Write/Edit so the lie-block hooks see them. No .kdbp → the tools say so."""


def call(name: str, args: dict, roots: list[str] | None) -> tuple[dict, bool]:
    t = BY_NAME.get(name)
    if not t:
        raise KeyError(name)
    try:
        return t["fn"](args or {}, roots), False
    except mq.MapStop as exc:
        return {"stop": str(exc), "tool": name}, True
