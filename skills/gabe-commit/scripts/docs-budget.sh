#!/usr/bin/env bash
# docs-budget — deterministic WARN check (documentation diet, 0.5b).
#
# Markdown is the agent-facing record: few, living, augmented in place. A NEW md file is allowed
# only for a genuinely NEW topic — never for a new change, iteration, or date. This check warns on:
#   (1) staged NEW .md files outside the allowed homes (.kdbp/**, files registered in .kdbp/DOCS.md)
#   (2) any staged NEW .md whose name carries a date stamp (the dated-throwaway smell)
# Exit codes: 0 = clean/skipped, 2 = warned. Never blocks.
set -u

docs_map=".kdbp/DOCS.md"
warned=0

new_md=$(git diff --cached --name-only --diff-filter=A -- '*.md' 2>/dev/null)
[ -n "$new_md" ] || exit 0

while IFS= read -r f; do
  [ -n "$f" ] || continue
  base=$(basename "$f")
  # dated-throwaway smell applies everywhere, including .kdbp/ (archives excepted)
  case "$f" in
    .kdbp/archive/*) : ;;
    *)
      if echo "$base" | grep -qE '[0-9]{4}-[0-9]{2}-[0-9]{2}'; then
        echo "⚠ DOCS BUDGET: new dated md file '$f' — no dated throwaways; replace/augment the living doc in place."
        warned=1
        continue
      fi
      ;;
  esac
  case "$f" in
    .kdbp/*) continue ;;   # KDBP state files are an allowed home
  esac
  if [ -f "$docs_map" ] && grep -qF "$f" "$docs_map" 2>/dev/null; then
    continue   # registered doc target — allowed
  fi
  echo "⚠ DOCS BUDGET: new md file '$f' outside the allowed homes — augment the existing topic doc instead, or register it in $docs_map."
  warned=1
done <<EOF
$new_md
EOF

[ "$warned" -eq 0 ] && exit 0
exit 2
