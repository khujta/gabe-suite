#!/usr/bin/env python3
"""datefix.py — a centre project whose BOARD carries dates on every side of the framings' bounds (D-061).

    datefix.py <root> [--evidence]

The seats' plain project (tests/embed-pane/seatfix.py --project) plus a .kdbp/ whose PENDING rows, PLAN phase and walk
are dated so that, measured from 2026-09-27 and again from 2026-09-28, a card crosses each bound the page counts: 7 days
(This week → 8 – 30 days · a close inside / outside the last 7), 30 (a close inside / outside the closed-30d window),
90 (an open card turning "over 3 months"), and 0 (a card recorded on the day itself). One open and one closed card carry
no date at all (the undated columns), and a PLAN phase owing cells was last touched by a LEDGER row (its "touched"
chip — review B-5). Nothing here reads the clock: the dates are literals, so the SAME tree is built twice with the
clock moved and must render the same board.

--evidence  also claim two proof sets for the gadget entity and make the tree a git repo (review B-1 · B-2 · B-4): the
            set `gadget-walk` is COMMITTED at 2026-09-28T01:30:00Z — 22:30 on the 27th at UTC−3, the evening a UTC
            date got wrong — and its shot's file time is set to a later day (a checkout's time, which must not count);
            `gadget-draft` is never committed and counts by its file time, 2026-09-20T12:00:00Z. The feature page's
            Captured cell then carries both, for a viewer in UTC and one in America/Sao_Paulo (UTC−3, no DST).
"""
import os
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

ROWS = (   # num · recorded · finding · status (a CLOSED/RESOLVED status carries its close date)
    ("1", "2026-09-27", "recorded on the day itself (0 days)", "OPEN"),
    ("2", "2026-09-26", "recorded the day before (1 day)", "OPEN"),
    ("3", "2026-09-20", "recorded 7 days before — This week, then 8 – 30", "OPEN"),
    ("4", "2026-08-28", "recorded 30 days before — 8 – 30, then 1 – 3 months", "OPEN"),
    ("5", "2026-06-29", "recorded 90 days before — aging, then over 3 months", "OPEN"),
    ("6", "2026-01-02", "recorded in January — over 3 months on both days", "OPEN"),
    ("7", "2026-09-01", "closed 7 days before — inside the last 7, then outside", "RESOLVED 2026-09-20"),
    ("8", "2026-08-01", "closed 30 days before — inside closed-30d, then outside", "RESOLVED 2026-08-28"),
    ("9", "2026-05-01", "closed in May", "RESOLVED 2026-05-10"),
    ("10", "2026-07-01", "closed with no date recorded", "RESOLVED"),
) + tuple((str(n), f"2026-02-{n:02d}", f"a February finding, medium priority — past the column's fold ({n})", "OPEN")
          for n in range(11, 19))   # eight more over-3-months cards: the stale column folds past its eight


def main(argv: list[str]) -> int:
    root = Path(argv[0]).resolve()
    subprocess.run([sys.executable, str(HERE.parent / "embed-pane" / "seatfix.py"), str(root), "--project"], check=True)
    k = root / ".kdbp"
    k.mkdir(parents=True, exist_ok=True)
    head = ("| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status | Verified |",
            "|---|---|---|---|---|---|---|---|---|---|---|")
    (k / "PENDING.md").write_text("\n".join(("# Deferred Items", "", *head, *(
        f"| {n} | {d} | review | {f} | `src/api.py` | mvp | {'medium' if int(n) > 10 else 'low'} | low | 0 | {st} | — |"
        for n, d, f, st in ROWS), "")))
    (k / "PLAN.md").write_text("\n".join((
        "# Plan", "", "## Current Phase", "", "Phase 1", "", "## Phases", "",
        "| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |", "|---|---|---|---|---|---|---|---|---|",
        "| 1 | P1 · Gadget sync | sync the gadgets | mvp | low | ✅ | ⬜ | ⬜ | ⬜ |", "")))
    (k / "walks.jsonl").write_text(json.dumps({"subject": "adopt:gadget", "when": "2026-09-25", "who": "op",
                                               "result": "pass", "note": "walked the gadget page"}) + "\n")
    (k / "LEDGER.md").write_text("| 2026-09-24 | EXEC | Phase P1 — the gadget sync, task 2 | — | lint ok |\n"
                                 "| 2026-09-10 | EXEC | Phase P1 — the gadget sync, task 1 | — | lint ok |\n")
    if "--evidence" in argv:
        evidence(root)
    return 0


PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a90000000049454e44ae426082")


def evidence(root: Path) -> None:
    cfg = root / "docs/site/center/center.config.json"
    c = json.loads(cfg.read_text())
    c["entities"]["gadget"]["proofs"] = ["gadget-walk", "gadget-draft"]
    cfg.write_text(json.dumps(c, indent=1))
    (root / "docs/site/center/cards").mkdir(parents=True, exist_ok=True)       # a card: the feature page is written
    (root / "docs/site/center/cards/gadget.md").write_text(
        "# HANDLE\nThe gadget slice.\n# WHAT & WHY\nGadgets end to end.\n# FOR WHOM\nFixture people.\n"
        "# FLOWS\n- walk ★ → open the gadget page\n# IS\nThe gadget slice.\n# IS NOT\nEverything else.\n"
        "# DECIDED\n- D1 fixture ruling.\n")
    proof = root / "tests/web-e2e/proof"
    for name in ("gadget-walk", "gadget-draft"):
        (proof / name).mkdir(parents=True, exist_ok=True)
        (proof / name / "01-open.png").write_bytes(PNG)
        (proof / name / "manifest.json").write_text(json.dumps({"feature": "gadget", "source_run": "the fixture"}))
    env = {**os.environ, "GIT_AUTHOR_DATE": "2026-09-28T01:30:00Z", "GIT_COMMITTER_DATE": "2026-09-28T01:30:00Z",
           "GIT_AUTHOR_NAME": "fx", "GIT_AUTHOR_EMAIL": "fx@x", "GIT_COMMITTER_NAME": "fx", "GIT_COMMITTER_EMAIL": "fx@x"}
    run = lambda *a: subprocess.run(["git", *a], cwd=root, check=True, capture_output=True, env=env)
    run("init", "-q")
    run("add", "-A", "--", ".", ":!tests/web-e2e/proof/gadget-draft")
    run("commit", "-q", "-m", "the gadget and its walk")
    later = 1790000000                                            # 2026-09-21: the checkout's time, never the capture's
    os.utime(proof / "gadget-walk" / "01-open.png", (later + 900000, later + 900000))
    os.utime(proof / "gadget-draft" / "01-open.png", (1789905600, 1789905600))   # 2026-09-20T12:00:00Z


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
