#!/usr/bin/env python3
"""write-inflight.py — the center's in-flight projection (ruling 2026-08-07, ask A),
and the refresh of the two feeds that churn per commit (commits.js + spine.js, Q4 b).

Derives docs/site/center/inflight.{json,js} from .kdbp/PLAN.json + git — a
PROJECTION, never a database (the board's own law): a script writes it, nobody
hand-edits it, and board.js reads it at view time. Invoked by the E8 beat tail
before the CENTER: pointer prints, so the file is exactly as fresh as the last
beat. The files are GITIGNORED (gabe-init seeds it): they carry `head`, which
changes every commit, so tracking them would dirty the tree forever and re-blind
the pulse signals; the board reads them locally and renders absence as absence.

"What changed" and "whose is it" come from the SHARED resolver
(gabe-pulse/scripts/work_scope.py) — the same one the pulse S6/S7 signals use, so
the board and the pulse line can never name different entities for one tree.

Honest blanks: a phase with no `entities` key renders `declared: null` (never
guessed); an explicit `none — <reason>` declaration arrives as `declared: []`.

The FEEDS, after inflight and whether or not it changed: when the center holds its
committed c4-graph.json, commits.js (the recent map-touching commits) and spine.js
(the LEDGER's five beats) are rebuilt from git + LEDGER through
`_a3_commits.refresh_feeds` — the regen's own writer, so the tail's bytes are the
regen's once the project's scripts/ copy is at the suite's version (a regen runs that
propagated copy; until then an older copy writes commits.js in the same schema, not
the same bytes, and no spine.js). The generator is the SUITE's copy (WS-2, operator
ruling 2026-09-02): parents[3] of this file is ~/.claude installed or the repo root in
a checkout, and the project's scripts/ is never imported, not even as a fallback — the
tail runs no project code. A feed git does not ignore is never written; only when a
refresh would change its bytes, one stderr line names the fix — /gabe-init update for
an unseeded feed, git rm --cached for a tracked one — or says git could not answer
check-ignore at all, which names no fix.
A failed git keeps the last good commits.js and says why on stderr. No map (the
suite's own center, a pre-map project) is silence. The step never raises and never
changes the exit code; an unchanged feed is not rewritten and prints nothing.

Usage: write-inflight.py [root]
  silent exit 0 when the project has no center; writes + prints one line per written
  file otherwise; exit 1 only on an inflight write failure.
Battery: tests/inflight/run.sh (FIRE and SILENT both proven) + tests/commits/run.sh.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

# The shared work-scope resolver lives in the pulse skill (pulse "owns the diff
# source"). Under both the repo layout and the installed ~/.claude layout it sits
# at ../../gabe-pulse/scripts relative to this file.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "gabe-pulse" / "scripts"))
try:
    import work_scope
except Exception:  # noqa: BLE001
    work_scope = None

# The feeds the tail refreshes beside inflight: refresh_feeds' name → its file in the center.
_FEEDS = {"commits": "commits.js", "spine": "spine.js"}
# WS-2: the suite's OWN generator copy, resolved from this file's tree — never the project's.
_GEN_DIRS = ("templates/gabe/center/generators",  # installed layout (~/.claude)
             "templates/center/generators")        # repo layout (suite checkout)


def sh(args: list[str], cwd: Path) -> str:
    try:
        p = subprocess.run(args, cwd=str(cwd), capture_output=True, text=True, timeout=30)
        return p.stdout if p.returncode == 0 else ""
    except Exception:  # noqa: BLE001
        return ""


def _write_inflight(root: Path, cfg: dict, out_dir: Path) -> int:
    head = sh(["git", "rev-parse", "--short", "HEAD"], root).strip() or None
    branch = sh(["git", "rev-parse", "--abbrev-ref", "HEAD"], root).strip() or None
    # last_commit — the HEAD subject, a machine-derived proxy for the beat brief's
    # DID line ("what we did"): the last landed work, never invented prose. Board
    # renders it in the ▶ NOW banner; absent (no commits yet) = the line is omitted.
    last_commit = sh(["git", "log", "-1", "--format=%s", "HEAD"], root).strip() or None

    plan = None
    plan_path = root / ".kdbp" / "PLAN.json"
    if plan_path.is_file():
        try:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            plan = None

    doc: dict = {"v": 1, "head": head, "branch": branch, "last_commit": last_commit}
    ph = None
    if plan and plan.get("status") == "active":
        cur = plan.get("current_phase")
        # current_phase may be null (PLAN.md's Current Phase line didn't parse) —
        # stringifying that to "None" and looking it up publishes a real phase as
        # never-declared. Guard it: active but no resolvable phase is honest.
        if cur not in (None, "", "null"):
            ph = next((p for p in plan.get("phases", []) or []
                       if str(p.get("id")) == str(cur)), None)

    if ph is None:
        doc["active"] = False
        if plan is None:
            doc["reason"] = "no PLAN.json"
        elif plan.get("status") != "active":
            doc["reason"] = f"plan status: {plan.get('status') or 'unknown'}"
        else:
            doc["reason"] = "current phase not resolvable in PLAN.json"
    else:
        files, src = work_scope.changed_files(root)
        doc["active"] = True
        doc["current_phase"] = str(ph.get("id"))
        doc["phase"] = {
            "id": str(ph.get("id")), "name": ph.get("name"),
            "tier": ph.get("tier"), "complexity": ph.get("complexity"),
            "types": ph.get("types") or [],
            "cells": ph.get("cells") or {},
            "cases": ph.get("cases"),
            "scope": ph.get("scope"),          # null = never declared
        }
        # declared: null = never declared · [] = explicit `none — <reason>` (honest blank)
        doc["declared"] = ph.get("entities") if "entities" in ph else None
        doc["touched"] = work_scope.touched_entities(cfg, files)
        doc["work_source"] = src               # "dirty" | <short sha> | "none"
        doc["dirty_files"] = len(files) if src == "dirty" else 0

    out_path = out_dir / "inflight.json"
    js_path = out_dir / "inflight.js"
    body = json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    js_body = "window.GABE_INFLIGHT = " + json.dumps(doc, sort_keys=True, ensure_ascii=False) + ";\n"
    try:
        if (out_path.is_file() and out_path.read_text(encoding="utf-8") == body
                and js_path.is_file() and js_path.read_text(encoding="utf-8") == js_body):
            return 0  # unchanged — no write, no output
        out_path.write_text(body, encoding="utf-8")
        js_path.write_text(js_body, encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        print(f"inflight: write failed — {exc}", file=sys.stderr)
        return 1
    label = doc.get("current_phase") if doc.get("active") else "inactive"
    print(f"inflight: {label} → {out_path.relative_to(root)}")
    return 0


def _git_rc(root: Path, args: list[str]) -> int | None:
    """git's exit code — ``sh`` cannot see it; None when git could not run (no binary, a timeout)."""
    try:
        return subprocess.run(["git", *args], cwd=str(root), capture_output=True, timeout=30).returncode
    except Exception:  # noqa: BLE001
        return None


def _ignored(root: Path, rel: str) -> bool | None:
    """git ignores ``rel`` → True · it does not → False · git could not answer (no git, not a
    repository, a timeout) → None, never read as "unignored". check-ignore answers 1 for a
    TRACKED path whatever the ignore lines say, so a tracked feed is never ours to write."""
    return {0: True, 1: False}.get(_git_rc(root, ["check-ignore", "-q", rel]))


def _stale(mod, root: Path, center: Path, kdbp: Path, names: list[str]) -> list[str]:
    """The feeds among ``names`` whose bytes a refresh would change — the gate's nag speaks only
    for these. Mirrors refresh_feeds: an unreadable map writes nothing, a failed git keeps the
    commits.js already on disk, and a spine that cannot be derived is the stub naming why — so
    the nag never raises past the refresh it only speaks for."""
    if not names:
        return []  # every feed is the refresh's to write: no second parse of the map
    try:
        graph = json.loads((center / "c4-graph.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out = []
    for name in names:
        path = center / _FEEDS[name]
        if name == "commits":
            commits, why = mod.derive(root, graph)
            if commits is None and path.is_file():
                continue
            text = mod.render(commits, why)
        else:
            try:
                sp, why = mod.build_spine(root, kdbp), None
            except Exception as e:  # noqa: BLE001 — refresh_feeds writes this same stub
                sp, why = None, f"spine derivation error: {e}"
            text = mod.render_spine(sp, why)
        try:
            if path.read_bytes() == text.encode("utf-8"):
                continue
        except OSError:
            pass
        out.append(name)
    return out


def _refresh_feeds(root: Path, cfg: dict, out_dir: Path) -> None:
    """commits.js + spine.js from git + LEDGER through the suite's _a3_commits (Q4 b).
    NEVER raises and never touches the exit code: the feeds ride the tail, inflight is its job."""
    try:
        paths = cfg.get("paths") or {}
        center = root / paths["center"] if paths.get("center") else out_dir
        if not (center / "c4-graph.json").is_file():
            return  # no map — the suite's own center, a pre-map project: no feed belongs here
        base = Path(__file__).resolve().parents[3]
        gen = next((base / d for d in _GEN_DIRS if (base / d / "_a3_commits.py").is_file()), None)
        if gen is None:
            print(f"commits: the suite's _a3_commits.py is not under {base} — feeds not refreshed",
                  file=sys.stderr)
            return
        sys.dont_write_bytecode = True  # never leave a __pycache__ in the suite's generator dir
        sys.path.insert(0, str(gen))
        import _a3_commits
        kdbp = root / (paths.get("kdbp") or ".kdbp")
        rel = {n: (center / f).relative_to(root).as_posix() for n, f in _FEEDS.items()}
        seen = {n: _ignored(root, rel[n]) for n in _FEEDS}
        ok = tuple(n for n in _FEEDS if seen[n])
        off = _stale(_a3_commits, root, center, kdbp, [n for n in _FEEDS if not seen[n]])
        # the nag names the fix for what git reports: unseeded · tracked (an ignore line cannot
        # untrack it) · no answer at all (the ignore lines may be fine — no advice to give)
        tracked = [n for n in off if seen[n] is False
                   and _git_rc(root, ["ls-files", "--error-unmatch", "--", rel[n]]) == 0]
        unseeded = [n for n in off if seen[n] is False and n not in tracked]
        blind = [n for n in off if seen[n] is None]
        if unseeded:
            print(f"{', '.join(rel[n] for n in unseeded)} not gitignored — not refreshed "
                  f"(run /gabe-init update to seed {'it' if len(unseeded) == 1 else 'them'})", file=sys.stderr)
        if tracked:
            print(f"{', '.join(rel[n] for n in tracked)} tracked — not refreshed (git rm --cached "
                  f"{' '.join(rel[n] for n in tracked)}; /gabe-init update seeds the ignore "
                  f"line{'' if len(tracked) == 1 else 's'})", file=sys.stderr)
        if blind:
            print(f"{', '.join(rel[n] for n in blind)} not refreshed — git could not answer check-ignore",
                  file=sys.stderr)
        res = _a3_commits.refresh_feeds(root, center, kdbp, only=ok, keep_last=True) if ok else {}
        for name, (state, n, why) in res.items():
            if state == "wrote":
                print(f"{name}: {n} → {rel[name]}" + ("" if n else f" (honest-empty — {why})"))
            elif state == "kept":
                print(f"{name}: kept the last good {rel[name]} ({n}) — {why}", file=sys.stderr)
            elif state == "failed":
                print(f"{name}: not written — {why}", file=sys.stderr)
    except Exception as exc:  # noqa: BLE001 — the feeds enhance the tail, never break it
        print(f"commits: feeds not refreshed — {exc}", file=sys.stderr)


def main() -> int:
    if work_scope is None:
        print("inflight: work_scope resolver not importable — skipped", file=sys.stderr)
        return 0  # a missing shared module is not a reason to brick a beat
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    # the SHARED both-layout probe (work_scope) — no second copy here, one parse-error
    # semantics (malformed config → None → treated as no center, same as the pulse line)
    cfg, out_dir = work_scope.load_center_config(root)
    if cfg is None:
        return 0  # no center (or malformed config) — not this project's surface; silence
    rc = _write_inflight(root, cfg, out_dir)
    _refresh_feeds(root, cfg, out_dir)  # after inflight, whether or not inflight changed
    return rc


if __name__ == "__main__":
    sys.exit(main())
