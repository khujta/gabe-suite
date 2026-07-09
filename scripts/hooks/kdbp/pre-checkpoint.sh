#!/usr/bin/env bash
# KDBP CHECKPOINT — PreToolUse hook for Bash (git commit detection)
# Reminds to use /gabe-commit instead of raw git commit
set -euo pipefail
if [ -f ".kdbp/BEHAVIOR.md" ]; then
  input=$(cat)
  if echo "$input" | grep -q '"command"' 2>/dev/null; then
    cmd=$(echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')
    if echo "$cmd" | grep -qE '^git commit' 2>/dev/null; then
      echo "[WARN] KDBP CHECKPOINT: Use /gabe-commit instead of raw git commit"
    fi
  fi
fi
