#!/usr/bin/env bash
# STRUCTURE: warning — PostToolUse hook
# Warns when a new file is created outside allowed patterns in .kdbp/STRUCTURE.md
set -euo pipefail
if [ -f ".kdbp/STRUCTURE.md" ]; then
  input=$(cat)
  tool=$(echo "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)
  if [ "$tool" = "Write" ]; then
    file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)
    if [ -n "$file_path" ]; then
      rel_path=$(realpath --relative-to="$(pwd)" "$file_path" 2>/dev/null || echo "$file_path")
      if echo "$rel_path" | grep -qvE '^(\.kdbp/|node_modules/|\.git/)' 2>/dev/null; then
        echo "[INFO] STRUCTURE: new file $rel_path — verify placement matches .kdbp/STRUCTURE.md"
      fi
    fi
  fi
fi
