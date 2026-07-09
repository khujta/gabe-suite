---
name: gabe-lens
description: Transform technical concepts into your cognitive format — physical analogies, spatial maps, constraint boxes.
---

# Gabe Lens

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

Cognitive translation tool. Transforms complex technical content into a visual-spatial, analogical reasoning format.

## Before Anything Else

Read the full skill definition from the gabe-lens skill (`SKILL.md`). This contains:
- The cognitive profile (visual-spatial, conceptual-analogical, top-down constraint-driven)
- The Gabe Block template and rules for each component (including ANALOGY LIMITS)
- Compression modes (Full / Brief / Oneliner)
- When to apply / when not to apply
- Examples of well-formed Gabe Blocks

## Modes

### Mode 1: Explain — Full Block (default)

**Usage:** `/gabe-lens [concept or question]`

Transform a single concept into a full Gabe Block. Steps:

1. Read the gabe-lens SKILL.md for format rules
2. Identify the core concept from the user's input
3. Produce a single, well-formed Gabe Block with all components:
   - THE PROBLEM (purpose-first — or WHAT IT ENABLES for tool/building-block concepts)
   - THE ANALOGY (physical system)
   - THE MAP (ASCII spatial diagram)
   - CONSTRAINT BOX (IS / IS NOT / DECIDES)
   - ONE-LINE HANDLE (5-10 words, survives fatigue)
   - ANALOGY LIMITS (where the analogy breaks)
   - SIGNAL (Quick check or Deeper question)

### Mode 2: Brief (`brief` | `bf`)

**Usage:** `/gabe-lens brief [concept]` or `/gabe-lens bf [concept]`

Produce a brief Gabe Block (~40-80 tokens) — one-line handle + constraint box only. Use when space is tight or the concept has been introduced before.

1. Read the gabe-lens SKILL.md for format rules
2. Identify the core concept from the user's input
3. Produce a brief block:
   - Concept name as header
   - CONSTRAINT BOX (IS / IS NOT / DECIDES)
   - ONE-LINE HANDLE

### Mode 3: Oneliner (`oneliner` | `ol`)

**Usage:** `/gabe-lens oneliner [concept]` or `/gabe-lens ol [concept]`

Produce only the one-line handle (~5-15 tokens) — the most compressed form. Use for compaction handoffs, session re-anchoring, or when every token counts.

1. Read the gabe-lens SKILL.md for one-line handle rules
2. Identify the core concept from the user's input
3. Produce a single memorable phrase (5-10 words) that captures the essence

### Mode 4: Annotate (`annotate` | `an`)

**Usage:** `/gabe-lens annotate [file-path]` or `/gabe-lens an [file-path]`

Read a document and produce a companion file with Gabe Blocks for its key concepts. Steps:

1. Read the gabe-lens SKILL.md for format rules
2. Read the target document fully
3. Identify the 3-5 most complex or critical concepts (not trivial facts)
4. For each concept, produce a complete Gabe Block (full mode)
5. Write the companion file to the same directory as the original, named `{original-name}-gabe-lens.md`
   - Example: `docs/04-gate-audit.md` → `docs/04-gate-audit-gabe-lens.md`
6. The companion file should:
   - Reference the source document at the top
   - Present Gabe Blocks in the order they appear in the source
   - Include a brief intro explaining what this file is

### Mode 5: Calibrate (`calibrate`)

**Usage:** `/gabe-lens calibrate` or `/gabe-lens calibrate reset`

Interactive calibration to find which cognitive suit matches how you think. The result is saved globally so all future `/gabe-lens` output adapts to your style.

1. Read the suit definitions from `skills/gabe-lens/SUITS.md`
2. Present 3 concept options (Simple: Caching, Medium: Event-driven architecture, Complex: Consensus algorithms)
3. Generate a FULL Gabe Block in each of the 4 suits for the chosen concept
4. User picks the one that clicked fastest
5. Save selected suit to `~/.claude/gabe-lens-profile.md`

**Reset:** `/gabe-lens calibrate reset` — deletes the profile, returns to default (Spatial-Analogical)
