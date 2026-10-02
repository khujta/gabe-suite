#!/usr/bin/env bash
# Legibility-audit battery — the executable contract of
# skills/gabe-artifact/tools/legibility-audit.mjs.
#
# The audit counts what a human reader hits and the model that built the page does not (D-066: nested hovers,
# a kind's meaning repeated on every hover, twins, bare items, raw feed words, unfilled tokens). A count that
# cannot fire is non-evidence, and a count that cannot stay silent is noise — so this proves BOTH, per check:
#
#   fire.html    every count fires with a KNOWN number (exact, not "> 0")
#   silent.html  the near-misses stay silent: a short label that repeats, a long line repeated by one hover
#                too few, twins that sit in two cells, a mark drawn inside an svg, a bare number, code placed LAST
#                in a hover, a URL's {id}, a file name
#   native.html  a page whose hover system is the title attribute — the options carry the convention
#
# and mutation-proves it: each check has a ONE-LINE mutant of the tool that must make its count change on the
# fixture (the fire side), and each near-miss has a one-line mutant that must make it FIRE (the silent side) —
# without them a green "silent" proves nothing. A stale mutation anchor aborts the run (exit 2): it never
# skips, or the case would pass against an unbuilt mutant.
#
# Needs playwright + a chrome; without them it SKIPs LOUDLY (the doctor surfaces "DID NOT RUN") and exits 0.
# Hermetic: temp copies only, the fixtures are served from file://. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TOOL="$REPO/skills/gabe-artifact/tools/legibility-audit.mjs"
FIX="$REPO/tests/legibility-audit/fixtures"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok(){ echo "  ok: $1"; pass=$((pass+1)); }
bad(){ echo "  FAIL: $1"; fail=$((fail+1)); }

[ -f "$TOOL" ] || { echo "⛔ missing tool: $TOOL"; exit 2; }
for f in fire silent native; do [ -f "$FIX/$f.html" ] || { echo "⛔ missing fixture: $FIX/$f.html"; exit 2; }; done

# the same resolution a user gets: GABE_PW_DIR / GABE_CHROME_BIN when set, else the tool's own search. A repo
# checkout that carries the author-time playwright-core uses it (the other browser batteries do the same).
if [ -z "${GABE_PW_DIR:-}" ] && [ -d "$REPO/docs/design/graft-adoption/spike/_build/node_modules/playwright-core" ]; then
  export GABE_PW_DIR="$REPO/docs/design/graft-adoption/spike/_build/node_modules/playwright-core"
fi

# mutants run from a mirror of the skills tree so the tool's own relative import (gabe-docsite's resolver) still resolves
MIRROR="$TMP/skills"
mkdir -p "$MIRROR/gabe-artifact/tools"
ln -s "$REPO/skills/gabe-docsite" "$MIRROR/gabe-docsite"
MTOOL="$MIRROR/gabe-artifact/tools/legibility-audit.mjs"

# mutate <old> <new> — rebuild the mutant from the real tool, ONE replacement, abort when the anchor is gone
mutate(){
  if ! python3 - "$TOOL" "$MTOOL" "$1" "$2" <<'PY'
import sys
src, dst, old, new = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
s = open(src, encoding="utf-8").read()
if s.count(old) != 1:
    sys.exit("anchor must match exactly once (%d): %s" % (s.count(old), old[:80]))
open(dst, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
  then echo "  FAIL: mutation anchor no longer matches the tool — not built"; exit 2; fi
}

# audit <tool> <fixture-name> <out-name> [options…] — runs the audit, report in $TMP/<out-name>.json, stdout in .txt
audit(){
  local tool="$1" fx="$2" out="$3"; shift 3
  rm -f "$TMP/$out.json"   # a mutant that crashes must not be read as the previous mutant's report
  node "$tool" "$FIX/$fx.html" --out "$TMP/$out.json" --settle 0 "$@" >"$TMP/$out.txt" 2>&1; echo $?
}
# val <out-name> <dotted.path> — one number from a report
val(){ python3 - "$TMP/$1.json" "$2" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
for k in sys.argv[2].split("."): d = d[k]
print(d)
PY
}
# expect <out-name> <dotted.path> <number> <message>
expect(){ local got; got="$(val "$1" "$2" 2>/dev/null)"; if [ "$got" = "$3" ]; then ok "$4 ($3)"; else bad "$4 — expected $3, got ${got:-nothing}"; fi; }
# changed <out-name> <dotted.path> <baseline> <message> — the mutant moved the count off the real tool's number
changed(){ local got; got="$(val "$1" "$2" 2>/dev/null)"; if [ -n "$got" ] && [ "$got" != "$3" ]; then ok "$4 (real $3 → mutant $got)"; else bad "$4 — mutant left it at ${got:-nothing}"; fi; }

echo "legibility-audit battery"

# ── 0 · the browser is there, or this battery says so out loud ─────────────
rc=$(audit "$TOOL" silent silent)
if grep -q "SKIP ⚠" "$TMP/silent.txt"; then
  echo "  SKIP ⚠ — LEGIBILITY-AUDIT COVERAGE DID NOT RUN: $(grep 'SKIP ⚠' "$TMP/silent.txt" | head -1)"
  echo "         provision: playwright-core + a system chrome (GABE_PW_DIR / GABE_CHROME_BIN), as tests/gabe-universe/run.sh's header says."
  exit 0
fi
[ "$rc" = "0" ] && ok "the audit runs and exits 0" || bad "audit exited $rc on the silent fixture"

# ── 1 · SILENT: the near-misses read clean, and the page really was audited ─
expect silent hover.targets 23 "silent fixture: every hover target found (the zeros below are not an empty read)"
expect silent hover.showing 23 "silent fixture: every target showed a hover"
for c in nested repeatLine repeatMajority twins twinFaces bare machineWords unfilled; do
  expect silent "checks.$c.count" 0 "silent fixture: $c stays silent"
done

# ── 2 · FIRES: every count, with the number the fixture was built to give ──
rc=$(audit "$TOOL" fire fire)
[ "$rc" = "0" ] && ok "report-never-gate: exit 0 with findings on the page" || bad "audit exited $rc on the fire fixture — it must never gate"
expect fire hover.targets 30 "fire fixture: every hover target found"
expect fire checks.nested.count 1 "nested: the inner target inside the outer one"
expect fire checks.repeatLine.count 12 "repeatLine: two groups of six hovers repeat a long line"
expect fire checks.repeatMajority.count 6 "repeatMajority: only the group whose hover is mostly the repeated line"
expect fire checks.twins.count 1 "twins: two items, one cell, one hover"
expect fire checks.twinFaces.count 1 "twinFaces: two items, one cell, one face"
expect fire checks.bare.count 2 "bare: two items with no glyph"
expect fire checks.machineWords.faces 5 "machineWords: five faces (expression · library id · feed id · i18n key · call)"
expect fire checks.machineWords.hoverOpening 1 "machineWords: one hover that OPENS with code"
expect fire checks.unfilled.count 2 "unfilled: a {token} face and an undefined hover"
python3 - "$TMP/fire.json" <<'PY' && ok "bySection names where each count sits" || bad "bySection missing on the fire report"
import json, sys
d = json.load(open(sys.argv[1]))
assert d["checks"]["nested"]["bySection"].get("hov") == 1, d["checks"]["nested"]
assert d["checks"]["bare"]["bySection"].get("rows") == 2, d["checks"]["bare"]
PY

# ── 3 · MUTANTS, fire side: each check's one-line mutant moves ITS count ───
fire_mutant(){   # <label> <old> <new> <dotted.path> <real-number>
  mutate "$2" "$3"; audit "$MTOOL" fire m-fire >/dev/null
  changed m-fire "$4" "$5" "mutant — $1"
}
fire_mutant "nested never set" 'nested: !!par && !(tip && par.closest(tipSel))' 'nested: false' checks.nested.count 1
fire_mutant "a repeat never reaches the threshold" '(byLine.get(l) || 0) >= repeat;' '(byLine.get(l) || 0) >= 99999;' checks.repeatLine.count 12
fire_mutant "majority bar unreachable" 'if (repChars * 2 > allChars)' 'if (repChars * 2 > allChars * 9)' checks.repeatMajority.count 6
fire_mutant "twins keyed on nothing" "twinOf((r) => r.txt, 'twins'" "twinOf((r) => '', 'twins'" checks.twins.count 1
fire_mutant "twinFaces keyed on nothing" "twinOf((r) => face(r.e), 'twinFaces'" "twinOf((r) => '', 'twinFaces'" checks.twinFaces.count 1
fire_mutant "every item counts as having a glyph" "if (!(r.e.closest('svg') || r.e.matches(glyph) || r.e.querySelector(glyph)))" 'if (false)' checks.bare.count 2
fire_mutant "faces never judged" 'if (h.length) {' 'if (0) {' checks.machineWords.faces 5
fire_mutant "hover openings never judged" 'if (first && rawWords(first).length)' 'if (0)' checks.machineWords.hoverOpening 1
fire_mutant "i18n keys never matched" 'if (!NOT_KEY.test(m[0])) hits.push(m[0]);' 'if (0) hits.push(m[0]);' checks.machineWords.faces 5
fire_mutant "unfilled pattern matches nothing" '/\bundefined\b|\bNaN\b|(?<!\/)\{[a-z]\w*\}/' '/\bNEVER\b/' checks.unfilled.count 2

# ── 4 · MUTANTS, silent side: each near-miss's one-line mutant makes it FIRE ─
silent_mutant(){   # <label> <old> <new> <dotted.path>
  mutate "$2" "$3"; audit "$MTOOL" silent m-silent >/dev/null
  local got; got="$(val m-silent "$4" 2>/dev/null)"
  if [ -n "$got" ] && [ "$got" != "0" ]; then ok "silent-side mutant — $1 ($4 = $got)"; else bad "silent-side mutant — $1 left $4 at ${got:-nothing}"; fi
}
silent_mutant "no label allowance (every line may count)" "'label-len': '24'" "'label-len': '1'" checks.repeatLine.count
silent_mutant "a long line repeated by four counts as repeated" "repeat: '5'" "repeat: '3'" checks.repeatLine.count
silent_mutant "twins looked for across the whole page, not one container" 'const c = r.e.closest(container), k = key(r);' "const c = r.e.closest('body'), k = key(r);" checks.twins.count
silent_mutant "a URL's {id} read as a hole" '(?<!\/)\{[a-z]\w*\}/;' '\{[a-z]\w*\}/;' checks.unfilled.count
silent_mutant "code last in a hover read as the opening" 'const first = lines(r.txt)[0];' 'const first = r.txt;' checks.machineWords.hoverOpening
silent_mutant "a bare number read as an element without an icon" 'if (!/[A-Za-z]/.test(face(r.e))) return;' '' checks.bare.count
silent_mutant "a mark drawn inside an svg read as a bare item" "r.e.closest('svg') || " '' checks.bare.count
silent_mutant "a host or file name read as an i18n key" '!NOT_KEY.test(m[0])' 'true' checks.machineWords.faces

# ── 5 · the options carry the page's hover convention and the audit's scope ─
rc=$(audit "$TOOL" fire o-machine --machine 'dependency-value')
expect o-machine checks.machineWords.faces 6 "--machine adds a page-specific raw word"
rc=$(audit "$TOOL" fire o-keep --keep 'is not None')
expect o-keep checks.machineWords.faces 4 "--keep removes a name before the face is judged"
rc=$(audit "$TOOL" fire o-rows --rows '#absent')
expect o-rows checks.bare.count 0 "--rows: no row region, no bare items"
expect o-rows checks.twins.count 0 "--rows: no row region, no twins"
expect o-rows checks.repeatLine.count 12 "--rows leaves the hover-wide counts alone"
rc=$(audit "$TOOL" fire o-scope --scope '#hov')
expect o-scope hover.targets 14 "--scope: only the targets inside the region"
expect o-scope checks.unfilled.count 0 "--scope: a hole outside the region is not counted"
expect o-scope checks.nested.count 1 "--scope: the region's own findings stay"
rc=$(audit "$TOOL" native o-native --hover-attr title --tip none)
expect o-native checks.nested.count 1 "--hover-attr title --tip none: nested native titles"
expect o-native checks.twins.count 1 "--hover-attr title --tip none: twin native titles"
rc=$(audit "$TOOL" native o-default)
expect o-default hover.targets 0 "a page without the declared hover attribute has no targets"
grep -q "NOTE  no hover targets" "$TMP/o-default.txt" && ok "…and the audit says so instead of printing clean zeros" || bad "no NOTE when nothing was audited"

# ── 6 · the edges: a page that will not load SKIPs loudly; bad usage exits 2 ─
node "$TOOL" --page http://127.0.0.1:9/ --settle 0 >"$TMP/skip.txt" 2>&1; rc=$?
if [ "$rc" = "0" ] && grep -q "SKIP ⚠ — LEGIBILITY AUDIT DID NOT RUN" "$TMP/skip.txt"; then ok "an unreachable page is a loud SKIP, not a clean report"; else bad "unreachable page: expected exit 0 + SKIP (got $rc)"; fi
node "$TOOL" "$FIX/fire.html" --no-such-option 1 >/dev/null 2>&1; rc=$?
[ "$rc" = "2" ] && ok "an unknown option is a usage error (exit 2)" || bad "unknown option exited $rc"

echo "legibility-audit: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
