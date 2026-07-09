#!/usr/bin/env bash
# ACTIVE PLAN — SessionStart hook
# Shows current plan status from .kdbp/PLAN.json (machine mirror), falling back to .kdbp/PLAN.md
set -euo pipefail

if [ -f ".kdbp/PLAN.json" ] && command -v python3 >/dev/null 2>&1; then
  summary=$(python3 - <<'PY' 2>/dev/null || true
import json
try:
    p = json.load(open(".kdbp/PLAN.json"))
except Exception:
    raise SystemExit(1)
status = p.get("status")
if status != "active":
    print("[INFO] ACTIVE PLAN: none — run /gabe-plan to create one")
    raise SystemExit(0)
cur = str(p.get("current_phase", "?"))
phase = next((ph for ph in p.get("phases", []) if str(ph.get("id")) == cur), None)
if phase:
    cells = phase.get("cells", {})
    trail = " ".join(f"{k}:{cells.get(k, '?')}" for k in ("exec", "review", "commit", "push"))
    print(f"[INFO] ACTIVE PLAN: Phase {cur} — {phase.get('name', '?')} ({trail})")
else:
    print(f"[INFO] ACTIVE PLAN: Phase {cur} — check .kdbp/PLAN.md")
PY
)
  if [ -n "$summary" ]; then
    echo "$summary"
    exit 0
  fi
fi

if [ -f ".kdbp/PLAN.md" ]; then
  if grep -q "^No active plan" .kdbp/PLAN.md 2>/dev/null; then
    echo "[INFO] ACTIVE PLAN: none — run /gabe-plan to create one"
  else
    phase_line=$(grep -E '^\| [0-9A-Z]' .kdbp/PLAN.md | grep '🔄' | head -1 || true)
    if [ -n "$phase_line" ]; then
      echo "[INFO] ACTIVE PLAN: in progress — $(echo "$phase_line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')"
    else
      echo "[INFO] ACTIVE PLAN: present — check .kdbp/PLAN.md"
    fi
  fi
fi
