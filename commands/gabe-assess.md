---
name: gabe-assess
description: "Rapid change impact assessment. Surfaces blast radius, maturity scope, prerequisites, and alternatives before committing to an 'obvious' fix."
---

# Gabe Assess

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

Rapid change impact assessment. Pauses before an "obvious yes" to photograph what a proposed change actually means.

## Before Anything Else

Read the full skill definition from the gabe-assess skill (`SKILL.md`). This contains:
- When to use (and when not to)
- The four assessment dimensions (blast radius, maturity scope, prerequisites, alternatives)
- Output formats (full, brief, inline)
- Sequential assessment for batched changes
- Behavior rules and integration with other gabe skills
- Example output

## Inputs

### Parsing Rule

The user provides the proposed change as free text after the command:
- If the argument is "this" or "what you just proposed" — assess whatever was most recently suggested
- If the argument is a file path — assess the changes in/to that file
- Otherwise treat the full text as the change description

Context (mid-task / planning / post-review / blocker) is auto-detected from conversation state. If ambiguous, state the assumed context.

## Modes

### Mode 1: Full (default)

**Usage:** `/gabe-assess [change description]`

Full assessment with all four dimensions. Steps:
1. Read the gabe-assess SKILL.md for format and behavior rules
2. Identify the proposed change and context
3. Read enough to understand what the change touches
4. Produce the full assessment
5. Include recommendation and one-liner

### Mode 2: Brief (`brief` | `bf`)

**Usage:** `/gabe-assess bf [change description]`

Compact table format. Steps:
1. Read the gabe-assess SKILL.md for brief format
2. Identify change and context
3. Produce the brief assessment (4 lines)

### Mode 3: Inline (`inline` | `il`)

**Usage:** `/gabe-assess il [change description]`

Single sentence woven into conversation. Steps:
1. Read the gabe-assess SKILL.md for inline format
2. Produce a natural-language aside with key facts

### Mode 4: Batch (`batch`)

**Usage:** `/gabe-assess batch [change 1] + [change 2]` or `/gabe-assess batch this`

Multiple changes assessed together. Steps:
1. Read the gabe-assess SKILL.md for batch format
2. Assess each change in brief mode
3. Produce combined recommendation (independent / coupled / sequenced)