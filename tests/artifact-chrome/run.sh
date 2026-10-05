#!/usr/bin/env bash
# Artifact-chrome fixture battery — the executable contract of
# skills/gabe-artifact/tools/verify-artifact-chrome.mjs.
#
# A gate that cannot fail is non-evidence (CLAUDE.md conventions). This proves
# the gate stays SILENT on the shipped kit and FIRES on each way an artifact
# can drift off the house rules: cog removed, column pinned to one side, roster
# options collapsed onto one face, selection not persisted, an accent rail, a
# text size or spacing step that changes nothing, a cog that scrolls away.
#
# archie fork (2026-10-05): cases 3 and 8 flip with H1 (centred column) and H5
# (rail retired); 7 and 17 re-anchor; 20–24 are new. Runs from the fork's own
# tests/ or, unchanged, from the suite repo's tests/.
#
# Hermetic: temp copies only, no network (the gate serves its own page on
# 127.0.0.1), cleans up after itself. Exit 0 = all pass.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$HERE/../../SKILL.md" ]; then SKILL="$(cd "$HERE/../.." && pwd)"          # inside a skill dir (the archie fork)
else SKILL="$(cd "$HERE/../.." && pwd)/skills/gabe-artifact"; fi                   # the suite repo's tests/
KIT="$SKILL/assets/artifact-chrome.html"
GATE="$SKILL/tools/verify-artifact-chrome.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok(){ echo "  ok: $1"; pass=$((pass+1)); }
bad(){ echo "  FAIL: $1"; fail=$((fail+1)); }

[ -f "$KIT" ]  || { echo "⛔ missing kit: $KIT"; exit 2; }
[ -f "$GATE" ] || { echo "⛔ missing gate: $GATE"; exit 2; }

# mutate <out-name> <python-replacement-expression>
#
# A stale anchor is a BATTERY FAILURE, never a skipped case: when the kit moves
# and the anchor stops matching, no fixture is written, the gate then "fires" on
# a file that does not exist, and the case reports green while proving nothing.
# That happened once (case 9, anchor left at the pre-pill font-size) — so a
# missing anchor now aborts the run instead of returning quietly.
mutate(){
  local out="$TMP/$1"; shift
  if ! python3 - "$KIT" "$out" "$@" <<'PY'
import sys
src, dst, old, new = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
s = open(src, encoding="utf-8").read()
if old not in s:
    sys.exit("anchor missing: " + old[:70])
open(dst, "w", encoding="utf-8").write(s.replace(old, new, 1))
PY
  then
    echo "  FAIL: mutation anchor no longer matches the kit — fixture not built"
    exit 2
  fi
}

run_gate(){ node "$GATE" "$1" >/dev/null 2>&1; echo $?; }

echo "artifact-chrome battery"

# ── 1 · SILENT on the shipped kit ──────────────────────────────────────────
if [ "$(run_gate "$KIT")" = "0" ]; then ok "shipped kit passes the gate"; else bad "shipped kit should pass"; fi

# ── 2 · FIRES when the cog is gone ─────────────────────────────────────────
mutate no-cog.html '<button class="af-cog" id="af-cog"' '<button class="af-cog" id="af-cog-renamed"'
if [ "$(run_gate "$TMP/no-cog.html")" != "0" ]; then ok "fires when the cog is missing"; else bad "missing cog not caught"; fi

# ── 3 · FIRES when the column is pinned to one side (H1: one centred column) ─
mutate pinned.html '    margin: 0 auto;   /* centred:' '    margin: 0 auto 0 clamp(16px, 4vw, 56px);   /* pinned:'
if [ "$(run_gate "$TMP/pinned.html")" != "0" ]; then ok "fires when the column is pinned left"; else bad "pinned column not caught"; fi

# ── 4 · FIRES when two roster options render identically ───────────────────
mutate twins.html "stack: '\"Segoe UI\", sans-serif',  size: 16, track: -0.015" "stack: 'ui-monospace, monospace', size: 15, track: -0.025"
if [ "$(run_gate "$TMP/twins.html")" != "0" ]; then ok "fires when options collapse onto one face"; else bad "duplicate options not caught"; fi

# ── 5 · FIRES when the choice is not persisted ─────────────────────────────
mutate no-store.html 'var v = window.localStorage.getItem(key);' 'var v = null;'
if [ "$(run_gate "$TMP/no-store.html")" != "0" ]; then ok "fires when the selection is not remembered"; else bad "lost persistence not caught"; fi

# ── 6 · FIRES when two skins paint the same ground (H5) ────────────────────
mutate skin-clash.html '--ground:#f6f8fc; --card:#fdfeff; --raised:#f1f5fd;' '--ground:#f6f7f9; --card:#fdfeff; --raised:#f1f5fd;'
if [ "$(run_gate "$TMP/skin-clash.html")" != "0" ]; then ok "fires when two skins share a ground"; else bad "duplicate skin ground not caught"; fi

# ── 7 · FIRES on square corners (H5) ───────────────────────────────────────
mutate sharp.html '--radius:6px; --shadow:none;' '--radius:0px; --shadow:none;'
if [ "$(run_gate "$TMP/sharp.html")" != "0" ]; then ok "fires on square corners"; else bad "sharp corners not caught"; fi

# ── 8 · FIRES when a panel carries an accent rail (H5: retired 2026-10-05) ──
mutate railed.html '  .sec { display: flex; flex-direction: column; gap: 14px; min-width: 0; }' '  :root .panel { border-left: 5px solid var(--accent); }
  .sec { display: flex; flex-direction: column; gap: 14px; min-width: 0; }'
if [ "$(run_gate "$TMP/railed.html")" != "0" ]; then ok "fires when a panel carries an accent rail"; else bad "accent rail not caught"; fi

# ── 9 · FIRES when section titles are bulked up (H5) ───────────────────────
mutate shouty.html 'font-size: 1em; font-weight: 600; letter-spacing: .045em; text-transform: uppercase;' 'font-size: 1.6em; font-weight: 600; letter-spacing: .28em; text-transform: uppercase;'
if [ "$(run_gate "$TMP/shouty.html")" != "0" ]; then ok "fires when titles are oversized/uppercased"; else bad "shouty titles not caught"; fi

# ── 10 · FIRES when two sections share a block colour ──────────────────────
mutate same-block.html '.sec[data-sec="2"] { --sec: var(--sec2); }' '.sec[data-sec="2"] { --sec: var(--sec1); }'
if [ "$(run_gate "$TMP/same-block.html")" != "0" ]; then ok "fires when section blocks repeat a colour"; else bad "duplicate section block not caught"; fi

# ── 11 · FIRES when a title loses its icon (H6) ────────────────────────────
mutate no-icon.html '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>' ''
if [ "$(run_gate "$TMP/no-icon.html")" != "0" ]; then ok "fires when a section title has no icon"; else bad "iconless title not caught"; fi

# ── 12 · FIRES when the title pill becomes a slab (H6) ─────────────────────
mutate slab.html 'padding: 2px 11px 2px 9px; border-radius: 999px;' 'padding: 2px 11px 2px 9px; border-radius: 6px;'
if [ "$(run_gate "$TMP/slab.html")" != "0" ]; then ok "fires when the title pill squares off"; else bad "slab title block not caught"; fi

# ── 13 · FIRES when titles fall back to the body face (H6) ─────────────────
mutate no-title-face.html '    font-family: var(--af-title);
    font-size: 1em;' '    font-family: inherit;
    font-size: 1em;'
if [ "$(run_gate "$TMP/no-title-face.html")" != "0" ]; then ok "fires when titles lose the title face"; else bad "lost title face not caught"; fi

# ── 14 · FIRES when content drops below the legibility floor (H6) ──────────
mutate tiny-text.html '.af-legend { font-size: .72em;' '.artifact-page p { font-size: 9px; }
  .af-legend { font-size: .72em;'
if [ "$(run_gate "$TMP/tiny-text.html")" != "0" ]; then ok "fires when content text drops under 12px"; else bad "sub-floor text not caught"; fi

# ── 15 · FIRES on a diagram label that RENDERS under the floor (H6) ────────
# Distinct branch: SVG text is authored in viewBox units, so the floor scales
# it by the svg's display width. A 20px label in a 1400-wide viewBox shown at
# 300px renders at 4.3px — legible in the source, unreadable on the page.
mutate svg-tiny.html '<section class="sec" data-sec="2">' \
'<section class="sec" data-sec="3"><div class="sec-head"><h2><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>Shrunk diagram</h2></div><div class="panel"><svg viewBox="0 0 1400 60" style="width:300px"><text x="10" y="30" style="font-size:20px">unreadable label</text></svg></div></section><section class="sec" data-sec="2">'
if [ "$(run_gate "$TMP/svg-tiny.html")" != "0" ]; then ok "fires when a diagram label renders under the floor"; else bad "shrunk svg label not caught"; fi

# ── 16 · FIRES when a section title loses its caps (H6) ────────────────────
mutate no-caps.html 'letter-spacing: .045em; text-transform: uppercase;' 'letter-spacing: .045em; text-transform: none;'
if [ "$(run_gate "$TMP/no-caps.html")" != "0" ]; then ok "fires when a title drops out of caps"; else bad "lowercase title not caught"; fi

# ── 17 · FIRES when another title borrows the title face (H6) ──────────────
# One distinctive treatment per page: an h1 or panel heading in the title face
# steals the signal the section pills carry.
mutate face-creep.html '  .sec { display: flex; flex-direction: column; gap: 14px; min-width: 0; }' '  h1 { font-family: var(--af-title); }
  .sec { display: flex; flex-direction: column; gap: 14px; min-width: 0; }'
if [ "$(run_gate "$TMP/face-creep.html")" != "0" ]; then ok "fires when another title borrows the title face"; else bad "title-face creep not caught"; fi

# ── 18 · FIRES when the scrollbar is left to the OS ────────────────────────
mutate os-scrollbar.html '    scrollbar-width: thin;
    scrollbar-color: var(--sb-thumb) var(--rule-soft);' '    /* unstyled */'
if [ "$(run_gate "$TMP/os-scrollbar.html")" != "0" ]; then ok "fires when scrollbars are left unstyled"; else bad "OS scrollbar not caught"; fi

# ── 19 · FIRES when the scrollbar is styled but does NOT follow the skin ───
# The subtler failure: a hardcoded bar looks deliberate and still clashes with
# two of the three skins.
mutate frozen-scrollbar.html '    --sb-thumb: color-mix(in srgb, var(--accent) 42%, var(--rule));' '    --sb-thumb: #8a8a8a;'
if [ "$(run_gate "$TMP/frozen-scrollbar.html")" != "0" ]; then ok "fires when the scrollbar ignores the skin"; else bad "theme-blind scrollbar not caught"; fi

# ── 20 · FIRES when a text-size step marks itself and changes nothing (H3) ──
mutate dead-size.html 'root.style.setProperty("--af-size", px + "px");' 'root.style.setProperty("--af-size", font.size + "px");'
if [ "$(run_gate "$TMP/dead-size.html")" != "0" ]; then ok "fires when text size does not apply"; else bad "dead text-size control not caught"; fi

# ── 21 · FIRES when a spacing step changes nothing (H3) ─────────────────────
mutate dead-space.html 'root.style.setProperty("--af-lh", String(space.lh));' ''
if [ "$(run_gate "$TMP/dead-space.html")" != "0" ]; then ok "fires when spacing does not apply"; else bad "dead spacing control not caught"; fi

# ── 22 · FIRES when the text size is not remembered ─────────────────────────
mutate size-amnesia.html 'write(ZKEY, zoom.id);' ''
if [ "$(run_gate "$TMP/size-amnesia.html")" != "0" ]; then ok "fires when the text size is not remembered"; else bad "lost size persistence not caught"; fi

# ── 23 · FIRES when the cog scrolls away with the page (H2) ─────────────────
mutate cog-scrolls.html '.af-chrome { position: fixed; top: 14px;' '.af-chrome { position: absolute; top: 14px;'
if [ "$(run_gate "$TMP/cog-scrolls.html")" != "0" ]; then ok "fires when the cog scrolls out of reach"; else bad "cog scrolling away not caught"; fi

# ── 24 · FIRES when the smallest text size shrinks the family's base (H6) ───
mutate shrunk-size.html '{ id: "100", label: "A", z: 1,    px: 12 },' '{ id: "100", label: "A", z: 0.8,  px: 12 },'
if [ "$(run_gate "$TMP/shrunk-size.html")" != "0" ]; then ok "fires when a size step shrinks below the base"; else bad "shrunk size step not caught"; fi

echo "artifact-chrome: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
