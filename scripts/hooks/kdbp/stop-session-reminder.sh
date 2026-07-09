#!/usr/bin/env bash
# NEXT-pointer — Stop hook (routing contract 0.3b)
# Fires ONLY when: KDBP project AND working tree dirty AND no commit landed this session.
# Prints a single deterministic next-step line. Zero model memory, no other reminders.
set -euo pipefail
input=$(cat)  # consume stdin (hook JSON)

[ -f ".kdbp/BEHAVIOR.md" ] || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# dirty check (tracked modifications or staged work; untracked-only does not fire)
dirty=$(git status --porcelain 2>/dev/null | grep -cv '^??' || true)
[ "$dirty" -gt 0 ] || exit 0

# "no commit this session": if the transcript is available, look for commit activity in it;
# otherwise approximate with "HEAD commit older than 30 minutes".
transcript=$(echo "$input" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//' | sed 's/"$//' || true)
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  if grep -q 'git commit' "$transcript" 2>/dev/null; then
    exit 0
  fi
else
  head_age=$(( $(date +%s) - $(git log -1 --format=%ct 2>/dev/null || echo 0) ))
  [ "$head_age" -gt 1800 ] || exit 0
fi

echo ""
echo "next: /gabe-commit ($dirty tracked file(s) dirty, no commit this session)"
