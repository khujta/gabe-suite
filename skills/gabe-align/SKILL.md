---
name: gabe-align
description: "Alignment guardian — manual pre-flight checks (shallow/standard/deep) plus automatic values + scenario checks at commit/PR boundaries. Usage: /gabe-align [mode] [target] or /gabe-align init [project]"
metadata:
  version: 2.1.0
---

# Gabe Align — Alignment Guardian

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

## Purpose

Two responsibilities:

1. **Manual alignment checks** — test proposed work against curated values BEFORE building. Three modes: shallow (quick), standard (full), deep (full + brief).
2. **Automatic checkpoint** — at commit/PR boundaries, evaluate values + test scenario coverage. Fires via hooks, no manual invocation needed.

> **Rendering note.** Output templates in this spec wrapped in bare triple-backtick fences are spec-meta delimiters — render their contents as plain markdown at runtime. Alignment tables and verdicts display as markdown. See `gabe-docs/SKILL.md` § "Runtime output rendering convention".

---

## Modes

### Manual Checks

| Mode | Alias | Values Checked | Output | Use Case |
|------|-------|---------------|--------|----------|
| **shallow** | `sf`, `bf` | Core only (A1-A3) + project values | 3-5 lines inline | Quick sanity check, auto-trigger in gabe-roast |
| **standard** | (default) | All Standard (A1-A7+) + project values + advisory AP checks | Full alignment document | Before design, implementation, or non-trivial tasks |
| **deep** | `dp` | All values + advisory AP checks + brief | Alignment document + alignment brief | Greenfield projects, new architectures, major decisions |

### Automatic Checkpoint

Fires at `git commit` / `gh pr create` via hook. Runs:
1. Values evaluation (user-level + project-level) — like shallow but with all loaded values
2. Scenario check — 3 realistic user scenarios per changed source file, check test coverage
3. Inline output — no separate document, just a summary before the commit proceeds

### Subcommands

| Command | What it does |
|---------|-------------|
| `/gabe-align init [name]` | Create `.kdbp/` with BEHAVIOR.md + VALUES.md (interactive), then run readiness check |
| `/gabe-align init-user` | Create `~/.kdbp/VALUES.md` (interactive) |
| `/gabe-align install-hooks` | Check `~/.claude/settings.json` for KDBP hooks and install missing ones (with confirmation) |
| `/gabe-align status` | Show current values (user + project) |
| `/gabe-align migrate` | Convert old `_kdbp/` to new `.kdbp/` format |
| `/gabe-align evolve` | Review value PASS/CONCERN frequency, suggest changes |

---

## Required Inputs (Manual Checks)

### 1. Target — What to check

| Input Type | Example |
|---|---|
| **Intent** | "build a memory system for my agents" |
| **File** | `/docs/architecture.md` |
| **Folder** | `/src/services/` |
| **Task reference** | `dev-story 42`, `code-review PR-17` |
| **Context** | "this conversation" |

### Artifact Discovery

When the target references a task/story/ticket:
1. Look for `sprint-status.yaml`, `TASKS.md`, `STORIES.md`, or similar in the current project root
2. If found, parse and locate the referenced task
3. If not found, ask: "I can't find a task tracking file. Where should I look? Or paste the task description."
4. If the task references other files (PRD, architecture doc, test plan), read those too

---

## Value Sources

Values load from three locations. All are read. Project-level has highest priority but doesn't replace others — they stack.

### Structural Values (part of the skill)

```
skills/gabe-align/VALUES.md — A1-A7 alignment values
```

Used in standard and deep modes. These are universal structural guards (user cognition, alternatives, validation before scale, etc.).

### Architecture Principles (installed template)

```
templates/architecture-principles.md
~/.claude/templates/gabe/architecture-principles.md
~/.agents/templates/gabe/architecture-principles.md
```

Used in standard and deep modes as advisory AP checks. AP checks are separate
from values: they produce CONCERN context and action items, but they do not count
as value failures and do not block commit/PR checkpoints unless a project value
or project-local rule independently makes the issue blocking. Load the first
available catalog path in the order above. If none exists, note that AP checks
were skipped because the catalog is missing.

### User-Level Values (always loaded)

```
~/.kdbp/VALUES.md — Universal values, all projects
```

Created by `/gabe-align init-user`. Applied at every checkpoint and every manual check. Example:
```markdown
# User Values
- **U1 — Verify Before Shipping:** Taste the dish before serving
- **U2 — Say Why:** Transparent reasoning — never output without context
- **U3 — Two Roads:** Show alternatives before committing to foundational decisions
```

### Project-Level Values (loaded on top)

```
.kdbp/VALUES.md — Project-specific values
```

Created by `/gabe-align init`. Only loaded when working in that project. Example:
```markdown
# Project Values
- **V1 — One New Thing:** One new thing, rest familiar
- **V2 — Nothing Rots:** Use what's expiring before what's exciting
- **V5 — Health Walls:** Health constraints are walls, not suggestions
```

### At Checkpoint / Check Time

All loaded values are evaluated:
- Shallow: project (V*) + user (U*) values only
- Standard: project (V*) + user (U*) + structural (A1-A7) + advisory AP checks
- Deep: all + advisory AP checks + alignment brief
- Automatic checkpoint: project (V*) + user (U*) + scenario check

---

## Procedure (Manual Checks)

### Before Checking

1. Read `skills/gabe-align/VALUES.md` fully (structural A1-A7)
2. Read `~/.kdbp/VALUES.md` if exists (user values)
3. Read `.kdbp/VALUES.md` if exists (project values)
4. For standard/deep only, read the architecture-principles catalog from the first available path: project-local `templates/architecture-principles.md`, then `~/.claude/templates/gabe/architecture-principles.md`, then `~/.agents/templates/gabe/architecture-principles.md`
5. Identify mode from invocation (shallow / standard / deep)
6. Identify target and context type
7. If existing artifact: locate and read ALL referenced files
8. If available, load cognitive profile from `~/.claude/gabe-lens-profile.md`. If the file does not exist and mode is **deep**, note it for the alignment brief (see Deep Mode below).

### During Checking

8. For each applicable value (based on mode tier):
   a. State the value handle
   b. Apply the test question to the target
   c. Produce verdict: PASS, CONCERN, or FAIL. PASS lines must name what was inspected: `U1 ✓ PASS — checked src/routes/scan.tsx:120-141 (diff hunk)`. A PASS with no inspected anchor is recorded as `⚠ CONCERN (uninspected)`.
   d. If CONCERN or FAIL: explain WHAT specifically is misaligned and WHY
9. Check each value independently — don't let other results influence assessment
10. Be specific. "Violates A4" is not enough. State what's misaligned concretely.
11. Don't pad. If all values pass, say so. A forced CONCERN is worse than an honest PASS.
12. In standard/deep only, run advisory AP checks after values:
   a. Evaluate only AP principles that the target evidence touches.
   b. Mark AP results as PASS, CONCERN, or NOT APPLICABLE.
   c. Do not fabricate AP concerns from generic preference; cite concrete target evidence.
   d. Keep AP results in a separate "ARCHITECTURE PRINCIPLES (advisory)" section.
   e. AP concerns may add action items, but they do not change the value PASS/CONCERN/FAIL counts.

### Rule-violation check (via `/gabe-debt`)

12a. If `.kdbp/RULES.md` exists (or `docs/rebuild/LESSONS.md` with R-rules), before producing the final verdict, run an implicit `audit-rules` pass against the target:
   - Load the rule index (R-NN entries + their `Detection` signatures).
   - Scan the target (file / folder / intent / diff) for rule violations.
   - Surface each violating rule as an additional CONCERN (standard mode) or contributing FAIL in strict-gate mode (e.g. pre-commit alignment checkpoint).
   - Format: `Rn ⚠ CONCERN — violates "<rule handle>" (source: RULES.md). <What to do>`
   - Do not surface if the match is in `.kdbp/debt-ignore.md`.
   - Skip this step silently if no rule index files exist — absence is not a concern.

### After Checking

13. Produce the output format for the selected mode
14. If any value FAILs in standard or deep mode: list specific action items
15. If AP advisory checks have CONCERNs: list specific action items, labelled with AP IDs
16. If the check reveals a gap no existing value or AP principle covers: propose a new value
17. If deep mode: produce the alignment brief
18. The alignment result IS the deliverable. Do not proceed to the task itself.

---

## Output Formats

### Shallow Mode

```
ALIGN (shallow): [target name]
U1 ✓ | U2 ✓ | V1 ✓ | V2 ⚠ [one-line concern] | A1 ✓ | A2 ✓ | A3 ✓
Status: PASS | PROCEED WITH CONCERNS | DO NOT PROCEED
```

### Standard Mode

```
GABE ALIGN: [target name]
Date: YYYY-MM-DD

VALUES CHECKED: N
PASS: X | CONCERN: Y | FAIL: Z

U1 ✓ PASS — [one-line explanation]
V1 ✓ PASS — [one-line explanation]
V2 ⚠ CONCERN — [explanation + what to do about it]
A1 ✓ PASS — [one-line explanation]
A2 ✗ FAIL — [explanation + what the alternative looks like]
...

ARCHITECTURE PRINCIPLES (advisory):
AP8 explicit state ⚠ CONCERN — [evidence-backed concern; does not change value counts]
AP12 documented decisions ✓ PASS — [evidence-backed pass, if applicable]

ACTION ITEMS:
1. [specific action for each concern/failure]

ALIGNMENT: PROCEED | PROCEED WITH CONCERNS | DO NOT PROCEED
```

**Verdict map (deterministic):** any FAIL → DO NOT PROCEED; else any CONCERN → PROCEED WITH CONCERNS; else PROCEED. The Status line is computed from the counts, never narrated.

### Deep Mode

Same as Standard, plus:

```
═══ ALIGNMENT BRIEF ═══

## Intent
[Restated for clarity — what we're trying to achieve]

## Cognitive Profile Constraints
[From gabe-lens suit. What this means for structural decisions.
 If no profile exists: "No cognitive profile found. Run `/gabe-lens calibrate` to generate one. Skipping cognitive constraints."]

## Structural Risks
[Risks identified by value checks — what's likely to go wrong]

## Recommended Approach
[Based on value alignment, what direction to take]

## Open Questions
[Must be resolved before designing]

## Values to Watch
[Which values are most at risk during implementation]
```

### Automatic Checkpoint (at commit/PR)

Only evaluates **session** and **story** altitude values (not epic). Only uses Hot tier context.

```
📋 KDBP Checkpoint — Pre-Commit

Values (session+story altitude only):
  U1 — Verify Before Shipping: ✅ PASS
  U2 — Say Why: ⚠️ CONCERN — new error message gives no context
  V1 — Cook First: ✅ PASS
  V2 — Nothing Rots: ✅ PASS
  (V3 — Shared Floor: skipped — epic altitude)

Test Scenarios:
  suggestRecipes.ts:
    ✅ User with pantry items gets suggestions
    ❌ Empty pantry → shows what? (no test)
    ❌ Rate limit hit → user sees what? (no test)

Action: 2 untested scenarios + 1 value concern.
  Fix now, or commit and track as deferred: /gabe-review deferred
```

After displaying, append to `.kdbp/LEDGER.md`:
```
## 2026-04-05 14:30 — Checkpoint (pre-commit)
U1:PASS U2:CONCERN V1:PASS V2:PASS | Scenarios: 4/6 covered | Committed: pending
```

### Checkpoint ❌ → Deferred Item Handoff

If the user proceeds with a commit despite ❌ untested scenarios, write those scenarios to `.kdbp/PENDING.md` when it exists, using the canonical 10-column schema (see gabe-review "Deferred Item Persistence"):

```markdown
| P4 | 2026-04-05 | checkpoint | Empty pantry scenario untested | suggestRecipes.ts | mvp | high | high | 1 | open |
```

`.kdbp/deferred-cr.md` is a legacy fallback only when PENDING.md is absent. Source is "checkpoint" (not a review name). This ensures that when `/gabe-review` runs next, it finds these items in the deferred backlog. If the same gap appears in the review's branch-test detection, `Times Deferred` increments to 2 → ⚠️ ESCALATED. This closes the loop between the automatic checkpoint and the manual review.

---

## Scenario Check (Automatic Checkpoint Only)

At commit/PR boundaries, after evaluating values, Claude reads the modified source files and their test files:

**For each feature or behavior added/changed in the diff:**
1. Name 3 realistic scenarios a user would hit (including error states, empty data, edge conditions)
2. Check if each scenario has a corresponding test
3. Report COVERED or NOT COVERED per scenario. COVERED must cite the exact test: `✅ COVERED — tests/suggestRecipes.test.ts::returns empty-state message for empty pantry`. No citation → NOT COVERED by definition (do not open-ended "probably covered").

**What counts as a "realistic scenario":**
- NOT contrived inputs or theoretical edge cases
- YES conditions a real user of THIS application would hit
- Think: empty data, network failure, duplicate action, slow dependency, missing permissions

**Skip the scenario check when:**
- Only `.md`, `.json`, `.yaml`, or config files changed (no source code)
- Trivial fix (single-line typo, import fix)

### Checkpoint Logging

After the checkpoint runs (values + scenarios), append a one-line summary to `.kdbp/LEDGER.md`:

```
## 2026-04-05 14:30 — Checkpoint (pre-commit)
U1:PASS U2:CONCERN V1:PASS V2:PASS | Scenarios: 2/3 covered | Committed: yes
```

The `Committed` field is set at write time: `yes` if the checkpoint fires during a commit that proceeds, `no` if the user aborts after seeing concerns. Since the hook fires via `PreToolUse` (before the commit executes), always write `Committed: yes` — if the user cancels the commit after seeing the checkpoint, the next session's checkpoint will detect the same issues and overwrite. Do not attempt to update the field retroactively.

This gives `/gabe-align evolve` data to analyze. The ledger is append-only — never read during normal checkpoint flow, only by `evolve`.

---

## Context Tiers

Not all values need to be in context at all times. Load by tier to avoid context pollution:

| Tier | What | When loaded | Cost |
|------|------|-------------|------|
| **Hot** | User values (U*) + project values (V*) | SessionStart hook — always | ~500 bytes |
| **Warm** | Structural values (A1-A7) + architecture principles (AP1-AP13) | On `/gabe-align standard` or `deep` invocation | ~6KB |
| **Cold** | Ledger history, evolution data | Only by `/gabe-align evolve` | Variable |

The automatic checkpoint at commit/PR only uses **Hot** tier values. Structural values (A1-A7) and architecture principles (AP1-AP13) are design-level guards — they're checked when you deliberately run `/gabe-align standard`, not on every commit.

---

## Project Files

```
.kdbp/
├── BEHAVIOR.md     # Project name, domain, maturity, active focus (~500 words)
├── VALUES.md       # Project-specific value handles (3-7 values)
├── LEDGER.md       # Checkpoint history (auto-appended, one line per checkpoint)
├── PENDING.md      # Deferred items, canonical 10-column schema — shared with gabe-review (primary)
└── deferred-cr.md  # Legacy fallback, only used when PENDING.md is absent
```

User-level:
```
~/.kdbp/
└── VALUES.md       # Universal value handles (3-5 values)
```

### BEHAVIOR.md Format

```yaml
---
name: [project-behavior-name]
domain: [what the project does]
maturity: mvp | enterprise | scale
tech: [comma-separated stack]
created: [date]
---
```

Followed by markdown describing purpose, active focus, and constraints. Keep under 500 words.

### VALUES.md Format

```markdown
# [User|Project] Values

- **[ID] — [Name]:** [One sentence] `[altitude]`
```

Example:
```markdown
# Project Values

- **V1 — Cook First:** Every decision starts from "does this help someone cook better?" `session`
- **V2 — Nothing Rots:** Use what's expiring before what's exciting `story`
- **V3 — Shared Floor:** Never deploy rules without cross-app validation `epic`
```

### Altitude

Each value has an altitude that determines WHEN it gets checked:

| Altitude | Meaning | Checked at |
|----------|---------|------------|
| `session` | Real-time relevance — check every checkpoint | Automatic checkpoint (commit/PR) |
| `story` | Per-feature relevance — check during feature work | Automatic checkpoint + `/gabe-align shallow` |
| `epic` | System-level relevance — check during planning/closing | `/gabe-align standard` and `deep` only |

If no altitude is specified, default to `session` (checked at every checkpoint).

At automatic checkpoints, only evaluate `session` and `story` altitude values. This keeps the checkpoint lightweight — epic-level values won't fire noise on session-level commits.

### Rules

- Maximum 7 per level (user: 3-5, project: 3-7)
- Each must be testable: you can look at a diff and say PASS or CONCERN
- Use the project's language, not abstract principles
- User-level IDs: U1, U2, U3...
- Project-level IDs: V1, V2, V3...

---

## Init Subcommand

### `/gabe-align init [project-name]`

Creates `.kdbp/` in the current project. Interactive:

1. "What does this project do?" → generates BEHAVIOR.md
2. "What's the last mistake that slipped through?" → suggests a value
3. "What decision do you keep revisiting?" → suggests a value
4. "What keeps breaking between sprints?" → suggests a value
5. Presents suggested values + the user-level values (if they exist)
6. User picks, modifies, or replaces → writes VALUES.md
7. Run **Readiness Report** (see below)

#### Readiness Report

After writing `.kdbp/` files, scan the environment and print a summary:

```
Gabe Suite — Readiness Report

  ✅ .kdbp/ created (BEHAVIOR.md, VALUES.md, LEDGER.md)
  ✅ ~/.kdbp/VALUES.md found (3 user values)         | or ❌ Missing — run /gabe-align init-user
  ✅ SessionStart hook installed                       | or ❌ Missing — run /gabe-align install-hooks
  ✅ PreToolUse checkpoint hook installed              | or ❌ Missing — run /gabe-align install-hooks
  ✅ ~/.claude/gabe-lens-profile.md found              | or ⚠️  Missing (optional, for deep mode — run /gabe-lens calibrate)
```

If any ❌ items exist, print: `"Run the suggested commands to complete setup. Checkpoint hooks are required for automatic values + scenario checks at commit/PR."`

### `/gabe-align init-user`

Creates `~/.kdbp/VALUES.md` if it doesn't exist. Same discovery questions but aimed at cross-project patterns.

### `/gabe-align install-hooks`

Checks `~/.claude/settings.json` for the two KDBP hooks and installs any that are missing. Requires user confirmation before modifying the file.

**Procedure:**
1. Read `~/.claude/settings.json`
2. Check for **SessionStart** hook — look for a hook whose command contains `KDBP Active`
3. Check for **PreToolUse** (Bash matcher) hook — look for a hook whose command contains `KDBP CHECKPOINT`
4. For each missing hook:
   - Show the user what will be added (the JSON snippet)
   - Ask for confirmation: "Add KDBP [SessionStart/PreToolUse] hook to settings.json? [Y/n]"
   - If confirmed: read the file, parse JSON, add the hook entry to the appropriate array, write back
   - If the hooks key or sub-arrays don't exist, create them
5. After installation, verify by re-reading and confirming both hooks are present
6. Print result:
   ```
   ✅ SessionStart hook: installed
   ✅ PreToolUse checkpoint hook: installed
   ```

**Safety rules:**
- Never overwrite existing hooks — only append to the hooks arrays
- Preserve all existing entries (RTK, GSD, etc.)
- If both hooks already exist, print: "Both KDBP hooks are already installed. No changes needed."

See the **Hook Installation** section below for the exact JSON to add.

### `/gabe-align migrate`

Reads old `_kdbp/behaviors/*/VALUES.md` and `BEHAVIOR.md`. Copies values and behavior into new `.kdbp/` format. Discards workflows, commands, hooks, protocol docs.

### `/gabe-align evolve`

Reviews checkpoint history from `.kdbp/LEDGER.md`. Counts per-value PASS/CONCERN frequency across recent entries.

**Process:**
1. Read `.kdbp/LEDGER.md` — parse the one-line checkpoint entries
2. Count per-value: how many PASS, how many CONCERN, across last 10-20 entries
3. Surface patterns:

| Pattern | Trigger | Suggestion |
|---------|---------|------------|
| Value CONCERN 3+ times | Recurring violation | "V2 has been CONCERN in 3 of last 5 checkpoints. Options: (a) reword to be more specific, (b) escalate — make it block commits, (c) accept — this is a known tradeoff" |
| Value PASS 10+ consecutive | Internalized | "U1 has been PASS for 10 straight checkpoints. Options: (a) graduate it out — add a new value, (b) keep as safety net, (c) tighten the test" |
| Scenario ❌ recurring on same file | Persistent coverage gap | "suggestRecipes.ts has had untested scenarios in 4 of last 6 checkpoints. Consider: /gabe-roast qa suggestRecipes.ts" |
| No checkpoints in ledger | Never run | "No checkpoint data yet. Run a few sessions with the hooks active, then try evolve again." |

4. If the user approves a value change, update VALUES.md directly

---

## New Value Proposal

When a check reveals a gap no existing value covers:

1. Surface it: "No existing value addresses [specific concern]"
2. Propose:
   ```
   [U/V/A]X — "[handle]"
   Guards against: [what]
   Test: "[question]"
   Tier: [Core / Standard / Extended]
   ```
3. User approves, rejects, or modifies
4. If approved: added to the appropriate VALUES.md

---

## Hook Installation

Two entries in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "VALUES=''; if [ -f ~/.kdbp/VALUES.md ]; then VALUES=\"USER_VALUES=$(head -20 ~/.kdbp/VALUES.md)\"; fi; if [ -f .kdbp/VALUES.md ]; then VALUES=\"$VALUES PROJECT_VALUES=$(head -20 .kdbp/VALUES.md)\"; fi; if [ -f .kdbp/BEHAVIOR.md ]; then VALUES=\"$VALUES BEHAVIOR=$(head -10 .kdbp/BEHAVIOR.md)\"; fi; if [ -n \"$VALUES\" ]; then echo \"{\\\"additionalContext\\\": \\\"KDBP Active. $VALUES\\\"}\"; fi",
        "timeout": 3000
      }]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "TOOL_INPUT=$(cat); if echo \"$TOOL_INPUT\" | grep -qE '\"command\".*git commit|\"command\".*gh pr'; then if [ -f ~/.kdbp/VALUES.md ] || [ -f .kdbp/VALUES.md ]; then echo '{\"additionalContext\": \"KDBP CHECKPOINT: Before committing, evaluate all values (from ~/.kdbp/VALUES.md and .kdbp/VALUES.md) against git diff. For each changed source file, name 3 realistic user scenarios (including errors, empty data, edge conditions) and check if each has a test. Report per-value PASS/CONCERN and per-scenario COVERED/NOT COVERED. If untested scenarios exist, suggest writing tests before committing.\"}'; fi; fi",
        "timeout": 3000
      }]
    }]
  }
}
```

---

## Integration with Gabe Suite

### Pre-roast gate

Before executing any roast, gabe-roast runs a shallow alignment:
1. Read target
2. Run gabe-align shallow (core values A1-A3 + project values)
3. If all PASS: proceed to roast
4. If CONCERN: print warning, proceed
5. If FAIL: print warning + "Foundational alignment issue. Consider /gabe-align standard. Proceed? [y/n]"

### Cross-tool suggestions

| Checkpoint result | Suggested action |
|-------------------|-----------------|
| All values PASS, all scenarios COVERED | Commit freely |
| Value CONCERN | Review the diff for that value. Fix or accept. |
| Untested scenarios | Write tests for ❌ scenarios. Or: `/gabe-roast qa [file]` |
| Both CONCERN + untested | `/gabe-review` for full risk-priced review |
| Alignment doubt (wrong direction?) | `/gabe-align standard` for full check |

---

## Error Taxonomy (Reference)

| Type | Name | Caught by |
|------|------|-----------|
| A | Syntax/Build | Build tools, CI |
| B | Logic | Tests, code review |
| C | Integration | E2E tests |
| D | Performance | Profiling, /gabe-health hotspots |
| E | UX | /gabe-roast UX perspective |
| **F** | **Alignment** | **Values check (this tool)** |
| **G** | **Coverage** | **Scenario check (this tool)** |

---

## When to Use

**Always use for:**
- New projects or architectures (deep mode)
- Before first roast on any artifact (shallow, auto)
- Starting work on a new epic or major feature

**Automatic (no action needed):**
- At every `git commit` and `gh pr create` — hook fires checkpoint

**Don't use for:**
- Trivial bug fixes or typo corrections
- Tasks where alignment was already checked and nothing changed
