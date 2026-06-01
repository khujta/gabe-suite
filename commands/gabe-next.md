---
name: gabe-next
description: "Zero-logic router — reads .kdbp/PLAN.md and dispatches to the next gabe command (review/commit/push/execute/plan). Pure state-machine, no LLM, no side effects beyond the command it routes to. Usage: /gabe-next [--dry-run]"
---

# Gabe Next

Thin router. Reads `.kdbp/PLAN.md`, finds the next unticked cell in the phase table, and dispatches to the matching `gabe-*` command. Zero LLM cost. No state writes of its own.

**Design principle.** This command does not execute tasks, reason about them, or modify files. It answers one question: "Given PLAN state, what's the next gabe command to run?" Then it runs that command (or prints it on `--dry-run`).

## Procedure

### Step 0: Validate preconditions

1. `.kdbp/` exists → else print `⚠ No KDBP. Run /gabe-init first.` and exit.
2. `.kdbp/PLAN.md` exists and contains `<!-- status: active -->` → else print `ℹ No active plan. Run /gabe-plan [goal] to create one.` and exit.

### Step 1: Parse PLAN.md

Read `.kdbp/PLAN.md`. Extract:

1. **Current Phase pointer.** Line matching `## Current Phase` → next non-blank line → leading integer `N` from `Phase N: ...`. If missing or unparseable → print `⚠ PLAN.md: Current Phase section missing or malformed.` and exit.
2. **Phases table columns.** Detect column names from header row. Expected: `# | Phase | Description | Complexity | Exec | Review | Commit | Push`. Legacy plans may lack `Exec` — treat missing column as always-✅ (skip that step).
3. **Target row.** Row where first data column equals `N`.
4. **Project type.** Parse top-of-file HTML comment `<!-- project_type: code | mockup | hybrid -->`. If absent → default `code`. Used by Step 1.5 Exec dispatch.
5. **Target row types.** Parse `Types` column (or `## Phase Details → Phase N → types:` YAML) for target row. List like `[design-system, ui-kit]`. Empty → `[]`. Used by Step 1.5 hybrid dispatch.

### Step 1.5: Resolve Exec command (project_type-aware)

Determines which command handles the Exec step for the target phase. Pure lookup, no state writes.

**Mockup-tag set:** `{design-system, ui-kit, mockup-flows, mockup-index, mockup-docs, mockup-validation}`.

| `project_type` | Target row types intersect mockup-tag set? | Exec command |
|----------------|--------------------------------------------|--------------|
| `mockup`       | any                                        | `/gabe-mockup` |
| `code` or missing | any                                     | `/gabe-execute` |
| `hybrid`       | yes AND types ⊆ mockup-tag set              | `/gabe-mockup` |
| `hybrid`       | no (mixed or pure code tags)                | `/gabe-execute` |

Store the resolved command as `EXEC_CMD` for Step 2 use. Review / Commit / Push commands are unchanged regardless of project type.

### Step 2: Decide next action (zero LLM)

Apply this decision table, top-to-bottom. First match wins.

| Condition | Next command | Why |
|-----------|--------------|-----|
| Target row's `Exec` = ⬜ | `EXEC_CMD` | Tasks not yet implemented |
| Target row's `Exec` = 🔄 | `EXEC_CMD` | Phase exec in progress (resume) |
| Target row's `Review` = ⬜ | `/gabe-review` | Code written and Exec gate complete; runtime-gated phases should only reach this after staging proof |
| Target row's `Commit` = ⬜ | `/gabe-commit` | Reviewed, not committed |
| Target row's `Push` = ⬜ | `/gabe-push` | Committed, not pushed |
| All 4 = ✅ on target row AND more phases below | Advance `Current Phase` to `N+1`, re-run Step 2 | Phase done, move on |
| All 4 = ✅ on target row AND no phases below | `/gabe-plan complete` | Plan complete — prompt archive |

**Advance mechanics.** When advancing Current Phase, do NOT write any other file. Only rewrite the `## Current Phase` section to point to `N+1` and bump `Last Updated` in Context to today's date.

### Step 3: Dispatch

- If `--dry-run` in `$ARGUMENTS` → print the decision and stop. Format:
  ```
  GABE NEXT (dry-run)
  PHASE: N — [name]
  STATE: Exec ⬜ | Review ⬜ | Commit ⬜ | Push ⬜
  NEXT:  /gabe-execute
  REASON: Tasks not yet implemented
  ```
- Else → print the one-line summary, then dispatch the chosen command. Pass through any remaining `$ARGUMENTS` after `--dry-run` is stripped.

**Downstream command contract.**

1. Prefer the host's native slash-command invocation for the chosen command, e.g. run `/gabe-commit` as a command when that is available.
2. If the host cannot directly invoke nested slash commands, load the chosen command spec from the active install (`~/.claude/commands/<command>.md` in Claude Code, `~/.agents/commands/<command>.md` in Codex, or this repository's `commands/<command>.md` as a source fallback) and follow its Procedure exactly.
3. Do not replace the chosen command with a hand-rolled equivalent. In particular, when `NEXT` is `/gabe-commit`, do not stop after running raw `git commit`; the `/gabe-commit` normal-flow output contract must still be satisfied, including the visible `**Gabe-Lens brief**`, `/gabe-teach` suggestion, PLAN auto-tick output, and existing LEDGER behavior.
4. `/gabe-next` owns only routing and phase advancement. Commit message generation, verification, ledger writes, briefs, pushes, and other side effects belong to the downstream command.

### Step 4: Legacy plan compatibility

If the Phases table lacks an `Exec` column (legacy plans pre-v2.9):

1. Exec branch is silently skipped (treat as ✅)
2. Decision table collapses to Review → Commit → Push → advance
3. Print one-line notice: `ℹ Legacy plan schema — Exec column missing. Add manually or recreate plan via /gabe-plan to adopt it.`
4. Do not auto-migrate. Human migration only.

### Step 5: Error surfaces

Exit silently (no error) in these cases:

- No `.kdbp/` → printed message per Step 0
- No active plan → printed message per Step 0
- Malformed Current Phase → printed warning per Step 1
- Row N not found in table → print `⚠ Current Phase N has no matching row in Phases table.` and exit

Never rewrite PLAN.md on error. Never invoke downstream commands on error.

## Example output

```
$ /gabe-next
ℹ PLAN: Phase 2 — PydanticAI triage agent
→ /gabe-execute
[... gabe-execute runs inline ...]
```

```
$ /gabe-next --dry-run
GABE NEXT (dry-run)
PHASE: 2 — PydanticAI triage agent
STATE: Exec ⬜ | Review ⬜ | Commit ⬜ | Push ⬜
NEXT:  /gabe-execute
REASON: Tasks not yet implemented
```

```
$ /gabe-next
ℹ PLAN: Phase 1 complete — advancing to Phase 2
ℹ PLAN: Phase 2 — PydanticAI triage agent
→ /gabe-execute
```

```
$ /gabe-next --dry-run
GABE NEXT (dry-run)
PROJECT_TYPE: mockup
PHASE: 2 — Atomic components
TYPES: design-system, ui-kit
STATE: Exec ⬜ | Review ⬜ | Commit ⬜ | Push ⬜
NEXT:  /gabe-mockup
REASON: Tasks not yet implemented (mockup dispatch via project_type)
```

## Non-goals

- Does NOT run lints, tests, type checks — those belong to `gabe-review`/`gabe-commit`
- Does NOT generate commit messages, briefs, or code — those belong to `gabe-execute`/`gabe-commit`
- Does NOT read git state — decisions come purely from PLAN.md cells
- Does NOT modify LEDGER.md, PENDING.md, KNOWLEDGE.md
- Does NOT emulate downstream command internals after routing
- Does NOT call LLMs under any circumstance

$ARGUMENTS
