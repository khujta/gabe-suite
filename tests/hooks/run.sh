#!/usr/bin/env bash
# Hook + router fixture harness — the executable contract of the enforcement layer.
#
# Encodes the fixture battery from the 2026-07-15 review rounds 3–5 (attacker POV, literal
# executor, regression hunts, real-twin dry-run). Three consecutive rounds found regressions
# in hand-verified hook edits — this harness exists so the fourth edit gets caught by
# `bash tests/hooks/run.sh` instead of another review round. Hermetic: one temp git repo,
# no network, cleans up after itself. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GUARD="$REPO/scripts/hooks/kdbp/plan-proof-guard.sh"
PRE="$REPO/scripts/hooks/kdbp/pre-checkpoint.sh"
NEXT="$REPO/skills/gabe-next/scripts/next.mjs"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
cd "$T" || exit 1
git init -q && git config user.email t@t && git config user.name t
mkdir -p .kdbp docs proof/style proof/empty shots/b tests
touch .kdbp/BEHAVIOR.md docs/unrelated.md shots/b/7.png \
      proof/style/01-a.png proof/style/escritorio.png proof/style/guia.png
git add -A >/dev/null && git commit -qm base
SHA=$(git rev-parse HEAD)

pass=0; fail=0
ok()   { pass=$((pass+1)); }
bad()  { fail=$((fail+1)); echo "FAIL: $1"; }

# --- helpers -------------------------------------------------------------
guard_on() { # $1 = python expr building phases list; runs guard, echoes exit code
  python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':$1}
json.dump(plan,open('.kdbp/PLAN.json','w'))"
  echo '{"tool_input":{"file_path":"/x/.kdbp/PLAN.json"}}' | bash "$GUARD" >/dev/null 2>&1
  echo $?
}
P() { # proof phase helper -> python dict literal
  echo "{'id':'$1','cells':{'exec':'done'},'proof':'PROOF: c → m → $2','cases':None}"
}

# --- plan-proof-guard: proof evidence (R2 + honesty bounds) ---------------
[ "$(guard_on "[$(P p 'proof/style/escritorio.png')]")" = 0 ] && ok || bad "guard: literal path must pass"
[ "$(guard_on "[$(P p 'proof/style/escritorio.png (4 shots)')]")" = 0 ] && ok || bad "guard: trailing annotation must pass"
[ "$(guard_on "[$(P p 'proof/style/01..06-*.png')]")" = 0 ] && ok || bad "guard: range shorthand w/ non-empty dir must pass"
[ "$(guard_on "[$(P p 'proof/style/{guia,escritorio}.png')]")" = 0 ] && ok || bad "guard: brace shorthand must pass"
[ "$(guard_on "[$(P p 'proof/empty/shot.png')]")" = 2 ] && ok || bad "guard: empty evidence dir must BLOCK"
[ "$(guard_on "[$(P p 'proof/never/shot.png')]")" = 2 ] && ok || bad "guard: missing dir must BLOCK"
[ "$(guard_on "[$(P p '*')]")" = 2 ] && ok || bad "guard: bare wildcard must BLOCK"
[ "$(guard_on "[$(P p '../../**')]")" = 2 ] && ok || bad "guard: updir wildcard must BLOCK"
[ "$(guard_on "[$(P p 'docs/{screens,shots}/final.png')]")" = 2 ] && ok || bad "guard: mid-path brace w/ no real alt dir must BLOCK (round-5 CRITICAL)"
CAP="shots/{$(python3 -c "print(','.join(chr(97+i) for i in range(20)))")}/{$(python3 -c "print(','.join(str(i) for i in range(1,16)))")}.png"
[ "$(guard_on "[$(P p "$CAP")]")" = 0 ] && ok || bad "guard: cap-tripped multi-brace w/ real evidence must pass (round-4 false block)"
[ "$(guard_on "[{'id':'n','cells':{'exec':'done'},'proof':None,'cases':None}]")" = 0 ] && ok || bad "guard: null proof passes (guard validates only declared proofs)"

# --- plan-proof-guard: red cell honesty -----------------------------------
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'','proof':None}]")" = 2 ] && ok || bad "guard: Red done w/o cases must BLOCK"
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'NEW C1 (red@$SHA)','proof':None}]")" = 0 ] && ok || bad "guard: Red done w/ reachable sha must pass"
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'NEW C1 (red@deadbeef)','proof':None}]")" = 2 ] && ok || bad "guard: Red done w/ unreachable sha must BLOCK"
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'NEW C1','proof':None}]")" = 0 ] && ok || bad "guard: cases record w/o sha passes (hook validates only cited shas)"

# --- plan-proof-guard: scoping / robustness -------------------------------
echo '{"tool_input":{"file_path":"/x/src/app.py"}}' | bash "$GUARD" >/dev/null 2>&1
[ $? = 0 ] && ok || bad "guard: non-plan write must exit 0"
echo 'not json at all' | bash "$GUARD" >/dev/null 2>&1
[ $? = 0 ] && ok || bad "guard: garbage stdin must exit 0"

# --- pre-checkpoint: raw-commit trigger discipline ------------------------
pre() { printf '%s' "$1" | bash "$PRE" 2>/dev/null | grep -c 'KDBP CHECKPOINT'; }
[ "$(pre '{"tool_input":{"command":"git commit -m wip"}}')" = 1 ] && ok || bad "pre: plain commit must WARN"
[ "$(pre '{"tool_input":{"command":"echo \"building\" && git commit -m x"}}')" = 1 ] && ok || bad "pre: commit after quoted arg must WARN (round-3)"
[ "$(pre '{"tool_input":{"command":"echo \"typo-unterminated && git commit -m done\\\""}}')" = 1 ] && ok || bad "pre: unterminated-quote typo must still WARN (round-5 CRITICAL)"
[ "$(pre '{"tool_input":{"command":"git log --grep \"; git commit\""}}')" = 0 ] && ok || bad "pre: quoted data must stay silent"
[ "$(pre '{"tool_input":{"command":"npm test"}}')" = 0 ] && ok || bad "pre: non-commit must stay silent"

# --- pre-checkpoint: C-id warns -------------------------------------------
printf 'it("x")\n' > "tests/my spaced.spec.js"
printf 'def test_good_C147():\n    pass\n' > tests/test_good.py
printf 'assert SEC101\n' > tests/test_decoy_noid.py
git add -f "tests/my spaced.spec.js" tests/test_good.py tests/test_decoy_noid.py
out=$(printf '%s' '{"tool_input":{"command":"git commit -m x"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'my spaced.spec.js carries no' && ok || bad "pre: spaced filename w/o id must WARN (round-3)"
echo "$out" | grep -q 'test_decoy_noid.py carries no' && ok || bad "pre: SEC101 decoy must not satisfy the id check (round-2)"
echo "$out" | grep -q 'test_good.py carries no' && bad "pre: C147 file must NOT warn" || ok

# --- next.mjs: routing + mirror refusal contract --------------------------
nx() { python3 -c "import json;json.dump($1,open('.kdbp/PLAN.json','w'))"; node "$NEXT" >/dev/null 2>&1; echo $?; }
nxout() { python3 -c "import json;json.dump($1,open('.kdbp/PLAN.json','w'))"; node "$NEXT" 2>/dev/null; }
BASE="{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'red':'todo','exec':'todo','review':'todo','commit':'todo','push':'todo'}}]}"
nxout "$BASE" | grep -q '/gabe-red 1' && ok || bad "next: red todo must route /gabe-red"
DONE_RED="{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'done','review':'done','commit':'done','push':'done'}},{'id':'2','cells':{'exec':'todo','review':'todo','commit':'todo','push':'todo'}}]}"
nxout "$DONE_RED" | grep -q '/gabe-execute' && ok || bad "next: omitted red key must settle (R1 —)"
RESUME="{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'red':'todo','exec':'in_progress','review':'todo','commit':'todo','push':'todo'}}]}"
nxout "$RESUME" | grep -q 'resume' && ok || bad "next: in-progress exec must resume, never retro-red"
[ "$(nx "{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'Done'}}]}")" = 2 ] && ok || bad "next: invalid cell token must exit 2 (round-3)"
[ "$(nx "{'version':1,'status':'active','current_phase':'1','phases':{'a':1}}")" = 2 ] && ok || bad "next: non-array phases must exit 2 (round-3)"
[ "$(nx "{'version':1,'status':'active','current_phase':'1','phases':[None,{'id':'1','cells':{'exec':'todo'}}]}")" = 2 ] && ok || bad "next: null phase entry must exit 2 (round-4)"
[ "$(nx "{'version':1,'status':'active','current_phase':'9','phases':[{'id':'1','cells':{'exec':'todo'}}]}")" = 2 ] && ok || bad "next: current_phase desync must exit 2"
DEBT="{'version':1,'status':'active','current_phase':'2','phases':[{'id':'1','cells':{'exec':'done','review':'done','commit':'todo','push':'done'}},{'id':'2','cells':{'exec':'todo','review':'todo','commit':'todo','push':'todo'}}]}"
nxout "$DEBT" | grep -q 'Commit→/gabe-commit' && ok || bad "next: debt banner must map every cell to its command (round-3 UX)"

echo "=================================="
echo "hooks harness: $pass passed, $fail failed"
[ "$fail" = 0 ]
