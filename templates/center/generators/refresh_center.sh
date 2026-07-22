#!/bin/bash
# refresh_center.sh — ONE entry point for the command center's evidence inputs.
# Bootstrap-by-copy per gabe-feature/references/feature-spec.md §Bootstrap.
#
# The capture commands (junit / coverage / e2e) are DECLARED per project in
# docs/site/center/center.config.json `commands` — one shell line per entry,
# run from the repo root — so this script carries no project-specific runner.
# `regen` (the default) just re-renders whatever inputs exist on disk; it is
# cheap and never runs a suite. Full-suite captures only — a partial run would
# poison the estate view.
#
# Usage: scripts/refresh_center.sh [junit|coverage|e2e|all|regen]
#        default = regen only
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-regen}"
shift || true
CONFIG="docs/site/center/center.config.json"

# Emit the shell lines declared under center.config.json `commands.<key>`.
_group_cmds() {
  python3 -c 'import json,os,sys
p=sys.argv[1]
cfg=json.load(open(p)) if os.path.exists(p) else {}
print("\n".join(cfg.get("commands", {}).get(sys.argv[2], [])))' "$CONFIG" "$1"
}

run_group() {   # $1 = command-group key
  local key="$1" cmd found=0
  while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    found=1
    echo "── $key: $cmd"
    bash -c "$cmd"
  done < <(_group_cmds "$key")
  # `[ … ] && echo` as the last command made run_group return 1 whenever
  # commands WERE found, and set -e then killed the script before the
  # regenerate+gates block — captures ran, gates never did (M01).
  if [ "$found" = 0 ]; then
    echo "── $key: no commands declared in center.config.json — skipping"
  fi
}

case "$MODE" in
  junit)    run_group junit ;;
  coverage) run_group coverage ;;
  e2e)      run_group e2e ;;
  all)      run_group junit; run_group coverage; run_group e2e ;;
  regen)    ;;
  *) echo "usage: $0 [junit|coverage|e2e|all|regen]" >&2; exit 2 ;;
esac

echo "── regenerate + gates"
# The A3-Tabbed shell generator fills the vendored shell skeletons with machine
# facts; the crawl gate then proves every internal link resolves.
python3 scripts/build_center_a3.py
python3 scripts/check_center_links.py
