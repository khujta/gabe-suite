#!/usr/bin/env bash
# Narration fixture battery — the executable contract of
# tools/verify-narration.mjs (the narrated page: one-bar dock, sections menu,
# voice-stepped diagrams, every section reachable under the dock).
#
# A gate that cannot fail is non-evidence. This builds the worked example
# (examples/narrated-mini — its mp3 are committed, so no network and no TTS)
# and proves the gate stays SILENT on it and FIRES on each way the page has
# actually broken while it was being made (archie, 2026-10-05):
#   the sections menu showing before it is asked for, the menu button squeezed
#   to an icon on a phone, a diagram that no longer steps with the voice, a
#   short last section that cannot reach the dock, a dock that is fixed — and
#   the rest/replay rule: play that does not reset a figure, a widget that
#   animates by itself at rest, a widget resting on its first frame.
#
# Each case is one gate run (~65 s — the gate plays real audio): ~10 min in all.
# Run it alone; it drives a browser. Hermetic: temp dir only, cleans up.
# Runs from the fork's own tests/ or, unchanged, from the suite repo's tests/.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$HERE/../../SKILL.md" ]; then SKILL="$(cd "$HERE/../.." && pwd)"
else SKILL="$(cd "$HERE/../.." && pwd)/skills/gabe-artifact"; fi
EX="$SKILL/examples/narrated-mini"
GATE="$SKILL/tools/verify-narration.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok(){ echo "  ok: $1"; pass=$((pass+1)); }
bad(){ echo "  FAIL: $1"; fail=$((fail+1)); }

[ -d "$EX" ]   || { echo "⛔ missing example: $EX"; exit 2; }
[ -f "$GATE" ] || { echo "⛔ missing gate: $GATE"; exit 2; }

PAGE="$TMP/narrated-mini.html"
python3 "$SKILL/tools/narrate-build.py" "$EX" -o "$PAGE" >/dev/null 2>&1 \
  || { echo "⛔ the example did not build"; exit 2; }

# mutate <out-name> <literal|regex> <old> <new> — a stale anchor aborts the run
# (a fixture that was never written would "fire" and prove nothing).
mutate(){
  local out="$TMP/$1"; shift
  if ! python3 - "$PAGE" "$out" "$@" <<'PY'
import re, sys
src, dst, mode, old, new = sys.argv[1:6]
s = open(src, encoding="utf-8").read()
if mode == "regex":
    t, n = re.subn(old, new, s)
    if n == 0: sys.exit("anchor missing: " + old[:70])
else:
    if old not in s: sys.exit("anchor missing: " + old[:70])
    t = s.replace(old, new, 1)
open(dst, "w", encoding="utf-8").write(t)
PY
  then
    echo "  FAIL: mutation anchor no longer matches the built page — fixture not built"
    exit 2
  fi
}

run_gate(){ node "$GATE" "$1" >/dev/null 2>&1; echo $?; }

echo "narration battery"

# ── 1 · SILENT on the worked example ────────────────────────────────────────
if [ "$(run_gate "$PAGE")" = "0" ]; then ok "silent on the worked example"; else bad "the gate fails the worked example"; fi

# ── 2 · FIRES when the sections menu shows before it is asked for ──────────
# The builder ships the menu with `hidden`; without it the panel sits open over
# the page. (Stripping the kit's [hidden] rule alone is NOT a defect in v3: the
# menu has no display rule, so the browser's own [hidden] still hides it — the
# rule guards the day it gets one. Tried first; the gate rightly stayed silent.)
mutate menu-open.html literal '<div class="toc" id="toc" hidden>' '<div class="toc" id="toc">'
if [ "$(run_gate "$TMP/menu-open.html")" != "0" ]; then ok "fires when the sections menu shows unasked"; else bad "an always-open menu not caught"; fi

# ── 3 · FIRES when the menu button is squeezed to an icon on a phone ───────
# The phone's 32px icon-button rule caught the menu button too: "k / n" spilled.
mutate toc-squeezed.html literal '.dock .toc-btn { width: auto; }' ''
if [ "$(run_gate "$TMP/toc-squeezed.html")" != "0" ]; then ok "fires when a dock control spills its box on a phone"; else bad "squeezed menu button not caught"; fi

# ── 4 · FIRES when a diagram no longer steps with the voice ────────────────
mutate no-cues.html regex ' data-cue="[^"]*"' ''
if [ "$(run_gate "$TMP/no-cues.html")" != "0" ]; then ok "fires when the diagrams lose their cues"; else bad "cue-less diagrams not caught"; fi

# ── 5 · FIRES when the last section cannot reach the dock ──────────────────
# Without the tail a short last section lands mid-screen: the counter names the
# section above it and Play starts that one's clip.
mutate no-tail.html literal '.artifact-page::after { content: ""; display: block; height: var(--tail, 0px); }' ''
if [ "$(run_gate "$TMP/no-tail.html")" != "0" ]; then ok "fires when the last section cannot park under the dock"; else bad "unreachable last section not caught"; fi

# ── 6 · FIRES when the dock is fixed instead of riding the page ────────────
mutate dock-fixed.html literal 'position: sticky; top: env(safe-area-inset-top, 0px);' 'position: fixed; top: env(safe-area-inset-top, 0px);'
if [ "$(run_gate "$TMP/dock-fixed.html")" != "0" ]; then ok "fires when the dock is fixed"; else bad "a fixed dock not caught"; fi

# ── 7 · FIRES when play does not reset a cued figure to its first frame ────
# Operator 2026-10-05: "when we play the transcription, it should reset to the
# original state". Without step 0 the figure shows whole until its first cue.
mutate no-reset.html literal 'if (!(q.fig in want)) want[q.fig] = 0; ' ''
if [ "$(run_gate "$TMP/no-reset.html")" != "0" ]; then ok "fires when play does not reset a figure to its first frame"; else bad "play without a reset not caught"; fi

# ── 8 · FIRES when a moving figure animates by itself at rest ──────────────
# The recap's first widget ran once on load and again when scrolled into view.
mutate self-start.html literal 'rest();   /* at rest: the finished frame */' 'new IntersectionObserver(function (es) { if (es[0].isIntersecting) run(); }).observe(stage);'
if [ "$(run_gate "$TMP/self-start.html")" != "0" ]; then ok "fires when a moving figure animates at rest"; else bad "a self-starting widget not caught"; fi

# ── 9 · FIRES when a moving figure rests on its first frame ────────────────
# Operator 2026-10-05: "when we are not reproducing transcriptions, they should
# go to the final state … not at the beginning of the animation".
mutate first-frame.html literal 'rest();   /* at rest: the finished frame */' 'to(0, false);'
if [ "$(run_gate "$TMP/first-frame.html")" != "0" ]; then ok "fires when a moving figure rests on its first frame"; else bad "a widget resting on its first frame not caught"; fi

echo "narration: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
