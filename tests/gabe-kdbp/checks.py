#!/usr/bin/env python3
"""gabe-kdbp battery — the KDBP-state server's executable contract (run by tests/gabe-kdbp/run.sh).

Hermetic: a synthetic .kdbp/ (PLAN.md table + PLAN.json mirror + Phase Details records · PENDING.md in the
11-column canon with token- and comment-closed rows · LEDGER.md with Phase P2 rows carrying REAL fixture shas ·
BEHAVIOR.md with ## Verify Commands · DECISIONS.md) inside a temp git repo, plus a divergent second repo
(3-column PENDING, no BEHAVIOR binding, a package.json). Reuses tests/gabe-map's client and fixture center so
phase_context's entity briefs are exercised through gabe-map's bodies. Previews are proven to write NOTHING.

Env: SERVER_OVERRIDE (mutation proof; same-dir copies) · GABE_SKILLS_DIR.
"""
from __future__ import annotations
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SERVER = os.environ.get("SERVER_OVERRIDE") or os.path.join(REPO, "skills", "gabe-kdbp", "scripts", "server.py")
os.environ.setdefault("GABE_SKILLS_DIR", os.path.join(REPO, "skills"))
sys.path.insert(0, os.path.join(REPO, "tests", "gabe-map"))
from client import Client, parse_text  # noqa: E402
import checks as mapfx  # noqa: E402  (fixture center + write + fake graft from the gabe-map battery)

PASS = FAIL = 0


def ok(cond, msg, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        print("FAIL: %s%s" % (msg, (" — " + str(extra)[:300]) if extra else ""))


def sh(args, cwd=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)


def git(root, *a):
    return sh(["git", "-C", root, *a]).stdout.strip()


W = mapfx.write


def make_repo(T: str) -> tuple[str, dict]:
    """A KDBP project with a center: returns (root, shas)."""
    root = mapfx.make_repo(T)                      # source + center + 3 commits, .kdbp/ dir exists
    # archie D (2026-09-24): an EARLIER plan's "Phase P2" row and a HANDOFF row name commits that are NOT this
    # phase's work — review_target must drop both, or their files join changed_files and the base moves back
    old_sha = git(root, "rev-list", "--max-parents=0", "--abbrev-commit", "HEAD")
    pre_sha = git(root, "rev-parse", "--short", "HEAD")
    # the RED checkpoint (declares a case) then two exec commits "for phase P2" — review_target resolves all three
    W(root, "apps/api/tests/test_things_api.py", 'def test_get_thing_C8():\n    assert False  # red\n')
    git(root, "add", "-A"); git(root, "commit", "-q", "-m", "red(P2): C8 declared")
    sha0 = git(root, "rev-parse", "--short", "HEAD")
    W(root, "apps/api/services/thing.py", '"""Service for things."""\n\n\ndef thing():\n    return 2\n')
    git(root, "add", "-A"); git(root, "commit", "-q", "-m", "P2: thing returns 2")
    sha1 = git(root, "rev-parse", "--short", "HEAD")
    W(root, "apps/api/other.py", open(os.path.join(root, "apps/api/other.py")).read() + "\n\ndef extra():\n    return 3\n")
    git(root, "add", "-A"); git(root, "commit", "-q", "-m", "P2: extra")
    sha2 = git(root, "rev-parse", "--short", "HEAD")
    W(root, ".kdbp/PLAN.md", """# Plan

## Goal
Fixture goal.

- **Created:** 2026-08-20

## Current Phase
P2

## Phases

| Phase | Name | Tier | Red | Exec | Review | Commit | Push | Center |
|---|---|---|---|---|---|---|---|---|
| P1 | Bootstrap | mvp | ✅ | ✅ | ✅ | ✅ | ✅ | ⏸ deferred |
| P2 | Things v2 | mvp | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| P3 | Widgets | enterprise | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Phase Details

### Phase P2 — Things v2
- **Cases:** C7 (REUSE) · C9 (NEW)
- **Reach:** apps/api/services/thing.py · apps/api/other.py (graft@%s)
- **Class:** feature

### Phase P3 — Widgets
- Tasks TBD.
""" % sha1)
    W(root, ".kdbp/PLAN.json", json.dumps({"version": 1, "status": "active", "project_type": "code", "goal": "Fixture goal.", "maturity": "mvp",
                                          "current_phase": "P2", "phases": [
        {"id": "P1", "name": "Bootstrap", "tier": "mvp", "cells": {"red": "done", "exec": "done", "review": "done", "commit": "done", "push": "done", "center": "deferred"}, "entities": ["thing"]},
        {"id": "P2", "name": "Things v2", "tier": "mvp", "complexity": "low", "types": ["core-only"], "proof": "pytest -k thing", "proof_type": "test", "cases": ["C7", "C9"],
         "scope": ["apps/api/services/*.py", "apps/api/other.py"], "entities": ["thing"],
         "cells": {"red": "done", "exec": "done", "review": "todo", "commit": "todo", "push": "todo", "center": "todo"}},
        {"id": "P3", "name": "Widgets", "tier": "enterprise", "cells": {"red": "todo", "exec": "todo", "review": "todo", "commit": "todo", "push": "todo", "center": "todo"}, "entities": [], "scope": []}]}))
    W(root, ".kdbp/PENDING.md", """# Pending

<!-- a production-gate MAP (3 cols) sits above the canonical table on real twins (gustify) -->

| # | Gate | Finding |
|---|---|---|
| G1 | founder | a gate note, not a deferred finding |
| G2 | founder | another gate note |

## Rows

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status | Verified |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 2026-08-01 | review | [security] thing leaks ids | apps/api/services/thing.py | mvp | high | data | 2 |  | @abc1234 2026-08-01 |
| P2 | 2026-08-02 | review | [perf] other.py loops twice | apps/api/other.py | mvp | medium | slow | 1 | RESOLVED 2026-08-10 | @abc1234 2026-08-02 |
| P3 | 2026-08-03 | health | [debt] widget model unowned | apps/api/models/widget.py | mvp | low | none | 1 |  | @abc1234 2026-08-03 |
<!-- P3 resolved 2026-08-11: claimed by the other entity -->
| P4 | 2026-08-04 | roast | [ux] no undo on delete | apps/web/src/things.ts | mvp | critical | trust | 3 |  | @abc1234 2026-08-04 |
""")
    W(root, ".kdbp/LEDGER.md", """# Session Ledger — thin index

| Date | Entry | Theme / scope | Commits | Gates / results |
|---|---|---|---|---|
| 2026-09-03 | HANDOFF | Phase P2 live; review next | HEAD %s | resume → HANDOFF.md |
| 2026-09-02 | EXEC | Phase P2 — tasks 2/2 | %s %s | lint ✓ · tests 3 passed |
| 2026-09-01 | RED | Phase P2 — 1 NEW · 1 REUSE | %s | RED: 1 failing (pytest, exit 1) · guards proven 0/0 · Red ✅ |
| 2026-08-30 | PUSH | main ← main @ deadbee | deadbee | push ✓ |
| 2026-07-10 | EXEC | Phase P2 — an EARLIER plan's P2 | %s | lint ✓ |
""" % (pre_sha, sha1, sha2, sha0, old_sha))
    W(root, ".kdbp/BEHAVIOR.md", """# Behavior

**Maturity:** mvp
**Mode:** standard

## Verify Commands

- lint: `ruff check .`
- types: `mypy apps`
- tests: `pytest -q --junitxml=tests/results/api-junit.xml` · `npm test`
- results_out: tests/results/api-junit.xml
""")
    W(root, ".kdbp/DECISIONS.md", "# Decisions\n\n| # | Date | Decision |\n|---|---|---|\n| D1 | 2026-08-01 | keep things |\n| D2 | 2026-08-02 | drop widgets |\n")
    W(root, ".kdbp/archive/PENDING-resolved_2026-08.md", "| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status | Verified |\n|---|---|---|---|---|---|---|---|---|---|---|\n| P9 | 2026-07-01 | review | old | x.py | mvp | low | none | 1 | RESOLVED | @a 2026-07-01 |\n")
    git(root, "add", "-A"); git(root, "commit", "-q", "-m", "kdbp fixture")
    return root, {"sha0": sha0, "sha1": sha1, "sha2": sha2}


def make_variant(T: str) -> str:
    root = os.path.join(T, "variant"); os.makedirs(os.path.join(root, ".kdbp"))
    sh(["git", "init", "-q", root]); git(root, "config", "user.email", "t@t"); git(root, "config", "user.name", "t")
    W(root, ".kdbp/PENDING.md", "# Pending\n\n| # | Gate | Finding |\n|---|---|---|\n| #20 | founder | Multi-user deferred FAR |\n| #21 | review | Closed one |\n<!-- #21 resolved 2026-08-01 -->\n")
    W(root, ".kdbp/PLAN.md", "# Plan\n\n## Phases\n\n| # | Phase | Description | Exec | Review |\n|---|---|---|---|---|\n| 1 | Alpha | #105 — the long description text | 🔄 | ⬜ |\n")
    W(root, "package.json", json.dumps({"name": "v", "scripts": {"lint": "eslint .", "typecheck": "tsc --noEmit", "test": "vitest run"}}))
    W(root, "README.md", "v\n")
    git(root, "add", "-A"); git(root, "commit", "-q", "-m", "variant")
    return root


def spawn(root, T, cwd=None):
    env = {"PATH": os.environ.get("PATH", ""), "GABE_SKILLS_DIR": os.environ["GABE_SKILLS_DIR"], "GABE_MAP_NO_EMIT": "1"}
    return Client(SERVER, root, env=env, cwd=cwd or T)


def call_json(c, name, args):
    text, is_err, raw = c.call(name, args)
    return parse_text(text), is_err, text, raw


def md5(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()


def main() -> int:
    T = tempfile.mkdtemp(prefix="gabe-kdbp-")
    try:
        run(T)
    finally:
        shutil.rmtree(T, ignore_errors=True)
    print("gabe-kdbp battery: %d passed, %d failed" % (PASS, FAIL))
    return 0 if FAIL == 0 else 1


def run(T):
    root, shas = make_repo(T)
    # ── wire laws on THIS server too ──
    c = spawn(root, T)
    r = c.request("server/discover", {}, id_="server-discover-probe-1")
    ok(r and r.get("error", {}).get("code") == -32601 and r.get("id") == "server-discover-probe-1", "pre-init server/discover → -32601, string id echoed", r)
    init = c.initialize("2025-11-25")
    res = (init or {}).get("result") or {}
    ok(res.get("serverInfo", {}).get("name") == "gabe-kdbp" and "mcp__gabe-kdbp__kdbp_snapshot" in (res.get("instructions") or ""), "serverInfo + routing instructions", res.get("serverInfo"))
    names = sorted(t["name"] for t in c.tools())
    ok(names == sorted(["kdbp_snapshot", "phase_context", "review_target", "next_beat", "verify_commands", "pending_row_preview", "ledger_row_preview"]), "seven kdbp tools listed", names)
    ok(all(t["annotations"]["readOnlyHint"] is True for t in c.tools()), "every kdbp tool is readOnly (previews included)")
    # ── snapshot ──
    d, is_err, text, raw = call_json(c, "kdbp_snapshot", {})
    ok(d and d["present"] and not is_err and "structuredContent" not in (raw["result"]), "snapshot answers on one text channel", text[:80])
    ok(d and d["plan"]["current_phase"] == "P2" and [p["id"] for p in d["plan"]["phases"]] == ["P1", "P2", "P3"], "plan table parsed header-resolved (3 phases, current P2)", d and d.get("plan"))
    ok(d and d["plan"]["phases"][1]["cells"] == {"red": "done", "exec": "done", "review": "todo", "commit": "todo", "push": "todo", "center": "todo"}, "cell states normalized", d and d["plan"]["phases"][1])
    ok(d and d["plan"]["phases"][0]["cells"]["center"] == "skipped", "⏸ deferred reads as skipped", d and d["plan"]["phases"][0])
    ok(d and d["pending"]["columns"] == ["#", "Date", "Source", "Finding", "File", "Scale", "Priority", "Impact", "Times Deferred", "Status", "Verified"], "K1/F2: the WIDEST keyword table wins — the canonical 11-col PENDING, not the 3-col gate-map decoy above it", d and d["pending"].get("columns"))
    ok(d and d["pending"]["open"] == 2 and d["pending"]["closed"] == 2, "PENDING closure: token-closed + comment-closed = 2 closed, 2 open", d and d.get("pending"))
    ok(d and d["pending"]["top"][0]["id"] == "P4" and d["pending"]["top"][0]["priority"] == "critical", "open rows ranked critical first", d and d["pending"]["top"])
    ok(d and [r["entry"] for r in d["ledger"]["last"]] == ["HANDOFF", "EXEC", "RED", "PUSH", "EXEC"], "K4: ledger rows sorted newest-first by Date (HANDOFF 09-03 · EXEC 09-02 · RED 09-01 · PUSH 08-30 · EXEC 07-10)", d and [(r["date"], r["entry"]) for r in d["ledger"]["last"]])
    ok(d and d["decisions"]["rows"] == 2 and d["git"]["branch"] and d["git"]["dirty"]["total"] == 0, "decisions count + git facts", d and {k: d.get(k) for k in ("decisions", "git")})
    ok(len(text) < 6000, "snapshot stays small (%d bytes)" % len(text))
    # ── phase_context ──
    d, _, _, _ = call_json(c, "phase_context", {})
    ok(d and d["phase"] == "P2" and d["plan_json"]["entities"] == ["thing"] and d["plan_md_row"]["cells"]["review"] == "todo", "phase_context defaults to current_phase, joins PLAN.json + table row", d and {k: d.get(k) for k in ("phase", "plan_md_row")})
    ok(d and d["records"].get("cases") == "C7 (REUSE) · C9 (NEW)" and d["records"].get("reach", "").startswith("apps/api/services/thing.py"), "Cases:/Reach: records extracted", d and d.get("records"))
    ok(d and d["behavior"]["maturity"] == "mvp" and d["behavior"]["verify_commands"]["tests"] == ["pytest -q --junitxml=tests/results/api-junit.xml", "npm test"] and d["behavior"]["verify_commands"]["results_out"] == ["tests/results/api-junit.xml"], "BEHAVIOR facts + Verify Commands parsed", d and d.get("behavior"))
    ok(d and [r["id"] for r in d["pending_in_scope"]] == ["P1"], "open PENDING rows matched to the phase scope globs (closed P2 excluded)", d and d.get("pending_in_scope"))
    ok(d and isinstance(d["entities"], dict) and "thing" in d["entities"] and isinstance(d["entities"]["thing"], dict) and d["entities"]["thing"].get("slug") == "thing", "declared entities get gabe-map briefs", d and str(d.get("entities"))[:200])
    ok(d and not any("Red is unstarted" in w for w in d["warnings"]), "no Red warning when Red ✅", d and d.get("warnings"))
    d, _, _, _ = call_json(c, "phase_context", {"phase": "P3"})
    ok(d and any("Red is unstarted" in w for w in d["warnings"]) and any("no declared entities" in w for w in d["warnings"]), "P3: Red-unstarted + no-entities warnings", d and d.get("warnings"))
    # ── S1 (review batch 2): a plan with NO Red column is a non-TDD project — the Red warning must NOT fire.
    # Before the guard, a missing `red` cell went through _state("") → "todo" and every such plan was nagged.
    _plan_path = os.path.join(root, ".kdbp", "PLAN.md")
    _plan_orig = open(_plan_path, encoding="utf-8").read()
    _no_red = []
    for _l in _plan_orig.splitlines():
        if _l.startswith("| Phase | Name | Tier | Red |"):
            _l = _l.replace("| Red |", "|", 1)
        elif _l.startswith("|---|---|---|---|---|---|---|---|---|"):
            _l = _l[:-4]                                   # one fewer column
        elif _l.startswith("| P") and _l.count("|") == 10:  # a phase row: drop the 4th cell (Red)
            _c = _l.split("|"); del _c[4]; _l = "|".join(_c)
        _no_red.append(_l)
    W(root, ".kdbp/PLAN.md", "\n".join(_no_red) + "\n")
    d, _, _, _ = call_json(c, "phase_context", {"phase": "P3"})
    ok(d and "red" not in (d.get("plan_md_row") or {}).get("cells", {}) and not any("Red is unstarted" in w for w in d["warnings"]),
       "S1: no Red column → no Red warning (a non-TDD plan is not nagged)", d and {"cells": (d.get("plan_md_row") or {}).get("cells"), "warnings": d.get("warnings")})
    W(root, ".kdbp/PLAN.md", _plan_orig)
    d, _, _, _ = call_json(c, "phase_context", {"phase": "P9"})
    ok(d and "reason" in d["plan_json"] and "reason" in d["plan_md_row"], "unknown phase → reasons, not a crash", d)
    # ── review_target ──
    d, _, _, _ = call_json(c, "review_target", {})
    ok(d and d["target"]["phase"] == "P2" and set(d["commits"]) == {shas["sha0"], shas["sha1"], shas["sha2"]}, "review_target: P2 (Exec ✅ Review ⬜) via LEDGER shas — the RED row's commit included", d and {k: d.get(k) for k in ("target", "commits")})
    ok(d and set(d["changed_files"]) == {"apps/api/tests/test_things_api.py", "apps/api/services/thing.py", "apps/api/other.py"} and d["base"] == git(root, "rev-parse", "--short", shas["sha0"] + "^"),
       "changed files = union of RED + EXEC commits (the declared case rides along); base = parent of the EARLIEST (the red checkpoint)", d and {k: d.get(k) for k in ("changed_files", "base", "source")})
    ok(d and d.get("floor") == "2026-08-20" and (d.get("floor_source") or "").startswith("PLAN.md") and d.get("skipped_rows") == {"before_floor": 1, "not_a_commit_entry": 1},
       "review_target: the plan's Created date floors the rows (an earlier plan's P2 dropped) and a HANDOFF row's sha is not the phase's work (archie D + D2)", d and {k: d.get(k) for k in ("floor", "floor_source", "skipped_rows")})
    d, _, _, _ = call_json(c, "review_target", {"phase": "P3"})
    ok(d and d["target"]["phase"] == "P3" and "git diff HEAD" in d["source"], "forced phase without LEDGER rows falls back to git diff", d and d.get("source"))
    # ── next_beat ──
    d, _, _, _ = call_json(c, "next_beat", {})
    has_node = shutil.which("node") is not None
    ok(d and ((d["exit"] == 0 and (d.get("decision") or {}).get("phase") == "P2") if has_node else d["exit"] == 127), "next_beat: decision for P2 (or 127 without node)", d and {k: d.get(k) for k in ("exit", "meaning", "decision")})
    # ── verify_commands ──
    d, _, _, _ = call_json(c, "verify_commands", {})
    ok(d and d["source"].startswith("a:") and d["commands"]["lint"] == ["ruff check ."] and d["probed"] is False, "verify_commands: BEHAVIOR binding wins, never probed", d)
    # ── previews never write ──
    before = {n: md5(os.path.join(root, ".kdbp", n)) for n in ("PENDING.md", "LEDGER.md")}
    d, _, _, _ = call_json(c, "pending_row_preview", {"flag": {"dimension": "security", "severity": "high", "description": "thing leaks ids again", "file": "apps/api/services/thing.py", "source": "review"}})
    ok(d and d["preview"] and d["next_id"] == 10 and d["row"].startswith("| P10 | ") and "[security] thing leaks ids again" in d["row"] and d["columns"][0] == "#", "pending preview: next id over live+archive (P9 archived → P10), canon columns", d and {k: d.get(k) for k in ("next_id", "row")})
    ok(d and d["recurring_candidates"] == ["P1"], "pending preview flags the recurring open row (same file, overlapping words)", d and d.get("recurring_candidates"))
    d, _, _, _ = call_json(c, "ledger_row_preview", {"entry": "REVIEW", "theme": "Phase P2 — WARNING", "commits": "abc1234", "gates": "raw 5 → 2"})
    ok(d and d["row"].endswith("| REVIEW | Phase P2 — WARNING | abc1234 | raw 5 → 2 |") and d["header_found"], "ledger preview in header order, gates verbatim", d and d.get("row"))
    d, is_err, _, _ = call_json(c, "ledger_row_preview", {"entry": "BOGUS", "theme": "x"})
    ok(is_err and "entry must be" in (d or {}).get("stop", ""), "ledger preview rejects an unknown entry", d)
    after = {n: md5(os.path.join(root, ".kdbp", n)) for n in ("PENDING.md", "LEDGER.md")}
    ok(before == after, "previews wrote NOTHING (byte-identical PENDING.md + LEDGER.md)")
    c.close()
    # ── variant: divergent schemas, manifest-only verify ──
    v = make_variant(T)
    c = spawn(v, T); c.initialize()
    d, _, _, _ = call_json(c, "kdbp_snapshot", {})
    ok(d and d["pending"]["open"] == 1 and d["pending"]["closed"] == 1 and d["pending"]["columns"] == ["#", "Gate", "Finding"], "3-column PENDING parsed; #21 closed by comment", d and d.get("pending"))
    ok(d and d["plan"]["phases"] and d["plan"]["phases"][0]["cells"]["exec"] == "active" and d["plan"]["phases"][0]["name"] == "Alpha", "variant PLAN table (# | Phase | Description | Exec | Review): id from #, NAME from Phase (not Description)", d and d.get("plan"))
    d, _, _, _ = call_json(c, "verify_commands", {})
    ok(d and d["source"].startswith("b:") and d["commands"]["lint"] == ["npm run lint"] and d["commands"]["types"] == ["npm run typecheck"] and d["commands"]["tests"] == ["npm run test"] and d.get("offer"), "verify_commands: package.json candidates with the BEHAVIOR offer", d and d.get("commands"))
    d, _, _, _ = call_json(c, "pending_row_preview", {"flag": {"description": "new debt"}})
    ok(d and d["row"] == "| #22 | review | new debt |", "preview follows the file's own 3 columns and #-style ids", d and d.get("row"))
    d, _, _, _ = call_json(c, "review_target", {})
    ok(d and d["target"]["phase"] == "1" and d["target"]["cells"]["exec"] == "active", "review_target picks Exec 🔄 + Review ⬜ in the variant table", d and d.get("target"))
    ok(d and d.get("floor") is None and "no Created date" in (d.get("floor_source") or ""), "a plan without a Created date says it has no floor (never a silent one)", d and {k: d.get(k) for k in ("floor", "floor_source")})
    c.close()
    # ── D-style PENDING ids (archie E, 2026-09-24: all 68 rows were D<n>, the preview minted P70) ──
    ds = os.path.join(T, "dstyle"); os.makedirs(os.path.join(ds, ".kdbp"))
    sh(["git", "init", "-q", ds]); git(ds, "config", "user.email", "t@t"); git(ds, "config", "user.name", "t")
    W(ds, ".kdbp/PENDING.md", "# Pending\n\n| # | Date | Source | Finding | File | Priority | Times Deferred | Status |\n|---|---|---|---|---|---|---|---|\n"
      "| D67 | 2026-09-20 | review | owner call pending | a.py | low | 1 |  |\n| D66 | 2026-09-19 | review | done thing | b.py | low | 1 | RESOLVED |\n"
      "| P3 | 2026-06-01 | review | an old P-style row | c.py | low | 1 |  |\n")
    W(ds, "README.md", "d\n"); git(ds, "add", "-A"); git(ds, "commit", "-q", "-m", "dstyle")
    c = spawn(ds, T); c.initialize()
    d, _, _, _ = call_json(c, "pending_row_preview", {"flag": {"description": "new debt"}})
    ok(d and d["next_id"] == 68 and d["row"].startswith("| D68 | "), "preview mints the file's MAJORITY prefix (D67/D66 over one P3 → D68), never a P by default", d and d.get("row"))
    c.close()
    # ── headerless legacy LEDGER (gastify shape): rows present, no header/separator ──
    hl = os.path.join(T, "headerless"); os.makedirs(os.path.join(hl, ".kdbp"))
    sh(["git", "init", "-q", hl]); git(hl, "config", "user.email", "t@t"); git(hl, "config", "user.name", "t")
    W(hl, ".kdbp/PLAN.md", "# Plan\n\n## Phases\n\n| Phase | Exec | Review |\n|---|---|---|\n| P1 | ✅ | ⬜ |\n")
    W(hl, ".kdbp/LEDGER.md", "# Session Ledger\n\n## legacy prose block — mentions the word Entry in text\nSCOPE: an entry of prose, not a table.\n\n| 2026-08-30 | COMMIT | old work | aaa1111 | ok |\n| 2026-09-01 | PUSH | ship it | bbb2222 | ok |\n")
    W(hl, "README.md", "h\n"); git(hl, "add", "-A"); git(hl, "commit", "-q", "-m", "headerless")
    c = spawn(hl, T); c.initialize()
    d, _, _, _ = call_json(c, "kdbp_snapshot", {})
    led = d.get("ledger", {}).get("last", [])
    ok(led and led[0]["entry"] == "PUSH" and led[0].get("headerless") and len(led) == 2, "K3+fallback: a headerless legacy LEDGER parses its thin-index rows (newest-first), never fabricates a header from prose", d and d.get("ledger"))
    c.close()
    # ── honest-empty ──
    plain = os.path.join(T, "plain"); os.makedirs(plain); sh(["git", "init", "-q", plain])
    c = spawn(plain, T); c.initialize()
    d, is_err, _, _ = call_json(c, "kdbp_snapshot", {})
    ok(d and d["present"] is False and not is_err and "/gabe-init" in d["reason"], "no .kdbp → present:false with the init pointer", d)
    d, is_err, _, _ = call_json(c, "pending_row_preview", {"flag": {"description": "x"}})
    ok(d and d["present"] is False, "previews honest-empty too", d)
    c.close()


if __name__ == "__main__":
    sys.exit(main())
