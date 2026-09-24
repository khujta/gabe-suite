#!/usr/bin/env bash
# gabe-commit deterministic-script fixture battery (alignment review finding M23:
# size-budget.sh, docs-budget.sh, evidence-freshness.sh shipped with ZERO fixtures).
#
# Proves each script can both FIRE (WARN, its documented exit 2 / usage exit 1) and
# stay SILENT (exit 0) against its REAL contract as read from the script source —
# not an assumed one. Hermetic: one temp git repo per script under test, no network,
# cleans up after itself. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SIZE="$REPO/skills/gabe-commit/scripts/size-budget.sh"
DOCS="$REPO/skills/gabe-commit/scripts/docs-budget.sh"
EVID="$REPO/skills/gabe-commit/scripts/evidence-freshness.sh"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

mkgit() { # $1 = dir; fresh repo with one empty base commit
  mkdir -p "$1"
  (cd "$1" && git init -q && git config user.email t@t && git config user.name t \
     && git commit -q --allow-empty -m base)
}

# =====================================================================
# size-budget.sh — [--cap N] [file...]; no args → staged (ACMR); exit
# 0=clean, 2=warned, 1=usage/environment error (docstring lines 10-12).
# =====================================================================
mkgit "$T/size"
run_size()   { (cd "$T/size" && bash "$SIZE" "$@" >"$T/size.out" 2>&1); echo $?; }
clean_size() { (cd "$T/size" && git reset -q HEAD >/dev/null 2>&1; \
                 git checkout -q -- . >/dev/null 2>&1; git clean -qfd >/dev/null 2>&1); }

(cd "$T/size" && seq 1 10 > small.py && git add small.py)
[ "$(run_size)" = 0 ] && ok || bad "size: under-cap staged file must stay SILENT"
clean_size

(cd "$T/size" && seq 1 810 > big.py && git add big.py)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q "big.py" "$T/size.out" && grep -q "new file over cap" "$T/size.out" \
  && ok || bad "size: over-cap new staged file must FIRE exit 2 naming the file (got $rc)"
clean_size

(cd "$T/size" && seq 1 100 > grow.py && git add grow.py && git commit -qm "grow under cap")
(cd "$T/size" && seq 1 900 > grow.py && git add grow.py)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q "newly crossed" "$T/size.out" && ok || bad "size: newly-crossed file must FIRE (got $rc)"
clean_size

(cd "$T/size" && seq 1 900 > huge.py && git add huge.py && git commit -qm "huge over cap")
(cd "$T/size" && seq 1 950 > huge.py && git add huge.py)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q "still over" "$T/size.out" && ok || bad "size: still-over file must FIRE (got $rc)"
clean_size

(cd "$T/size" && { printf '// Code generated. DO NOT EDIT.\n'; seq 1 900; } > gen.py && git add gen.py)
[ "$(run_size)" = 0 ] && ok || bad "size: generated-file marker must stay SILENT despite being over cap"
clean_size

(cd "$T/size" && mkdir -p .kdbp && seq 1 900 > .kdbp/DECISIONS.md && seq 1 900 > .kdbp/LEDGER.md \
   && seq 1 900 > .kdbp/DEPLOYMENTS.md && git add .kdbp/DECISIONS.md .kdbp/LEDGER.md .kdbp/DEPLOYMENTS.md)
[ "$(run_size)" = 0 ] && ok || bad "size: append-only KDBP logs (DECISIONS/LEDGER/DEPLOYMENTS) must stay SILENT over cap"
clean_size

(cd "$T/size" && mkdir -p .kdbp && seq 1 900 > .kdbp/PENDING.md && git add .kdbp/PENDING.md)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q ".kdbp/PENDING.md" "$T/size.out" \
  && ok || bad "size: .kdbp/PENDING.md is edited, not append-only — over cap must still FIRE (got $rc)"
clean_size

(cd "$T/size" && mkdir -p docs && seq 1 900 > docs/DECISIONS.md && git add docs/DECISIONS.md)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q "docs/DECISIONS.md" "$T/size.out" \
  && ok || bad "size: the log exemption is exact-path — docs/DECISIONS.md over cap must still FIRE (got $rc)"
clean_size

(cd "$T/size" && python3 -c "open('blob.bin','wb').write(b'A\x00B\x00'*400)" && git add blob.bin)
[ "$(run_size)" = 0 ] && ok || bad "size: binary file must stay SILENT (skipped before line count)"
clean_size

(cd "$T/size" && seq 1 50 > midsize.py)
rc=$(run_size --cap 10 midsize.py)
[ "$rc" = 2 ] && grep -q "midsize.py" "$T/size.out" && grep -q "cap 10" "$T/size.out" \
  && ok || bad "size: explicit file arg + --cap must FIRE without staging (got $rc)"
clean_size

[ "$(run_size --bogus)" = 1 ] && ok || bad "size: unknown flag must exit 1 (usage error)"

(cd "$T/size" && mkdir -p .kdbp && printf 'big.py needs splitting into big_a.py/big_b.py\n' > .kdbp/RULES.md \
   && git add .kdbp/RULES.md && git commit -qm "add rules")
(cd "$T/size" && seq 1 810 > big.py && git add big.py)
rc=$(run_size)
[ "$rc" = 2 ] && grep -q "recorded seams" "$T/size.out" && grep -q "RULES.md" "$T/size.out" \
  && ok || bad "size: recorded seams from .kdbp/RULES.md must print alongside the WARN"
clean_size

mkdir -p "$T/notgit"
rc=$( (cd "$T/notgit" && bash "$SIZE" >"$T/notgit.out" 2>&1); echo $? )
[ "$rc" = 1 ] && grep -q "not a git repository" "$T/notgit.out" \
  && ok || bad "size: non-git dir must degrade LOUDLY, exit 1 with a message (got $rc)"

# =====================================================================
# docs-budget.sh — no args, scans staged NEW *.md (diff-filter=A); exit
# 0=clean/skipped, 2=warned (docstring line 8). Never blocks.
# =====================================================================
mkgit "$T/docs"
run_docs()   { (cd "$T/docs" && bash "$DOCS" >"$T/docs.out" 2>&1); echo $?; }
clean_docs() { (cd "$T/docs" && git reset -q HEAD >/dev/null 2>&1; git clean -qfd >/dev/null 2>&1); }

[ "$(run_docs)" = 0 ] && ok || bad "docs: no staged new md must stay SILENT"

(cd "$T/docs" && mkdir -p docs && printf '# n\n' > docs/notes-2026-07-22.md && git add docs/notes-2026-07-22.md)
rc=$(run_docs)
[ "$rc" = 2 ] && grep -q "dated md file" "$T/docs.out" && grep -q "notes-2026-07-22.md" "$T/docs.out" \
  && ok || bad "docs: dated new md must FIRE naming the file (got $rc)"
clean_docs

(cd "$T/docs" && mkdir -p docs && printf '# g\n' > docs/guide.md && git add docs/guide.md)
rc=$(run_docs)
[ "$rc" = 2 ] && grep -q "outside the allowed homes" "$T/docs.out" && grep -q "docs/guide.md" "$T/docs.out" \
  && ok || bad "docs: new md outside allowed homes + unregistered must FIRE (got $rc)"
clean_docs

(cd "$T/docs" && mkdir -p .kdbp docs && printf 'docs/registered.md\n' > .kdbp/DOCS.md \
   && printf '# r\n' > docs/registered.md && git add .kdbp/DOCS.md docs/registered.md)
[ "$(run_docs)" = 0 ] && ok || bad "docs: new md registered in .kdbp/DOCS.md must stay SILENT"
clean_docs

(cd "$T/docs" && mkdir -p .kdbp && printf '# s\n' > .kdbp/STATE.md && git add .kdbp/STATE.md)
[ "$(run_docs)" = 0 ] && ok || bad "docs: new md under .kdbp/* (allowed home) must stay SILENT"
clean_docs

(cd "$T/docs" && mkdir -p .kdbp/archive && printf '# o\n' > .kdbp/archive/notes-2026-07-22.md \
   && git add .kdbp/archive/notes-2026-07-22.md)
[ "$(run_docs)" = 0 ] && ok || bad "docs: dated file under .kdbp/archive/ stays SILENT (archive + kdbp exemptions)"
clean_docs

# =====================================================================
# evidence-freshness.sh — no args, reads .kdbp/PLAN.json + BEHAVIOR.md's
# proof_root; exit 0=ok/skipped, 2=warned+bypass-logged (docstring 7-8).
# =====================================================================
mkgit "$T/evid"
run_evid() { (cd "$T/evid" && bash "$EVID" >"$T/evid.out" 2>&1); echo $?; }

[ "$(run_evid)" = 0 ] && ok || bad "evidence: missing PLAN.json (non-KDBP repo) must stay SILENT"

(cd "$T/evid" && mkdir -p .kdbp && printf '{"status":"active","current_phase":"1","phases":[{"id":"1","proof":null}]}' > .kdbp/PLAN.json)
[ "$(run_evid)" = 0 ] && ok || bad "evidence: null proof (no requirement) must stay SILENT"

(cd "$T/evid" && printf '{"status":"active","current_phase":"1","phases":[{"id":"1","proof":"PROOF: c -> m -> proof/x.png"}]}' > .kdbp/PLAN.json \
   && printf '# behavior\n' > .kdbp/BEHAVIOR.md)
# archie F (2026-09-24): a bookkeeping-only commit has nothing to measure — no proof_root info line on it.
# MUTATION: move the proof_root test back above the staged-source loop → this prints the info line.
(cd "$T/evid" && printf 'row\n' >> .kdbp/LEDGER.md && git add .kdbp/LEDGER.md)
rc=$(run_evid)
[ "$rc" = 0 ] && ! grep -q "no proof_root" "$T/evid.out" \
  && ok || bad "evidence: unset proof_root + a bookkeeping-only commit must stay SILENT (no info line every commit) (got $rc)"
(cd "$T/evid" && git reset -q HEAD -- .kdbp/LEDGER.md && mkdir -p src && printf 'code0\n' > src/app0.py && git add src/app0.py)
rc=$(run_evid)
[ "$rc" = 0 ] && grep -q "no proof_root" "$T/evid.out" \
  && ok || bad "evidence: missing proof_root + a staged source change must degrade LOUDLY (info) yet exit 0 (got $rc)"
(cd "$T/evid" && printf -- '---\nproof_root:   # none — no committed evidence\n---\n' > .kdbp/BEHAVIOR.md)
rc=$(run_evid)
[ "$rc" = 0 ] && grep -q "no proof_root" "$T/evid.out" \
  && ok || bad "evidence: a proof_root line holding only a # comment is UNSET, never the path '#none…' (got $rc)"
(cd "$T/evid" && git reset -q HEAD -- src/app0.py)

(cd "$T/evid" && printf 'proof_root: proof\n' > .kdbp/BEHAVIOR.md && mkdir -p proof src)
[ "$(run_evid)" = 0 ] && ok || bad "evidence: proof carrying but no staged source files must stay SILENT"

(cd "$T/evid" && printf 'code\n' > src/app.py && git add src/app.py)
rc=$(run_evid)
bypass="$T/evid/.kdbp/archive/evidence-bypass.log"
[ "$rc" = 2 ] && grep -q "no artifacts under proof" "$T/evid.out" && grep -q "phase 1" "$T/evid.out" \
  && ok || bad "evidence: empty proof_root + staged src must FIRE 'no artifacts under' (got $rc)"
[ -f "$bypass" ] && grep -q "no artifacts under" "$bypass" \
  && ok || bad "evidence: FIRE must append to .kdbp/archive/evidence-bypass.log"
(cd "$T/evid" && git reset -q HEAD -- src/app.py)

(cd "$T/evid" && printf 'x' > proof/old-shot.png && touch -d '2020-01-01' proof/old-shot.png)
(cd "$T/evid" && printf 'code2\n' > src/app2.py && touch -d '2030-01-01' src/app2.py && git add src/app2.py)
rc=$(run_evid)
[ "$rc" = 2 ] && grep -q "OLDER than staged change" "$T/evid.out" && grep -q "app2.py" "$T/evid.out" \
  && ok || bad "evidence: stale proof mtime (older than newest staged src) must FIRE (got $rc)"
(cd "$T/evid" && git reset -q HEAD -- src/app2.py)

(cd "$T/evid" && git add src/app2.py && touch -d '2035-01-01' proof/old-shot.png)
rc=$(run_evid)
[ "$rc" = 0 ] && grep -q "fresher than the staged changes" "$T/evid.out" \
  && ok || bad "evidence: proof mtime newer than staged src must stay SILENT (got $rc)"
# SOURCE = app code only (gustify P8, 2026-09-04): a red checkpoint stages TESTS, a tombstone stages DOCS — neither is the change
# the proof must be fresher than. MUTATION: drop the docs/tests exemption in the case → this FIRES "OLDER than staged change".
(cd "$T/evid" && git reset -q HEAD -- src/app2.py && mkdir -p tests docs && printf 'def test_red(): assert 0\n' > tests/test_red.py \
   && printf '# tombstone\n' > docs/gone.md && touch -d '2036-01-01' tests/test_red.py docs/gone.md && git add tests/test_red.py docs/gone.md)
rc=$(run_evid)
[ "$rc" = 0 ] && ! grep -q "OLDER than staged change" "$T/evid.out" \
  && ok || bad "evidence: a tests-only + docs-only staging (red checkpoint / tombstone) must stay SILENT — never a false bypass (got $rc)"
(cd "$T/evid" && git reset -q HEAD -- tests/test_red.py docs/gone.md)

# =====================================================================
# checkpoint-trailer.sh — <message-file|->; exit 0=clean/not-applicable,
# 2=WARN finding, 1=usage (ruling 2026-08-07 — the TASK CONTRACT fold:
# the printed block went 0-for-19; the record moved to the message).
# =====================================================================
TRAIL="$REPO/skills/gabe-commit/scripts/checkpoint-trailer.sh"
tmsg() { printf '%s' "$1" > "$T/msg.txt"; bash "$TRAIL" "$T/msg.txt" >"$T/trail.out" 2>&1; echo $?; }

[ "$(tmsg 'feat(x): ordinary commit with no footer')" = 0 ] && ok || bad "trailer: non-checkpoint message must stay SILENT"
[ "$(tmsg 'feat(pantry): add slot counter

Phase: 7 — F6 backend
Task: T2/6 — derive counters
Cases: C8134 (red@abc1234) · Guard: C8125
Class: red')" = 0 ] && ok || bad "trailer: valid red checkpoint trailer must stay SILENT"
[ "$(tmsg 'fix(x): y

Task: T1/4 — wire the panel
Cases: none — pure wiring, no red claim
Class: wiring')" = 0 ] && ok || bad "trailer: wiring + honest none must stay SILENT"
[ "$(tmsg 'chore: z

Task: T3/4 — config move
Cases: skip:not-testable — config-only
Class: wiring')" = 0 ] && ok || bad "trailer: skip:<code> form must stay SILENT"
[ "$(tmsg 'fix: w

Task: T1/2 — hotfix
Cases: RED OWED — /gabe-red never ran for this phase
Class: growth')" = 0 ] && ok || bad "trailer: RED OWED honest-absence must stay SILENT"
rc=$(tmsg 'feat: x

Task: T2/6 — derive counters')
[ "$rc" = 2 ] && grep -q 'no Cases: line' "$T/trail.out" && grep -q 'no Class: line' "$T/trail.out" \
  && ok || bad "trailer: Task: without Cases:/Class: must FIRE naming both (got $rc)"
rc=$(tmsg 'feat: x

Task: T2/6 — d
Cases: C8134
Class: rebuild-to-reference')
[ "$rc" = 2 ] && grep -q 'malformed Class' "$T/trail.out" && ok || bad "trailer: retired CLASS vocabulary must FIRE (got $rc)"
rc=$(tmsg 'feat: x

Task: T2/6 — d
Cases: none — nothing declared
Class: red')
[ "$rc" = 2 ] && grep -q 'declares no C-id' "$T/trail.out" && ok || bad "trailer: Class red with no C-id must FIRE (got $rc)"
rc=$(tmsg 'feat: x

Task: T2/6 — d
Cases: whatever prose
Class: wiring')
[ "$rc" = 2 ] && grep -q 'honest-absence' "$T/trail.out" && ok || bad "trailer: id-less prose Cases must FIRE (got $rc)"
# ASCII hyphen must be accepted, not just the em dash (real keyboards type '-')
[ "$(tmsg 'fix: y

Task: T1/4 — wire
Cases: none - pure wiring, no red claim
Class: wiring')" = 0 ] && ok || bad "trailer: honest-none with an ASCII hyphen must stay SILENT"
# a Guard: tail id must NOT satisfy the red-claim (the reuse-parse_cases fix)
rc=$(tmsg 'feat: x

Task: T2/6 — refactor
Cases: none — pure refactor · Guard: C8125
Class: red')
[ "$rc" = 2 ] && grep -q 'Guard: id does not count' "$T/trail.out" \
  && ok || bad "trailer: Class red backed only by a Guard: id must FIRE (got $rc)"
# a C-id on a wrapped continuation line must be seen, not missed
[ "$(printf 'feat: x\n\nTask: T2/6 — d\nCases: advances\n       C8140 (red@a1b2c3d) · Guard: C1\nClass: red\n' > "$T/msg.txt"; bash "$TRAIL" "$T/msg.txt" >/dev/null 2>&1; echo $?)" = 0 ] \
  && ok || bad "trailer: a C-id on a continuation line must count (no false red-claim WARN)"
# Class value is case-insensitive
[ "$(tmsg 'feat: x

Task: T1/1 — d
Cases: C8140 (red@a1b2c3d)
Class: Red')" = 0 ] && ok || bad "trailer: capitalised Class value must be accepted, not called malformed"
[ "$(bash "$TRAIL" >/dev/null 2>&1; echo $?)" = 1 ] && ok || bad "trailer: no args must exit 1 (usage)"
[ "$(bash "$TRAIL" /nonexistent-msg-file >/dev/null 2>&1; echo $?)" = 1 ] && ok || bad "trailer: missing file must exit 1 (usage)"
rc=$(printf 'Task: T1/1 — x\nCases: C5 (guarded)\nClass: guard\n' | bash "$TRAIL" - >/dev/null 2>&1; echo $?)
[ "$rc" = 0 ] && ok || bad "trailer: stdin form with valid trailer must stay SILENT"

echo "=================================="
echo "commit-scripts battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
