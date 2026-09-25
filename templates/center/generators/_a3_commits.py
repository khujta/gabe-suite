#!/usr/bin/env python3
"""_a3_commits.py — recent git commits, each mapped to the graph ELEMENTS it touched.

A commit becomes a JOURNEY in the Gabe Universe picker (the "commits" kind): its
carriers are the current-graph nodes whose file the commit changed — a COVERAGE view
over the map ("what did this commit touch"), the historical mirror of the live sim
projection. Read-only, static-safe: the station never runs anything, it just walks the
touched set with the existing journey machinery.

Derivation (a function of (tree, head) — no wallclock, deterministic per commit), in TWO passes:
  * PICK — ``git log -n <scan> --no-merges --name-only`` → the first ``N`` commits whose files
    touch a map node (sha · short · subject · date · author).
  * MEASURE — ONE ``git log --no-walk=unsorted --numstat <picked shas>`` → the files each picked
    commit changed AND each file's (added, deleted), over the WHOLE commit. The numstat pass never
    walks the scanned 600: diffing every regenerated MB-sized center file cost a twin 16–20 s
    against the 30 s budget, and when the budget ran out the feed went empty without a word.
  * one bounded ``git show --unified=0 <sha> -- <small files>`` per commit → the actual ± lines
    for files whose change is SMALL (``_SMALL`` lines), so the step panel can show a real
    side-by-side instead of a count. A big file carries its counts only — never truncated
    content pretending to be the whole change.
  * each file → the graph node ids homed to it (backend ``det.file`` · fe piece ``file``);
    a file with no represented node contributes nothing (honest — tests/config/docs drop).

A commit that touched a now-DELETED element shows fewer carriers — it is a coverage view
over the CURRENT map, not a time machine. The date BUCKET (today/this week/…) is computed
CLIENT-SIDE at view time, so this module emits only the raw ISO date.

An empty feed says WHY — in the stub's comment and in the build log (no graph · no git · git
log failed · timed out · no map-touching commit in the scan). ``refresh_feeds`` writes
commits.js and spine.js (the LEDGER's five beats, ``_kdbp_ledger.ledger_spine``) in ONE step, so
the two feeds a board seat joins cannot drift apart. Both are written at every regen and
refreshed by the E8 beat tail, gitignored like inflight.{json,js} (gabe-init seeds them); they
churn per commit and per LEDGER row. A write whose bytes are already on disk is skipped, so an
unchanged feed keeps its mtime; the tail (``keep_last``) keeps the last good commits.js when git
fails, where a regen writes the stub naming why.
Battery: tests/commits/run.sh (synthetic git repo + a stub graph + fixture LEDGERs).
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import _a3_sim  # sibling — reuse the rename helper + the bounded `git show` runner (no duplication)
import _kdbp_ledger  # sibling — the LEDGER rows the spine projects (pure: takes the kdbp dir)

N = 30          # map-touching commits the feed keeps
_TIMEOUT = 30   # seconds per git call
_SEP = "\x1f"  # unit separator — safe inside a subject, splits the log format


def _file_to_nodes(graph: dict[str, Any]) -> dict[str, list[str]]:
    """``{repo-relative file → [node id]}`` from the built c4 graph: backend nodes carry
    ``det.file``; every fe piece carries ``file``. One file can home many nodes."""
    idx: dict[str, list[str]] = {}
    for ent in (graph.get("l2") or {}).values():
        for node in ent.get("nodes") or []:
            f = (node.get("det") or {}).get("file")
            if f:
                idx.setdefault(f, []).append(node["id"])
    for piece in ((graph.get("fe") or {}).get("pieces") or []):
        f = piece.get("file")
        if f and piece.get("id"):
            idx.setdefault(f, []).append(piece["id"])
    return idx


_REC = "\x1e"  # record separator — marks each commit header in the --numstat stream
# The step panel shows a real side-by-side only when a file's change is small enough to READ;
# past that it shows the counts. Both are honest — the cap is a legibility budget, not a floor
# on the data (the counts are exact for every file, whatever its size).
_SMALL = 12        # max (added + deleted) for a file to carry its literal lines
_MAX_FILES = 6     # max small files per commit to fetch content for (one `git show`, bounded)
_MAX_LINES = 24    # hard cap on stored lines per file — a guard, never reached under _SMALL


def _hunk_lines(root: Path, sha: str, files: list[str]) -> dict[str, list[list[str]]]:
    """``{file → [["+"|"-", text], …]}`` for the given files of one commit, from a single
    ``git show --unified=0``. Content only — no hunk headers, no context. ``{}`` on any
    failure (the panel then shows counts alone)."""
    if not files:
        return {}
    out: dict[str, list[list[str]]] = {}
    try:
        txt = _a3_sim._sh(["git", "show", "--format=", "--unified=0", "--no-color",
                           "--no-renames", sha, "--", *files], root)
    except Exception:  # noqa: BLE001
        return {}
    cur = None
    for ln in txt.split("\n"):
        if ln.startswith("+++ b/"):
            cur = ln[6:].strip()
            out.setdefault(cur, [])
        elif ln.startswith("--- ") or ln.startswith("diff --git") or ln.startswith("@@"):
            continue
        elif cur and ln[:1] in ("+", "-") and len(out[cur]) < _MAX_LINES:
            out[cur].append([ln[0], ln[1:]])
    return {f: v for f, v in out.items() if v}


def _git(args: list[str], root: Path) -> tuple[int | None, str, str]:
    """``(rc, stdout, first stderr line)`` of one git call — ``rc`` None when it ran past
    ``_TIMEOUT``, -1 when it could not run at all. Local on purpose: ``_a3_sim._sh`` folds every
    failure into "" for its other callers, and this feed must say WHICH failure it met."""
    try:
        p = subprocess.run(["git", *args], cwd=str(root), capture_output=True, text=True,
                           timeout=_TIMEOUT)
        err = (p.stderr or "").strip().splitlines()
        return p.returncode, p.stdout, (err[0] if err else "")
    except subprocess.TimeoutExpired:
        return None, "", ""
    except Exception as e:  # noqa: BLE001 — no git binary, an undecodable stream …
        return -1, "", str(e)


def _log_failed(rc: int | None, err: str) -> str:
    return (f"git log timed out after {_TIMEOUT} s" if rc is None
            else f"git log failed: rc {rc} — {err or '(no stderr)'}")


def derive(root: Path, graph: dict[str, Any] | None, n: int = N,
           scan: int | None = None) -> tuple[list[dict] | None, str | None]:
    """``(commits, reason)`` — the most recent ``n`` commits that TOUCHED THE MAP, each with the
    node ids it touched, and why the list is empty when it is. A commit that changed only
    tests/docs/config/spikes (nothing represented in the graph) has no coverage journey and is
    SKIPPED — so ``n`` counts map-touching commits, not raw commits. Picks from up to ``scan``
    (default max(n*20, 400)) raw commits in one ``--name-only`` pass, then measures only the picked
    ones in one ``--numstat`` pass (no per-commit subprocess). ``None`` on a failure (no graph ·
    no git · git log failed or timed out), ``[]`` when the scan held no map-touching commit.
    NEVER raises out."""
    if not graph:
        return None, "no graph (the c4 derivation failed)"
    try:
        root = Path(root)
        if _git(["rev-parse", "--git-dir"], root)[0] != 0:
            return None, "no git (rev-parse failed)"
        f2n = _file_to_nodes(graph)
        scan = scan or max(n * 20, 400)
        fmt = _REC + _SEP.join(["%H", "%h", "%s", "%aI", "%an"])
        # PASS 1 — PICK: which commits touch the map, by file NAME (git computes no diff here)
        rc, names, err = _git(["log", "-n", str(scan), "--no-merges", "--name-only", "--no-renames",
                               f"--format={fmt}"], root)
        if rc != 0:
            return None, _log_failed(rc, err)
        picked: list[str] = []
        for chunk in names.split(_REC):
            lines = chunk.strip("\n").split("\n")
            if len(lines[0].split(_SEP)) < 5:
                continue
            if any(f2n.get(_a3_sim._unrename(f)) for f in lines[1:] if f.strip()):
                picked.append(lines[0].split(_SEP)[0])
                if len(picked) >= n:
                    break
        if not picked:
            return [], f"no map-touching commit in the last {scan}"
        # PASS 2 — MEASURE: whole-commit numstat of the picked commits only, in pick order. Never
        # pathspec-limited: the rollup ± counts every file the commit changed, mapped or not.
        rc, stream, err = _git(["log", "--no-walk=unsorted", "--numstat", "--no-renames",
                                f"--format={fmt}", *picked], root)
        if rc != 0:
            return None, _log_failed(rc, err)
        kept: list[dict] = []
        for chunk in stream.split(_REC):
            chunk = chunk.strip("\n")
            if not chunk:
                continue
            lines = chunk.split("\n")
            head = lines[0].split(_SEP)
            if len(head) < 5:
                continue
            sha, short, subject, date, author = head[:5]
            # --numstat rows are `added \t deleted \t path`; a binary file reports `-  -`
            stat: dict[str, list[int]] = {}
            for row in lines[1:]:
                if not row.strip():
                    continue
                parts = row.split("\t")
                if len(parts) < 3:
                    continue
                f = _a3_sim._unrename(parts[2])
                a, d = parts[0], parts[1]
                stat[f] = [-1, -1] if (a == "-" or d == "-") else [int(a or 0), int(d or 0)]
            files = sorted(stat)
            touched = sorted({nid for f in files for nid in f2n.get(f, [])})
            if not touched:
                continue                       # changed nothing on the map → no coverage journey
            # only files the MAP represents can ever be a journey step — never fetch content
            # for a file no step can show (keeps the `git show` bounded and the feed honest)
            mapped = [f for f in files if f2n.get(f)]
            small = [f for f in mapped
                     if stat[f] != [-1, -1] and sum(stat[f]) <= _SMALL][:_MAX_FILES]
            content = _hunk_lines(root, sha, small)
            diffs = {f: ({"a": stat[f][0], "d": stat[f][1]}
                         | ({"lines": content[f]} if f in content else {}))
                     for f in mapped}
            kept.append({"sha": sha, "short": short, "subject": subject, "date": date,
                         "author": author, "touched": touched, "diffs": diffs,
                         "nFiles": len(files), "nTouched": len(touched),
                         "add": sum(v[0] for v in stat.values() if v[0] > 0),
                         "del": sum(v[1] for v in stat.values() if v[1] > 0)})
            if len(kept) >= n:
                break
        return kept, (None if kept else f"no map-touching commit in the last {scan}")
    except Exception as e:  # noqa: BLE001 — the arm enhances, never breaks, the build
        return None, f"commits derivation error: {e}"


def build_commits(root: Path, graph: dict[str, Any] | None, n: int = N,
                  scan: int | None = None) -> list[dict] | None:
    """``derive`` without its reason: the commits, ``[]`` when the scan held no map-touching
    commit, ``None`` on a failure (no graph · no git · git log failed or timed out)."""
    return derive(root, graph, n, scan)[0]


def render(commits: list[dict] | None, reason: str | None = None) -> str:
    """commits.js as text — the window global, or the honest-empty stub that names its reason. The reason rides a
    ``//`` comment, so it is flattened to ONE line: a newline in it would push the rest into code, and a stub
    that fails to parse leaves ``GABE_COMMITS`` undefined — the silent blank this stub exists to end."""
    if not commits:
        why = " ".join((reason or "no commit derived").split())
        return (f"// commits honest-empty — {why}\n"
                "window.GABE_COMMITS = [];\n")
    return "window.GABE_COMMITS = " + json.dumps(commits, ensure_ascii=False,
                                                 separators=(",", ":")) + ";\n"


def render_spine(spine: dict | None, reason: str | None = None) -> str:
    """spine.js as text. ``None`` renders the stub naming ``reason`` — the stub and the data share
    one shape (``_kdbp_ledger.empty_spine``), so a reader never branches on which it got."""
    if spine is None:
        spine = _kdbp_ledger.empty_spine(reason or "no spine derived")
    return "window.GABE_SPINE = " + json.dumps(spine, sort_keys=True, ensure_ascii=False,
                                               separators=(",", ":")) + ";\n"


def _put(path: Path, text: str) -> str:
    """Write ``text`` unless those bytes are already there → ``'wrote'`` | ``'unchanged'``."""
    data = text.encode("utf-8")
    try:
        if path.read_bytes() == data:
            return "unchanged"
    except OSError:
        pass
    path.write_bytes(data)
    return "wrote"


def emit(commits: list[dict] | None, out_dir: Path, reason: str | None = None) -> None:
    _put(Path(out_dir) / "commits.js", render(commits, reason))


def _kdbp_label(root: Path, kdbp_dir: Path) -> str:
    """The kdbp dir as the repo names it — ``.kdbp`` unless ``paths.kdbp`` moved it."""
    try:
        return Path(kdbp_dir).resolve().relative_to(Path(root).resolve()).as_posix()
    except ValueError:
        return Path(kdbp_dir).name


def build_spine(root: Path, kdbp_dir: Path) -> dict:
    """One project's LEDGER spine (LEDGER.md + archive/LEDGER*.md), or the stub naming the gap."""
    label = _kdbp_label(root, kdbp_dir)
    if not (Path(kdbp_dir) / "LEDGER.md").is_file():
        return _kdbp_ledger.empty_spine(f"no {label}/LEDGER.md")
    return _kdbp_ledger.ledger_spine(_kdbp_ledger.ledger_rows(Path(kdbp_dir), include_archive=True),
                                     kdbp_label=label)


def _count(path: Path) -> int:
    """How many commits the commits.js on disk carries — 0 for the stub or a file this module did not write."""
    try:
        txt = path.read_text(encoding="utf-8")
        head = "window.GABE_COMMITS = "
        return len(json.loads(txt[len(head):-2])) if txt.startswith(head + "[") and txt.endswith(";\n") else 0
    except Exception:  # noqa: BLE001
        return 0


def refresh_feeds(root: Path, center_dir: Path, kdbp_dir: Path, *,
                  graph: dict[str, Any] | None = None, only: tuple[str, ...] | None = None,
                  n: int = N, keep_last: bool = False) -> dict[str, tuple[str, int, str | None]]:
    """Write commits.js and spine.js into ``center_dir`` in ONE step →
    ``{"commits" | "spine": (state, count, reason | None)}``, state 'wrote' | 'unchanged' | 'kept' |
    'failed'; ``only`` names a subset.

    ``graph=None`` reads ``center_dir/c4-graph.json`` (the beat tail) and returns ``{}`` — writing
    NEITHER feed, the spine included, whatever ``only`` asks — when that file is absent or unreadable:
    a center without its map is pre-map (or the suite's own), and no feed belongs there. The build
    passes its in-memory graph, or ``{}`` when its c4 derivation failed, so both files are always
    written there (a stub names the reason).

    ``keep_last`` (the E8 tail): a FAILED derivation (no graph · no git · git log failed or timed out)
    leaves a commits.js already on disk as it is → ``('kept', its count, reason)``; the regen leaves
    it off and writes the stub naming the reason. NEVER raises: a feed whose write fails reads
    ``('failed', 0, '<name> write error: …')`` and the other feed is still written."""
    out: dict[str, tuple[str, int, str | None]] = {}
    try:
        center_dir = Path(center_dir)
        if graph is None:
            graph = json.loads((center_dir / "c4-graph.json").read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — absent or bad: no map, so no feed
        return {}
    if only is None or "commits" in only:
        try:
            commits, reason = derive(root, graph, n)
            path = center_dir / "commits.js"
            if commits is None and keep_last and path.is_file():
                out["commits"] = ("kept", _count(path), reason)
            else:
                out["commits"] = (_put(path, render(commits, reason)), len(commits or []), reason)
        except Exception as e:  # noqa: BLE001 — derive never raises: this is the write
            out["commits"] = ("failed", 0, f"commits write error: {e}")
    if only is None or "spine" in only:
        try:
            sp = build_spine(root, kdbp_dir)
        except Exception as e:  # noqa: BLE001
            sp = _kdbp_ledger.empty_spine(f"spine derivation error: {e}")
        try:
            out["spine"] = (_put(center_dir / "spine.js", render_spine(sp)),
                            sum(len(v) for v in sp["beats"].values()), sp["reason"])
        except Exception as e:  # noqa: BLE001
            out["spine"] = ("failed", 0, f"spine write error: {e}")
    return out
