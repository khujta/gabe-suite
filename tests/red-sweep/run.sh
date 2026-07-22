#!/usr/bin/env bash
# C-id backfill sweep fixture battery (alignment review finding M34:
# skills/gabe-red/scripts/backfill-sweep.py shipped with ZERO fixtures, despite
# its own docstring naming a second-run idempotency check as "the regression
# check" and claiming decoys like RFC1234/SEC101 "never match" the anchored
# token pattern).
#
# Proves the script's REAL CLI/behavior as read from its source, against a
# small fixture corpus built fresh in a temp dir on every run: an unstamped
# pytest file and an unstamped vitest file (the shapes collect() actually
# globs — test_*.py/*_test.py and *.test.ts/*.test.tsx/*.spec.ts/*.spec.tsx),
# a decoy file whose SEC101/RFC1234 substrings must never be read as existing
# C-ids by alloc_start()'s anchored regex, a file carrying one REAL pre-existing
# id (the allocation floor), and a file already carrying an M-label scenario
# title (must not be confused with a C-id, and — since no --myopic-labels is
# passed — must still receive the ordinary dual-token C-stamp on top of it).
# Then re-runs the sweep against the now-stamped tree and asserts stamped=0,
# the script's own documented regression check. Hermetic: one temp dir, no
# network, cleans up after itself, never touches the script under test.
# Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SWEEP="$REPO/skills/gabe-red/scripts/backfill-sweep.py"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

# --- fixture corpus (COPIES only, built fresh in $T) ------------------------
C="$T/corpus"
mkdir -p "$C"

# unstamped pytest file — two defs, one async (the collect() PY_GLOBS shape).
cat > "$C/test_ledger.py" <<'EOF'
def test_add_entry():
    assert 1 + 1 == 2


async def test_async_flow():
    assert True
EOF

# unstamped vitest file — two it() titles, one with an apostrophe inside a
# double-quoted title (the collect() TS_GLOBS shape / TS_TITLE quote handling).
cat > "$C/ledger.spec.ts" <<'EOF'
import { it, describe } from "vitest";

describe("ledger", () => {
  it("adds an entry", () => {
    expect(1 + 1).toBe(2);
  });
  it("handles a contraction's title", () => {
    expect(true).toBe(true);
  });
});
EOF

# decoy: SEC101/RFC1234 read as text ("...C101"/"...C1234" preceded by a
# letter) must NOT satisfy the ANCHORED lookbehind — must not be counted as
# existing case ids and must not inflate allocation. The def itself is a
# normal unstamped test and IS expected to be stamped, at a LOW id.
cat > "$C/test_decoy.py" <<'EOF'
def test_decoy_tokens():
    # SEC101 and RFC1234 must never be parsed as case ids
    assert "SEC101" != "RFC1234"
EOF

# a REAL pre-existing anchored id — the allocation floor (PY_HAS_ID must skip
# re-stamping it).
cat > "$C/test_baseline.py" <<'EOF'
def test_prior_case_C9():
    assert True
EOF

# an M-label scenario title (as left behind by a PRIOR rename_myopic() pass).
# M999 must not be misread by ANCHORED as case id 999, and — since this run
# passes no --myopic-labels — TS_HAS_ID must NOT treat "M999 ·" as an
# already-id'd title, so it gets the ordinary dual-token C-stamp on top.
cat > "$C/myopic.spec.ts" <<'EOF'
import { it } from "vitest";

it("M999 · overwhelm on step two", () => {
  expect(true).toBe(true);
});
EOF

# --- run 1: first sweep -----------------------------------------------------
run1=$(python3 "$SWEEP" "$C" 2>"$T/run1.err")
rc1=$?
echo "$run1" > "$T/run1.out"

[ "$rc1" = 0 ] && ok || bad "sweep: first run must exit 0 (got $rc1; stderr: $(cat "$T/run1.err"))"

# shapes matched: both unstamped pytest defs stamped, in file order.
grep -qF "test_add_entry -> test_add_entry_C11" "$T/run1.out" \
  && ok || bad "sweep: unstamped pytest def test_add_entry must be stamped C11"
grep -qF "test_async_flow -> test_async_flow_C12" "$T/run1.out" \
  && ok || bad "sweep: unstamped pytest def test_async_flow must be stamped C12"

# shapes matched: both unstamped vitest titles stamped, in file order.
grep -qF "'adds an entry' -> C13 · 'adds an entry'" "$T/run1.out" \
  && ok || bad "sweep: unstamped vitest title 'adds an entry' must be stamped C13"
grep -qF "\"handles a contraction's title\" -> C14 · \"handles a contraction's title\"" "$T/run1.out" \
  && ok || bad "sweep: unstamped vitest title w/ apostrophe must be stamped C14"

# decoy: stamped at a LOW id (C10) — proves SEC101/RFC1234 never inflated
# allocation (an unanchored match on RFC1234 would have started counting at
# 1235).
grep -qF "test_decoy_tokens -> test_decoy_tokens_C10" "$T/run1.out" \
  && ok || bad "sweep: decoy file's real def must stamp at the LOW next id (C10), not be skewed by SEC101/RFC1234"
grep -qF 'SEC101' "$C/test_decoy.py" && grep -qF 'RFC1234' "$C/test_decoy.py" \
  && ok || bad "sweep: decoy tokens SEC101/RFC1234 must remain verbatim in the file (untouched)"

# baseline: the real pre-existing id must be left alone, not re-stamped.
grep -qF 'test_prior_case_C9' "$T/run1.out" \
  && bad "sweep: already-id'd def test_prior_case_C9 must NOT appear in the stamp log" || ok
grep -qF 'def test_prior_case_C9():' "$C/test_baseline.py" \
  && ok || bad "sweep: already-id'd def must be byte-identical after the sweep"

# M-label: not treated as a C-id (no m-rename fired, since --myopic-labels was
# never given) yet still gets the ordinary dual-token C-stamp riding alongside
# it, with M999 preserved verbatim.
grep -qF "'M999 · overwhelm on step two' -> C15 · 'M999 · overwhelm on step two'" "$T/run1.out" \
  && ok || bad "sweep: M-label title must get the ordinary dual-token C-stamp (C15 · M999 · ...)"
grep -qF 'M-RENAME' "$T/run1.out" \
  && bad "sweep: no --myopic-labels was given — m-rename must NOT fire" || ok
grep -qF 'it("C15 · M999 · overwhelm on step two"' "$C/myopic.spec.ts" \
  && ok || bad "sweep: M999 must survive verbatim as the dual-token suffix on disk"

# summary line: exact expected counts.
grep -qF "summary: files py=3 ts=2 · stamped=6 · already-id'd(skipped)=1 · m-renames=0 · next free id=C16" \
  "$T/run1.out" \
  && ok || bad "sweep: run-1 summary line must report the exact expected counts"

# --- run 2: idempotency (the script's own documented regression check) -----
run2=$(python3 "$SWEEP" "$C" 2>"$T/run2.err")
rc2=$?
echo "$run2" > "$T/run2.out"

[ "$rc2" = 0 ] && ok || bad "sweep: second run must exit 0 (got $rc2)"
grep -qF 'STAMP ' "$T/run2.out" \
  && bad "sweep: second run must not stamp anything (STAMP line present)" || ok
grep -qF "stamped=0" "$T/run2.out" \
  && ok || bad "sweep: second run must report stamped=0 (idempotency regression check)"
grep -qF "already-id'd(skipped)=7" "$T/run2.out" \
  && ok || bad "sweep: second run must skip all 7 now-id'd defs/titles"

echo "=================================="
echo "red-sweep battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
