#!/usr/bin/env bash
# SESSION-END REMINDER — Stop hook
# Reminds about KDBP session-end tasks
set -euo pipefail
cat  # pass through stdin
if [ -f ".kdbp/BEHAVIOR.md" ]; then
  pending=$(grep -cE '^\| [0-9]' .kdbp/PENDING.md 2>/dev/null || echo "0")
  echo ""
  echo "[INFO] SESSION-END REMINDER (KDBP):"
  echo "  - Deferred items: $pending"
  echo "  - Run /gabe-teach if commits were made"
  echo "  - Run /gabe-commit for uncommitted changes"
fi
