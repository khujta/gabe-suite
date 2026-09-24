"""The KDBP LEDGER reader — dated rows, newest first BY DATE (stdlib only, pure).

The spec says a LEDGER is written newest first under its header; neither twin does it. gastify APPENDS: a
headerless table under thousands of lines of `## 2026-…` prose, oldest row first. gustify is MIXED: a prepended
head (newest first) sitting over an appended tail (oldest first), with some days in both. A reader that trusts file
position shows one twin its oldest rows as "Recent changes". So order comes from the Date cell, and because a Date
cell is a DAY, the order WITHIN a day comes from the file's LOCAL direction around that day's rows.

Pure on purpose: no import-time I/O, no env reads, no `_center_data` import — the caller passes the kdbp dir, so
the E8 beat tail can run the suite's own generator copy against another project and read that project's tree.
"""
from __future__ import annotations

import datetime as _dt
import re
from pathlib import Path

LEDGER_ROW_RX = re.compile(r"^\|\s*(20\d\d-\d\d-\d\d)\s*\|")


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
    """(date, line number, cells) for every row whose first cell is a real date, in file order."""
    out = []
    for n, line in enumerate(path.read_text().splitlines(), 1):
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
