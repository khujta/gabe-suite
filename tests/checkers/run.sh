#!/usr/bin/env bash
# Skill-shipped checker fixture battery (alignment review finding M35:
# skills/gabe-docsite/tools/diagram-compliance.mjs and
# skills/gabe-mockup/scripts/check-storybook-correspondence.mjs shipped with
# ZERO fixtures proving either can FIRE or stay SILENT against its real CLI).
#
# diagram-compliance.mjs: `node diagram-compliance.mjs [site-dir]` (default
# <cwd>/docs/site) loads every top-level *.html page in site-dir over file://
# in headless Chromium, waits for the vendored classic mermaid to render, and
# asserts every .mermaid/.mermaid-fig/figure[data-mermaid-src] block became a
# real, sized <svg> with no raw mermaid source left as text. Exit 1 on any
# non-compliant page or an empty site-dir, exit 0 otherwise. It resolves
# Playwright's chromium via _playwright.mjs (PLAYWRIGHT_DIR override → normal
# node resolution → hardcoded sibling-project fallbacks under $HOME) — this
# repo carries no local Playwright, so it always falls through to whichever
# fallback resolves on the machine running this battery.
#
# check-storybook-correspondence.mjs: `node check-storybook-correspondence.mjs
# [--web-dir DIR] [--index PATH] [--forbid-title-pattern REGEX]... [--strict]`
# reads a Storybook static index.json, cross-checks it against *.stories.*
# files under <web-dir>/src, and is report-never-gate by default — findings
# print under "status: REVIEW" but exit 0 unless --strict is passed, which
# turns findings into exit 1.
#
# Hermetic: one temp dir, no network, cleans up after itself, never touches
# either tool under test. Exit 0 = all pass.
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DIAGRAM="$REPO/skills/gabe-docsite/tools/diagram-compliance.mjs"
STORYBOOK="$REPO/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pass=0; fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

# =============================================================================
# diagram-compliance.mjs
# =============================================================================

# SILENT: a clean page whose .mermaid block already carries a real, sized svg
# (standing in for the vendored classic-mermaid render this tool waits for).
SIL="$T/diagram-silent"; mkdir -p "$SIL"
cat > "$SIL/clean.html" <<'EOF'
<!doctype html><html><body>
<div class="mermaid"><svg width="200" height="100"><rect width="100" height="50"/></svg></div>
</body></html>
EOF
out=$(node "$DIAGRAM" "$SIL" 2>&1); rc=$?
echo "$out" > "$T/diagram-silent.out"
[ "$rc" = 0 ] && ok || bad "diagram-compliance: clean rendered-svg page must exit 0 (got $rc)"
grep -qF "ALL COMPLIANT" "$T/diagram-silent.out" \
  && ok || bad "diagram-compliance: clean page must report ALL COMPLIANT"
grep -qF "[PASS]" "$T/diagram-silent.out" \
  && ok || bad "diagram-compliance: clean page's own row must read PASS"

# FIRE: a page whose .mermaid block never rendered — raw `flowchart TD / -->`
# source is still sitting there as text, no <svg> child at all.
FIR="$T/diagram-fire"; mkdir -p "$FIR"
cat > "$FIR/broken.html" <<'EOF'
<!doctype html><html><body>
<div class="mermaid">flowchart TD
  A --> B
</div>
</body></html>
EOF
out=$(node "$DIAGRAM" "$FIR" 2>&1); rc=$?
echo "$out" > "$T/diagram-fire.out"
[ "$rc" = 1 ] && ok || bad "diagram-compliance: unrendered raw-mermaid page must exit 1 (got $rc)"
grep -qF "1 PAGE(S) NON-COMPLIANT" "$T/diagram-fire.out" \
  && ok || bad "diagram-compliance: broken page must report 1 PAGE(S) NON-COMPLIANT"
grep -qF "no <svg> — did not render" "$T/diagram-fire.out" \
  && ok || bad "diagram-compliance: broken page's finding must name the missing <svg>"

# empty site-dir (no .html pages at all) → exit 1, distinct failure mode.
EMPTY="$T/diagram-empty"; mkdir -p "$EMPTY"
node "$DIAGRAM" "$EMPTY" >"$T/diagram-empty.out" 2>&1
rc=$?
[ "$rc" = 1 ] && ok || bad "diagram-compliance: empty site-dir must exit 1 (got $rc)"
grep -qF "No .html pages" "$T/diagram-empty.out" \
  && ok || bad "diagram-compliance: empty site-dir must say why"

# =============================================================================
# check-storybook-correspondence.mjs
# =============================================================================

# SILENT: a compliant fixture — one source story file, one matching indexed
# entry, title matches its src/design-system/<layer> taxonomy, no forbidden
# pattern given. Must stay genuinely silent: zero findings, status PASS.
COMP="$T/sb-compliant"
mkdir -p "$COMP/src/design-system/atoms" "$COMP/storybook-static"
cat > "$COMP/src/design-system/atoms/Button.stories.tsx" <<'EOF'
export default { title: "Design System/Atoms/Button" };
export const Default = {};
EOF
cat > "$COMP/storybook-static/index.json" <<'EOF'
{
  "v": 5,
  "entries": {
    "design-system-atoms-button--default": {
      "id": "design-system-atoms-button--default",
      "title": "Design System/Atoms/Button",
      "name": "Default",
      "importPath": "./src/design-system/atoms/Button.stories.tsx",
      "type": "story"
    }
  }
}
EOF
out=$(node "$STORYBOOK" --web-dir="$COMP" 2>&1); rc=$?
echo "$out" > "$T/sb-compliant.out"
[ "$rc" = 0 ] && ok || bad "storybook-correspondence: compliant fixture must exit 0 (got $rc)"
grep -qF "status: PASS" "$T/sb-compliant.out" \
  && ok || bad "storybook-correspondence: compliant fixture must report status: PASS"
grep -qF "No correspondence findings." "$T/sb-compliant.out" \
  && ok || bad "storybook-correspondence: compliant fixture must have zero findings"

# FIRE: a story whose indexed title matches --forbid-title-pattern. Under
# --strict this must produce a forbidden-title finding AND exit 1 (without
# --strict, findings are report-only and exit 0 — proven above by the fact
# this same tool exits 0 on the compliant fixture with no findings; the
# strict-vs-report split is asserted directly below).
FORB="$T/sb-forbidden"
mkdir -p "$FORB/src/design-system/atoms" "$FORB/storybook-static"
cat > "$FORB/src/design-system/atoms/Debug.stories.tsx" <<'EOF'
export default { title: "Design System/Atoms/Debug (WIP)" };
export const Default = {};
EOF
cat > "$FORB/storybook-static/index.json" <<'EOF'
{
  "v": 5,
  "entries": {
    "design-system-atoms-debug--default": {
      "id": "design-system-atoms-debug--default",
      "title": "Design System/Atoms/Debug (WIP)",
      "name": "Default",
      "importPath": "./src/design-system/atoms/Debug.stories.tsx",
      "type": "story"
    }
  }
}
EOF

# Non-strict: finding is reported but must NOT fail automation (report-never-gate).
out=$(node "$STORYBOOK" --web-dir="$FORB" --forbid-title-pattern='\(WIP\)' 2>&1); rc=$?
echo "$out" > "$T/sb-forbidden-report.out"
[ "$rc" = 0 ] && ok || bad "storybook-correspondence: forbidden title WITHOUT --strict must still exit 0 (got $rc)"
grep -qF "status: REVIEW" "$T/sb-forbidden-report.out" \
  && ok || bad "storybook-correspondence: forbidden title must be reported as status: REVIEW"
grep -qF "[forbidden-title]" "$T/sb-forbidden-report.out" \
  && ok || bad "storybook-correspondence: report must name the forbidden-title finding"

# Strict: the same finding now fails automation.
out=$(node "$STORYBOOK" --web-dir="$FORB" --forbid-title-pattern='\(WIP\)' --strict 2>&1); rc=$?
echo "$out" > "$T/sb-forbidden-strict.out"
[ "$rc" = 1 ] && ok || bad "storybook-correspondence: forbidden title WITH --strict must exit 1 (got $rc)"
grep -qF "forbidden-title" "$T/sb-forbidden-strict.out" \
  && ok || bad "storybook-correspondence: --strict report must still name the forbidden-title finding"
grep -qF "matches /\\(WIP\\)/i" "$T/sb-forbidden-strict.out" \
  && ok || bad "storybook-correspondence: --strict report must cite the matched pattern"

echo "=================================="
echo "checkers battery: $pass passed, $fail failed"
[ "$fail" = 0 ]
