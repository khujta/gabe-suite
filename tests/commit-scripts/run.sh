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
rc=$(run_evid)
[ "$rc" = 0 ] && grep -q "no proof_root" "$T/evid.out" \
  && ok || bad "evidence: missing proof_root in BEHAVIOR.md must degrade LOUDLY (info) yet exit 0 (got $rc)"

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

echo "=================================="
echo "commit-scripts battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
