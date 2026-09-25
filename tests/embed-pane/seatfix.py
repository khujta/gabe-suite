#!/usr/bin/env python3
"""seatfix.py — a centre project whose board seats have something to draw: git history + a LEDGER spine.

    seatfix.py <root> [--project] [--history [--abbrev N]]

--project   write a minimal centre project at <root> (one FastAPI router + a config that claims it) — for a
            battery with no fixture of its own; tests/center passes its mk_fixture tree instead. Alone, it is
            the plain project: no git, no LEDGER, so both seats read honest-empty.
--history   `git init`, three commits that each touch src/api.py (a map file, so each is a commits.js entry),
            and a .kdbp/LEDGER.md naming them in the shapes a real LEDGER has — OLDEST FIRST and headerless
            (gastify's), EXEC beside EXECUTE, one commit logged twice (at 7 and at 8 characters), a REVIEW
            whose Commits cell is `—` but whose Gates prove `green@<sha>`, a 7-character token beside
            8-character ones, a PUSH of a commit the repo does not hold (undrawable), a PUSH whose token is an
            INNER piece of a real sha, never its start (undrawable: a substring join would draw it) — and one
            row in .kdbp/archive/LEDGER-x.md. Prints the three full shas, oldest first, as JSON.
--abbrev N  `git config core.abbrev N` (default 7), so commits.js `short` (git's %h) is N characters. Always
            set in the fixture's own config, so a machine whose global core.abbrev says otherwise builds the
            same feed. The seats must draw by PREFIX either way.
"""
import json
import subprocess
import sys
from pathlib import Path


def git(root: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True, text=True).stdout.strip()


def project(root: Path) -> None:
    (root / "src").mkdir(parents=True, exist_ok=True)
    (root / "src" / "api.py").write_text(
        'router = APIRouter(prefix="/gadgets")\n\n\n'
        '@router.get("/one")\ndef get_gadget():\n    """Fetch one gadget."""\n    return 1\n\n\n'
        '@router.post("/two")\ndef make_gadget():\n    """Make a gadget."""\n    return 2\n')
    c = root / "docs/site/center"
    c.mkdir(parents=True, exist_ok=True)
    (c / "center.config.json").write_text(json.dumps({
        "project": {"name": "seats", "display_name": "Seats", "lang": "en"},
        "paths": {"center": "docs/site/center", "kdbp": ".kdbp"},
        "entities": {"gadget": {"test_rx": "gadget", "code": {"api": ["src/api.py"]}}}}, indent=1))


def main(argv: list[str]) -> int:
    root = Path(argv[0]).resolve()
    abbrev = argv[argv.index("--abbrev") + 1] if "--abbrev" in argv else "7"
    if "--project" in argv:
        project(root)
    if "--history" not in argv:
        return 0
    git(root, "init", "-q")
    git(root, "config", "user.email", "seats@fixture")
    git(root, "config", "user.name", "seats")
    git(root, "config", "core.abbrev", abbrev)
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "gadgets: the first endpoints")
    api = root / "src" / "api.py"
    for i, msg in ((3, "gadgets: a third endpoint"), (4, "gadgets: a fourth endpoint")):
        api.write_text(api.read_text() + f'\n\n@router.get("/n{i}")\ndef gadget_{i}():\n    """Gadget {i}."""\n    return {i}\n')
        git(root, "commit", "-q", "-am", msg)
    c0, c1, c2 = git(root, "log", "--format=%H", "--reverse").split()
    # a sha the repo does not hold, never a prefix of one it does: the PUSH no seat can draw
    ghost = next(g for g in ("fadedbee1", "c0ffee42", "beaded77") if not any(c.startswith(g) for c in (c0, c1, c2)))
    # an INNER piece of ONE real sha that starts none: a prefix join leaves it undrawable, a substring join draws
    # it (with a digit in it — the LEDGER reader takes a digitless token for a hex word, not a commit)
    inner = next(p for p in (c1[o:o + 8] for o in range(1, 32))
                 if any(ch.isdigit() for ch in p) and not any(c.startswith(p) for c in (c0, c1, c2))
                 and sum(p in c for c in (c0, c1, c2)) == 1)
    k = root / ".kdbp"
    (k / "archive").mkdir(parents=True, exist_ok=True)
    (k / "LEDGER.md").write_text("\n".join((
        "## 2026-09-01 — the gadget arc (prose above a headerless table, rows appended oldest first)",
        "",
        f"| 2026-09-01 | RED | red checkpoint — the gadget cases fail | {c0[:8]} | cases C1 C2 red |",
        f"| 2026-09-02 | EXEC | task 1 — a third endpoint | {c1[:7]} | lint ok |",
        f"| 2026-09-02 | EXECUTE | task 2 — a fourth endpoint | {c2[:8]} | tests 4/4 |",
        f"| 2026-09-03 | REVIEW | review of the gadget phase | — | green@{c2[:8]} |",
        f"| 2026-09-03 | COMMIT | commit the gadget phase | {c2[:7]} | size ok |",
        f"| 2026-09-04 | COMMIT | commit again — the same commit, logged twice | {c2[:8]} | |",
        f"| 2026-09-04 | PUSH | push to a remote the fixture never had | {ghost} | ci green |",
        f"| 2026-09-03 | PUSH | a push logged by a mangled sha — a piece of a real one | {inner} | |",
        "")))
    (k / "archive" / "LEDGER-x.md").write_text(
        f"| 2026-08-30 | PUSH | an archived push of the first commit | {c0[:8]} | ci green |\n")
    print(json.dumps({"shas": [c0, c1, c2], "ghost": ghost, "inner": inner}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
