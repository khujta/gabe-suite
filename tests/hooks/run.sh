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
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'NEW C1','proof':None}]")" = 2 ] && ok || bad "guard: NEW record w/o red@sha must BLOCK (rail R2 — record-shaped is not evidence-shaped)"
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'— · GUARD: C091 (behavior unchanged)','proof':None}]")" = 0 ] && ok || bad "guard: guard-only record w/o sha must pass (refactor form needs no red commit)"
[ "$(guard_on "[{'id':'r','cells':{'red':'done'},'cases':'skip:not-testable — config-only','proof':None}]")" = 0 ] && ok || bad "guard: skip:* record w/o sha must pass (enumerated exit)"

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

# --- pre-checkpoint: fast exit before Python (the 5 s timeouts, 324 in gastify+gustify) ---
# A python3 shim on PATH leaves a mark when started; the real one still runs after it.
mkdir -p "$T/shim" && printf '#!/usr/bin/env bash\ntouch "%s/py.started"\nexec %s "$@"\n' "$T" "$(command -v python3)" > "$T/shim/python3" && chmod +x "$T/shim/python3"
started() { rm -f "$T/py.started"; printf '%s' "$1" | PATH="$T/shim:$PATH" bash "$PRE" >/dev/null 2>&1; [ -f "$T/py.started" ] && echo 1 || echo 0; }
[ "$(started '{"tool_input":{"command":"ls -la web/src"}}')" = 0 ] && ok || bad "pre: a non-commit, non-PLAN command must exit before Python starts"
[ "$(started '{"tool_input":{"command":"git commit -m x"}}')" = 1 ] && ok || bad "pre: a commit must still reach the Python parse"
[ "$(started '{"tool_input":{"command":"cat .kdbp/PLAN.json"}}')" = 1 ] && ok || bad "pre: a PLAN path must still reach the Python parse"

# --- pre-checkpoint: C-id warns -------------------------------------------
printf 'it("x")\n' > "tests/my spaced.spec.js"
printf 'def test_good_C147():\n    pass\n' > tests/test_good.py
printf 'assert SEC101\n' > tests/test_decoy_noid.py
git add -f "tests/my spaced.spec.js" tests/test_good.py tests/test_decoy_noid.py
out=$(printf '%s' '{"tool_input":{"command":"git commit -m x"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'my spaced.spec.js carries no' && ok || bad "pre: spaced filename w/o id must WARN (round-3)"
echo "$out" | grep -q 'test_decoy_noid.py carries no' && ok || bad "pre: SEC101 decoy must not satisfy the id check (round-2)"
echo "$out" | grep -q 'test_good.py carries no' && bad "pre: C147 file must NOT warn" || ok

# --- pre-checkpoint: declared-case warn class (M25) ------------------------
# The guard fixtures above leave PLAN.json with phase id 'r' vs current_phase
# '1', so the ids loop never ran — this whole warn class sat outside the
# battery. Matching phase id + a fabricated C999 enters it for real.
python3 -c "import json;json.dump({'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'done'},'cases':'NEW C999','proof':None}]},open('.kdbp/PLAN.json','w'))"
out=$(printf '%s' '{"tool_input":{"command":"git commit -m x"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'declared C999' && ok || bad "pre: declared id with 0 corpus hits must WARN (M25)"
python3 -c "import json;json.dump({'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'done'},'cases':'NEW C147','proof':None}]},open('.kdbp/PLAN.json','w'))"
out=$(printf '%s' '{"tool_input":{"command":"git commit -m x"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'declared C147' && bad "pre: id present in the corpus must NOT warn (M25)" || ok

# --- pre-checkpoint: shell-side PLAN edit warn (rail R5) -------------------
out=$(printf '%s' '{"tool_input":{"command":"sed -i s/todo/done/ .kdbp/PLAN.json"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'PLAN-EDIT' && ok || bad "pre: sed -i on PLAN.json must WARN (R5 — guard cannot see shell writes)"
out=$(printf '%s' '{"tool_input":{"command":"python3 fix.py > .kdbp/PLAN.json"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'PLAN-EDIT' && ok || bad "pre: redirect into PLAN.json must WARN (R5)"
out=$(printf '%s' '{"tool_input":{"command":"cat .kdbp/PLAN.json"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'PLAN-EDIT' && bad "pre: reading PLAN.json must stay SILENT (R5)" || ok
out=$(printf '%s' '{"tool_input":{"command":"jq .phases .kdbp/PLAN.json"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'PLAN-EDIT' && bad "pre: jq read of PLAN.json must stay SILENT (R5)" || ok
out=$(printf '%s' '{"tool_input":{"command":"sed -i s/a/b/ src/app.py"}}' | bash "$PRE" 2>/dev/null)
echo "$out" | grep -q 'PLAN-EDIT' && bad "pre: sed on a non-PLAN file must stay SILENT (R5)" || ok

# --- session + stop + structure hooks (M24 — 4 of 6 hooks had no cases) ----
STOPH="$REPO/scripts/hooks/kdbp/stop-session-reminder.sh"
POSTH="$REPO/scripts/hooks/kdbp/post-structure-warning.sh"
SKA="$REPO/scripts/hooks/kdbp/session-kdbp-active.sh"
SPA="$REPO/scripts/hooks/kdbp/session-plan-awareness.sh"
H="$T/hookfix"
mkdir -p "$H/.kdbp" "$H/src"
(cd "$H" && git init -q && git config user.email t@t && git config user.name t)
printf 'name: Fixture\nmaturity: mvp\ntech: bash\n' > "$H/.kdbp/BEHAVIOR.md"
printf '# patterns\n' > "$H/.kdbp/STRUCTURE.md"
(cd "$H" && printf x > tracked.txt && git add -A \
  && GIT_COMMITTER_DATE="@$(( $(date +%s) - 2400 )) +0000" git commit -qm base --date "@$(( $(date +%s) - 2400 )) +0000" \
  && printf y >> tracked.txt)

so() { (cd "$H" && printf '%s' "$1" | bash "$STOPH" 2>/dev/null); }
so '{}' | grep -q 'next: /gabe-commit' && ok || bad "stop: dirty tree + old HEAD + no transcript must print the routing line (M24)"
printf 'ran git commit here\n' > "$T/transcript.txt"
[ -z "$(so "{\"transcript_path\": \"$T/transcript.txt\"}")" ] && ok || bad "stop: transcript containing a commit must stay silent"
(cd "$H" && git add -A && GIT_COMMITTER_DATE="@$(( $(date +%s) - 2400 )) +0000" git commit -qm clean --date "@$(( $(date +%s) - 2400 )) +0000")
[ -z "$(so '{}')" ] && ok || bad "stop: clean tree must stay silent"
(cd "$H" && printf z > untracked-only.txt)
[ -z "$(so '{}')" ] && ok || bad "stop: untracked-only dirt must stay silent"
rm -f "$H/untracked-only.txt"

po() { (cd "$H" && printf '%s' "$1" | bash "$POSTH" 2>/dev/null); }
touch "$H/src/stray.py"
po "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$H/src/stray.py\"}}" \
  | grep -q 'STRUCTURE: new file src/stray.py' && ok || bad "post-structure: stray Write must warn (M24)"
[ -z "$(po "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$H/.kdbp/PENDING.md\"}}")" ] \
  && ok || bad "post-structure: a .kdbp write must stay silent"
[ -z "$(po "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$H/src/stray.py\"}}")" ] \
  && ok || bad "post-structure: a non-Write tool must stay silent"

(cd "$H" && bash "$SKA" 2>/dev/null) | grep -q 'KDBP Active — Fixture (mvp) \[bash\]' \
  && ok || bad "session-kdbp: must announce name/maturity/tech (M24)"
spa() { (cd "$H" && bash "$SPA" 2>/dev/null); }
python3 -c "import json;json.dump({'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','name':'Fix','cells':{'exec':'done','review':'todo','commit':'todo','push':'todo'}}]},open('$H/.kdbp/PLAN.json','w'))"
spa | grep -q 'ACTIVE PLAN: Phase 1 — Fix' && ok || bad "session-plan: active mirror must summarize the phase (M24)"
python3 -c "import json;json.dump({'version':1,'status':'archived'},open('$H/.kdbp/PLAN.json','w'))"
spa | grep -q 'none — run /gabe-plan' && ok || bad "session-plan: non-active mirror must say none"
rm "$H/.kdbp/PLAN.json"
printf 'No active plan\n' > "$H/.kdbp/PLAN.md"
spa | grep -q 'none — run /gabe-plan' && ok || bad "session-plan: PLAN.md fallback must say none"
mkdir -p "$T/nokdbp"
[ -z "$( (cd "$T/nokdbp" && bash "$SKA" 2>/dev/null; printf '{}' | bash "$STOPH" 2>/dev/null; bash "$SPA" 2>/dev/null) )" ] \
  && ok || bad "hooks: a non-KDBP dir must stay fully silent"

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
# --json now_line/next_line: the E8 beat tail prints these VERBATIM (the [object Object] fix)
njson() { python3 -c "import json;json.dump($1,open('.kdbp/PLAN.json','w'))"; node "$NEXT" --json 2>/dev/null; }
nowline() { echo "$1" | python3 -c "import json,sys;print(json.load(sys.stdin).get('now_line'))"; }
J1=$(njson "$BASE")
echo "$J1" | python3 -c "import json,sys;json.load(sys.stdin)" 2>/dev/null && ok || bad "next --json: must emit valid JSON"
[ "$(nowline "$J1")" != "None" ] && ! echo "$(nowline "$J1")" | grep -q 'object Object' \
  && ok || bad "next --json: now_line must be a rendered string, never [object Object]"
echo "$J1" | grep -q '"next_line"' && ok || bad "next --json: next_line must be present"
# plan-complete payload → now_line null (tail prints only NEXT)
ALLDONE="{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'done','review':'done','commit':'done','push':'done'}}]}"
[ "$(nowline "$(njson "$ALLDONE")")" = "None" ] && ok || bad "next --json: plan-complete payload must carry now_line null"
# exit-2 mirror-unusable still emits JSON with next:null (tail parses one shape, prints neither)
BADJ=$(njson "{'version':1,'status':'active','current_phase':'1','phases':[{'id':'1','cells':{'exec':'Done'}}]}")
echo "$BADJ" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['next'] is None" 2>/dev/null \
  && ok || bad "next --json: exit-2 must still emit JSON with next:null"

echo "=================================="

# --- direction-guard: FIRE in KDBP projects, SILENT elsewhere (2026-07-31) ----
DG="$REPO/scripts/hooks/kdbp/direction-guard.sh"
out=$(CLAUDE_PROJECT_DIR="$T" bash "$DG")           # $T has .kdbp/ -> must FIRE
case "$out" in *"DIRECTION GUARD"*) ok ;; *) bad "direction-guard: must FIRE when .kdbp exists" ;; esac
NOK=$(mktemp -d)
out=$(CLAUDE_PROJECT_DIR="$NOK" bash "$DG")         # no .kdbp -> must stay SILENT
[ -z "$out" ] && ok || bad "direction-guard: must stay SILENT without .kdbp"
rm -rf "$NOK"

# --- plan-proof-guard: red→green thread (review honesty + exec/red debt) ----
GREENSHA=$SHA
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':'NEW C1 (red@$SHA)','proof':None}]")" = 2 ] && ok || bad "guard: Review done w/ red@ but no green@ must BLOCK"
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':'NEW C1 (red@$SHA) · green@$GREENSHA','proof':None}]")" = 0 ] && ok || bad "guard: Review done w/ reachable green@ must pass"
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':'NEW C1 (red@$SHA) · green@deadbeef','proof':None}]")" = 2 ] && ok || bad "guard: Review done w/ unreachable green@ must BLOCK"
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':'skip:not-testable — config-only','proof':None}]")" = 0 ] && ok || bad "guard: Review done w/ skip:* record must pass (exempt)"
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':None,'proof':None}]")" = 0 ] && ok || bad "guard: Review done w/o cases record must pass (not a red-beat phase)"
[ "$(guard_on "[{'id':'g','cells':{'review':'done'},'cases':'— · GUARD: C091 (behavior unchanged)','proof':None}]")" = 0 ] && ok || bad "guard: Review done on guard-only record (no red@) must pass"
# exec ✅ while red ⬜ = debt: WARN on stdout, exit 0
python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':[{'id':'d','cells':{'exec':'done','red':'todo'},'proof':None,'cases':None}]}
json.dump(plan,open('.kdbp/PLAN.json','w'))"
wout=$(echo '{"tool_input":{"file_path":"/x/.kdbp/PLAN.json"}}' | bash "$GUARD" 2>/dev/null); wrc=$?
[ "$wrc" = 0 ] && echo "$wout" | grep -q 'Exec ✅ while Red ⬜' && ok || bad "guard: Exec done + Red todo must WARN on stdout and exit 0"
wout=$(echo '{"tool_input":{"file_path":"/x/.kdbp/PLAN.json"}}' | { python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':[{'id':'d','cells':{'exec':'done','red':'done'},'proof':None,'cases':'NEW C1 (red@$SHA)'}]}
json.dump(plan,open('.kdbp/PLAN.json','w'))" && cat; } | bash "$GUARD" 2>/dev/null)
echo "$wout" | grep -q 'Exec ✅ while Red ⬜' && bad "guard: Exec done + Red done must NOT warn" || ok

# --- plan-proof-guard: review record (option B — present-but-false blocks, absent warns) ---
RV() { echo "{'id':'v','cells':{'review':'done'},'review':$1,'cases':None,'proof':None}"; }
[ "$(guard_on "[$(RV "'APPROVE@$SHA findings:3 triaged:3'")]")" = 0 ] && ok || bad "guard: valid review record must pass"
[ "$(guard_on "[$(RV "'looks fine to me'")]")" = 2 ] && ok || bad "guard: malformed review record must BLOCK"
[ "$(guard_on "[$(RV "'APPROVE@deadbeef findings:0 triaged:0'")]")" = 2 ] && ok || bad "guard: unreachable review sha must BLOCK"
[ "$(guard_on "[$(RV "'WARNING@$SHA findings:5 triaged:3'")]")" = 2 ] && ok || bad "guard: triaged < findings must BLOCK (untriaged findings)"
python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':[{'id':'v','cells':{'review':'done'},'review':None,'cases':None,'proof':None}]}
json.dump(plan,open('.kdbp/PLAN.json','w'))"
wout=$(echo '{"tool_input":{"file_path":"/x/.kdbp/PLAN.json"}}' | bash "$GUARD" 2>/dev/null); wrc=$?
[ "$wrc" = 0 ] && echo "$wout" | grep -q 'without a review record' && ok || bad "guard: Review done w/o record must WARN and exit 0 (legacy debt)"
[ "$(guard_on "[{'id':'v','cells':{'review':'todo'},'review':'APPROVE@$SHA findings:1 triaged:1','cases':None,'proof':None}]")" = 0 ] && ok || bad "guard: review todo w/ record present must pass (no check)"
python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':[{'id':str(i),'cells':{'review':'done'},'review':None,'cases':None,'proof':None} for i in range(1,9)]}
json.dump(plan,open('.kdbp/PLAN.json','w'))"
wout=$(echo '{"tool_input":{"file_path":"/x/.kdbp/PLAN.json"}}' | bash "$GUARD" 2>/dev/null)
[ "$(echo "$wout" | grep -c 'without a review record')" = 1 ] && echo "$wout" | grep -q '8 phase(s)' && ok || bad "guard: 8 record-less phases must aggregate to ONE warn line (warn-blindness)"

# --- red-entry-guard: WARN on source write while Red ⬜, SILENT otherwise ----
REG="$REPO/scripts/hooks/kdbp/red-entry-guard.sh"
reg() { # $1 = phases py literal · $2 = file_path -> echoes hook stdout
  python3 -c "
import json
plan={'version':1,'status':'active','current_phase':'1','phases':$1}
json.dump(plan,open('.kdbp/PLAN.json','w'))"
  echo "{\"tool_input\":{\"file_path\":\"$2\"}}" | bash "$REG" 2>/dev/null
}
RTODO="[{'id':'1','cells':{'red':'todo','exec':'todo'},'cases':None}]"
reg "$RTODO" "/x/src/app.py" | grep -q 'RED-ENTRY' && ok || bad "red-entry: source write w/ Red todo must WARN"
reg "$RTODO" "/x/tests/test_app.py" | grep -q 'RED-ENTRY' && bad "red-entry: test file must stay SILENT (red workspace)" || ok
reg "$RTODO" "/x/.kdbp/PLAN.md" | grep -q 'RED-ENTRY' && bad "red-entry: .kdbp write must stay SILENT" || ok
reg "$RTODO" "/x/docs/notes.md" | grep -q 'RED-ENTRY' && bad "red-entry: docs/markdown must stay SILENT" || ok
reg "[{'id':'1','cells':{'red':'done','exec':'todo'},'cases':'NEW C1'}]" "/x/src/app.py" | grep -q 'RED-ENTRY' && bad "red-entry: Red done must stay SILENT" || ok
reg "[{'id':'1','cells':{'red':'todo','exec':'todo'},'cases':'skip:not-testable — config'}]" "/x/src/app.py" | grep -q 'RED-ENTRY' && bad "red-entry: enumerated skip must stay SILENT" || ok
reg "[{'id':'1','cells':{'exec':'todo'},'cases':None}]" "/x/src/app.py" | grep -q 'RED-ENTRY' && bad "red-entry: absent Red column must stay SILENT" || ok
NOK=$(mktemp -d); out=$(cd "$NOK" && echo '{"tool_input":{"file_path":"/x/src/app.py"}}' | bash "$REG" 2>/dev/null)
[ -z "$out" ] && ok || bad "red-entry: no .kdbp must stay SILENT"
rm -rf "$NOK"

# --- push-gate-guard: terminal-env promotion fails closed (ruling 2026-08-07) ---
PGG="$REPO/scripts/hooks/kdbp/push-gate-guard.sh"
pg() { printf '%s' "$1" | bash "$PGG" >/dev/null 2>&1; echo $?; }
pgout() { printf '%s' "$1" | bash "$PGG" 2>/dev/null; }
mkmarker() { printf '%s main\n' "$(git rev-parse HEAD)" > .kdbp/.push-gate-ok; }  # sha-bound, content not mtime
# multi-env PUSH.md: staging (source) + production (terminal, promote_from staging);
# a commented-out decoy env proves comment-stripping (the template ships one).
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Defaults

| default_env | production |

## Environments

### staging

| Setting | Value |
|---------|-------|
| target_branch | staging |
| promote_from | — |

### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | staging |

<!--
### decoy-env

| Setting | Value |
|---------|-------|
| target_branch | decoy |
| promote_from | — |
-->
PUSHEOF
git branch -f main HEAD 2>/dev/null; git branch -f feature-x HEAD 2>/dev/null
CURB=$(git rev-parse --abbrev-ref HEAD)
rm -f .kdbp/.push-gate-ok
PROMO='{"tool_input":{"command":"git push origin origin/staging:main"}}'
[ "$(pg "$PROMO")" = 2 ] && ok || bad "push-gate: promotion push w/o marker must BLOCK (the observed bypass shape)"
[ "$(pg '{"tool_input":{"command":"git push origin main"}}')" = 2 ] && ok || bad "push-gate: direct terminal push w/o marker must BLOCK"
[ "$(pg '{"tool_input":{"command":"git push --force-with-lease origin HEAD:refs/heads/main"}}')" = 2 ] && ok || bad "push-gate: HEAD:refs/heads/main + force flag must BLOCK"
[ "$(pg '{"tool_input":{"command":"git push origin feature-x"}}')" = 0 ] && ok || bad "push-gate: feature-branch push must stay SILENT"
# push-SHAPED only (gustify P8, 2026-09-04): a command that merely MENTIONS push is not a push — the three observed false blocks
[ "$(pg '{"tool_input":{"command":"pytest apps/api/tests/test_pre_push_api_gate.py -q"}}')" = 0 ] && ok || bad "push-gate: a test FILENAME containing push must stay SILENT"
[ "$(pg '{"tool_input":{"command":"git config push.default simple"}}')" = 0 ] && ok || bad "push-gate: the config key push.default must stay SILENT (git, but not a push)"
[ "$(pg '{"tool_input":{"command":"python3 - <<PY\nrow = [\"Push\", \"⬜\"]\nprint(row)\nPY"}}')" = 0 ] && ok || bad "push-gate: a table cell named Push inside a python heredoc must stay SILENT"
[ "$(pg '{"tool_input":{"command":"echo done && echo $(git push origin main)"}}')" = 2 ] && ok || bad "push-gate: a substitution HIDING git push must still BLOCK (the both-words rule is the FIRE side)"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging"}}')" = 0 ] && ok || bad "push-gate: staging (non-terminal) push must stay SILENT"
[ "$(pg '{"tool_input":{"command":"git log --grep \"git push origin main\""}}')" = 0 ] && ok || bad "push-gate: quoted decoy must stay SILENT"
[ "$(pg '{"tool_input":{"command":"npm test"}}')" = 0 ] && ok || bad "push-gate: non-push command must stay SILENT"
# fail-closed on ambiguity (verified bypasses the old parser let through)
git checkout -q feature-x 2>/dev/null || true
[ "$(pg '{"tool_input":{"command":"git push origin HEAD"}}')" = 0 ] && ok || bad "push-gate: HEAD refspec on a feature branch must resolve + stay SILENT"
git checkout -q main 2>/dev/null || true
[ "$(pg '{"tool_input":{"command":"git push origin HEAD"}}')" = 2 ] && ok || bad "push-gate: HEAD refspec on the terminal branch must BLOCK (bare-HEAD bypass)"
[ "$(pg '{"tool_input":{"command":"git push"}}')" = 2 ] && ok || bad "push-gate: bare push on checked-out terminal branch must BLOCK"
git checkout -q "$CURB" 2>/dev/null || true
[ "$(pg '{"tool_input":{"command":"git push --all origin"}}')" = 2 ] && ok || bad "push-gate: --all pushes every branch incl. terminal → must BLOCK"
[ "$(pg '{"tool_input":{"command":"git push --mirror origin"}}')" = 2 ] && ok || bad "push-gate: --mirror → must BLOCK"
[ "$(pg '{"tool_input":{"command":"git push origin main&&true"}}')" = 2 ] && ok || bad "push-gate: operator glued to the refspec → fail closed"
[ "$(pg '{"tool_input":{"command":"git push origin main;echo done"}}')" = 2 ] && ok || bad "push-gate: semicolon glued to the refspec → fail closed"
# review finding 9: a STANDALONE sequence operator is a CLEAN segment boundary (shlex emits it as its
# own token). A non-terminal push chained after it must ALLOW; the fused forms above still fail closed.
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging && gh pr create --fill"}}')" = 0 ] && ok || bad "push-gate: non-terminal push && (standalone) another cmd → ALLOW (the common staging+PR flow)"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging | tee push.log"}}')" = 0 ] && ok || bad "push-gate: non-terminal push | (standalone) pipe → ALLOW"
[ "$(pg '{"tool_input":{"command":"git push origin main && gh pr create"}}')" = 2 ] && ok || bad "push-gate: TERMINAL push && another cmd → still BLOCK (destination is evaluated)"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging && git push origin main"}}')" = 2 ] && ok || bad "push-gate: staging && push main → the SECOND (main) segment BLOCKs (outer loop resumes past the operator)"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging && echo `whoami`"}}')" = 2 ] && ok || bad "push-gate: a SUBSTITUTION anywhere (could hide a push in backticks) → fail closed, even with a clean leading segment"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging && echo done $(date)"}}')" = 2 ] && ok || bad "push-gate: \$( ) substitution anywhere → fail closed"
[ "$(pg '{"tool_input":{"command":"git --git-dir=/x/.git push origin main"}}')" = 2 ] && ok || bad "push-gate: repo-redirect flag → cannot prove repo → fail closed"
[ "$(pg '{"tool_input":{"command":"git -C /other/repo push origin staging"}}')" = 2 ] && ok || bad "push-gate: -C redirect (validates the WRONG repo's PUSH.md) → fail closed"
[ "$(pg '{"tool_input":{"command":"git push origin refs/heads/*:refs/heads/*"}}')" = 2 ] && ok || bad "push-gate: glob refspec → cannot prove it misses terminal → fail closed"
# sha-bound marker: valid only while HEAD matches
mkmarker
[ "$(pg "$PROMO")" = 0 ] && ok || bad "push-gate: marker whose sha == HEAD must authorize the promotion"
printf 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef main\n' > .kdbp/.push-gate-ok
[ "$(pg "$PROMO")" = 2 ] && ok || bad "push-gate: marker with a stale sha (a commit landed since) must BLOCK"
rm -f .kdbp/.push-gate-ok
out=$(pgout '{"tool_input":{"command":"GABE_PUSH_EMERGENCY=1 git push origin origin/staging:main"}}'); rc=$?
[ "$rc" = 0 ] && echo "$out" | grep -q 'GABE_PUSH_EMERGENCY' && ok || bad "push-gate: emergency escape must allow WITH a loud warning"
[ "$(pg 'not json at all')" = 0 ] && ok || bad "push-gate: non-push stdin must stay SILENT"
# ── PR merges are promotions (archie B1, 2026-09-24: `gh pr merge 43 --merge` promoted to main ungated).
# A gh STUB on PATH answers `gh pr view <sel> --json baseRefName`: PR 43 → main · PR 7 → staging · else fails.
GHSTUB=$(mktemp -d)
cat > "$GHSTUB/gh" <<'GHEOF'
#!/usr/bin/env bash
[ "$1 $2" = "pr view" ] || exit 1
case " $* " in *" 43 "*|*"/pull/43 "*) echo main ;; *" 7 "*) echo staging ;; *) exit 1 ;; esac
GHEOF
chmod +x "$GHSTUB/gh"
trap 'rm -rf "$T" "$GHSTUB"' EXIT
# pgc = pg over a RAW command string (JSON-encoded here, so heredocs and quotes ride verbatim), gh stub first on PATH
pgc() { python3 -c 'import json,sys;print(json.dumps({"tool_input":{"command":sys.argv[1]}}))' "$1" | PATH="$GHSTUB:$PATH" bash "$PGG" >/dev/null 2>&1; echo $?; }
rm -f .kdbp/.push-gate-ok
[ "$(pgc 'gh pr merge 43 --merge')" = 2 ] && ok || bad "push-gate: gh pr merge into the terminal branch w/o marker must BLOCK (archie B1)"
[ "$(pgc 'gh api -X PUT repos/{owner}/{repo}/pulls/43/merge')" = 2 ] && ok || bad "push-gate: REST merge (PUT …/pulls/43/merge) into terminal must BLOCK"
[ "$(pgc "gh api graphql -f query='mutation{mergePullRequest(input:{pullRequestId:\"x\"}){clientMutationId}}'")" = 2 ] && ok || bad "push-gate: graphql merge mutation (base unresolvable) must BLOCK"
[ "$(pgc 'gh pr merge 99')" = 2 ] && ok || bad "push-gate: merge whose base cannot be resolved must BLOCK (fail closed)"
[ "$(pgc 'gh pr merge 43 -R other/repo')" = 2 ] && ok || bad "push-gate: merge in a repo other than origin must BLOCK (repo redirect)"
[ "$(pgc '/usr/bin/gh pr merge 43')" = 2 ] && ok || bad "push-gate: a path-qualified gh is still gh"
[ "$(pgc 'gh pr view 1&&gh pr merge 43')" = 2 ] && ok || bad "push-gate: an operator fused into a merge-mentioning gh segment must fail closed"
[ "$(pgc 'git push origin HEAD:staging && gh pr merge 43')" = 2 ] && ok || bad "push-gate: a clean staging push chained to a terminal merge must BLOCK (second segment)"
[ "$(pgc '/usr/bin/git push origin main')" = 2 ] && ok || bad "push-gate: a path-qualified git is still git (was an unlocated push verb → silent ALLOW)"
[ "$(pgc 'gh pr merge 7 --merge')" = 0 ] && ok || bad "push-gate: gh pr merge into a NON-terminal base must stay SILENT"
[ "$(pgc 'gh api repos/{owner}/{repo}/pulls/43/merge')" = 0 ] && ok || bad "push-gate: a GET of a PR's merge status merges nothing → SILENT"
[ "$(pgc 'gh pr merge 43 --disable-auto')" = 0 ] && ok || bad "push-gate: --disable-auto turns auto-merge OFF → SILENT"
[ "$(pgc 'gh pr list --search merge')" = 0 ] && ok || bad "push-gate: a gh command that only mentions merge must stay SILENT"
[ "$(pgc 'git merge origin/staging')" = 0 ] && ok || bad "push-gate: a local git merge is not a promotion → SILENT"
git remote add origin https://github.com/o/r.git
[ "$(pgc 'gh pr merge 7 -R o/r')" = 0 ] && ok || bad "push-gate: -R naming origin's own repo resolves → non-terminal base stays SILENT"
[ "$(pgc 'gh pr merge 43 -R github.com/o/r')" = 2 ] && ok || bad "push-gate: -R HOST/OWNER/REPO naming origin → terminal base still BLOCKs"
git remote remove origin
mkmarker
[ "$(pgc 'gh pr merge 43 --merge')" = 0 ] && ok || bad "push-gate: marker whose sha == HEAD must authorize the terminal merge"
rm -f .kdbp/.push-gate-ok
# ── quoted heredoc bodies are data (archie A, 2026-09-24: /gabe-push's own Step 8.5 commit was blocked)
[ "$(pgc $'git commit -F - <<\'EOF\'\nchore(kdbp): record push bookkeeping for P7\n\n- don\'t forget: the `git push` row, $(date)\nEOF')" = 0 ] && ok || bad "push-gate: bookkeeping commit via a QUOTED heredoc (backtick, apostrophe, \$( in body) must stay SILENT"
[ "$(pgc $'git commit -m "$(cat <<\'EOF\'\nrecord push; git push done, it\'s fine\nEOF\n)"')" = 0 ] && ok || bad "push-gate: the \"\$(cat <<'EOF' … )\" commit form must stay SILENT"
[ "$(pgc $'git commit -F - <<-\'EOF\'\n\tbody: push it\'s\n\tEOF')" = 0 ] && ok || bad "push-gate: <<-'EOF' (tab-stripped terminator) must stay SILENT"
[ "$(pgc $'git commit -F - <<\\EOF\nbody: push it\'s\nEOF')" = 0 ] && ok || bad "push-gate: <<\\EOF (backslash-quoted) must stay SILENT"
[ "$(pgc $'git add . && git commit -F - <<\'EOF\'\npush bookkeeping, it\'s done\nEOF')" = 0 ] && ok || bad "push-gate: \`git add .\` before a quoted-heredoc commit must not disable the strip"
[ "$(pgc $'git commit -F - <<\'EOF\' && git push origin HEAD:staging\nbody: it\'s the push\nEOF')" = 0 ] && ok || bad "push-gate: quoted heredoc chained to a STAGING push must stay SILENT"
[ "$(pgc $'cat <<EOF\n$(git push origin main)\nEOF')" = 2 ] && ok || bad "push-gate: an UNQUOTED heredoc body runs its \$( ) → must BLOCK"
[ "$(pgc $'git commit -F - <<\'EOF\' && git push origin main\nbody with push\nEOF')" = 2 ] && ok || bad "push-gate: quoted heredoc chained to a TERMINAL push must BLOCK"
[ "$(pgc $'bash <<\'EOF\'\ngit push origin main\nEOF')" = 2 ] && ok || bad "push-gate: a quoted heredoc fed to bash IS its script → must BLOCK"
[ "$(pgc $'cat <<\'EOF\' | sh\ngit push origin main\nEOF')" = 2 ] && ok || bad "push-gate: a quoted heredoc piped into sh → must BLOCK"
[ "$(pgc $'cat > x.sh <<\'EOF\'\ngit push origin main\nEOF\n. x.sh')" = 2 ] && ok || bad "push-gate: a heredoc written to a file then sourced → must BLOCK"
[ "$(pgc $'echo "<<\'EOF\'"\ngit push origin main\nEOF')" = 2 ] && ok || bad "push-gate: a heredoc operator INSIDE quotes is not a heredoc → must BLOCK"
[ "$(pgc $'# <<\'EOF\'\ngit push origin main\nEOF')" = 2 ] && ok || bad "push-gate: a heredoc operator inside a comment is not a heredoc → must BLOCK"
[ "$(pgc $'echo $\'it\\\'s <<"X"\'\ngit push origin main\nX')" = 2 ] && ok || bad "push-gate: \$'…' ANSI quoting the scanner cannot follow → keep the body → BLOCK"
[ "$(pgc $'git commit -F - <<\'EOF\'\nunterminated push, it\'s')" = 2 ] && ok || bad "push-gate: an unterminated heredoc keeps the old fail-closed parse"
# bold / backticked keys (the file is hand-editable; markdown tables get prettified)
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Defaults

| default_env | production |

## Environments

### staging

| Setting | Value |
|---------|-------|
| **target_branch** | staging |
| **promote_from** | — |

### production

| Setting | Value |
|---------|-------|
| **target_branch** | main |
| **promote_from** | staging |
PUSHEOF
rm -f .kdbp/.push-gate-ok
[ "$(pg '{"tool_input":{"command":"git push origin main"}}')" = 2 ] && ok || bad "push-gate: bold-key env table must still parse + BLOCK (no fail-open on prettified markdown)"
# INERT: env headings declared but none parse (never a silent ALLOW)
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Environments

### production

| Setting | Value |
|---------|-------|
| some-other-field | main |
PUSHEOF
out=$(pgout '{"tool_input":{"command":"git push origin main"}}'); rc=$?
[ "$rc" = 0 ] && echo "$out" | grep -q 'INERT' && ok || bad "push-gate: declared env headings but none parsed must go INERT (loud), never silent ALLOW"
# the template-trap: example env uncommented without wiring production.promote_from →
# both read as terminal → ordinary staging push must NOT be blocked (gate the default env only)
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Defaults

| default_env | production |

## Environments

### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | — |

### staging

| Setting | Value |
|---------|-------|
| target_branch | staging |
| promote_from | — |
PUSHEOF
rm -f .kdbp/.push-gate-ok
[ "$(pg '{"tool_input":{"command":"git push origin staging"}}')" = 0 ] && ok || bad "push-gate: mis-wired multi-terminal topology must not block ordinary staging pushes"
[ "$(pg '{"tool_input":{"command":"git push origin main"}}')" = 2 ] && ok || bad "push-gate: default env still gated in a mis-wired topology"
# same mis-wired topology, but default_env is markdown-prettified — narrowing must still fire
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Defaults

| **default_env** | production |

## Environments

### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | — |

### staging

| Setting | Value |
|---------|-------|
| target_branch | staging |
| promote_from | — |
PUSHEOF
rm -f .kdbp/.push-gate-ok
[ "$(pg '{"tool_input":{"command":"git push origin staging"}}')" = 0 ] && ok || bad "push-gate: bold **default_env** must still resolve → staging stays free (no silent production fallback)"
[ "$(pg '{"tool_input":{"command":"git push origin main"}}')" = 2 ] && ok || bad "push-gate: bold **default_env** → default (main) still gated"
# single-env project — gating OFF
cat > .kdbp/PUSH.md <<'PUSHEOF'
### production

| Setting | Value |
|---------|-------|
| target_branch | main |
| promote_from | — |
PUSHEOF
[ "$(pg '{"tool_input":{"command":"git push origin main"}}')" = 0 ] && ok || bad "push-gate: single-env project must stay SILENT (gating OFF, ruling 2026-07-31)"
[ "$(pgc 'gh pr merge 43 --merge')" = 0 ] && ok || bad "push-gate: single-env project — a PR merge stays SILENT too (gating OFF, ruling 2026-07-31, kept 2026-09-24)"
# plain key:value env format (the gustify shape — caught by the real-data dry-run,
# where the table-only parse silently ALLOWED the promotion)
cat > .kdbp/PUSH.md <<'PUSHEOF'
## Defaults

default_env: production

## Environments

### staging

target_branch: staging
promote_from: null

### production

target_branch: main
promote_from: staging
PUSHEOF
rm -f .kdbp/.push-gate-ok
[ "$(pg "$PROMO")" = 2 ] && ok || bad "push-gate: key:value env format (gustify shape) must BLOCK the promotion"
[ "$(pg '{"tool_input":{"command":"git push origin HEAD:staging"}}')" = 0 ] && ok || bad "push-gate: key:value format — staging push must stay SILENT"
NOK=$(mktemp -d)
[ "$( (cd "$NOK" && printf '%s' "$PROMO" | bash "$PGG" >/dev/null 2>&1; echo $?) )" = 0 ] && ok || bad "push-gate: no PUSH.md must stay SILENT"
rm -rf "$NOK"

# --- subagent-context: what a sub-agent is handed at spawn (SubagentStart) ----
SAC="$REPO/scripts/hooks/kdbp/subagent-context.sh"
SP="$T/spawn"; mkdir -p "$SP/both/.kdbp" "$SP/both/docs/site/center" "$SP/blocks/.kdbp" "$SP/none"
printf '# What exists\nThere is exactly one MerchantHeader.\n' | tee "$SP/both/.kdbp/BLOCKS.md" > "$SP/blocks/.kdbp/BLOCKS.md"
echo '{}' > "$SP/both/docs/site/center/archmap.json"
sac() { printf '{"agent_type":"%s"}' "$2" | CLAUDE_PROJECT_DIR="$SP/$1" bash "$SAC" 2>/dev/null; }
ctx() { python3 -c 'import json,sys; t=sys.stdin.read().strip(); print(json.loads(t)["hookSpecificOutput"]["additionalContext"] if t else "")'; }
out=$(sac both Explore | ctx)
echo "$out" | grep -q 'exactly one MerchantHeader' && ok || bad "spawn: Explore must be handed BLOCKS.md (it never loads CLAUDE.md)"
echo "$out" | grep -q 'mcp__gabe-map__who_calls' && ok || bad "spawn: a project with a map must hand Explore the map line"
sac both Plan | ctx | grep -q 'exactly one MerchantHeader' && ok || bad "spawn: Plan must be handed BLOCKS.md (it never loads CLAUDE.md)"
out=$(sac both general-purpose | ctx)
echo "$out" | grep -q 'mcp__gabe-map__who_calls' && ok || bad "spawn: every sub-agent kind gets the map line"
echo "$out" | grep -q 'MerchantHeader' && bad "spawn: general-purpose must NOT get BLOCKS.md twice (the CLAUDE.md import already carries it)" || ok
out=$(sac blocks Explore | ctx)
echo "$out" | grep -q 'gabe-map' && bad "spawn: no archmap.json → no map line" || ok
[ -z "$(sac none Explore)" ] && ok || bad "spawn: a project with neither file must stay SILENT"
[ -z "$(printf 'not json' | CLAUDE_PROJECT_DIR="$SP/both" bash "$SAC" 2>/dev/null)" ] && ok || bad "spawn: garbage stdin must stay SILENT"
printf 'not json' | bash "$SAC" >/dev/null 2>&1; [ $? = 0 ] && ok || bad "spawn: the hook must always exit 0 (it cannot block)"

echo "hooks harness: $pass passed, $fail failed"
[ "$fail" = 0 ]
