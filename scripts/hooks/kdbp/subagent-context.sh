#!/usr/bin/env bash
# SubagentStart — hand a sub-agent the context its parent already started with.
# · Explore and Plan never load CLAUDE.md, so the project's .kdbp/BLOCKS.md (what already
#   exists) reaches them here; every other kind gets it through the CLAUDE.md import.
# · Every sub-agent in a project with a codebase map gets one line naming the map: the map's
#   own guide reaches every sub-agent and moves almost none (gastify+gustify: the parent's
#   prompt named the map → 5 of 6 used it; prompt silent → 1 of 52).
# Context only: the event cannot block. Silent (no output, exit 0) when the project has
# neither file. The map marker is the one gabe-map reads: docs/site/center/archmap.json.
set -u
input=$(cat)
command -v python3 >/dev/null 2>&1 || exit 0
printf '%s' "$input" | python3 -c '
import json, os, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
root = os.environ.get("CLAUDE_PROJECT_DIR") or d.get("cwd") or ""
if not root:
    sys.exit(0)
parts = []
blocks = os.path.join(root, ".kdbp", "BLOCKS.md")
if d.get("agent_type") in ("Explore", "Plan") and os.path.isfile(blocks):
    with open(blocks, encoding="utf-8") as f:
        parts.append(f.read()[:8000].strip())
if os.path.isfile(os.path.join(root, "docs", "site", "center", "archmap.json")):
    parts.append("This project has a codebase map. Before grepping for who calls X, where X is "
                 "used or what touches a file, ask the map first (mcp__gabe-map__who_calls, "
                 "touches, find; load them with ToolSearch), then grep to fill what it misses.")
if parts:
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "SubagentStart",
                                             "additionalContext": "\n\n".join(parts)}}))
' 2>/dev/null || true
exit 0
