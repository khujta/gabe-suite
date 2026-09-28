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
#
# D-062 (the run cells): index's Last run and the test corpora's changelog carry the
# RUN's day — a run-history line is stamped with the report's own time, else when the
# report was committed (tracked) or its file written (untracked), never the build's —
# and the page counts it (datefix.py --runs, a lab build a day apart: the same bytes;
# days.mjs at two todays, a UTC−3 evening and a viewer before a run's date — never a
# negative count). The T−N normaliser is gone; the stamp rule is anchored (review F4).
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
sed -i "s/f'recorded {c.get(\"created\")}',$/f'recorded {c.get(\"created\")} (seen {__import__(\"datetime\").date.today()})',/" "$T/gm1/_a3_board.py"
if grep -q '(seen {__import__("datetime").date.today()})' "$T/gm1/_a3_board.py" && cbuild "$T/gm1" 2026-09-27 "$T/m27" && cbuild "$T/gm1" 2026-09-28 "$T/m28"; then
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

# --- D-062 · the run cells (index's Last run · the test corpora's changelog): the RUN's day, counted by the page ----------
# datefix.py --runs (a git tree): api names its zone and moved its totals (the build appends a pytest line); web names
# none and matches the history's vitest line; jest names none but its corpus says naive_tz utc (review F3); pw's run time
# does not parse and the report is COMMITTED, its file time a later checkout's (F1 · F7); loose names none and is
# untracked, its file time fixed (F2). Built as a LAB run (GABE_CENTER_OUT: the history there is never rewritten, so every
# build starts from the same lines) with the clock on the 27th and the 28th. SILENT: index, the test corpora, rows-seen and
# the written run history are the same bytes a day later — under map-baseline's normaliser, which since review F4 strips
# the regen stamp ONLY (a history line's time is content) — and the whole lab centre's raw diff is the regen stamp; every
# appended line carries its RUN's time, else the report's commit or file time (one rule for index and the history); the
# cells ship absolute days; both pages load a3-days.js; no warning; the retired T−N rule would change nothing. FIRE (on
# mutated COPIES): the history stamped with the build's clock, a Last-run cell counted by the build, a fallback that reads
# the build's clock (F2), a committed report dated by its checkout's file time (F1), a shell whose index does not load the
# counter (the build names it), and the counter check narrowed back to the board and feature pages (it does not).
rbuild() {   # rbuild <generators dir> <day> <out dir> [<shell>] — the --runs tree built as a lab run with the clock at <day>
  rm -rf "$3"; mkdir -p "$3"
  (cd "$T" && GABE_REPO_ROOT="$T/fxr" GABE_CENTER_OUT="$3" GABE_SHELL_SRC="${4:-$SHELL_SRC}" GABE_GRAFT_BUILD=0 \
     python3 "$HERE/clockbuild.py" "$1" "$2" >"$3.log" 2>&1)
}
same_runs() {   # same_runs <out A> <out B> [<map-baseline.sh>] — the run pages and their records equal under its normaliser
  local rx f; rx=$(_rx "${3:-$BASELINE}"); [ -n "$rx" ] || return 1
  for f in index.html test-corpora.html rows-seen.json run-history.jsonl; do
    [ -f "$1/$f" ] && [ -f "$2/$f" ] && [ "$(sed -E "$rx" "$1/$f" | sha256sum)" = "$(sed -E "$rx" "$2/$f" | sha256sum)" ] || return 1
  done
}
gmut() {   # gmut <tag> <file> <old> <new> — a copy of the generators whose <file> has ONE exact replacement
  rm -rf "$T/gr-$1"; cp -r "$GENS" "$T/gr-$1"
  python3 - "$T/gr-$1/$2" "$3" "$4" <<'PY'   # exit 1 when the mutation does not apply: the caller names it
import sys
f, old, new = sys.argv[1:4]
s = open(f, encoding="utf-8").read()
if s.count(old) != 1: sys.exit(1)
open(f, "w", encoding="utf-8").write(s.replace(old, new))
PY
}
HIST_WANT='{"ts": "2026-09-21T01:30:00Z", "source": "pytest", "totals": {"passed": 3, "failed": 0, "skipped": 0}}
{"ts": "2026-09-21T01:30:00Z", "source": "jest", "totals": {"passed": 1, "failed": 0, "skipped": 0}}
{"ts": "2026-09-22T15:00:00Z", "source": "playwright", "totals": {"passed": 1, "failed": 0, "skipped": 0}}
{"ts": "2026-09-23T12:00:00Z", "source": "mocha", "totals": {"passed": 1, "failed": 0, "skipped": 0}}'
runs_vals() {   # runs_vals <out> — every appended history line and every run cell carries its RUN's time, else the report's
  [ "$(tail -4 "$1/run-history.jsonl" 2>/dev/null)" = "$HIST_WANT" ] \
    && grep -qF '<td class="num">2</td><td><span class="a3-day" data-day="@1789954200" data-day-text="{date}" data-day-title="changed {date} · {d}" title="changed 2026-09-21 UTC">2026-09-21</span></td><td><span class="a3-day" data-day="@1789954200" data-day-text="{d}" data-day-title="changed {date} · {d}" title="changed 2026-09-21 UTC">2026-09-21</span></td>' "$1/test-corpora.html" \
    && grep -qF '<span class="a3-day" data-day="@1789954200" data-day-text="{d}" data-day-title="ran {date} · {d}" title="ran 2026-09-21 UTC">2026-09-21</span>' "$1/index.html" \
    && grep -qF '<span class="a3-day" data-day="2026-09-24" data-day-text="{d}" data-day-title="ran {date} · {d}" data-day-ahead="ran {date} — as written: the report names no zone, and this date is after the viewer&#x27;s today" title="ran 2026-09-24">2026-09-24</span>' "$1/index.html" \
    && grep -qF '<span class="a3-day" data-day="@1790089200" data-day-text="{d}" data-day-title="report committed {date} — the run time does not parse: Tue, 22 Sep 2026 15:00:00 GMT · {d}" title="report committed 2026-09-22 UTC — the run time does not parse: Tue, 22 Sep 2026 15:00:00 GMT">2026-09-22</span>' "$1/index.html" \
    && grep -qF '<span class="a3-day" data-day="@1790164800" data-day-text="{d}" data-day-title="report file written {date} — the report names no run time · {d}" title="report file written 2026-09-23 UTC — the report names no run time">2026-09-23</span>' "$1/index.html" \
    && for pg in tests.html feature-gadget.html; do   # the Kinds rows and the feature page's Tests tab: the same one rule
         [ "$(grep -o '<span class="tag s-ok"[^>]*>captured [^<]*</span>' "$1/$pg" | LC_ALL=C sort -u)" = "$CAPT_WANT" ] || return 1
       done
}
CAPT_WANT='<span class="tag s-ok" title="the report names no run time the build can read — its commit time">captured 2026-09-22T15:00</span>
<span class="tag s-ok" title="the report names no run time the build can read — its file&#x27;s time">captured 2026-09-23T12:00</span>
<span class="tag s-ok">captured 2026-09-21T01:30</span>
<span class="tag s-ok">captured 2026-09-24T01:00</span>'
python3 "$HERE/datefix.py" "$T/fxr" --runs >/dev/null 2>&1
if rbuild "$GENS" 2026-09-27 "$T/r27" && rbuild "$GENS" 2026-09-28 "$T/r28"; then ok; else bad "fixture: the --runs tree did not build"; tail -5 "$T/r28.log"; fi
same_runs "$T/r27" "$T/r28" && ok || bad "silent: index, the test corpora, rows-seen and the run history built a day later must be the same bytes (regen stamp aside)"
[ -f "$T/r27/index.html" ] && [ "$(diff -r "$T/r27" "$T/r28" | grep '^[<>]' | grep -vcE 'regen (· )?2026-09-2[78] 10:00Z|"generated": "2026-09-2[78] 10:00Z"')" = 0 ] \
  && ok || bad "silent: the only raw difference a day makes to the whole lab centre is the regen stamp"
runs_vals "$T/r27" && ok || { bad "silent: each appended history line — and the changelog's Date and Last change, and index's Last run — carries the RUN's time, else the report's commit (tracked) or file (untracked) time, said so"; tail -4 "$T/r27/run-history.jsonl"; }
[ -f "$T/r27/index.html" ] && ! grep -q 'T−[0-9]' "$T/r27/index.html" "$T/r27/test-corpora.html" && ok || bad "silent: no page writes a T−N cell"
grep -qF '<script src="assets/a3-days.js" defer></script>' "$T/r27/index.html" && grep -qF '<script src="assets/a3-days.js" defer></script>' "$T/r27/test-corpora.html" \
  && [ -f "$T/r27.log" ] && ! grep -q 'does not load assets/a3-days.js' "$T/r27.log" \
  && ok || bad "silent: index and the test corpora load a3-days.js, and the build names no page"
_tn=0; for f in "$T/r27"/*.html "$T/r27"/*.json "$T/r27"/*.jsonl; do cmp -s "$f" <(sed -E 's/T\xe2\x88\x92[0-9]+[dhm]/T-AGE/g' "$f") || _tn=$((_tn+1)); done
[ -f "$T/r27/index.html" ] && [ "$_tn" = 0 ] && ok || bad "silent: the retired T−N normaliser rule must change nothing on the new pages ($_tn file(s) changed)"
# FIRE R1 — the history line stamped with the build's clock (HEAD's rule): the Date moves with the build day, and the
# history line itself now shows it to the normaliser (review F4 — the old rule blanked every ISO time in every file)
if gmut hist build_center_a3.py 'new.append({"ts": j["run"]["at"],' \
     'new.append({"ts": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),' \
   && rbuild "$T/gr-hist" 2026-09-27 "$T/rh27" && rbuild "$T/gr-hist" 2026-09-28 "$T/rh28"; then
  same_runs "$T/rh27" "$T/rh28" && bad "fire R1: a history line stamped with the build's clock must move the pages a day later" || ok
  _hrx=$(_rx "$BASELINE")
  [ -f "$T/rh27/run-history.jsonl" ] && [ "$(sed -E "$_hrx" "$T/rh27/run-history.jsonl" | sha256sum)" != "$(sed -E "$_hrx" "$T/rh28/run-history.jsonl" | sha256sum)" ] \
    && ok || bad "fire R1 (F4): under map-baseline's normaliser a history line stamped with the build's clock must differ a day later"
else bad "fixture: the R1 mutation did not apply or build"; fi
# FIRE R2 — a Last-run cell counted by the build (the retired T−N shape): index moves a day later
if gmut cell build_center_a3.py '              _run_cell(j["run"])]' \
     '              E("T−%dd" % (_dt.datetime.utcnow() - _dt.datetime.fromisoformat(j["run"]["at"]).replace(tzinfo=None)).days)]' \
   && rbuild "$T/gr-cell" 2026-09-27 "$T/rc27" && rbuild "$T/gr-cell" 2026-09-28 "$T/rc28"; then
  grep -q 'T−6d' "$T/rc27/index.html" && ! same_runs "$T/rc27" "$T/rc28" && ok || bad "fire R2: a Last-run cell the build counts must move index a day later"
else bad "fixture: the R2 mutation did not apply or build"; fi
# FIRE R5 (review F2) — the fallback reads the build's clock (a report with no run time the build can read): index's pw
# and loose cells and their history lines move a day later
if gmut fbclock _results_ingest.py 'run = {"at": at or written,' \
     'run = {"at": at or _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),' \
   && rbuild "$T/gr-fbclock" 2026-09-27 "$T/rf27" && rbuild "$T/gr-fbclock" 2026-09-28 "$T/rf28"; then
  [ -f "$T/rf27/index.html" ] && ! same_runs "$T/rf27" "$T/rf28" && ! runs_vals "$T/rf27" && ok \
    || bad "fire R5: a fallback that reads the build's clock must move the pages a day later"
else bad "fixture: the R5 mutation did not apply or build"; fi
# FIRE R6 (review F1) — the commit rule dropped: the committed pw report dated by its checkout's file time (the 26th)
if gmut fbmtime _results_ingest.py '        if ct.isdigit():' '        if False:' \
   && rbuild "$T/gr-fbmtime" 2026-09-27 "$T/rm27"; then
  ! runs_vals "$T/rm27" && grep -q 'data-day="@1790424000"' "$T/rm27/index.html" && ok \
    || bad "fire R6: a committed report dated by its checkout's file time must be caught"
else bad "fixture: the R6 mutation did not apply or build"; fi
# FIRE R3 — a shell whose index does not load the counter: the build names it (the page's run days would stay dates)
rm -rf "$T/shell-ni"; cp -r "$SHELL_SRC" "$T/shell-ni"; sed -i '/assets\/a3-days.js/d' "$T/shell-ni/index.html"
rbuild "$GENS" 2026-09-27 "$T/rni" "$T/shell-ni"
grep -q 'index.html does not load assets/a3-days.js' "$T/rni.log" && ok \
  || bad "fire R3: an index that carries a counted day but does not load a3-days.js must be named by the build"
# FIRE R4 — the counter check narrowed back to the board and feature pages (D-061's filter): the same shell goes unnamed
if gmut narrow build_center_a3.py 'and (pg.name == "board.html" or re.search(' \
     'and (pg.name == "board.html" or pg.name.startswith("feature") and re.search(' \
   && rbuild "$T/gr-narrow" 2026-09-27 "$T/rnn" "$T/shell-ni"; then
  [ -f "$T/rnn/index.html" ] && ! grep -q 'index.html does not load assets/a3-days.js' "$T/rnn.log" && ok \
    || bad "fire R4: a counter check narrowed to the board and feature pages must leave the blind index unnamed (so R3 catches it)"
else bad "fixture: the R4 mutation did not apply or build"; fi

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
  # D-062 · the run cells, opened by four viewers: UTC at noon on the 27th and the 28th, UTC−3 at 23:45 on the 27th, and
  # UTC at 20:00 on the 23rd (before the web run's date as written). SILENT on the built pages; FIRE: an instant shipped
  # as its UTC date, a zone-less stamp read as UTC, a shell whose index never loads the counter, a counter that writes a
  # negative count (F3a), a corpus's naive_tz ignored (F3b), and a changelog Date shipped as its UTC date (F5).
  runs_run() {   # runs_run <out> <tag> — both pages, the four viewers, judged; the judge's output in $T/days-<tag>.out
    (cd "$HERE" && GABE_CHROME_BIN="$CHROME" timeout 120 node days.mjs "$1/index.html" 2026-09-27 2026-09-28 \
       "2026-09-28T02:45:00Z@America/Sao_Paulo" "2026-09-23T20:00:00Z@UTC" >"$T/rsi-$2.jsonl" 2>"$T/rsi-$2.err"
     GABE_CHROME_BIN="$CHROME" timeout 120 node days.mjs "$1/test-corpora.html" 2026-09-27 2026-09-28 \
       "2026-09-28T02:45:00Z@America/Sao_Paulo" "2026-09-23T20:00:00Z@UTC" >"$T/rsc-$2.jsonl" 2>"$T/rsc-$2.err")
    python3 "$HERE/days_check.py" --runs "$T/rsi-$2.jsonl" "$T/rsc-$2.jsonl" >"$T/days-$2.out" 2>&1
  }
  if runs_run "$T/r27" rsilent; then ok; else bad "silent: the page must count the run days right for every viewer (see below)"; grep FAIL "$T/days-rsilent.out"; cat "$T/rsi-rsilent.err"; fi
  echo "  runs (headless): $(grep -c '  PASS  ' "$T/days-rsilent.out") pass · $(grep -c '  FAIL  ' "$T/days-rsilent.out") fail"
  if gmut rutc _a3_render.py 'data, said = f"@{int(ts.timestamp())}", f"{day} UTC"' 'data, said = day, f"{day} UTC"' \
     && rbuild "$T/gr-rutc" 2026-09-27 "$T/ru"; then
    runs_run "$T/ru" rutc; redfor rutc R4 "a run's instant shipped as its UTC date (the viewer's evening miscounted)"
  else bad "fixture: the rutc mutation did not apply or build"; fi
  if gmut rnaive _a3_render.py '    if ts.tzinfo is None:
        day = ts.date().isoformat()' '    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=_dt.timezone.utc)
    if False:
        day = ts.date().isoformat()' && rbuild "$T/gr-rnaive" 2026-09-27 "$T/rv"; then
    runs_run "$T/rv" rnaive; redfor rnaive R5 "a zone-less stamp read as UTC (the retired rel_age rule), not as written"
  else bad "fixture: the rnaive mutation did not apply or build"; fi
  runs_run "$T/rni" rnojs; redfor rnojs R2 "an index that never loads the counter"
  # F3a — the counter writes a negative count (a3-days.js without its after-today branch)
  rm -rf "$T/d-rneg"; cp -r "$T/r27" "$T/d-rneg"
  python3 - "$T/d-rneg/assets/a3-days.js" <<'PY' || bad "fixture: the rneg mutation did not apply"
import sys
f = sys.argv[1]; s = open(f, encoding="utf-8").read()
old = "    if (n < 0) {"
if s.count(old) != 1: sys.exit(1)
open(f, "w", encoding="utf-8").write(s.replace(old, "    if (false) {"))
PY
  runs_run "$T/d-rneg" rneg; redfor rneg R9 "a date after the viewer's today written as a negative count"
  # F3b — the corpus's naive_tz ignored: the jest run read as written
  if gmut rtz _results_ingest.py 'at = run_stamp(ranat, naive_zone(name))' 'at = run_stamp(ranat)' \
     && rbuild "$T/gr-rtz" 2026-09-27 "$T/rz"; then
    runs_run "$T/rz" rtz; redfor rtz R11 "a corpus's naive_tz ignored (jest-junit's UTC read as local)"
  else bad "fixture: the rtz mutation did not apply or build"; fi
  # F5 — the changelog's Date shipped as its UTC date: one row names two days west of Greenwich
  if gmut rdate build_center_a3.py '                     counted_day(recs[-1].get("ts"), "changed", text="{date}") if recs[-1].get("ts") else "—",' \
       '                     E((recs[-1].get("ts") or "")[:10] or "—"),' && rbuild "$T/gr-rdate" 2026-09-27 "$T/rd"; then
    runs_run "$T/rd" rdate; redfor rdate R10 "a changelog Date shipped as its UTC date"
  else bad "fixture: the rdate mutation did not apply or build"; fi
  echo "  runs FIRE: $(cat "$T"/days-{rutc,rnaive,rnojs,rneg,rtz,rdate}.out 2>/dev/null | grep -c '  FAIL  ') assert(s) red across 6 mutants"
else
  bad "headless: RED — the page's day count DID NOT RUN (chrome at $CHROME: $([ -x "$CHROME" ] && echo yes || echo no) · playwright: $([ "$PW" = 1 ] && echo yes || echo no))"
  echo "         provision: see tests/embed-pane/run.sh (a system chrome + GABE_PW_DIR)"
fi

# --- the baseline NORMALISER (scripts/map-baseline.sh) after D-061 · D-062 ------------------------------------------
# The board, the Evidence tab (D-061) and the run cells of index and the test corpora (D-062) no longer tick with the
# clock, so the three rules that hid their ticks are gone: nothing may normalise "on the board N days", "N d ago" or
# "T−N" (a normaliser for them would only hide a regression that wrote one back). The regen-stamp rule stays — it is
# what makes the day-apart pairs above compare equal — ANCHORED where the stamp is written (review F4): a page's
# "regen <stamp>" and the archmap's "generated"; a bare ISO rule would blank a run-history line's time, a feature
# page's "captured", every date-time in every file. FIRE: each retired rule put back, the broad ISO rule put back (the
# R1 history pair compares equal under it), and no stamp rule at all (the day-apart boards compare unequal).
norm_ok() {
  local rx; rx=$(_rx "$1"); [ -n "$rx" ] && ! grep -q 'on the board' <<<"$rx" && ! grep -q ' ago' <<<"$rx" \
    && ! grep -qF 'T\xe2\x88\x92' <<<"$rx" && grep -qF 's/(regen (· )?)[0-9]{4}' <<<"$rx" && grep -qF 's/("generated": ")[0-9]{4}' <<<"$rx" \
    && ! grep -qF 's/[0-9]{4}-' <<<"$rx"
}
norm_ok "$BASELINE" && ok || bad "silent: map-baseline.sh keeps only the anchored regen-stamp rule — no board-age, ago, T−N or bare ISO rule"
python3 - "$BASELINE" "$T" <<'PY'
import sys, pathlib
src, out = pathlib.Path(sys.argv[1]).read_text(), pathlib.Path(sys.argv[2])
line = next(l for l in src.splitlines() if l.startswith("_NORM_RX='"))
for tag, new in (("board", line[:-1] + '; s/( title="recorded [0-9]{4}-[0-9]{2}-[0-9]{2} \\xe2\\x80\\x94 on the board )[0-9]+ days"/\\1N days"/g\''),
                 ("ago", line[:-1] + "; s/\\b[0-9]+ ?[dhm] ago\\b/AGE ago/g'"),
                 ("tminus", line[:-1] + "; s/T\\xe2\\x88\\x92[0-9]+[dhm]/T-AGE/g'"),
                 ("broad", "_NORM_RX='s/[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2})?Z?//g'"),
                 ("iso", "_NORM_RX='s/NO-STAMP-RULE//g'")):
    (out / f"mb-{tag}.sh").write_text(src.replace(line, new))
PY
grep -q 'on the board' "$T/mb-board.sh" && ! norm_ok "$T/mb-board.sh" && ok || bad "fire: a normaliser that brings the board-age rule back must be caught"
grep -q ' ago' "$T/mb-ago.sh" && ! norm_ok "$T/mb-ago.sh" && ok || bad "fire: a normaliser that brings the 'N d ago' rule back must be caught"
grep -qF 'T\xe2\x88\x92' "$T/mb-tminus.sh" && ! norm_ok "$T/mb-tminus.sh" && ok || bad "fire: a normaliser that brings the T−N rule back must be caught"
_brx=$(_rx "$T/mb-broad.sh")
grep -qF "_NORM_RX='s/[0-9]{4}-" "$T/mb-broad.sh" && ! norm_ok "$T/mb-broad.sh" && [ -f "$T/rh27/run-history.jsonl" ] \
  && [ "$(sed -E "$_brx" "$T/rh27/run-history.jsonl" | sha256sum)" = "$(sed -E "$_brx" "$T/rh28/run-history.jsonl" | sha256sum)" ] && ok \
  || bad "fire (F4): the broad ISO rule put back must be caught — it hides a history line stamped with the build's clock"
! grep -qF 'regen (· )?' "$T/mb-iso.sh" && ! same_days "$T/c27" "$T/c28" "$T/mb-iso.sh" && ok \
  || bad "fire: without the regen-stamp rule the day-apart boards must compare unequal (the stamp is real clock)"

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
