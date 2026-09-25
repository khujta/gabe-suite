#!/usr/bin/env bash
# write-inflight.py fixture battery — the in-flight projection's executable
# contract (ruling 2026-08-07, ask A). Proves FIRE (writes the projection) and
# SILENT (no center → no file, no output), plus the honesty and determinism
# laws: declared null vs [] vs slugs, path-derived touched (bookkeeping commits
# skipped), no wallclock (unchanged tree ⇒ byte-identical, second run writes
# nothing). The FEEDS (Q4 b): commits.js + spine.js refreshed after inflight
# from the committed c4-graph.json through the SUITE's generator (WS-2 — a
# project _a3_commits.py is never imported), only where git ignores them, a
# failed git keeping the last good commits.js, rc never touched; the gate's one
# stderr line names the fix per state (unseeded · tracked · git could not
# answer) and its own derivation never raises past the refresh. Hermetic: temp
# git repos. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
W="${W_OVERRIDE:-$REPO/skills/gabe-cc-update/scripts/write-inflight.py}"   # override for the mutation proof

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok(){ pass=$((pass+1)); }
bad(){ fail=$((fail+1)); echo "FAIL: $1"; }

mkrepo() { local r="$T/$1"; mkdir -p "$r"; (cd "$r" && git init -q . \
  && git config user.email t@t && git config user.name t \
  && echo seed > seed.txt && git add -A && git commit -qm seed); echo "$r"; }
mkcenter() { mkdir -p "$1/docs/site/center"
  cat > "$1/docs/site/center/center.config.json" <<'JSON'
{"entities":{"transaction":{"code":{"api":["api/*.py"],"web":["web/*.tsx"]}},"pantry":{"code":{"api":["pantry/*.py"]}}}}
JSON
}
J() { python3 -c "import json;p=json.load(open('$1/docs/site/center/inflight.json'));print($2)"; }

# ── SILENT: no center → no file, no output ─────────────────────────────────
r=$(mkrepo nocenter)
out=$(python3 "$W" "$r"); rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && [ ! -f "$r/docs/site/center/inflight.json" ] \
  && ok || bad "no center must be fully silent (rc=$rc out='$out')"

# ── FIRE: active plan + declared entities + dirty touched files ────────────
r=$(mkrepo live); mkcenter "$r"; mkdir -p "$r/.kdbp" "$r/api" "$r/web"
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":"7","phases":[
 {"id":"7","name":"F6 backend","tier":"mvp","complexity":"low","types":["persistence"],
  "cells":{"exec":"in_progress"},"cases":null,"entities":["pantry"],"scope":["api/*.py"]}]}
JSON
(cd "$r" && git add -A && git commit -qm "center + plan")
echo x > "$r/api/tx.py"; echo x > "$r/api/tx2.py"   # dirty, matches transaction glob
out=$(python3 "$W" "$r")
[ -f "$r/docs/site/center/inflight.json" ] && ok || bad "active plan must write inflight.json"
[ -f "$r/docs/site/center/inflight.js" ] && ok || bad "writer must emit the inflight.js script sibling (file:// kills fetch)"
head -c 23 "$r/docs/site/center/inflight.js" | grep -q "window.GABE_INFLIGHT = " \
  && ok || bad "inflight.js must be the window-assignment form"
python3 -c "
import json
j = json.load(open('$r/docs/site/center/inflight.json'))
js = open('$r/docs/site/center/inflight.js').read().strip()
assert js.startswith('window.GABE_INFLIGHT = ') and js.endswith(';')
assert json.loads(js[len('window.GABE_INFLIGHT = '):-1]) == j
" && ok || bad "inflight.js payload must equal inflight.json byte-for-semantics"
echo "$out" | grep -q "inflight: 7" && ok || bad "write must print its one line (got '$out')"
[ "$(J "$r" "p['active']")" = "True" ] && ok || bad "active flag"
[ "$(J "$r" "p['phase']['name']")" = "F6 backend" ] && ok || bad "phase payload carried"
[ "$(J "$r" "p['declared']")" = "['pantry']" ] && ok || bad "declared entities carried from the plan record"
[ "$(J "$r" "p['touched']")" = "[{'files': 2, 'slug': 'transaction'}]" ] \
  && ok || bad "touched must be path-derived from the dirty diff (got $(J "$r" "p['touched']"))"
[ "$(J "$r" "p['work_source']")" = "dirty" ] && ok || bad "work_source dirty"

# ── determinism: second run on an unchanged tree writes nothing, bytes equal ─
cp "$r/docs/site/center/inflight.json" "$T/before.json"   # cmp, not md5sum (BSD ships no md5sum)
out2=$(python3 "$W" "$r")
[ -z "$out2" ] && cmp -s "$T/before.json" "$r/docs/site/center/inflight.json" \
  && ok || bad "unchanged tree must be a silent no-op with identical bytes"
grep -qE '"(generated|ts|time)' "$r/docs/site/center/inflight.json" \
  && bad "projection must carry NO wallclock field" || ok

# ── honest blanks: no entities key → declared null; none-declaration → [] ──
r=$(mkrepo blanks); mkcenter "$r"; mkdir -p "$r/.kdbp"
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":"1","phases":[
 {"id":"1","name":"A","cells":{"exec":"todo"}}]}
JSON
(cd "$r" && git add -A && git commit -qm "wire")
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['declared']")" = "None" ] && ok || bad "no entities key must render declared null (never a guess)"
python3 - "$r" <<'PY'
import json, sys
p = json.load(open(sys.argv[1] + "/.kdbp/PLAN.json"))
p["phases"][0]["entities"] = []
json.dump(p, open(sys.argv[1] + "/.kdbp/PLAN.json", "w"))
PY
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['declared']")" = "[]" ] && ok || bad "explicit none-declaration must render declared []"

# ── bookkeeping blindness: clean tree, kdbp commit on top — touched sees work ─
r=$(mkrepo walkback); mkcenter "$r"; mkdir -p "$r/.kdbp" "$r/api"
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":"1","phases":[{"id":"1","name":"A","cells":{"exec":"done"}}]}
JSON
(cd "$r" && git add -A && git commit -qm "wire" \
  && for f in a b c; do echo x > api/$f.py; done && git add -A && git commit -qm "feat: work" \
  && echo tick > .kdbp/LEDGER.md && git add -A && git commit -qm "chore(kdbp): tick")
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['touched'][0]['slug']")" = "transaction" ] \
  && ok || bad "clean tree must walk past the .kdbp bookkeeping commit to the work commit"
[ "$(J "$r" "p['work_source']")" != "dirty" ] && ok || bad "work_source must name the commit, not dirty"

# ── archived plan → active:false with the reason ───────────────────────────
r=$(mkrepo archived); mkcenter "$r"; mkdir -p "$r/.kdbp"
printf '{"version":1,"status":"none","phases":[]}' > "$r/.kdbp/PLAN.json"
(cd "$r" && git add -A && git commit -qm "wire")
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['active']")" = "False" ] && ok || bad "archived plan must render active:false"
[ "$(J "$r" "p['reason']")" = "plan status: none" ] && ok || bad "inactive carries its reason"

# ── null current_phase → active:false, NOT a declared phase mispublished ────
# (regen-mirror writes current_phase:null when PLAN.md's Current Phase line
# doesn't parse; str(None)=="None" would look up nothing and print declared:null
# for a phase that DID declare entities)
r=$(mkrepo nullphase); mkcenter "$r"; mkdir -p "$r/.kdbp"
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":null,"phases":[{"id":"1","name":"A","cells":{"exec":"todo"},"entities":["pantry"]}]}
JSON
(cd "$r" && git add -A && git commit -qm wire)
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['active']")" = "False" ] && ok || bad "null current_phase must render active:false, never publish a phase as never-declared"
[ "$(J "$r" "'current_phase' not in p")" = "True" ] && ok || bad "null current_phase must be omitted, never the literal 'None'"

# ── suite center layout (docs/center/suite-center.config.json) must be found ──
# (the single-path probe produced nothing on a suite-shaped center while pulse fired)
r=$(mkrepo suitelayout); mkdir -p "$r/docs/center" "$r/.kdbp" "$r/api"
cat > "$r/docs/center/suite-center.config.json" <<'JSON'
{"entities":{"pantry":{"code":{"api":["api/*.py"]}}}}
JSON
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":"1","phases":[{"id":"1","name":"A","cells":{"exec":"in_progress"},"entities":["pantry"]}]}
JSON
(cd "$r" && git add -A && git commit -qm wire && echo x > api/x.py)
out=$(python3 "$W" "$r")
[ -f "$r/docs/center/inflight.json" ] && ok || bad "suite-layout center must produce inflight.json (two-layout probe)"
[ -n "$out" ] && ok || bad "suite-layout center must not fall to the silent no-center path"

# ── shared resolver parity: board's touched agrees with the pulse S6 resolver ─
# both must call work_scope; a glob-declared entity that S6 sees, the board sees too
r=$(mkrepo parity); mkdir -p "$r/docs/site/center" "$r/.kdbp" "$r/api"
cat > "$r/docs/site/center/center.config.json" <<'JSON'
{"entities":{"pantry":{"code":{"api":["api/*.py"]}}}}
JSON
cat > "$r/.kdbp/PLAN.json" <<'JSON'
{"version":1,"status":"active","current_phase":"1","phases":[{"id":"1","name":"A","cells":{"exec":"in_progress"}}]}
JSON
(cd "$r" && git add -A && git commit -qm wire && for f in a b c; do echo x > api/$f.py; done)
python3 "$W" "$r" >/dev/null
[ "$(J "$r" "p['touched'][0]['slug']")" = "pantry" ] && ok || bad "board resolver must match glob-declared entities (shared work_scope)"
[ "$(J "$r" "p['touched'][0]['files']")" = "3" ] && ok || bad "board resolver must count 3 glob-matched files"

# ── work_scope excludes the projection under BOTH center layouts (basename match) ──
# (a path-list check only knew docs/site/center/; the suite layout writes to docs/center/,
#  so its own inflight.js re-blinded pulse there — review 2026-08-07)
r=$(mkrepo wsexcl); mkdir -p "$r/docs/site/center" "$r/docs/center" "$r/src"
# a real dirty file keeps us on the dirty branch; the inflight files (both layouts) must be filtered out
(cd "$r" && echo x > src/real.py && echo x > docs/site/center/inflight.js && echo x > docs/center/inflight.json && echo x > docs/center/inflight.js)
got=$(cd "$r" && python3 -c "
import sys; sys.path.insert(0,'$REPO/skills/gabe-pulse/scripts')
import work_scope; from pathlib import Path
files,src=work_scope.changed_files(Path('.'))
print(sorted(files), src)")
[ "$got" = "['src/real.py'] dirty" ] && ok || bad "work_scope must exclude inflight.* under both center layouts, keep real work (got: $got)"

# ── the FEEDS: commits.js + spine.js refreshed after inflight from the committed map (Q4 b) ──
# the twins' four ignore lines · a c4-graph.json homing one node to api/tx.py · commit 1 wires
# the center (touches no mapped file), commit 2 touches api/tx.py. GEN is the generator W
# resolves (parents[3] of W), never a fixture's scripts/.
GEN="$(cd "$(dirname "$W")/../../.." && pwd)/templates/center/generators"
IGN='docs/site/center/inflight.json
docs/site/center/inflight.js
docs/site/center/commits.js
docs/site/center/spine.js'
mkfeeds() { local r; r=$(mkrepo "$1"); mkcenter "$r"; mkdir -p "$r/api"
  echo '{"l2":{"transaction":{"nodes":[{"id":"model:Tx","det":{"file":"api/tx.py"}}]}},"fe":{"pieces":[]}}' \
    > "$r/docs/site/center/c4-graph.json"
  printf '%s\n' "$2" > "$r/.gitignore"
  (cd "$r" && git add -A && git commit -qm "center + map" && echo x > api/tx.py && git add -A && git commit -qm "feat: tx")
  echo "$r"; }
CS() { python3 -c "import json,sys;t=open(sys.argv[1]).read();h='window.GABE_COMMITS = '
print(json.loads(t[len(h):-2])[0]['sha'] if t.startswith(h+'[') else 'STUB')" "$1/docs/site/center/commits.js" 2>/dev/null; }
# bytes + mtime per file — a rewrite of the same bytes still shows
snap() { for f in "$@"; do if [ -f "$f" ]; then printf '%s %s\n' "$(cksum < "$f")" \
  "$(python3 -c 'import os,sys;print(os.stat(sys.argv[1]).st_mtime_ns)' "$f")"; else echo absent; fi; done; }
lines() { if [ -s "$1" ]; then wc -l < "$1" | tr -d ' '; else echo 0; fi; }

# FIRE: both feeds land, commits.js leads with HEAD, one stdout line each, stderr clean
r=$(mkfeeds feeds "$IGN"); C="$r/docs/site/center"
out=$(python3 "$W" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && ok || bad "the feed refresh must leave rc 0 (got $rc)"
[ "$(CS "$r")" = "$(cd "$r" && git rev-parse HEAD)" ] && ok \
  || bad "FIRE: commits.js must lead with HEAD, the newest map-touching commit (got $(CS "$r"))"
[ "$(echo "$out" | sed -n 2p)" = "commits: 1 → docs/site/center/commits.js" ] && ok \
  || bad "a written commits.js prints its one line, after inflight's (got '$out')"
[ "$(echo "$out" | sed -n 3p)" = "spine: 0 → docs/site/center/spine.js (honest-empty — no .kdbp/LEDGER.md)" ] && ok \
  || bad "a stub spine.js is written in the same step and names its reason (got '$out')"
[ "$(echo "$out" | head -1)" = "inflight: inactive → docs/site/center/inflight.json" ] && ok \
  || bad "inflight is still written, and first (got '$out')"
[ "$(lines "$T/err")" = 0 ] && ok || bad "a clean refresh writes nothing to stderr (got '$(cat "$T/err")')"

# SILENT: a second run on the unchanged tree prints nothing, every file keeps bytes AND mtime
s0=$(snap "$C/inflight.json" "$C/commits.js" "$C/spine.js")
out=$(python3 "$W" "$r" 2>&1)
[ -z "$out" ] && [ "$(snap "$C/inflight.json" "$C/commits.js" "$C/spine.js")" = "$s0" ] && ok \
  || bad "SILENT: an unchanged tree rewrites no feed and prints nothing (got '$out')"

# head moves, the map does not: a docs-only commit rewrites inflight, never the feeds
(cd "$r" && echo doc > README.md && git add -A && git commit -qm "docs: readme")
s0=$(snap "$C/commits.js" "$C/spine.js")
out=$(python3 "$W" "$r" 2>&1)
[ "$out" = "inflight: inactive → docs/site/center/inflight.json" ] \
  && [ "$(snap "$C/commits.js" "$C/spine.js")" = "$s0" ] && ok \
  || bad "a docs-only commit rewrites inflight (head moved) and leaves both feeds alone (got '$out')"

# inflight unchanged, the feeds not: the refresh never sits behind inflight's unchanged return
rm "$C/commits.js"; mkdir -p "$r/.kdbp"
printf '| 2026-09-24 | COMMIT | feat: tx | %s | ok |\n' "$(cd "$r" && git rev-parse --short HEAD~1)" > "$r/.kdbp/LEDGER.md"
out=$(python3 "$W" "$r" 2>&1)
[ "$out" = "commits: 1 → docs/site/center/commits.js
spine: 1 → docs/site/center/spine.js" ] && ok \
  || bad "the feeds refresh when inflight is unchanged — a missing commits.js returns, the LEDGER row lands (got '$out')"

# O2: a failed git keeps the last good commits.js (bytes + mtime) and names why on stderr; rc 0
SHIM="$T/shim"; mkdir -p "$SHIM"
printf '#!/bin/sh\ncase "$1" in log) echo "fatal: the shim refuses log" >&2; exit 1;; esac\nexec "%s" "$@"\n' \
  "$(command -v git)" > "$SHIM/git"; chmod +x "$SHIM/git"
s0=$(snap "$C/commits.js")
out=$(PATH="$SHIM:$PATH" python3 "$W" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ "$(snap "$C/commits.js")" = "$s0" ] && ok \
  || bad "O2: a failed git keeps the last good commits.js, rc 0 (rc=$rc)"
[ "$(cat "$T/err")" = "commits: kept the last good docs/site/center/commits.js (1) — git log failed: rc 1 — fatal: the shim refuses log" ] \
  && ok || bad "O2: the kept feed names why on stderr, one line (got '$(cat "$T/err")')"

# GATE: a feed git does not ignore is never written — one stderr line, rc 0, git status clean of feeds
r=$(mkfeeds feedgate 'docs/site/center/inflight.json
docs/site/center/inflight.js'); C="$r/docs/site/center"
out=$(python3 "$W" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ ! -e "$C/commits.js" ] && [ ! -e "$C/spine.js" ] && ok \
  || bad "GATE: an unignored feed is never written (rc=$rc)"
[ "$(cat "$T/err")" = "docs/site/center/commits.js, docs/site/center/spine.js not gitignored — not refreshed (run /gabe-init update to seed them)" ] \
  && ok || bad "GATE: one stderr line names the feeds and /gabe-init update (got '$(cat "$T/err")')"
echo "$out" | grep -qE '^(commits|spine):' && bad "GATE: no feed line on stdout (got '$out')" || ok
[ -z "$(cd "$r" && git status --porcelain | grep -E 'commits\.js|spine\.js')" ] && ok \
  || bad "GATE: git status must show no feed"

# a TRACKED commits.js (force-added over its ignore line) is never written: holding the bytes a
# refresh would write → no nag (SILENT); stale after a new commit → the one gate line (FIRE)
r=$(mkfeeds feedtracked "$IGN"); C="$r/docs/site/center"
python3 -B - "$GEN" "$r" <<'PY'
import json, pathlib, sys
sys.path.insert(0, sys.argv[1])
import _a3_commits
root = pathlib.Path(sys.argv[2]); c = root / "docs/site/center"
graph = json.loads((c / "c4-graph.json").read_text(encoding="utf-8"))
(c / "commits.js").write_text(_a3_commits.render(*_a3_commits.derive(root, graph)), encoding="utf-8")
PY
(cd "$r" && git add -f docs/site/center/commits.js && git commit -qm "chore: a tracked feed")
s0=$(snap "$C/commits.js")
python3 "$W" "$r" >/dev/null 2>"$T/err"
[ "$(snap "$C/commits.js")" = "$s0" ] && [ "$(lines "$T/err")" = 0 ] && [ -f "$C/spine.js" ] && ok \
  || bad "SILENT: a tracked commits.js already holding the refresh's bytes is untouched and unnagged; the ignored spine.js lands (err '$(cat "$T/err")')"
(cd "$r" && echo y > api/tx.py && git add -A && git commit -qm "feat: tx again")
s0=$(snap "$C/commits.js")
python3 "$W" "$r" >/dev/null 2>"$T/err"
[ "$(snap "$C/commits.js")" = "$s0" ] && [ -z "$(cd "$r" && git status --porcelain docs/site/center/commits.js)" ] && ok \
  || bad "a TRACKED commits.js is never written, even stale"
[ "$(cat "$T/err")" = "docs/site/center/commits.js tracked — not refreshed (git rm --cached docs/site/center/commits.js; /gabe-init update seeds the ignore line)" ] \
  && ok || bad "a stale TRACKED commits.js gets the untrack line, not the seed advice (got '$(cat "$T/err")')"

# a spine that cannot be derived (an unreadable LEDGER) while spine.js is unignored: the nag's own
# derivation reads the stub, as refresh_feeds does — never raising past the refresh of the ignored
# commits.js (the twins' state until their spine.js line lands)
if [ "$(id -u)" != 0 ]; then
  r=$(mkfeeds feedspinebad "$(printf '%s\n' "$IGN" | grep -v spine.js)"); C="$r/docs/site/center"
  mkdir -p "$r/.kdbp"; echo '| 2026-09-24 | COMMIT | x | abc1234 | ok |' > "$r/.kdbp/LEDGER.md"; chmod 000 "$r/.kdbp/LEDGER.md"
  out=$(python3 "$W" "$r" 2>"$T/err"); rc=$?
  [ "$rc" = 0 ] && [ "$(CS "$r")" = "$(cd "$r" && git rev-parse HEAD)" ] && [ ! -e "$C/spine.js" ] && ok \
    || bad "a spine that cannot be derived never stops the ignored commits.js from landing (rc=$rc out '$out' err '$(cat "$T/err")')"
  [ "$(cat "$T/err")" = "docs/site/center/spine.js not gitignored — not refreshed (run /gabe-init update to seed it)" ] \
    && ok || bad "an underivable spine still gets the one gate line, nothing else (got '$(cat "$T/err")')"
  chmod 644 "$r/.kdbp/LEDGER.md"
else
  echo "SKIP: the unreadable-LEDGER case needs a non-root uid (root reads a mode-000 file)"
fi

# git that cannot answer check-ignore (exit 128) is not "unignored": no /gabe-init advice, no feed, rc 0
r=$(mkfeeds feedblind "$IGN"); C="$r/docs/site/center"
SHIM2="$T/shim128"; mkdir -p "$SHIM2"
printf '#!/bin/sh\ncase "$1" in check-ignore) echo "fatal: the shim cannot answer" >&2; exit 128;; esac\nexec "%s" "$@"\n' \
  "$(command -v git)" > "$SHIM2/git"; chmod +x "$SHIM2/git"
out=$(PATH="$SHIM2:$PATH" python3 "$W" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ ! -e "$C/commits.js" ] && [ ! -e "$C/spine.js" ] && ! grep -q "/gabe-init update" "$T/err" && ok \
  || bad "a check-ignore that cannot answer writes no feed and gives no seed advice (rc=$rc err '$(cat "$T/err")')"
[ "$(cat "$T/err")" = "docs/site/center/commits.js, docs/site/center/spine.js not refreshed — git could not answer check-ignore" ] \
  && ok || bad "a check-ignore that cannot answer says so on one line (got '$(cat "$T/err")')"

# every feed ignored: the nag has nothing to judge and never parses the map (the refresh parses it once)
got=$(python3 -B - "$W" "$r" <<'PY'
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location("wi", sys.argv[1]); wi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wi)
reads = []
class Spy:
    @staticmethod
    def loads(s, *a, **k):
        reads.append(1); return json.loads(s, *a, **k)
wi.json = Spy
root = pathlib.Path(sys.argv[2]); c = root / "docs/site/center"
class Mod:
    render_spine = staticmethod(lambda sp, why=None: "x")
    build_spine = staticmethod(lambda r, k: {})
none = wi._stale(Mod, root, c, root / ".kdbp", []); n0 = len(reads)
one = wi._stale(Mod, root, c, root / ".kdbp", ["spine"])
print(none, n0, one, len(reads) - n0)
PY
)
[ "$got" = "[] 0 ['spine'] 1" ] && ok \
  || bad "no feed to judge → no parse of the map; one to judge → one parse (got '$got')"

# SILENT: no c4-graph.json (a pre-map center, the suite's own) — no feed, no extra output
r=$(mkrepo feednomap); mkcenter "$r"; printf '%s\n' "$IGN" > "$r/.gitignore"; mkdir -p "$r/api"
(cd "$r" && git add -A && git commit -qm wire && echo x > api/tx.py && git add -A && git commit -qm "feat: tx")
out=$(python3 "$W" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ "$out" = "inflight: inactive → docs/site/center/inflight.json" ] && [ "$(lines "$T/err")" = 0 ] \
  && [ ! -e "$r/docs/site/center/commits.js" ] && [ ! -e "$r/docs/site/center/spine.js" ] && ok \
  || bad "SILENT: no c4-graph.json writes no feed and adds no output (out '$out')"

# WS-2: a trap _a3_commits.py in the project's scripts/ AND at its root is never imported —
# the suite's copy writes the feed, run from the project root as the E8 tail runs it
TRAP='print("SHADOW"); raise RuntimeError("the project copy was imported")'
sr=$(mkfeeds feedshadow "$IGN"); mkdir -p "$sr/scripts"
echo "$TRAP" > "$sr/scripts/_a3_commits.py"; echo "$TRAP" > "$sr/_a3_commits.py"
out=$(cd "$sr" && python3 "$W" . 2>&1); rc=$?
[ "$rc" = 0 ] && ! echo "$out" | grep -q SHADOW && [ "$(CS "$sr")" = "$(cd "$sr" && git rev-parse HEAD)" ] && ok \
  || bad "WS-2: the suite's generator writes the feed; no project _a3_commits.py is imported (got '$out')"

# ISOLATION: write-inflight.py + work_scope.py alone in a skills-shaped tree (no templates/) —
# inflight is written, rc 0, one stderr line; the project's copy is STILL never the fallback
I="$T/iso"; mkdir -p "$I/skills/gabe-cc-update/scripts" "$I/skills/gabe-pulse/scripts"
cp "$W" "$I/skills/gabe-cc-update/scripts/write-inflight.py"
cp "$(dirname "$W")/../../gabe-pulse/scripts/work_scope.py" "$I/skills/gabe-pulse/scripts/"
IW="$I/skills/gabe-cc-update/scripts/write-inflight.py"
r=$(mkfeeds feediso "$IGN")
out=$(python3 "$IW" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ -f "$r/docs/site/center/inflight.json" ] && [ ! -e "$r/docs/site/center/commits.js" ] && ok \
  || bad "ISOLATION: no suite generator still writes inflight, rc 0, no feed (rc=$rc)"
[ "$(lines "$T/err")" = 1 ] && grep -q "_a3_commits.py is not under .* — feeds not refreshed" "$T/err" && ok \
  || bad "ISOLATION: one stderr line says the suite generator is missing (got '$(cat "$T/err")')"
out=$(cd "$sr" && python3 "$IW" . 2>&1)
! echo "$out" | grep -q SHADOW && ok \
  || bad "WS-2: with no suite generator the project's _a3_commits.py is still never imported (got '$out')"
# a suite generator that raises at import: rc 0, inflight written, the error on one stderr line
mkdir -p "$I/templates/center/generators"
echo 'raise RuntimeError("boom at import")' > "$I/templates/center/generators/_a3_commits.py"
r=$(mkfeeds feedboom "$IGN")
out=$(python3 "$IW" "$r" 2>"$T/err"); rc=$?
[ "$rc" = 0 ] && [ -f "$r/docs/site/center/inflight.json" ] && [ "$(lines "$T/err")" = 1 ] \
  && grep -q "commits: feeds not refreshed — boom at import" "$T/err" && ok \
  || bad "a generator that raises at import leaves rc 0 and inflight written (rc=$rc err '$(cat "$T/err")')"

echo "inflight battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
