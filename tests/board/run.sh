#!/usr/bin/env bash
# Board KPI-filter + ▶ NOW banner contract battery.
#
# Guards the coupling that shipped broken twice: a KPI tile filters on a card
# attribute the GENERATOR must emit, and the banner renders classes the CSS must
# style. When the two halves live in different files, that seam is exactly where
# a filter silently starts showing the whole board again (closed-30d showed 137
# of 83; over-3-months showed all of 2) — no error, just a wrong count.
#
# It is a SOURCE-CONTRACT battery (grep predicates, fire+silent) because the
# suite ships no browser. The runtime counts themselves are proven at author
# time by playwright against a real twin's board (the lab-driver read-only
# build); this battery keeps the two source halves from drifting apart after.
#
# The board SEATS (D-045 · D-048) ride the same contract: the skeleton mounts
# {{BOARD_SEATS}} and loads the pane runtime in its one working order, render_board
# fills the token, and seats.js joins a ledger sha by PREFIX and tears a pane down
# through GabePane.destroy. The done-card sha chip too: card_html emits it only on
# a done card that names a commit, and seats.css styles the class it emits (its
# keyboard focus ring kept). What the seats DO is proven in a browser by
# tests/embed-pane/seats.mjs; what a regen WRITES, by tests/center.
#
# D-061 (the board's dates): the generator writes no wallclock-relative text — two
# builds of one tree with the clock a day apart are the same bytes (the regen stamp
# aside), and the PAGE counts the days (assets/a3-days.js) — proven in a real
# browser at two simulated todays (days.mjs + days_check.py, file://). Then the
# baseline normaliser without its retired board/ago rules, and S4: every git read
# map-baseline.sh makes of a target runs with GIT_OPTIONAL_LOCKS=0. No chrome or
# no Playwright is RED, not a skip (a checker that cannot run is not evidence).
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
GEN="$REPO/templates/center/generators/_a3_board.py"
JS="$REPO/templates/center/shell/assets/board.js"
CSS="$REPO/templates/center/shell/assets/a3.css"
SHELL_BOARD="$REPO/templates/center/shell/board.html"
BUILD="$REPO/templates/center/generators/build_center_a3.py"
SEATS_JS="$REPO/templates/center/shell/assets/seats.js"
SEATS_CSS="$REPO/templates/center/shell/assets/seats.css"
# the SEATS' scripts, in the one order that works: the feeds, the 3D bundle, _grammar before _slice (which
# captures it at load), _pane before _pane-console (which wraps it), the boot last — all after board.js
SEAT_SRCS="c4-graph.js commits.js workflows.js spine.js assets/3d-bundle.js assets/_grammar.js assets/_slice.js assets/_uni-grammar.js assets/_pane.js assets/_pane-console.js assets/seats.js"

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

# --- the two predicates, so the SAME check that passes on the shipped file is
#     the one asserted to FAIL on a mutated copy (a checker that cannot fail is
#     non-evidence — meta-review P2). ------------------------------------------
gen_ok() {  # the generator emits BOTH KPI-filter attributes on every card (the page sets them from the card's date and
            # the tile's rule — D-061), and each date KPI tile names the flag its click filters on
  grep -q 'data-closed30="0" data-aged="0"' "$1" && grep -q '"le:30", "closed30", "closed"' "$1" && grep -q '"gt:90", "aged", "created"' "$1"
}
js_ok() {   # board.js carries, applies, and WIRES both filter dimensions,
            # and builds the spine rail mapped to gabe commands
  grep -q 'closed30:' "$1" && grep -q 'aged:' "$1" \
    && grep -q 'F.closed30 || c.dataset.closed30' "$1" \
    && grep -q 'F.aged || c.dataset.aged' "$1" \
    && grep -q "key === 'closed'" "$1" && grep -q "F.closed30 = '1'" "$1" \
    && grep -q "key === 'aged'" "$1" && grep -q "F.aged = '1'" "$1" \
    && grep -q 'bnow-rail' "$1" && grep -q 'bnow-stage' "$1" \
    && grep -q "'/gabe-cc-update'" "$1" && grep -q "'/gabe-push'" "$1"
}
shell_ok() {  # the seats mount between the title and the lede; their skin is linked; their scripts follow board.js in order
  tr '\n' ' ' <"$1" | grep -q '<h1>{{BOARD_TITLE}}</h1> *{{BOARD_SEATS}} *<p>{{BOARD_LEDE}}</p>' \
    && grep -q 'href="assets/_pane.css"' "$1" && grep -q 'href="assets/_pane-console.css"' "$1" && grep -q 'href="assets/seats.css"' "$1" \
    && [ "$(grep -o '<script src="[^"]*" defer>' "$1" | sed 's/<script src="\([^"]*\)".*/\1/' | sed -n '/^assets\/board\.js$/,$p' | tail -n +2 | tr '\n' ' ')" = "$SEAT_SRCS " ]
}
render_ok() {  # render_board fills the token — from the seats module, capped by the commits feed's own N
  grep -q '"{{BOARD_SEATS}}": _a3_seats.board_seats(cap=_a3_commits.N),' "$1" && grep -q '^import _a3_seats' "$1"
}
seats_ok() {  # seats.js joins by PREFIX on the full sha (a position-0 test — never a bare indexOf, which is a SUBSTRING
              # join), tears down through the public destroy, never the old wording
  grep -qE '\.sha\b[^;]*\.(lastIndexOf\([^,)]*, *0\) *[!=]== *0|indexOf\([^,)]*\) *[!=]== *0|startsWith\()' "$1" && grep -q 'GabePane\.destroy(' "$1" \
    && ! grep -q '_destructor' "$1" && ! grep -q 'HAVE\[c\.short\]' "$1" && ! grep -q 'newer than the landed feed' "$1"
}

chip_ok() {   # card_html emits the sha chip — a button of its OWN class (never .bchip, which board.js filters on) —
              # only on a DONE card that names a commit; the debt loop hands a card its shas only when the row closed
  grep -q '    if c\["done"\] and c.get("shas"):$' "$1" && grep -q '<button type="button" class="bc-sha" ' "$1" \
    && grep -q '<div class="bc-top">{"".join(chips)}{ripe}{sha}</div>' "$1" \
    && grep -q 'shas=(r\["shas"\] if r\["closed"\] else \[\]),' "$1"
}
chipcss_ok() {  # seats.css styles the chip the generator emits, ● and ○ apart, and keeps a keyboard focus ring on it
  grep -q '^\.bc-sha{' "$1" && grep -q '^\.bc-sha\[data-live="1"\]{' "$1" \
    && grep -q '^\.bc-sha:focus-visible{ outline:2px solid var(--accent);' "$1" && ! grep -q '^\.bc-sha.*outline:none' "$1"
}

# --- SILENT: the shipped sources satisfy the contract ----------------------
gen_ok "$GEN" && ok || bad "silent: generator must emit data-closed30 + data-aged"
js_ok  "$JS"  && ok || bad "silent: board.js must carry/apply/wire closed30+aged and build the spine rail"
# the NOW pill must stay white-on-accent (the contrast fix — dark-ink-on-accent
# read as one indistinguishable block)
grep -A1 '\.bnow-tag{' "$CSS" | grep -q 'color:#fff' \
  && ok || bad "silent: NOW pill (.bnow-tag) must be white-on-accent"
# the CSS must style what the banner emits: current-stage chip + label rows
grep -q '\.bnow-stage\.now' "$CSS" && ok || bad "silent: CSS must style the lit spine stage (.bnow-stage.now)"
grep -q '\.bnow-lab' "$CSS"        && ok || bad "silent: CSS must style the banner labels (.bnow-lab)"
# the ▶ NOW banner links to the Gabe Universe (the one codebase-graph station since 2026-09-10) —
# this beat's touched→blast IS what the station overlays from the same inflight.
grep -q 'href="gabe-universe.html"' "$JS" && grep -q 'bnow-graph' "$JS" \
  && ok || bad "silent: the ▶ NOW banner must link to gabe-universe.html (.bnow-graph)"
grep -q '\.bnow-graph' "$CSS" && ok || bad "silent: CSS must style the ▶ NOW→graph link (.bnow-graph)"
# the SEATS (D-045 · D-048): the mount, the render, the boot
shell_ok  "$SHELL_BOARD" && ok || bad "silent: board.html must mount {{BOARD_SEATS}} between the title and the lede, link the seat skin, and load the seats' scripts in order after board.js"
render_ok "$BUILD"       && ok || bad "silent: render_board must fill {{BOARD_SEATS}} from _a3_seats, capped by _a3_commits.N"
seats_ok  "$SEATS_JS"    && ok || bad "silent: seats.js must join by prefix on the full sha and tear down through GabePane.destroy"
chip_ok    "$GEN"        && ok || bad "silent: card_html must emit the .bc-sha chip on a done card that names a commit, and only there"
chipcss_ok "$SEATS_CSS"  && ok || bad "silent: seats.css must style .bc-sha, ● apart from ○"

# --- FIRE: drift on EITHER half is caught ----------------------------------
T=${BOARD_T:-$(mktemp -d)}; [ -n "${BOARD_T:-}" ] || trap 'rm -rf "$T"' EXIT

# a) generator drops the closed-30d attribute → the silent-KPI bug returns
sed 's/data-closed30="0" data-aged="0" //' "$GEN" > "$T/gen.py"
gen_ok "$T/gen.py" && bad "fire: a generator missing data-closed30 must be caught" || ok

# b) board.js loses the closed30 filter dimension from F
sed "s/closed30: '', aged: '' };/};/" "$JS" > "$T/board.js"
js_ok "$T/board.js" && bad "fire: a board.js missing the closed30 filter must be caught" || ok

# c) board.js loses the spine-rail command map
sed "s#'/gabe-cc-update'#''#" "$JS" > "$T/board2.js"
js_ok "$T/board2.js" && bad "fire: a spine rail with no command map must be caught" || ok

# d) the seats token dropped from the skeleton — the board ships seatless, silently
sed 's/{{BOARD_SEATS}}//' "$SHELL_BOARD" > "$T/board-a.html"
shell_ok "$T/board-a.html" && bad "fire: a board.html without {{BOARD_SEATS}} must be caught" || ok
# e) _slice.js loaded before _grammar.js — _slice captures window.GabeGrammar at load and would hold undefined
sed -e 's#assets/_grammar\.js#@G@#' -e 's#assets/_slice\.js#assets/_grammar.js#' -e 's#@G@#assets/_slice.js#' "$SHELL_BOARD" > "$T/board-b.html"
shell_ok "$T/board-b.html" && bad "fire: _slice.js before _grammar.js must be caught" || ok
# f) render_board stops filling the token
grep -v '"{{BOARD_SEATS}}": _a3_seats' "$BUILD" > "$T/build.py"
render_ok "$T/build.py" && bad "fire: a render_board that never fills {{BOARD_SEATS}} must be caught" || ok
# g) the exact-key join comes back (the mock's HAVE[c.short] — `short` is 7 characters here, 8 in the twins)
{ cat "$SEATS_JS"; echo 'var HAVE = {}; C.forEach(function (c, i) { HAVE[c.short] = i; });'; } > "$T/seats-g.js"
seats_ok "$T/seats-g.js" && bad "fire: a seats.js joining on HAVE[c.short] must be caught" || ok
# h) the teardown goes back to the private force-graph destructor (it never loses the WebGL context)
sed 's/GabePane\.destroy(cur)/cur.Graph._destructor()/' "$SEATS_JS" > "$T/seats-h.js"
grep -q 'cur.Graph._destructor()' "$T/seats-h.js" && ! seats_ok "$T/seats-h.js" && ok || bad "fire: a seats.js tearing down through _destructor must be caught"
# i) a SUBSTRING join — a ledger token found anywhere inside a sha, not at its start, would draw the wrong commit
sed 's/\.toLowerCase()\.lastIndexOf(s, 0) !== 0) continue;/.toLowerCase().indexOf(s) < 0) continue;/' "$SEATS_JS" > "$T/seats-i.js"
grep -q 'indexOf(s) < 0) continue;' "$T/seats-i.js" && ! seats_ok "$T/seats-i.js" && ok || bad "fire: a seats.js joining by SUBSTRING (indexOf(s) < 0) must be caught"

# j) the chip branch dropped — no done card wears its commit, silently
sed 's/^    if c\["done"\] and c.get("shas"):$/    if False:/' "$GEN" > "$T/gen-j.py"
grep -q '^    if False:$' "$T/gen-j.py" && ! chip_ok "$T/gen-j.py" && ok || bad "fire: a card_html that never emits the chip must be caught"
# k) the done guard dropped — an open card would wear a sha as if it were resolved
sed 's/^    if c\["done"\] and c.get("shas"):$/    if c.get("shas"):/' "$GEN" > "$T/gen-k.py"
grep -q '^    if c.get("shas"):$' "$T/gen-k.py" && ! chip_ok "$T/gen-k.py" && ok || bad "fire: a chip emitted without the done guard must be caught"
# l) the chip left unstyled
grep -v '^\.bc-sha' "$SEATS_CSS" > "$T/seats-l.css"
chipcss_ok "$T/seats-l.css" && bad "fire: a seats.css without the .bc-sha rules must be caught" || ok
# m) the focus ring removed — a Tab onto a ○ chip shows nothing
sed 's/^\(\.bc-sha\[data-live="1"\]:hover, \.bc-sha:focus-visible{ .*\) }$/\1 outline:none; }/' "$SEATS_CSS" > "$T/seats-m.css"
grep -q 'outline:none; }$' "$T/seats-m.css" && ! chipcss_ok "$T/seats-m.css" && ok || bad "fire: a .bc-sha rule that drops the focus ring (outline:none) must be caught"

# --- D-061 · the board writes no wallclock-relative text; the PAGE counts the days -------------------------------------
# datefix.py dates the cards on every side of the bounds the page counts (0 · 7 · 30 · 90 days); clockbuild.py builds that
# ONE tree with the clock at 2026-09-27 and again at 2026-09-28. SILENT: the two board.html are the same bytes once the
# run timestamp (the regen stamp, the normaliser's first rule) is stripped — and the raw diff is that stamp and nothing
# else. FIRE: a generator that writes one clock read into a card, on a mutated COPY of the generators.
HERE="$REPO/tests/board"
GENS="$REPO/templates/center/generators"
SHELL_SRC="$REPO/templates/center/shell"
BASELINE="$REPO/scripts/map-baseline.sh"
_rx() { grep -m1 "^_NORM_RX='" "$1" | sed "s/^_NORM_RX='//; s/'\$//"; }
cbuild() {   # cbuild <generators dir> <day> <out dir> — the datefix tree built with the clock at <day>, its centre copied out
  rm -rf "$T/fx/docs/site/center/"*.html "$T/fx/docs/site/center/assets"
  (cd "$T" && GABE_REPO_ROOT="$T/fx" GABE_SHELL_SRC="$SHELL_SRC" GABE_GRAFT_BUILD=0 \
     python3 "$HERE/clockbuild.py" "$1" "$2" >"$T/cb.log" 2>&1) && rm -rf "$3" && cp -r "$T/fx/docs/site/center" "$3"
}
same_days() {   # same_days <centre A> <centre B> <map-baseline.sh> — board.html equal under the script's normaliser
  local rx; rx=$(_rx "$3"); [ -n "$rx" ] && [ -f "$1/board.html" ] && [ -f "$2/board.html" ] \
    && [ "$(sed -E "$rx" "$1/board.html" | sha256sum)" = "$(sed -E "$rx" "$2/board.html" | sha256sum)" ]
}
python3 "$HERE/datefix.py" "$T/fx" >/dev/null 2>&1
if cbuild "$GENS" 2026-09-27 "$T/c27" && cbuild "$GENS" 2026-09-28 "$T/c28"; then ok; else bad "fixture: the datefix board did not build"; tail -5 "$T/cb.log"; fi
same_days "$T/c27" "$T/c28" "$BASELINE" && ok || bad "silent: a board built a day later must be the same bytes (run timestamp aside)"
! cmp -s "$T/c27/board.html" "$T/c28/board.html" \
  && [ "$(diff "$T/c27/board.html" "$T/c28/board.html" | grep '^[<>]' | grep -vcE 'regen (· )?2026-09-2[78] 10:00Z')" = 0 ] \
  && ok || bad "silent: the only raw difference a day makes is the regen stamp (the clock really moved; nothing else did)"
grep -q 'data-created="2026-09-27"' "$T/c27/board.html" && grep -q 'data-kpi-days="' "$T/c27/board.html" \
  && grep -q '<script src="assets/a3-days.js" defer></script>' "$T/c27/board.html" && [ -f "$T/c27/assets/a3-days.js" ] \
  && ok || bad "silent: the board ships the dates as dates, the KPI tiles their dates, and loads a3-days.js"
# the build warns when the shell it renders with cannot count the days (a twin whose vendored shell predates D-061)
grep -q 'does not load assets/a3-days.js' "$T/cb.log" && bad "silent: the current shell must not trip the missing-counter warning" || ok
rm -rf "$T/shell-old"; cp -r "$SHELL_SRC" "$T/shell-old"; sed -i '/assets\/a3-days.js/d' "$T/shell-old/board.html"; rm -f "$T/shell-old/assets/a3-days.js"
rm -rf "$T/fx/docs/site/center/"*.html "$T/fx/docs/site/center/assets"
(cd "$T" && GABE_REPO_ROOT="$T/fx" GABE_SHELL_SRC="$T/shell-old" GABE_GRAFT_BUILD=0 python3 "$GENS/build_center_a3.py" >"$T/old-shell.log" 2>&1)
grep -q 'does not load assets/a3-days.js' "$T/old-shell.log" && ok || bad "fire: a shell without a3-days.js must be named by the build (its date framings would stay empty)"
# FIRE B1 — one clock read leaks into a card's tooltip: the two days' boards differ
rm -rf "$T/gm1"; cp -r "$GENS" "$T/gm1"
sed -i "s/f'recorded {c.get(\"created\")}',$/f'recorded {c.get(\"created\")} (seen {D.NOW.date()})',/" "$T/gm1/_a3_board.py"
if grep -q '(seen {D.NOW.date()})' "$T/gm1/_a3_board.py" && cbuild "$T/gm1" 2026-09-27 "$T/m27" && cbuild "$T/gm1" 2026-09-28 "$T/m28"; then
  same_days "$T/m27" "$T/m28" "$BASELINE" && bad "fire B1: a board carrying one clock read must differ a day later" || ok
else bad "fixture: the B1 mutation did not apply or build"; fi

# --- review B-1 · B-2 · B-4: the Evidence tab's Captured day ----------------------------------------------------------
# datefix.py --evidence: the gadget entity claims two proof sets in a git tree — `gadget-walk` COMMITTED at
# 2026-09-28T01:30Z (22:30 on the 27th at UTC−3) with its shot's file time moved to a later day (a checkout's time),
# `gadget-draft` untracked (file time 2026-09-20T12:00Z). SILENT: the feature page is the same bytes a day later, ships
# the commit's INSTANT (never the checkout's time) and the draft's file time, loads a3-days.js, and no warning fires.
# FIRE (B-4): a shell whose feature.html does not load the counter is NAMED by the build.
ebuild() {   # ebuild <generators dir> <day> <out dir> [<shell>] — the --evidence tree built with the clock at <day>
  rm -rf "$T/fxe/docs/site/center/"*.html "$T/fxe/docs/site/center/assets"
  (cd "$T" && GABE_REPO_ROOT="$T/fxe" GABE_SHELL_SRC="${4:-$SHELL_SRC}" GABE_GRAFT_BUILD=0 \
     python3 "$HERE/clockbuild.py" "$1" "$2" >"$T/eb.log" 2>&1) && rm -rf "$3" && cp -r "$T/fxe/docs/site/center" "$3"
}
python3 "$HERE/datefix.py" "$T/fxe" --evidence >/dev/null 2>&1
if ebuild "$GENS" 2026-09-27 "$T/e27" && ebuild "$GENS" 2026-09-28 "$T/e28"; then ok; else bad "fixture: the --evidence tree did not build"; tail -5 "$T/eb.log"; fi
_erx=$(_rx "$BASELINE")
[ -f "$T/e27/feature-gadget.html" ] && [ "$(sed -E "$_erx" "$T/e27/feature-gadget.html" | sha256sum)" = "$(sed -E "$_erx" "$T/e28/feature-gadget.html" | sha256sum)" ] \
  && ok || bad "silent: a feature page built a day later must be the same bytes (run timestamp aside)"
grep -q 'data-day="@1790559000"' "$T/e27/feature-gadget.html" && grep -q 'data-day="@1789905600"' "$T/e27/feature-gadget.html" \
  && grep -q '<script src="assets/a3-days.js" defer></script>' "$T/e27/feature-gadget.html" \
  && ok || bad "silent: the Captured cell ships the commit's instant (never the checkout's file time), an untracked set its file time, and the page loads a3-days.js"
grep -q 'does not load assets/a3-days.js' "$T/eb.log" && bad "silent: the current shell's feature page must not trip the missing-counter warning" || ok
rm -rf "$T/shell-nf"; cp -r "$SHELL_SRC" "$T/shell-nf"; sed -i '/assets\/a3-days.js/d' "$T/shell-nf/feature.html"
ebuild "$GENS" 2026-09-27 "$T/enf" "$T/shell-nf"
grep -q 'feature-gadget.html does not load assets/a3-days.js' "$T/eb.log" && ok \
  || bad "fire (B-4): a feature page that carries a counted day but does not load a3-days.js must be named by the build"

# --- the page counts the days: the SAME board opened on two days (a real browser, file://) -----------------------------
# days.mjs sets the viewer's clock to each day and prints what a3-days.js made of the page; days_check.py judges it.
# FIRE: four mutants of the counting (a3-days.js, on copies of the built centre) and one of the generator's pool order.
CHROME="${GABE_CHROME_BIN:-/usr/bin/google-chrome-stable}"; [ -x "$CHROME" ] || CHROME=/usr/bin/google-chrome
[ -n "${GABE_PW_DIR:-}" ] && [ -z "${PLAYWRIGHT_DIR:-}" ] && export PLAYWRIGHT_DIR="$GABE_PW_DIR"
PW=0; node --input-type=module -e "await import('$REPO/skills/gabe-docsite/tools/_playwright.mjs')" >/dev/null 2>&1 && PW=1
days_run() {   # days_run <centre> <tag> — both days, judged; the judge's output in $T/days-<tag>.out
  (cd "$HERE" && GABE_CHROME_BIN="$CHROME" timeout 120 node days.mjs "$1/board.html" 2026-09-27 2026-09-28 >"$T/snap-$2.jsonl" 2>"$T/snap-$2.err")
  python3 "$HERE/days_check.py" "$T/snap-$2.jsonl" >"$T/days-$2.out" 2>&1
}
dmut() {   # dmut <tag> <old> <new> — a copy of the 27th's centre whose a3-days.js has ONE exact replacement
  rm -rf "$T/d-$1"; cp -r "$T/c27" "$T/d-$1"
  python3 - "$T/d-$1/assets/a3-days.js" "$2" "$3" <<'PY' || bad "fixture: the $1 mutation did not apply"
import sys
f, old, new = sys.argv[1:4]
s = open(f, encoding="utf-8").read()
if s.count(old) != 1: sys.exit(1)
open(f, "w", encoding="utf-8").write(s.replace(old, new))
PY
}
redfor() {   # redfor <tag> <assert id> <what the mutant did> — that run's judge turned the assert red
  grep -q "  FAIL  $2 " "$T/days-$1.out" && ok || { bad "fire ($1): $3 must turn $2 red"; tail -3 "$T/days-$1.out"; }
}
if [ -x "$CHROME" ] && [ "$PW" = 1 ] && [ -f "$T/c27/board.html" ]; then
  if days_run "$T/c27" silent; then ok; else bad "silent: the page must count the days right on both days (see below)"; grep FAIL "$T/days-silent.out"; cat "$T/snap-silent.err"; fi
  echo "  days (headless): $(grep -c '  PASS  ' "$T/days-silent.out") pass · $(grep -c '  FAIL  ' "$T/days-silent.out") fail"
  dmut pool    "  each('.bboard[data-days]', null, function (b) {" "  each('.bboard[data-none]', null, function (b) {"
  dmut clock   "var TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());" "var TODAY = now.getTime();"
  dmut bound   "return kv[0] === 'le' ? n <= b" "return kv[0] === 'le' ? n < b"
  dmut noflag  "      c.setAttribute('data-' + flag, n !== null && holds(k.getAttribute('data-kpi-rule'), n) ? '1' : '0');" ""
  for m in pool clock bound noflag; do days_run "$T/d-$m" "$m"; done
  redfor pool   D3.27 "a script that never empties the date framings' pools"
  redfor pool   A1 "a script that never empties the date framings' pools"
  redfor clock  C1 "a distance counted from the clock time, not the calendar day (off by one at noon)"
  redfor bound  K1 "a within-30 rule that drops the card closed exactly 30 days back"
  redfor noflag K3 "a KPI that never sets the card flag its click filters on"
  # B5 — the generator's pool in the wrong order: the done framing no longer reads newest first
  rm -rf "$T/gm5"; cp -r "$GENS" "$T/gm5"
  sed -i 's/if done else _sortkey, reverse=done)$/if done else _sortkey, reverse=False)/' "$T/gm5/_a3_board.py"
  if grep -q 'reverse=False)$' "$T/gm5/_a3_board.py" && cbuild "$T/gm5" 2026-09-27 "$T/g5"; then
    days_run "$T/g5" order; redfor order N3 "a done pool shipped oldest first"
  else bad "fixture: the B5 mutation did not apply or build"; fi
  # B-5 — an open phase's ledger touch written back as a bare date: nothing counts it
  rm -rf "$T/gm6"; cp -r "$GENS" "$T/gm6"
  sed -i 's/^        touched = day_of(c\["last_activity"\])/        touched = None/' "$T/gm6/_a3_board.py"
  if grep -q '^        touched = None' "$T/gm6/_a3_board.py" && cbuild "$T/gm6" 2026-09-27 "$T/g6"; then
    days_run "$T/g6" touched; redfor touched C5 "an open phase's touched date shipped uncounted"
  else bad "fixture: the B-5 mutation did not apply or build"; fi
  echo "  days FIRE: $(cat "$T"/days-{pool,clock,bound,noflag,order,touched}.out 2>/dev/null | grep -c '  FAIL  ') assert(s) red across 6 mutants"
  # the Evidence tab's Captured day, opened by a viewer at UTC−3 (23:45 on the capture's evening, then three days on)
  # and one in UTC — SILENT on the built page; FIRE: the generator ships the UTC date (review B-1), counts the capture
  # by the checkout's file time (B-2), the counter reads the instant on the UTC calendar (B-1, the script's half), and
  # the feature page never loads the counter (B-4)
  ev_run() {   # ev_run <centre> <tag> — the three viewers, judged; the judge's output in $T/days-<tag>.out
    (cd "$HERE" && GABE_CHROME_BIN="$CHROME" timeout 120 node days.mjs "$1/feature-gadget.html" "2026-09-28T02:45:00Z@America/Sao_Paulo" \
       "2026-09-30T13:00:00Z@America/Sao_Paulo" "2026-09-28T12:00:00Z@UTC" >"$T/esnap-$2.jsonl" 2>"$T/esnap-$2.err")
    python3 "$HERE/days_check.py" --evidence "$T/esnap-$2.jsonl" >"$T/days-$2.out" 2>&1
  }
  if ev_run "$T/e27" esilent; then ok; else bad "silent: the page must count the Captured day on the viewer's own calendar (see below)"; grep FAIL "$T/days-esilent.out"; cat "$T/esnap-esilent.err"; fi
  echo "  captured (headless): $(grep -c '  PASS  ' "$T/days-esilent.out") pass · $(grep -c '  FAIL  ' "$T/days-esilent.out") fail"
  rm -rf "$T/gme1"; cp -r "$GENS" "$T/gme1"; sed -i 's/data-day="@{int(ts)}"/data-day="{day}"/' "$T/gme1/_a3_evidence.py"
  if grep -q 'data-day="{day}"' "$T/gme1/_a3_evidence.py" && ebuild "$T/gme1" 2026-09-27 "$T/eg1"; then
    ev_run "$T/eg1" eutc; redfor eutc E3 "a Captured cell shipped as its UTC date"
  else bad "fixture: the eutc mutation did not apply or build"; fi
  rm -rf "$T/gme2"; cp -r "$GENS" "$T/gme2"
  sed -i 's/^    return (ct, True) if ct and ct >= mt else (mt, False)$/    return (max(f.stat().st_mtime for f in files), True)/' "$T/gme2/_a3_evidence.py"
  if grep -q 'return (max(f.stat().st_mtime for f in files), True)$' "$T/gme2/_a3_evidence.py" && ebuild "$T/gme2" 2026-09-27 "$T/eg2"; then
    ev_run "$T/eg2" emtime; redfor emtime E3 "a capture counted by the checkout's file time"
  else bad "fixture: the emtime mutation did not apply or build"; fi
  rm -rf "$T/d-ejs"; cp -r "$T/e27" "$T/d-ejs"
  python3 - "$T/d-ejs/assets/a3-days.js" <<'PY' || bad "fixture: the ejs mutation did not apply"
import sys
f = sys.argv[1]; s = open(f, encoding="utf-8").read()
old = "return [t.getFullYear(), t.getMonth(), t.getDate()];"
if s.count(old) != 1: sys.exit(1)
open(f, "w", encoding="utf-8").write(s.replace(old, "return [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()];"))
PY
  ev_run "$T/d-ejs" ejs; redfor ejs E3 "an instant counted on the UTC calendar, not the viewer's"
  ev_run "$T/enf" enf; redfor enf E2 "a feature page that never loads the counter"
  echo "  captured FIRE: $(cat "$T"/days-{eutc,emtime,ejs,enf}.out 2>/dev/null | grep -c '  FAIL  ') assert(s) red across 4 mutants"
else
  bad "headless: RED — the page's day count DID NOT RUN (chrome at $CHROME: $([ -x "$CHROME" ] && echo yes || echo no) · playwright: $([ "$PW" = 1 ] && echo yes || echo no))"
  echo "         provision: see tests/embed-pane/run.sh (a system chrome + GABE_PW_DIR)"
fi

# --- the baseline NORMALISER (scripts/map-baseline.sh) after D-061 ----------------------------------------------------
# The board and the Evidence tab no longer tick with the clock, so the two rules that hid their ticks are gone: nothing
# may normalise "on the board N days" or "N d ago" (a normaliser for them would only hide a regression that wrote one
# back). The run-timestamp rule stays — it is what makes the day-apart pair above compare equal — and so does the T−N
# rule (index and the test corpora still render a suite run's freshness server-side).
norm_ok() {
  local rx; rx=$(_rx "$1"); [ -n "$rx" ] && ! grep -q 'on the board' <<<"$rx" && ! grep -q ' ago' <<<"$rx" \
    && grep -qF '[ T][0-9]{2}:[0-9]{2}' <<<"$rx" && grep -qF 'T\xe2\x88\x92[0-9]+[dhm]' <<<"$rx"
}
norm_ok "$BASELINE" && ok || bad "silent: map-baseline.sh keeps the run-timestamp and T−N rules and carries no board-age or ago rule"
python3 - "$BASELINE" "$T" <<'PY'
import sys, pathlib
src, out = pathlib.Path(sys.argv[1]).read_text(), pathlib.Path(sys.argv[2])
line = next(l for l in src.splitlines() if l.startswith("_NORM_RX='"))
iso = "s/[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?//g; "
for tag, new in (("board", line[:-1] + '; s/( title="recorded [0-9]{4}-[0-9]{2}-[0-9]{2} \\xe2\\x80\\x94 on the board )[0-9]+ days"/\\1N days"/g\''),
                 ("ago", line[:-1] + "; s/\\b[0-9]+ ?[dhm] ago\\b/AGE ago/g'"),
                 ("iso", line.replace(iso, ""))):
    (out / f"mb-{tag}.sh").write_text(src.replace(line, new))
PY
grep -q 'on the board' "$T/mb-board.sh" && ! norm_ok "$T/mb-board.sh" && ok || bad "fire: a normaliser that brings the board-age rule back must be caught"
grep -q ' ago' "$T/mb-ago.sh" && ! norm_ok "$T/mb-ago.sh" && ok || bad "fire: a normaliser that brings the 'N d ago' rule back must be caught"
! grep -qF '[ T][0-9]{2}:[0-9]{2}' "$T/mb-iso.sh" && ! same_days "$T/c27" "$T/c28" "$T/mb-iso.sh" && ok \
  || bad "fire: without the run-timestamp rule the day-apart boards must compare unequal (the stamp is real clock)"

# --- S4 · every git read of a target runs without optional locks (GIT_OPTIONAL_LOCKS=0) ----------------------------------
# A copy of map-baseline.sh in a scratch repo layout (its manifests land there, never here), a git on PATH that records the
# environment it was called with, a stand-in generators dir, one target. SILENT: every git call saw GIT_OPTIONAL_LOCKS=0.
# FIRE: the same copy without the export — the target's `git status` would take its index.lock.
mbrun() {   # mbrun <script> <log> — one capture over the scratch roster; the fake git's calls land in <log>
  rm -rf "$T/mb/base" "$T/mb/tests" && mkdir -p "$T/mb/tests/baselines" "$T/mb/scripts" && cp "$1" "$T/mb/scripts/map-baseline.sh" && : >"$2"
  (cd "$T/mb" && PATH="$T/fakebin:$PATH" GITLOG="$2" GABE_BASELINE_TARGETS="$T/mb/targets.conf" GABE_BASELINE_DIR="$T/mb/base" \
     bash scripts/map-baseline.sh capture --gens "$T/mb/gens" fx >"$2.out" 2>&1)
}
mkdir -p "$T/fakebin" "$T/mb/gens"
printf '#!/usr/bin/env bash\necho "${GIT_OPTIONAL_LOCKS:-unset} $*" >>"$GITLOG"\ncase "$*" in *"rev-parse HEAD"*) echo 0123456789abcdef0123456789abcdef01234567;; esac\nexit 0\n' >"$T/fakebin/git"
chmod +x "$T/fakebin/git"
printf 'import json, os\nopen(os.path.join(os.environ["GABE_CENTER_OUT"], "archmap.json"), "w").write(json.dumps({"entities": {}}))\n' >"$T/mb/gens/build_center_a3.py"
printf 'fx|%s|\n' "$T/fx" >"$T/mb/targets.conf"
locks_ok() { [ -s "$1" ] && grep -q 'status --porcelain' "$1" && grep -q 'rev-parse HEAD' "$1" && ! grep -qv '^0 ' "$1"; }
mbrun "$BASELINE" "$T/git-silent.log"
locks_ok "$T/git-silent.log" && grep -q 'blessed:' "$T/git-silent.log.out" && ok \
  || { bad "silent: every git read map-baseline.sh makes of a target runs with GIT_OPTIONAL_LOCKS=0"; cat "$T/git-silent.log" "$T/git-silent.log.out"; }
grep -v '^export GIT_OPTIONAL_LOCKS=0$' "$BASELINE" >"$T/mb-nolock.sh"
mbrun "$T/mb-nolock.sh" "$T/git-fire.log"
! grep -q '^export GIT_OPTIONAL_LOCKS' "$T/mb-nolock.sh" && ! locks_ok "$T/git-fire.log" && grep -q '^unset .*status --porcelain' "$T/git-fire.log" && ok \
  || bad "fire: a map-baseline.sh that drops the export must be caught (its git status ran with optional locks)"

# --- review B-3 · a baseline renders with ITS generators' shell, and a page that cannot count its days fails the bless ----
# The same scratch roster. SILENT: the build ran with GABE_SHELL_SRC=<gens>/../shell (the pair under test, never the
# target's own vendored shell). FIRE: the script without that line (the build saw no GABE_SHELL_SRC); a build whose log
# names a page that does not load a3-days.js is a FAIL, never blessed.
mkdir -p "$T/mb/shell"; export SHELLOG="$T/shell-env.txt"
printf 'import json, os\nopen(os.path.join(os.environ["GABE_CENTER_OUT"], "archmap.json"), "w").write(json.dumps({"entities": {}}))\nopen(os.environ["SHELLOG"], "w").write(os.environ.get("GABE_SHELL_SRC", "unset"))\n' >"$T/mb/gens/build_center_a3.py"
mbrun "$BASELINE" "$T/git-shell.log"
[ "$(cat "$T/shell-env.txt" 2>/dev/null)" = "$(cd "$T/mb/shell" && pwd)" ] && grep -q 'blessed:' "$T/git-shell.log.out" && ok \
  || { bad "silent: map-baseline.sh builds with the shell beside its generators"; cat "$T/shell-env.txt" "$T/git-shell.log.out"; }
sed 's/env ${shell:+GABE_SHELL_SRC="$shell"} $4 /env $4 /' "$BASELINE" >"$T/mb-noshell.sh"
mbrun "$T/mb-noshell.sh" "$T/git-noshell.log"
! grep -q 'GABE_SHELL_SRC="$shell"' "$T/mb-noshell.sh" && [ "$(cat "$T/shell-env.txt" 2>/dev/null)" = unset ] && ok \
  || bad "fire: a map-baseline.sh that drops the shell must be caught (the target's own shell rendered the baseline)"
printf 'import json, os\nopen(os.path.join(os.environ["GABE_CENTER_OUT"], "archmap.json"), "w").write(json.dumps({"entities": {}}))\nprint("  \u26a0 board.html does not load assets/a3-days.js \u2014 its age and done framings stay empty")\n' >"$T/mb/gens/build_center_a3.py"
mbrun "$BASELINE" "$T/git-blind.log"
grep -q 'FAIL fx' "$T/git-blind.log.out" && ! grep -q 'blessed:' "$T/git-blind.log.out" && ok \
  || { bad "fire: a build that names a page unable to count its days must FAIL, not be blessed"; cat "$T/git-blind.log.out"; }

echo "=================================="
echo "board battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
