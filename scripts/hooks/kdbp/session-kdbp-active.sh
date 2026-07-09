#!/usr/bin/env bash
# KDBP Active — SessionStart hook
# Shows KDBP status when .kdbp/ exists in the working directory
set -euo pipefail
if [ -f ".kdbp/BEHAVIOR.md" ]; then
  name=$(grep '^name:' .kdbp/BEHAVIOR.md | head -1 | sed 's/^name: *//')
  maturity=$(grep '^maturity:' .kdbp/BEHAVIOR.md | head -1 | sed 's/^maturity: *//')
  tech=$(grep '^tech:' .kdbp/BEHAVIOR.md | head -1 | sed 's/^tech: *//')
  echo "[INFO] KDBP Active — $name ($maturity) [$tech]"
fi
