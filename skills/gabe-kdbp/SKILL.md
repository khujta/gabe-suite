---
name: gabe-kdbp
description: "The suite's second MCP server — a project's .kdbp/ lifecycle state as 7 read-only tools the spine skills reach for (kdbp_snapshot · phase_context · review_target · next_beat · verify_commands · pending_row_preview · ledger_row_preview); previews write nothing. Usage: /gabe-kdbp status | register | probe [root]"
when_to_use: "Manage the gabe-kdbp MCP server: registered at user scope, disabled in this project, install parity. Human-initiated only; the TOOLS are reached for by every skill that touches lifecycle state — the spine (/gabe-plan, /gabe-red, /gabe-execute, /gabe-review, /gabe-commit, /gabe-push), /gabe-handoff, /gabe-next, /gabe-pulse and the satellites — through mcp__gabe-kdbp__*."
disable-model-invocation: true
metadata:
  version: 1.0.3
---

# Gabe KDBP — the lifecycle state as tools

**Usage:** `/gabe-kdbp status` · `/gabe-kdbp register` · `/gabe-kdbp probe [root]`

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

`scripts/server.py` is a stdio MCP server (Python stdlib only; the wire framework is gabe-map's `mcpwire.py`) that serves a project's `.kdbp/` — `PLAN.md` · `PLAN.json` · `PENDING.md` · `LEDGER.md` · `BEHAVIOR.md` · `DECISIONS.md` — plus git as seven read-only tools. It is the sibling of `gabe-map` (the codebase map); together they are the suite's **reliability surface**: what a beat used to reach by re-reading 60k tokens of bookkeeping files, or by remembering a spec step, becomes a tool advertised every session. Parsers are header-resolved (PENDING/PLAN/LEDGER schemas diverge across twins) and closure-aware. **Nothing here writes `.kdbp`**: the two PREVIEW tools return the exact row to paste, because the suite's lie-block hooks watch the harness's Write/Edit/Bash calls, not `mcp__*` (design D14 — an open ruling). Honest-empty without `.kdbp/`.

Design record: `../../docs/design/gabe-map/README.md` (§15). Binding contract: `references/kdbp-spec.md`.

## The seven tools (`mcp__gabe-kdbp__<name>`)

| Tool | Answers | Reads |
|---|---|---|
| `kdbp_snapshot` | where the project stands: branch, ahead/behind, dirty; PLAN phase table states; PENDING open rows (top 10); last LEDGER rows; DECISIONS count | git · PLAN · PENDING · LEDGER · DECISIONS |
| `phase_context` | execute's preflight for one phase: record, row states, `Cases:`/`Reach:` records, Verify Commands, PENDING rows in scope, declared entities' briefs (via gabe-map), warnings | PLAN.json · PLAN.md · BEHAVIOR · PENDING · gabe-map |
| `review_target` | what is pending review: the PLAN row with Review ⬜ and Exec ✅/🔄, its LEDGER commits (RED/EXEC/COMMIT rows dated on or after the plan's Created date) → changed files + a base ref; git-diff fallback | PLAN · LEDGER · git |
| `next_beat` | the router's decision (`next.mjs --json`) with exit codes mapped to fields | gabe-next |
| `verify_commands` | the lint/types/tests binding: BEHAVIOR first, else manifest candidates — never run, never a guessed flag | BEHAVIOR · package.json · pyproject · Makefile |
| `pending_row_preview` | the exact PENDING row to paste (file's own columns, next id in the file's majority prefix, Verified anchor, recurring-row flag) — writes nothing | PENDING (+ archive) · git |
| `ledger_row_preview` | the exact LEDGER row to insert newest-first (Gates verbatim) — writes nothing | LEDGER |

## Procedure

1. Treat the text after the invocation as the mode: `status` (default) · `register` · `probe [root]`.
2. Read `references/kdbp-spec.md` before acting. If missing, E6 applies — STOP.
3. **status** — `python3 "${ECC_ROOT:-$HOME/.claude}/skills/gabe-map/scripts/mcp-status.py" --server gabe-kdbp` (reads `~/.claude.json`, never `claude mcp get`): registered · disabled here · install parity · `server_sha`. Then the probe (step 5) and relay `kdbp_snapshot`.
4. **register** — ask-first: `claude mcp add -s user gabe-kdbp -- python3 "$HOME/.claude/skills/gabe-kdbp/scripts/server.py"`; idempotent; a session **restart** is required. `./install.sh --register-mcp` registers both servers.
5. **probe [root]** — `python3 "${ECC_ROOT:-$HOME/.claude}/skills/gabe-map/scripts/probe.py" --server gabe-kdbp [root]`: tool names + the `kdbp_snapshot` text (honest-empty when the project has no `.kdbp/`).
6. Report (E7): registered/disabled/parity · `.kdbp` present · current phase · `server_sha`.

## Output contract (summary)

- Every tool answer is ONE text block: header `gabe-kdbp · <tool>` (`· no .kdbp` when absent) + the JSON result; lists capped at 40 with the cap named; absence is a `reason`.
- Preview tools return `preview: true`, `writes: "nothing — …"`, and the `row` string; they never touch a file.
