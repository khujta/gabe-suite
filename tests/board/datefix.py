#!/usr/bin/env python3
"""datefix.py — a centre project whose BOARD carries dates on every side of the framings' bounds (D-061).

    datefix.py <root> [--evidence] [--runs]

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
--runs      also five suite reports and a run history in a git tree (D-062): the index's Last run and the test corpora's
            changelog carry the RUN's day (never the build's) — else the report's commit or file time, said so — and the
            page counts it; see runs() below.
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
    if "--runs" in argv:
        runs(root)
    return 0


def runs(root: Path) -> None:
    """D-062 · the suite runs whose days the index and the test corpora count, in a git tree (the D-062 review's F1-F3):

    api     pytest   names its zone — 22:30 on the 20th in UTC−3, 2026-09-21T01:30Z — and moved its totals since the
                     history's last pytest line, so a build APPENDS one stamped with that RUN's time;
    web     vitest   names no zone (a runner's local time, 01:00 on the 24th, read as written) and matches the history's
                     vitest line, stamped 2026-09-24T12:00Z;
    jest    jest     names no zone but its corpus says `naive_tz: utc` (jest-junit writes UTC unmarked): the INSTANT
                     2026-09-21T01:30Z, appended as such;
    pw      playwright  a run time that does not parse; the report is COMMITTED at 2026-09-22T15:00Z and its file time
                     is a later checkout's (2026-09-26T12:00Z) — the commit dates it, on index and in the history;
    loose   mocha    no run time; never committed; its file time, 2026-09-23T12:00Z, dates it.

    Built with GABE_CENTER_OUT (a lab run), so the history here is never rewritten and every build starts from the same
    lines."""
    res = root / "tests/results"
    res.mkdir(parents=True, exist_ok=True)
    cfg = root / "docs/site/center/center.config.json"
    c = json.loads(cfg.read_text())
    unit = {"kind": "unit", "kind_detail": "fixture", "tag_class": "l-web"}
    c["corpora"] = [
        {"key": "api", "runner": "pytest", "kind": "integration", "kind_detail": "HTTP surface", "tag_class": "l-api",
         "kpi_detail": "pytest"},
        {"key": "web", "runner": "vitest", "kind": "unit", "kind_detail": "components/hooks", "tag_class": "l-web",
         "kpi_detail": "vitest"},
        {"key": "jest", "runner": "jest", **unit, "kpi_detail": "jest", "naive_tz": "utc"},
        {"key": "pw", "runner": "playwright", **unit, "kpi_detail": "playwright"},
        {"key": "loose", "runner": "mocha", **unit, "kpi_detail": "mocha"}]
    cfg.write_text(json.dumps(c, indent=1))
    card(root)                                                    # the feature page's Tests tab: each corpus "captured"
    case = '<testcase classname="tests.test_gadgets" name="test_gadget_{0}" time="0.1"/>'
    (res / "api-junit.xml").write_text('<testsuites><testsuite name="pytest" timestamp="2026-09-20T22:30:00-03:00">'
                                       + "".join(case.format(i) for i in range(3)) + "</testsuite></testsuites>")
    (res / "web-junit.xml").write_text('<testsuites><testsuite name="vitest" timestamp="2026-09-24T01:00:00">'
                                       '<testcase classname="src/gadget.test.ts" name="arms" time="0.01"/>'
                                       "</testsuite></testsuites>")
    (res / "jest-junit.xml").write_text('<testsuites><testsuite name="jest" timestamp="2026-09-21T01:30:00">'
                                        '<testcase classname="src/gadget.spec.ts" name="jest arms" time="0.01"/>'
                                        "</testsuite></testsuites>")
    (res / "pw-junit.xml").write_text('<testsuites><testsuite name="playwright" timestamp="Tue, 22 Sep 2026 15:00:00 GMT">'
                                      '<testcase classname="e2e/gadget.spec.ts" name="walk" time="1"/>'
                                      "</testsuite></testsuites>")
    (res / "loose-junit.xml").write_text('<testsuites><testsuite name="mocha">'
                                         '<testcase classname="test/gadget.js" name="loose arms" time="0.01"/>'
                                         "</testsuite></testsuites>")
    (root / "docs/site/center/run-history.jsonl").write_text(
        json.dumps({"ts": "2026-09-10T12:00:00Z", "source": "pytest", "totals": {"passed": 1, "failed": 0, "skipped": 0}}) + "\n"
        + json.dumps({"ts": "2026-09-24T12:00:00Z", "source": "vitest", "totals": {"passed": 1, "failed": 0, "skipped": 0}}) + "\n")
    env = {**os.environ, "GIT_AUTHOR_DATE": "2026-09-22T15:00:00Z", "GIT_COMMITTER_DATE": "2026-09-22T15:00:00Z",
           "GIT_AUTHOR_NAME": "fx", "GIT_AUTHOR_EMAIL": "fx@x", "GIT_COMMITTER_NAME": "fx", "GIT_COMMITTER_EMAIL": "fx@x"}
    run = lambda *a: subprocess.run(["git", *a], cwd=root, check=True, capture_output=True, env=env)
    run("init", "-q")
    run("add", "-A", "--", ".", ":!tests/results/loose-junit.xml")
    run("commit", "-q", "-m", "the gadget and its runs")
    os.utime(res / "pw-junit.xml", (1790424000, 1790424000))    # 2026-09-26T12:00:00Z: a checkout's time, never the run's
    os.utime(res / "loose-junit.xml", (1790164800, 1790164800))  # 2026-09-23T12:00:00Z: untracked — its file time dates it


def card(root: Path) -> None:
    """A card for the gadget entity: the feature page is written."""
    (root / "docs/site/center/cards").mkdir(parents=True, exist_ok=True)
    (root / "docs/site/center/cards/gadget.md").write_text(
        "# HANDLE\nThe gadget slice.\n# WHAT & WHY\nGadgets end to end.\n# FOR WHOM\nFixture people.\n"
        "# FLOWS\n- walk ★ → open the gadget page\n# IS\nThe gadget slice.\n# IS NOT\nEverything else.\n"
        "# DECIDED\n- D1 fixture ruling.\n")


PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a90000000049454e44ae426082")


def evidence(root: Path) -> None:
    cfg = root / "docs/site/center/center.config.json"
    c = json.loads(cfg.read_text())
    c["entities"]["gadget"]["proofs"] = ["gadget-walk", "gadget-draft"]
    cfg.write_text(json.dumps(c, indent=1))
    card(root)
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
