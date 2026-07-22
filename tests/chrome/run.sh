#!/usr/bin/env bash
# Chrome-harness fixture battery — the executable contract of the shell-JS
# verifier (2026-07-22 alignment review M22).
#
# M22 found the only shell-JS harness (gastify's verify_center_chrome.mjs)
# was DEAD CODE: its tr.rowtog locators match nothing the generators emit, so
# it could neither pass nor catch drift, and adopt-spec's "shell JS ships only
# with its committed harness" was false everywhere. The rewritten harness at
# templates/center/verify_center_chrome.mjs is proven here to both stay SILENT
# on the shipped example pages and FIRE when the page markup or the shell JS
# drifts off the contract. Hermetic: temp copies only, no network, cleans up
# after itself. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$REPO/templates/center/verify_center_chrome.mjs"
SHELL_SRC="$REPO/templates/center/shell"
LEDGER="feature-transaction-action-ledger.html"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

run_h() { node "$HARNESS" "$@" >"$T/out" 2>&1; echo $?; }
mkshell() { rm -rf "$T/shell"; cp -a "$SHELL_SRC" "$T/shell"; }

# --- SILENT: the shipped example pages pass ---------------------------------
[ "$(run_h "$SHELL_SRC/example")" = 0 ] \
  && ok || { bad "silent: shipped example pages must pass"; cat "$T/out"; }
grep -q "$LEDGER" "$T/out" && ok || bad "silent: report names the pages it checked"
grep -q "does not reference rowclick.js" "$T/out" \
  && ok || bad "silent: the pre-ledger page is skipped with a note, not failed"

# --- FIRE: page-side drift — the row class the JS keys on is renamed --------
mkshell
sed -i 's/class="xrow"/class="rowx"/g' "$T/shell/example/$LEDGER"
[ "$(run_h "$T/shell/example/$LEDGER")" != 0 ] \
  && ok || bad "fire: renaming .xrow in the page must fail the harness"

# --- FIRE: JS-side drift — rowclick's .xrow selector is renamed -------------
mkshell
sed -i "s/'\\.xrow'/'.row2'/g" "$T/shell/assets/rowclick.js"
[ "$(run_h "$T/shell/example")" != 0 ] \
  && ok || bad "fire: rowclick selector drift must fail the harness"
grep -q "FAIL · .*clicking the row summary opens the row" "$T/out" \
  && ok || bad "fire: selector drift is caught by EXECUTING the JS, not by grep"

# --- FIRE: a cross-referenced row id goes dead (openTarget no-op drift) -----
mkshell
REF=$(grep -o 'href="#dm-[^"]*"' "$T/shell/example/$LEDGER" | head -1 \
      | sed 's/href="#//; s/"$//')
[ -n "$REF" ] || bad "fixture: no #dm- cross-ref found to mutate"
sed -i "s/id=\"$REF\"/id=\"$REF-gone\"/" "$T/shell/example/$LEDGER"
[ "$(run_h "$T/shell/example/$LEDGER")" != 0 ] \
  && ok || bad "fire: a dangling cross-ref anchor must fail the harness"

# --- FIRE: the page stops loading rowclick.js (explicit page mode) ----------
mkshell
sed -i 's#<script src="[^"]*rowclick\.js"[^>]*></script>##' "$T/shell/example/$LEDGER"
[ "$(run_h "$T/shell/example/$LEDGER")" != 0 ] \
  && ok || bad "fire: an explicit page without rowclick.js must fail"

# --- FIRE: a shipped asset the page references is missing -------------------
mkshell
rm "$T/shell/assets/a3-lightbox.js"
[ "$(run_h "$T/shell/example")" != 0 ] \
  && ok || bad "fire: a missing referenced asset must fail the harness"

# --- vacuous run refused ----------------------------------------------------
mkdir -p "$T/empty"
[ "$(run_h "$T/empty")" = 2 ] \
  && ok || bad "vacuous: a dir with no qualifying pages must exit 2, not pass"

echo "=================================="
echo "chrome battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
