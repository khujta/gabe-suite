#!/usr/bin/env bash
# Read-aloud fixture battery — the executable contract of skills/gabe-artifact/tools/verify-read-aloud.mjs.
#
# A gate that cannot fail is non-evidence (CLAUDE.md conventions). This proves the gate stays SILENT on the demo and FIRES on a page with no
# bar (fixtures/without-bar.html) and on each way a page that reads aloud can break: a summary (or an item's example or impact) a voice cannot say, a bar that leaves the top
# of the screen, hidden copy buttons, motion, text under 12px, a skip that moves the reading but not the page, a saved voice that is ignored,
# a speed that is not relative to the voice, an utterance that is a whole paragraph, a default that is not "always", a fallback voice the page
# does not name, a bar under the cog on a phone, a menu wider than the phone, storage that throws, a page with nothing to read.
#
# Hermetic: temp copies only (the gate serves its own page on 127.0.0.1), cleans up after itself.
# Needs Playwright + Chrome: PLAYWRIGHT_DIR=/path/to/node_modules/playwright-core [CHROME_BIN=/path/to/chrome]. Exit 0 = all pass.
# Where the gate cannot run (no Playwright / no Chrome) the battery goes RED (exit 2), never a quiet pass.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$DIR/../.." && pwd)"; SKILL="$REPO/skills/gabe-artifact"
DEMO="${RA_DEMO:-$SKILL/assets/read-aloud-demo.html}"; MOD_JS="${RA_JS:-$SKILL/assets/read-aloud.js}"; MOD_CSS="${RA_CSS:-$SKILL/assets/read-aloud.css}"
GATE="${RA_GATE:-$SKILL/tools/verify-read-aloud.mjs}"; FIX_WITHOUT="${RA_FIX:-$DIR/fixtures/without-bar.html}"
# the same resolution a user gets: PLAYWRIGHT_DIR when set, else the gate's own search (gabe-docsite's resolver). A repo checkout that carries
# the author-time playwright-core uses it (the other browser batteries do the same).
if [ -z "${PLAYWRIGHT_DIR:-}" ] && [ -d "$REPO/docs/design/graft-adoption/spike/_build/node_modules/playwright-core" ]; then
  export PLAYWRIGHT_DIR="$REPO/docs/design/graft-adoption/spike/_build/node_modules/playwright-core"
fi
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ok(){ echo "  ok: $1"; pass=$((pass+1)); }
bad(){ echo "  FAIL: $1"; fail=$((fail+1)); }
for f in "$DEMO" "$MOD_JS" "$MOD_CSS" "$GATE" "$FIX_WITHOUT"; do [ -f "$f" ] || { echo "⛔ missing: $f"; exit 2; }; done

# mutate <src> <dst> <old> <new> [<old> <new> ...] — a stale anchor ABORTS the battery: a fixture that was not built makes the gate "fire"
# on an unchanged page, and the case reports green proving nothing.
mutate(){
  local src="$1" dst="$2"; shift 2
  python3 - "$src" "$dst" "$@" <<'PY' || { echo "⛔ mutation anchor no longer matches — fixture not built"; exit 2; }
import sys
src, dst, pairs = sys.argv[1], sys.argv[2], sys.argv[3:]
s = open(src, encoding="utf-8").read()
for i in range(0, len(pairs), 2):
    if pairs[i] not in s: sys.exit("anchor missing: " + pairs[i][:70])
    s = s.replace(pairs[i], pairs[i + 1], 1)
open(dst, "w", encoding="utf-8").write(s)
PY
}
# a case directory: the page, and its own copy of the module (a mutant of the module must not leak into the next case)
casedir(){ mkdir -p "$TMP/$1"; cp "$DEMO" "$TMP/$1/page.html"; cp "$MOD_JS" "$TMP/$1/read-aloud.js"; cp "$MOD_CSS" "$TMP/$1/read-aloud.css"; }
# run <dir-or-file> [gate args...] → output in $TMP/out, exit code in $RC
run(){ local page="$1"; shift; node "$GATE" "$page" "$@" >"$TMP/out" 2>&1; RC=$?; if [ "$RC" -ge 2 ]; then echo "⛔ the gate could not run (exit $RC):"; tail -3 "$TMP/out"; exit 2; fi; }
fires(){ run "$@"; [ "$RC" = "1" ]; }
expect(){ grep -qF "FAIL  $1" "$TMP/out" && ok "fires: $1" || bad "did not fire: $1"; }
quiet(){ grep -qF "FAIL  $1" "$TMP/out" && bad "should be silent: $1" || ok "silent: $1"; }

echo "read-aloud battery"

# ── 1 · SILENT on the demo ───────────────────────────────────────────────────
run "$DEMO"; if [ "$RC" = "0" ] && ! grep -q "^FAIL" "$TMP/out"; then ok "the demo passes every check ($(grep -o '^[0-9]*/[0-9]* checks passed' "$TMP/out"))"; else bad "the demo should pass"; grep "^FAIL" "$TMP/out" | head -3; fi

# ── 2 · FIRES on a page with no bar (the fixture law) ────────────────────────
if fires "$FIX_WITHOUT"; then ok "fires on a page without the bar ($(grep -c '^FAIL' "$TMP/out") checks fail)"; else bad "a page without the bar must fail"; fi
expect "the read-aloud bar is on the page"; expect "every section opens with a spoken summary and a copy button"
expect "scrolled to the bottom with no voice playing, the bar is still at the top and visible"; expect "the bar has one chip per section"

# ── 3 · a page with nothing to read is a loud SKIP, never a quiet pass ──────
mkdir -p "$TMP/empty"; printf '<!doctype html><title>x</title><div class="artifact-page"><header><h1>nothing</h1></header></div>\n' > "$TMP/empty/page.html"; cp "$MOD_JS" "$TMP/empty/"
run "$TMP/empty/page.html"; if [ "$RC" = "0" ] && grep -q "^SKIP" "$TMP/out"; then ok "a page with no sections SKIPs loudly"; else bad "no-sections page should SKIP, not pass quietly"; fi

# ── 4 · summaries a voice cannot say: an id, a path, a symbol, a {token}, undefined, too many sentences ──
casedir summary
mutate "$DEMO" "$TMP/summary/page.html" '"Press play and the page reads from the section you are looking at."].join(" ") },' \
  '"Press play and the page reads from the section you are looking at.", "See D-076 in docs/design/read-aloud.json for {n} more, undefined → go.", "A seventh sentence.", "An eighth sentence."].join(" ") },'
if fires "$TMP/summary/page.html" --only 1; then ok "a bad summary fails the page"; else bad "a bad summary must fail"; fi
expect "no summary holds an id or a code identifier"; expect "no summary holds a path or a file name"; expect "no summary holds a symbol a voice cannot say"
expect "no summary holds a {token} or a missing value left in"; expect "a section's summary is 3 to 6 sentences"
quiet "every section opens with a spoken summary and a copy button"

# ── 4b · an item's example and impact are read by the same lint: an id and a path in an example, two sentences in an impact (D-078) ──
casedir exim
mutate "$DEMO" "$TMP/exim/page.html" 'example: "For example, with a voice saved in the voice lab' 'example: "See D-077 in docs/design/read-aloud.json. For example, with a voice saved in the voice lab' \
  'gives that strip back when nothing reads." }' 'gives that strip back. Nothing more is read." }'
if fires "$TMP/exim/page.html" --only 1; then ok "an example or an impact a voice cannot say fails the page"; else bad "a bad example or impact must fail"; fi
expect "no summary holds an id or a code identifier"; expect "no summary holds a path or a file name"; expect "a section's summary is 3 to 6 sentences"
quiet "every section opens with a spoken summary and a copy button"

# ── 5 · CSS defects: the bar does not stay (static), copy hidden, a transition, text at 10px ──
casedir css
printf '\n.ra-bar { position: static !important; }\n[data-ra-copy] { display: none !important; }\n.ra-say { transition: background .3s; }\n.ra-plain { font-size: 10px !important; }\n' >> "$TMP/css/read-aloud.css"
if fires "$TMP/css/page.html" --only 1,2,6; then ok "CSS defects fail the page"; else bad "CSS defects must fail"; fi
expect "scrolled to the bottom with no voice playing, the bar is still at the top and visible"; expect "every section opens with a spoken summary and a copy button"
expect "no animation, no transition and no smooth scroll"; expect "nothing the bar or a summary draws is under 12px"
quiet "the read-aloud bar is on the page"

# ── 6 · module defects: the page does not follow a skip · a saved voice is ignored · speed is absolute · an utterance is a paragraph · the default is not "always" ──
casedir module
mutate "$MOD_JS" "$TMP/module/read-aloud.js" \
  'reveal(node || units[i].el, i, true); }' '0; }' \
  'mine = !!(s && typeof s.voice === "string" && s.voice)' 'mine = false' \
  '* RATES[prefs.speed]' '* 1' \
  'var u = units[i], p = sentences(u.text);' 'var u = units[i], p = [u.text];' \
  'MODE = opts.bar === "playing" ? "playing" : "always"' 'MODE = "playing"'
if fires "$TMP/module/page.html" --only 1,2,3,4; then ok "module defects fail the page"; else bad "module defects must fail"; fi
expect "next moves the reading to the next summary AND scrolls the page there"; expect "a section chip moves the reading to that section AND the page there"
expect "voice resolution — saved"; expect '"slower" is 0.8 of the voice'; expect "every utterance is one sentence"
expect "scrolled to the bottom with no voice playing, the bar is still at the top and visible"

# ── 7 · the fallback voice is used but the page does not say so ──────────────
casedir voice
mutate "$DEMO" "$TMP/voice/page.html" 'ReadAloud.mount({ sections: SECTIONS, voice: VOICE });' \
  'ReadAloud.mount({ sections: SECTIONS, voice: VOICE, words: { voiceMissing: "", voiceMissingNone: "", voiceBritish: "", voiceEnglish: "", voiceNone: "" } });'
if fires "$TMP/voice/page.html" --only 4; then ok "a silent fallback fails the page"; else bad "a fallback the page does not name must fail"; fi
expect "voice resolution — a British Google voice"; expect "voice resolution — an English Natural voice"; expect "voice resolution — the browser’s default"; quiet "voice resolution — saved"

# ── 8 · a phone: the bar under the cog, a menu wider than the screen ─────────
casedir phone
printf '\n.ra-bar { padding-right: 0 !important; }\n.ra-menu { min-width: 700px !important; }\n' >> "$TMP/phone/read-aloud.css"
if fires "$TMP/phone/page.html" --only 6; then ok "phone defects fail the page"; else bad "phone defects must fail"; fi
expect "at 390px the page does not scroll sideways"; expect "the cog is clear of every control in the bar"

# ── 9 · storage that throws is not guarded ───────────────────────────────────
casedir storage
mutate "$MOD_JS" "$TMP/storage/read-aloud.js" 'function store(get, set) { try { return get(root.localStorage); } catch (e) { return set; } }' 'function store(get, set) { return get(root.localStorage); }'
if fires "$TMP/storage/page.html" --only 5; then ok "unguarded storage fails the page"; else bad "unguarded storage must fail"; fi
expect "storage that throws changes nothing"

echo ""; echo "read-aloud battery: $pass passed, $fail failed"
[ "$fail" = "0" ]
