"""The KDBP LEDGER reader — dated rows, newest first BY DATE (stdlib only, pure).

The spec says a LEDGER is written newest first under its header; neither twin does it. gastify APPENDS: a
headerless table under thousands of lines of `## 2026-…` prose, oldest row first. gustify is MIXED: a prepended
head (newest first) sitting over an appended tail (oldest first), with some days in both. A reader that trusts file
position shows one twin its oldest rows as "Recent changes". So order comes from the Date cell, and because a Date
cell is a DAY, the order WITHIN a day comes from the file's LOCAL direction around that day's rows.

Pure on purpose: no import-time I/O, no env reads, no `_center_data` import — the caller passes the kdbp dir, so
the E8 beat tail can run the suite's own generator copy against another project and read that project's tree.

The SPINE (`ledger_spine`) is the same rows read as the five lifecycle beats — RED · EXECUTE · REVIEW · COMMIT · PUSH —
each row pinned to the commit(s) it names, for the board's spine strip (`_a3_commits.refresh_feeds` writes it as
spine.js). One sha tokenizer (`sha_tokens`) serves the spine and the done-card chips.
"""
from __future__ import annotations

import datetime as _dt
import re
from collections.abc import Iterable
from pathlib import Path

LEDGER_ROW_RX = re.compile(r"^\|\s*(20\d\d-\d\d-\d\d)\s*\|")
# A commit sha as a LEDGER or PENDING cell writes it: 7-40 lowercase hex, not glued to a word (`wf_74f0a593` is a
# workflow id) or to `#` (an issue number); `@` is allowed before it (`green@569cd070`, `@e1c5558f`) and a `*` after.
SHA_RX = re.compile(r"(?<![0-9A-Za-z_#])([0-9a-f]{7,40})(?![0-9A-Za-z_])")
GREEN_RX = re.compile(r"\bgreen@([0-9a-f]{7,40})(?![0-9A-Za-z_])")
# The Entry cell, letters only and upper-cased, → the beat it records. EXEC is the short form of EXECUTE; every other
# entry (PLAN · HANDOFF · CENTER · VERIFY · FIX …) is not a beat. A red-checkpoint COMMIT row stays COMMIT.
BEATS = {"RED": "RED", "EXEC": "EXECUTE", "EXECUTE": "EXECUTE", "REVIEW": "REVIEW", "COMMIT": "COMMIT", "PUSH": "PUSH"}
SPINE_ORDER = ["RED", "EXECUTE", "REVIEW", "COMMIT", "PUSH"]


def split_row(line: str) -> list[str]:
    """One table row's cells, an escaped `\\|` kept inside its cell — the one split every KDBP table reads through.
    The guard runs BEFORE the outer pipes are stripped, so a row ending in `\\|` keeps that pipe."""
    guarded = line.strip().replace("\\|", "\x00").strip("|")
    return [c.strip().replace("\x00", "|") for c in guarded.split("|")]


def _day_order(dates: list[str]) -> list[int]:
    """Indexes of one file's rows, newest first: by date, then within a day by the LOCAL direction of the file.

    Rows of one date that sit together form a run. A run whose neighbours are earlier-or-absent before it and
    later-or-absent after it sits in a RISING (appended) stretch — a later line is newer. The mirror case sits in a
    FALLING (prepended) stretch — an earlier line is newer. A turning point (a valley or a peak between the two
    stretches, or a file of one run) takes the file's overall direction, last date against first; an equal first
    and last date carries no direction and reads as the spec's prepended shape (first line newest). So a file
    that holds ONE day, which an appending project writes on its first day, flips that day once the next lands."""
    runs: list[tuple[str, list[int]]] = []
    for i, d in enumerate(dates):
        if runs and runs[-1][0] == d:
            runs[-1][1].append(i)
        else:
            runs.append((d, [i]))
    rising = bool(dates) and dates[-1] > dates[0]
    keyed = []
    for k, (d, idx) in enumerate(runs):
        prev = runs[k - 1][0] if k else None
        nxt = runs[k + 1][0] if k + 1 < len(runs) else None
        falls = (prev is None or prev > d) and (nxt is None or nxt < d)
        rises = (prev is None or prev < d) and (nxt is None or nxt > d)
        up = rising if falls == rises else rises
        keyed += [((d, i if up else len(dates) - i), i) for i in idx]
    keyed.sort(key=lambda x: x[0], reverse=True)
    return [i for _, i in keyed]


def _dated(path: Path) -> list[tuple[str, int, list[str]]]:
    """(date, line number, cells) for every row whose first cell is a real date, in file order. Read as UTF-8, never
    the locale's default, so the bytes a feed carries are the same on every host; a stray non-UTF-8 byte reads as
    U+FFFD in its cell instead of failing the whole file."""
    out = []
    for n, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        m = LEDGER_ROW_RX.match(line)
        if not m:
            continue
        try:
            _dt.date.fromisoformat(m[1])
        except ValueError:
            continue
        out.append((m[1], n, split_row(line)))
    return out


def ledger_rows(kdbp: Path, include_archive: bool = False) -> list[dict]:
    """Every dated row of kdbp/LEDGER.md (plus archive/LEDGER*.md when asked), newest first across files.

    Same-day rows from different files: the live file leads, then the archives in name order. Each row keeps its
    cells verbatim (`cells`) beside the named ones; `gates` joins every cell past the fourth, so a note written
    after an unescaped pipe is not lost. `src` names the file under the kdbp dir's OWN name (`.kdbp/…` by default,
    whatever `paths.kdbp` retargets it to otherwise)."""
    paths = [kdbp / "LEDGER.md"]
    if include_archive and (kdbp / "archive").is_dir():
        paths += sorted((kdbp / "archive").glob("LEDGER*.md"))
    keyed = []
    for rank, path in enumerate(paths):
        if not path.is_file():
            continue
        rows = _dated(path)
        src = kdbp.name + "/" + path.relative_to(kdbp).as_posix()
        for pos, i in enumerate(_day_order([d for d, _, _ in rows])):
            d, n, cells = rows[i]
            at = cells + [""] * (4 - len(cells))
            keyed.append(((d, -rank, -pos), {
                "date": d, "entry": at[1], "theme": at[2], "commits": at[3],
                "gates": " | ".join(cells[4:]), "cells": cells, "src": src, "line": n}))
    keyed.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in keyed]


def _same(a: str, b: str) -> bool:
    """Two spellings of one commit: a LEDGER writes a sha at 7 or at 8 characters, so one is a prefix of the other."""
    return a.startswith(b) or b.startswith(a)


def _fold(tokens: Iterable[str]) -> list[str]:
    """Each commit once, in the place it first appears, at its LONGEST spelling (`569cd07 569cd070` → `569cd070`)."""
    out: list[str] = []
    for t in tokens:
        k = next((i for i, s in enumerate(out) if _same(s, t)), None)
        if k is None:
            out.append(t)
        elif len(t) > len(out[k]):
            out[k] = t
    return out


def sha_tokens(text: str) -> list[str]:
    """The sha-shaped tokens of one cell, in order, each commit once (`_fold`). An all-digit token longer than 8 is a
    CI run id (30949598299), and a token with no digit is a hex WORD (`defaced`) — neither is a commit."""
    return _fold(t for t in SHA_RX.findall(text or "")
                 if not ((t.isdigit() and len(t) > 8) or not any(ch.isdigit() for ch in t)))


def _ws(text: str) -> str:
    return " ".join((text or "").split())


def _file_order(dates: list[str]) -> str:
    """How one file keeps its rows, from its dates in line order: every step rising (appended), every step falling or
    none at all (the spec's prepended shape), or both (a prepended head over an appended tail)."""
    up = sum(1 for a, b in zip(dates, dates[1:]) if b > a)
    down = sum(1 for a, b in zip(dates, dates[1:]) if b < a)
    return "mixed" if up and down else "oldest-first" if up else "newest-first"


def empty_spine(reason: str | None) -> dict:
    """The spine's one shape with nothing in it — the stub spine.js carries when there is no LEDGER to read."""
    return {"v": 1, "order": list(SPINE_ORDER), "beats": {b: [] for b in SPINE_ORDER}, "sources": [],
            "no_sha": {b: 0 for b in SPINE_ORDER}, "reason": reason}


def ledger_spine(rows: list[dict], kdbp_label: str | None = None) -> dict:
    """The five beats as columns, newest first — `rows` as `ledger_rows(kdbp, include_archive=True)` returns them.

    A row's commit is read from its Commits cell BY POSITION (the fourth cell, however many cells follow); a row that
    names none there is kept only when its Gates prove a green commit (`green@<sha>`, `via: "gates"`), otherwise it
    is dropped and counted in `no_sha`. Within one beat each commit sits in ONE entry — the one of the newest row
    that names it, matched by prefix (a LEDGER writes a sha at 7 or at 8 characters) and held at its longest
    spelling. A row whose commits are all held already folds into the entry holding its first (`rows` + 1); a row
    that names new ones is an entry of its own holding only those — so a phase summary that re-lists its task
    checkpoints never shows one commit twice, and a beat's `rows` plus its `no_sha` count every row of that beat.
    No dedupe crosses beats. `kdbp_label` renames the kdbp dir in every `src` (the repo-relative path when
    `paths.kdbp` moved it). No head, no wallclock: the bytes move only when the LEDGER does."""
    spine = empty_spine(None)
    held: dict[tuple[str, str], list[dict]] = {}   # (beat, sha[:7]) → the entries holding a spelling of that commit
    per_file: dict[str, list[tuple[int, str]]] = {}
    for r in rows:
        src = r["src"] if not kdbp_label else kdbp_label + "/" + r["src"].split("/", 1)[1]
        per_file.setdefault(src, []).append((r["line"], r["date"]))
        beat = BEATS.get(re.sub("[^A-Z]", "", r["entry"].upper()))
        if not beat:
            continue
        cells = r["cells"]
        shas, via = sha_tokens(cells[3] if len(cells) > 3 else ""), "commits"
        if not shas:
            shas, via = _fold(GREEN_RX.findall(r["gates"])), "gates"
        if not shas:
            spine["no_sha"][beat] += 1
            continue
        new, first = [], None
        for t in shas:
            e = next((h for h in held.get((beat, t[:7]), []) if any(_same(t, s) for s in h["shas"])), None)
            if e is None:
                new.append(t)
                continue
            first = first or e      # held by a newer row: that entry keeps it, at the longer of the two spellings
            e["shas"] = [t if _same(t, s) and len(t) > len(s) else s for s in e["shas"]]
            e["sha"] = e["shas"][0]
        if not new:
            first["rows"] += 1
            continue
        entry = {"date": r["date"], "sha": new[0], "shas": new, "label": _ws(r["theme"])[:120],
                 "gates": _ws(r["gates"])[:160], "via": via, "rows": 1, "src": f"{src}:{r['line']}"}
        for t in new:
            held.setdefault((beat, t[:7]), []).append(entry)
        spine["beats"][beat].append(entry)
    spine["sources"] = [{"file": f, "rows": len(v), "order": _file_order([d for _, d in sorted(v)])}
                        for f, v in sorted(per_file.items(), key=lambda kv: ("/archive/" in kv[0], kv[0]))]
    if not any(spine["beats"].values()):
        spine["reason"] = "no RED/EXECUTE/REVIEW/COMMIT/PUSH row names a commit"
    return spine
