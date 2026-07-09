---
name: gabe-roast
description: "Adversarial gap review from a required perspective. Classifies gaps by maturity (MVP/Enterprise/Scale) and importance (Critical/High/Medium/Low) with one-liners."
---

# Gabe Roast

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

Adversarial gap review. Stress-tests a target from a specific perspective to surface gaps, risks, and missing pieces.

## Before Anything Else

Read the full skill definition from the gabe-roast skill (`SKILL.md`). This contains:
- The two required inputs (target + perspective)
- Classification dimensions (maturity levels + importance levels)
- Per-gap field definitions and rules
- Output format (full and brief)
- Behavior rules for before/during/after the roast
- Sequential roasting guidance
- Example output

## Pre-Roast Alignment Gate

Before executing any roast, run a shallow alignment check:

1. Read gabe-align VALUES.md for Core values (A1-A3)
2. Run each Core value’s test against the roast target
3. Print the shallow result before the roast output:
   - All PASS: proceed normally
   - Any CONCERN: print warning, proceed with roast
   - Any FAIL: print warning + "Foundational alignment issue detected on [value]. Consider running /gabe-align standard before roasting implementation details. Proceed anyway?"
4. If user says proceed, continue with roast. If not, stop.

This gate ensures roasts don’t waste effort on implementation gaps in a fundamentally misaligned design.

## Inputs — Both Required

**If either input is missing, ask before proceeding. Never assume a default perspective.**

### Parsing Rule

The user provides both perspective and target as free text after the command. To parse:
- If the last argument looks like a file path, folder path, or "this conversation" / "what we discussed" — treat it as the **target** and everything before it as the **perspective**
- If ambiguous, ask the user to clarify which is which

## Modes

### Mode 1: Full (default)

**Usage:** `/gabe-roast [perspective] [target]`

Full adversarial review with all fields per gap. Steps:
1. Read the gabe-roast SKILL.md for format and behavior rules
2. Confirm both inputs are present — if missing, ask
3. Read the target fully (files, imports, referenced configs)
4. Adopt the perspective completely
5. Produce the roast in full format
6. Include the summary line

### Mode 2: Brief (`brief` | `bf`)

**Usage:** `/gabe-roast bf [perspective] [target]`

Table format. One row per gap. Sorted by maturity then importance. Steps:
1. Read the gabe-roast SKILL.md for format rules
2. Confirm both inputs — if missing, ask
3. Read the target fully
4. Adopt the perspective
5. Produce the brief table
6. Include the summary line
