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
# The board SEATS (D-043 · D-046) ride the same contract: the skeleton mounts
# {{BOARD_SEATS}} and loads the pane runtime in its one working order, render_board
# fills the token, and seats.js joins a ledger sha by PREFIX and tears a pane down
# through GabePane.destroy. The done-card sha chip too: card_html emits it only on
# a done card that names a commit, and seats.css styles the class it emits (its
# keyboard focus ring kept). What the seats DO is proven in a browser by
# tests/embed-pane/seats.mjs; what a regen WRITES, by tests/center.
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
gen_ok() {  # the generator emits BOTH KPI-filter attributes on every card
  grep -q 'data-closed30="' "$1" && grep -q 'data-aged="' "$1"
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
# the SEATS (D-043 · D-046): the mount, the render, the boot
shell_ok  "$SHELL_BOARD" && ok || bad "silent: board.html must mount {{BOARD_SEATS}} between the title and the lede, link the seat skin, and load the seats' scripts in order after board.js"
render_ok "$BUILD"       && ok || bad "silent: render_board must fill {{BOARD_SEATS}} from _a3_seats, capped by _a3_commits.N"
seats_ok  "$SEATS_JS"    && ok || bad "silent: seats.js must join by prefix on the full sha and tear down through GabePane.destroy"
chip_ok    "$GEN"        && ok || bad "silent: card_html must emit the .bc-sha chip on a done card that names a commit, and only there"
chipcss_ok "$SEATS_CSS"  && ok || bad "silent: seats.css must style .bc-sha, ● apart from ○"

# --- FIRE: drift on EITHER half is caught ----------------------------------
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT

# a) generator drops the closed-30d attribute → the silent-KPI bug returns
sed 's/data-closed30="{closed30}" data-aged="{aged}" //' "$GEN" > "$T/gen.py"
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

echo "=================================="
echo "board battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
