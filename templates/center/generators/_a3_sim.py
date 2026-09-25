"""_a3_sim.py — derive the change-simulation projection (``window.GABE_SIM``) LIVE.

The Gabe Universe (the codebase-graph station until 2026-09-10) overlays a change-in-flight on the C4 graph. Until now
that projection was hand-authored (the committed example) and a real twin was
honest-empty. This module DERIVES the base shape twin-neutrally from data the
center already has, so a real change in flight lights the station up — or, at rest,
stays honest-empty.

INPUTS (all committed/derived center data or plain git — no project hardcoding):
  inflight : docs/site/center/inflight.json  (write-inflight.py) — active? · touched
             entity slugs · head · last_commit · work_source · phase.cases
  archmap  : docs/site/center/archmap.json — models (cls/file/table/cols/fks) + endpoints
  git      : numstat of the working change (dirty → vs HEAD · a sha → that commit)
  junit    : tests/results/*-junit.xml.digest.json — evidence (optional)
  PENDING  : .kdbp/PENDING.md — review findings on the changed files (optional)

HONEST PROVENANCE — DERIVED vs left EMPTY (the station degrades per-field):
  DERIVED : touched · blast · blast_edges (FK reverse — FK-ONLY BY DESIGN: this
            module builds its graph with graft=None; call-aware blast is a
            deliberate future decision, graft phase 2) · pieces (a touched entity's CHANGED models, by file · a blast
            entity's models whose FK points into the change) · Execute {changed,add,
            del} (git numstat, FILE-level attribution — stated) · Commit meta (git
            totals + head/subject) · Red {tested,cases} (the phase's declared cases)
            · Review {touched_again,risk,why} (PENDING rows on the changed files) ·
            evidence (junit).
  EMPTY   : the CURATED NARRATIVE the example hand-authors — the red assertion prose,
            `guards`, execute `effect`/`action`, review free-text beyond the PENDING
            title, `use_case`, and service-fn attribution (the service layer is not in
            the archmap). A future authoring layer can fill these; the machine won't
            invent them.

DETERMINISM: byte-identical on an unchanged tree — no wallclock, sorted keys, git
numbers are a function of (tree, head). sim.data.js is a regen-time projection (the
build writes it; the beat tail never does), gitignored like inflight.{json,js}; the build
seeds ``window.GABE_SIM = null`` when there is no change in flight.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

import _a3_graph  # sibling — built here with graft=None: blast stays FK-only by design


def _sh(args: list[str], cwd: Path) -> str:
    try:
        p = subprocess.run(args, cwd=str(cwd), capture_output=True, text=True, timeout=30)
        return p.stdout if p.returncode == 0 else ""
    except Exception:  # noqa: BLE001
        return ""


def _ok(args: list[str], cwd: Path) -> bool:
    try:
        return subprocess.run(args, cwd=str(cwd), capture_output=True, timeout=30).returncode == 0
    except Exception:  # noqa: BLE001
        return False


def _unrename(path: str) -> str:
    """git numstat renders a rename as `dir/{old => new}` or `old => new` → post-rename path."""
    if "=>" not in path:
        return path
    m = re.match(r"^(.*)\{.* => (.*)\}(.*)$", path)     # dir/{old => new}/tail
    if m:
        return (m.group(1) + m.group(2) + m.group(3)).replace("//", "/")
    m = re.match(r"^.* => (.*)$", path)                  # old => new
    return m.group(1) if m else path


def _file_lines(root: Path, path: str) -> int:
    f = root / path
    if not f.is_file():
        return 0
    return len(f.read_text(encoding="utf-8", errors="ignore").splitlines())


def _numstat(root: Path, ws: str | None) -> list[tuple[int, int, str]]:
    """`(add, del, path)` per changed file (post-rename path). dirty → working tree vs
    HEAD PLUS untracked/born-new files (whole file added); a short sha → that commit."""
    rows: list[tuple[int, int, str]] = []

    def _parse(out: str) -> None:
        for line in out.splitlines():
            parts = line.split("\t")
            if len(parts) == 3:
                a, d, path = parts
                rows.append((int(a) if a.isdigit() else 0,
                             int(d) if d.isdigit() else 0, _unrename(path)))

    if ws == "dirty":
        _parse(_sh(["git", "diff", "--numstat", "HEAD"], root))
        for path in _sh(["git", "ls-files", "--others", "--exclude-standard"], root).splitlines():
            path = path.strip()
            if path:
                rows.append((_file_lines(root, path), 0, path))    # born-new: whole file added
    elif ws and ws not in ("none", ""):
        _parse(_sh(["git", "show", "--numstat", "--format=", ws], root))
    return rows


def _changed_new_lines(root: Path, ws: str | None, path: str) -> set[int]:
    """NEW-side line numbers changed in `path`. A born-new file (untracked in dirty, or
    added-in-commit via the @@ -0,0 hunk) → every line; a pure-deletion marker adds none."""
    if ws == "dirty":
        if not _ok(["git", "cat-file", "-e", f"HEAD:{path}"], root):   # untracked → all new
            return set(range(1, _file_lines(root, path) + 1))
        diff = _sh(["git", "diff", "-U0", "HEAD", "--", path], root)
    elif ws and ws not in ("none", ""):
        diff = _sh(["git", "show", "-U0", "--format=", ws, "--", path], root)
    else:
        diff = ""
    out: set[int] = set()
    for h in re.finditer(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", diff, re.M):
        count = int(h.group(2)) if h.group(2) is not None else 1
        if count == 0:                       # `+c,0` — a pure deletion, no new lines
            continue
        start = int(h.group(1))
        for i in range(start, start + count):
            out.add(i)
    return out


def _class_ranges(root: Path, ws: str | None, path: str) -> dict[str, tuple[int, int]]:
    """{class: (start,end)} of the NEW file content — python only (ast). Empty on a
    non-python file or a parse error → the caller falls back to file-level."""
    if not path.endswith(".py"):
        return {}
    if ws == "dirty":
        src = ((root / path).read_text(encoding="utf-8", errors="ignore")
               if (root / path).is_file() else "")
    elif ws and ws not in ("none", ""):
        src = _sh(["git", "show", f"{ws}:{path}"], root)
    else:
        src = ""
    ranges: dict[str, tuple[int, int]] = {}
    try:
        import ast
        for node in ast.walk(ast.parse(src)):
            if isinstance(node, ast.ClassDef):
                ranges[node.name] = (node.lineno, getattr(node, "end_lineno", node.lineno))
    except Exception:  # noqa: BLE001
        return {}
    return ranges


def _entities(amap: dict) -> dict:
    return {s: e for s, e in (amap.get("entities") or {}).items() if e}


def _models(ent: dict) -> list[dict]:
    return ent.get("models", []) or []


def _pending_findings(pending: str, changed_files: set[str]) -> dict[str, dict]:
    """Loose parse of .kdbp/PENDING.md → {changed_file: {risk, title}} for rows that
    cite one of the changed files. Report-only heuristic — a row that names a changed
    file and a P(<risk>) marker becomes that file's review finding. Best-effort."""
    out: dict[str, dict] = {}
    if not pending:
        return out
    risk_rx = re.compile(r"P\(?\s*(high|medium|low)\s*\)?", re.I)
    # split into blocks on markdown headings / list bullets
    for block in re.split(r"\n(?=#{1,6}\s|[-*]\s|\|\s*#?\d)", pending):
        # cite on path-token boundaries — a bare substring would let a changed file
        # match a longer path that merely contains it.
        cited = [f for f in changed_files
                 if re.search(r"(?<![\w/.\-])" + re.escape(f) + r"(?![\w/.\-])", block)]
        if not cited:
            continue
        rm = risk_rx.search(block)
        risk = rm.group(1).lower() if rm else "medium"
        # title = the first non-empty line, trimmed of markdown furniture
        title = ""
        for ln in block.strip().splitlines():
            t = ln.strip().lstrip("#-*| ").strip()
            if t:
                title = t[:120]
                break
        for f in cited:
            out.setdefault(f, {"risk": risk, "title": title})
    return out


def build_sim(inflight: dict | None, amap: dict, root: Path,
              evidence: dict | None = None, pending: str | None = None) -> dict | None:
    """Derive the GABE_SIM dict, or ``None`` when there is no change in flight
    (honest-empty). Deterministic: a pure function of (inflight, archmap, tree)."""
    if not inflight or not inflight.get("active"):
        return None
    touched = sorted(set(inflight.get("touched") or []))
    if not touched:
        return None
    tset = set(touched)
    ents = _entities(amap)

    # ── blast radius: entities whose FK points INTO a touched entity (source=
    #    dependent → target=depended). graft=None on purpose: FK-only blast. ──
    edges = _a3_graph.build_c4_graph(amap)["l1"]["edges"]
    blast, blast_edges = set(), []
    for e in edges:
        if e["target"] in tset and e["source"] not in tset:
            blast.add(e["source"])
            blast_edges.append({"from": e["source"], "to": e["target"],
                                "kinds": e.get("kinds", {"fk": e.get("weight", 1)})})
    blast = sorted(blast)
    blast_edges.sort(key=lambda x: (x["from"], x["to"]))

    # ── changed files + per-file line counts ──
    ws = inflight.get("work_source")
    rows = _numstat(root, ws)
    add_by_file = {p: a for (a, d, p) in rows}
    del_by_file = {p: d for (a, d, p) in rows}
    changed_files = set(add_by_file)

    # table → owning touched slug (for the FK coupling)
    touched_tables = {m["table"]: s for s in touched for m in _models(ents.get(s, {}))
                      if m.get("table")}

    # ── pieces — CLASS-level attribution: a model is "changed" only if its own class
    #    lines changed (python via ast hunks), not merely because a neighbour in the
    #    same file did; non-python models fall back to file-level. ──
    _nl_cache: dict[str, set[int]] = {}
    _rg_cache: dict[str, dict[str, tuple[int, int]]] = {}

    def _model_add(m: dict, cls: str) -> int | None:
        """lines this model's CLASS gained, or None if it did not change."""
        f = m.get("file")
        if f not in changed_files:
            return None
        rng = _rg_cache.setdefault(f, _class_ranges(root, ws, f)).get(cls)
        if not rng:                                   # non-python / no ast → file-level
            return add_by_file.get(f, 0)
        nl = _nl_cache.setdefault(f, _changed_new_lines(root, ws, f))
        hit = sum(1 for ln in nl if rng[0] <= ln <= rng[1])
        return hit if hit else None

    pieces: dict[str, list] = {}
    changed_model: dict[str, dict[str, dict]] = {}   # slug -> {pid: {"m", "add"}}
    for s in touched:
        ps, cm = [], {}
        for m in _models(ents.get(s, {})):
            cls = m.get("cls")
            if not cls:                # a malformed model row degrades, never blanks the sim
                continue
            add = _model_add(m, cls)
            if add is not None:
                pid = "model:" + cls
                ps.append({"id": pid, "label": cls, "kind": "model", "role": "changed"})
                cm[pid] = {"m": m, "add": add}
        pieces[s] = ps
        changed_model[s] = cm

    cross_edges: list = []
    for s in blast:
        ps = []
        for m in _models(ents.get(s, {})):
            cls = m.get("cls")
            if not cls:
                continue
            for col, tgt in sorted((m.get("fks") or {}).items()):
                owner = touched_tables.get(tgt.split(".")[0])
                if owner:
                    pid = "model:" + cls
                    ps.append({"id": pid, "label": cls, "kind": "model", "role": "link", "via": col})
                    to_model = next((tm for tm in _models(ents.get(owner, {}))
                                     if tm.get("cls") and tm.get("table") == tgt.split(".")[0]), None)
                    if to_model:
                        cross_edges.append({"from_slug": s, "from": pid, "to_slug": owner,
                                            "to": "model:" + to_model["cls"], "via": col})
                    break
        pieces[s] = ps
    cross_edges.sort(key=lambda x: (x["from_slug"], x["from"], x["to"]))

    # intra-entity FK connectors among an entity's CHANGED pieces (the station draws
    # these inside an exploded container), from the same FK data.
    intra_edges: dict[str, list] = {}
    for s in touched:
        tbl2pid = {d["m"]["table"]: pid for pid, d in changed_model[s].items()
                   if d["m"].get("table")}
        ies = [{"source": pid, "target": tbl2pid[tgt.split(".")[0]]}
               for pid, d in changed_model[s].items()
               for col, tgt in sorted((d["m"].get("fks") or {}).items())
               if tbl2pid.get(tgt.split(".")[0]) and tbl2pid[tgt.split(".")[0]] != pid]
        if ies:
            intra_edges[s] = ies

    # ── stages (machine-derived fields only; curated prose stays empty) ──
    # add = class-level (precise); del is not attributable per-class → 0 (the file/
    # commit totals carry deletions). The +N add is the Execute lens's primary signal.
    execute = {pid: {"changed": True, "add": d["add"], "del": 0, "file": d["m"].get("file")}
               for s in touched for pid, d in changed_model[s].items()}

    cases = list((inflight.get("phase") or {}).get("cases") or [])
    red = {pid: {"tested": True, "cases": cases}
           for s in touched for pid in changed_model[s]} if cases else {}

    findings = _pending_findings(pending or "", changed_files)
    review = {}
    for s in touched:
        for pid, d in changed_model[s].items():
            f = findings.get(d["m"].get("file"))
            if f:
                review[pid] = {"touched_again": True, "risk": f["risk"], "why": f["title"]}

    add_tot = sum(add_by_file.values())
    del_tot = sum(del_by_file.values())
    commit_meta = {"commit": inflight.get("head") or "", "subject": inflight.get("last_commit") or "",
                   "files": len(changed_files), "add": add_tot, "del": del_tot, "cases": cases}

    return {
        "commit": inflight.get("head") or "",
        "subject": inflight.get("last_commit") or "",
        "touched": touched, "blast": blast, "blast_edges": blast_edges,
        "files": len(changed_files),
        "pieces": pieces,
        "intra_edges": intra_edges,
        "cross_edges": cross_edges,
        "stages": {
            "red":     {"real": True, "pieces": red},
            "execute": {"real": True, "pieces": execute},
            "review":  {"real": True, "pieces": review},
            "commit":  {"real": True, "meta": commit_meta,
                        "pieces": {pid: {} for s in touched for pid in changed_model[s]}},
        },
        "evidence": evidence or {},
        "derived": True,             # provenance: machine-derived, not the curated example
    }


def archive_upsert(existing: dict | None, sim: dict | None, inflight: dict | None) -> dict:
    """Accumulate the CURRENT phase's projection into the committed per-phase archive
    (Graph 2 replays past changes). Keyed by phase id — completed phases stay FROZEN;
    only the current phase's entry is (re)written, so a finished phase yields a clean,
    byte-identical diff. A pure function of (existing, sim, inflight)."""
    arch = existing if (isinstance(existing, dict) and existing.get("v")) else {"v": 1, "phases": []}
    by_phase = {p.get("phase"): p for p in arch.get("phases", []) if isinstance(p, dict) and p.get("phase")}
    ph = str((inflight or {}).get("current_phase") or "").strip()
    if sim is not None and ph:
        name = ((inflight or {}).get("phase") or {}).get("name") or ""
        by_phase[ph] = {"phase": ph, "name": name, **sim}
    return {"v": 1, "phases": [by_phase[k] for k in sorted(by_phase)]}


# emit_archive() was retired 2026-09-10 with the Codebase archive station — nothing read window.GABE_SIM_ARCHIVE.
# archive_upsert() stays a pure function (tests/sim §G) until a universe tab consumes the archive.


def emit(sim: dict | None, center_out: Path) -> None:
    """Write ``sim.data.js``. A live projection when a change is in flight, else the
    honest-empty stub (``window.GABE_SIM = null``). Sorted keys → byte-identical on an
    unchanged tree; the file is gitignored like inflight.{json,js}."""
    p = center_out / "sim.data.js"
    if sim is None:
        p.write_text("// no change in flight — honest-empty at rest (_a3_sim.build_sim)\n"
                     "window.GABE_SIM = null;\n")
    else:
        p.write_text("window.GABE_SIM = "
                     + json.dumps(sim, sort_keys=True, ensure_ascii=False) + ";\n")
