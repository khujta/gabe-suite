#!/usr/bin/env python3
"""C-id backfill sweep — red-spec §Backfill prototype (D5, rulings R2/R3).

Mechanical, idempotent. Roots are EXPLICIT arguments — never inferred.
  usage: backfill_sweep.py [--myopic-labels=C1,C4] <root> [<root>...]   (run from repo root)

Per spec:
  * detection/allocation uses the ANCHORED token pattern
    (?<![A-Za-z0-9])C[0-9]{1,5}(?![0-9])  — decoys like RFC1234/SEC101 never match;
  * colliding id-LIKE label families (myopic scenario labels in vitest titles) are
    renamed to M<n> in the SAME pass (R3) BEFORE allocation, so label tokens never
    burn case ids. The set is ENUMERATED (--myopic-labels), never an open pattern:
    after the sweep, stamped titles legitimately start with `C<n> · `, which an open
    pattern would clobber on any re-run;
  * python: id suffixed into the def name before `(`;  vitest: id prefixed into the title;
  * a name already carrying an anchored C-token is left alone (idempotency);
  * no fake reds — this stamps names only, never touches assertions or claims.

Runbook (rehearsed end-to-end on a synthetic twin, 2026-07-15):
  1. clean tree first; run the sweep; verify counts (def test_/it( before == after) and that
     excluded trees are untouched;
  2. stage the swept files BY EXPLICIT LIST (git add <file>... — never by directory: a stray
     __pycache__/ rode a dir-scoped add in rehearsal), commit: the SWEEP commit;
  3. write the sweep sha into .git-blame-ignore-revs + `git config blame.ignoreRevsFile
     .git-blame-ignore-revs`, commit as an immediately following chore commit (the sha cannot
     ride its own commit);
  4. re-run the sweep (must print stamped=0) — idempotency is the regression check.
Known limits (pre-scan the corpus for these BEFORE the real run): no it.each/test.each/
describe.each handling, no template-literal (backtick) titles, no pytest parametrize-id special
cases. H-family scenario labels (e.g. "H11 · …") are NOT renamed — they get a dual-token title
("C415 · H11 · …") like any other stamp, which is the ruled dual-token form. Allocation reads
full file text by spec (corpus = registry), so data/comment C-tokens inflate the start id —
harmless burn, note it in the sweep commit.
"""
import re
import sys
from pathlib import Path

ANCHORED = re.compile(r"(?<![A-Za-z0-9])C([0-9]{1,5})(?![0-9])")
# `async def test_` is 58%+ of a modern pytest corpus (gastify: 616/1061) — capture and keep it
PY_DEF = re.compile(r"^(?P<indent>\s*)(?P<a>async\s+)?def (?P<name>test_[A-Za-z0-9_]+)\(", re.M)
# vitest/jest test title openers: it("...  it('...  test("...  — the title class excludes only
# the DELIMITING quote, so contractions/apostrophes inside double quotes match (real corpora:
# 97 such titles across the twins). Backtick titles + .each remain known manual follow-ups.
TS_TITLE = re.compile(r"(?P<callq>\b(?:it|test)\(\s*(?P<q>[\"']))(?P<title>(?:\\.|(?!(?P=q))[^\\])*?)(?P=q)")
# already-id'd checks are POSITION-anchored — a mid-title reference like "(C3)" is not an id
PY_HAS_ID = re.compile(r"_C[0-9]{1,5}(v[0-9]+)?$")
TS_HAS_ID = re.compile(r"^C[0-9]{1,5}(v[0-9]+)? ·")

PY_GLOBS = ("test_*.py", "*_test.py")
TS_GLOBS = ("*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx")


def collect(roots):
    py, ts = [], []
    for root in roots:
        base = Path(root)
        if not base.is_dir():
            sys.exit(f"BREAK: explicit root {root!r} is not a directory")
        for g in PY_GLOBS:
            py.extend(sorted(base.rglob(g)))
        for g in TS_GLOBS:
            ts.extend(sorted(base.rglob(g)))
    return sorted(set(py)), sorted(set(ts))


def rename_myopic(ts_files, label_set):
    """R3: ENUMERATED scenario labels at vitest title start → M-family, same sweep."""
    renames = []
    if not label_set:
        return renames
    pat = re.compile(r"^C(" + "|".join(sorted(label_set)) + r")(\s*·)")
    for f in ts_files:
        text = f.read_text(encoding="utf-8")

        def sub(m):
            new_title, n = pat.subn(lambda t: f"M{t.group(1)}{t.group(2)}", m.group("title"))
            if n:
                renames.append((str(f), m.group("title"), new_title))
            return m.group("callq") + new_title + m.group("q")

        new = TS_TITLE.sub(sub, text)
        if new != text:
            f.write_text(new, encoding="utf-8")
    return renames


def alloc_start(files):
    """Allocation = max anchored C-token across the roots + 1 (corpus IS the registry)."""
    mx = 0
    for f in files:
        for m in ANCHORED.finditer(f.read_text(encoding="utf-8")):
            mx = max(mx, int(m.group(1)))
    return mx + 1


def main():
    args = sys.argv[1:]
    label_set = set()
    roots = []
    for a in args:
        if a.startswith("--myopic-labels="):
            label_set = {t.strip().lstrip("C") for t in a.split("=", 1)[1].split(",") if t.strip()}
        else:
            roots.append(a)
    if not roots:
        sys.exit("BREAK: no explicit roots given (roots are never inferred)")
    py_files, ts_files = collect(roots)
    renames = rename_myopic(ts_files, label_set)
    counter = alloc_start(py_files + ts_files)
    stamped, skipped = [], 0

    for f in py_files:
        text = f.read_text(encoding="utf-8")

        def sub_py(m):
            nonlocal counter, skipped
            if PY_HAS_ID.search(m.group("name")):
                skipped += 1
                return m.group(0)
            cid = f"C{counter}"
            counter += 1
            stamped.append((str(f), f"{m.group('name')} -> {m.group('name')}_{cid}"))
            return f"{m.group('indent')}{m.group('a') or ''}def {m.group('name')}_{cid}("

        new = PY_DEF.sub(sub_py, text)
        if new != text:
            f.write_text(new, encoding="utf-8")

    for f in ts_files:
        text = f.read_text(encoding="utf-8")

        def sub_ts(m):
            nonlocal counter, skipped
            if TS_HAS_ID.match(m.group("title")):
                skipped += 1
                return m.group(0)
            cid = f"C{counter}"
            counter += 1
            stamped.append((str(f), f"{m.group('title')!r} -> {cid} · {m.group('title')!r}"))
            return m.group("callq") + f"{cid} · " + m.group("title") + m.group("q")

        new = TS_TITLE.sub(sub_ts, text)
        if new != text:
            f.write_text(new, encoding="utf-8")

    for path, old, new in renames:
        print(f"M-RENAME {path}: {old!r} -> {new!r}")
    for path, change in stamped:
        print(f"STAMP {path}: {change}")
    print(f"summary: files py={len(py_files)} ts={len(ts_files)} · stamped={len(stamped)}"
          f" · already-id'd(skipped)={skipped} · m-renames={len(renames)}"
          f" · next free id=C{counter}")


if __name__ == "__main__":
    main()
