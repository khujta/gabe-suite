---
name: gabe-myopic
description: "Simulate a short-sighted / myopic user (planning horizon 1 / 1.5 / 2 steps, never 3+) and walk an app's flow step by step to flag foresight traps, overwhelm points, recall demands, and no-undo dead-ends. The inverse of an expert design panel: what a beginner FAILS to see coming. Usage: /gabe-myopic [walk|trap|step|fix|horizon] [target]"
---

# Gabe Myopic

## Gabe execution contract (E1–E7)

These are floors, not ceilings — a skill's own gate may be stricter, never looser.

- **E1 EVIDENCE** — every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.
- **E2 RUN-BEFORE-✅** — ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.
- **E3 NO SILENT DOWNGRADE** — quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.
- **E4 REUSE FIRST** — before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.
- **E5 STATE SYNC** — actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.
- **E6 MISSING ANCHOR = STOP** — referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.
- **E7 REPORT WHERE** — end user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

Role-play the user who can't plan ahead, and find where the design punishes them for it. Walks a
target flow as a **panel of three bounded-horizon users** (@1 / @1.5 / @2) and reports the fatal
step for each.

## Before Anything Else

Read the full skill definition from the gabe-myopic skill (`skills/gabe-myopic/SKILL.md`). It
contains:
- The persona (panel of 3 horizons) and the memory-eviction rule that makes the simulation real
- The four flag types (🛏️ foresight trap · 🌊 overwhelm · 🧠 recall · 🚪 no-undo dead-end)
- Severity scoring (panel depth × blast radius)
- Output format (panel result + step ledger + findings + handle)
- The guardrails — above all **stay dumb on purpose**; the expert perspective is the failure mode

For the 8-question per-step battery, panel mechanics, and step reconstruction, read
`skills/gabe-myopic/method.md`. For worked examples, `skills/gabe-myopic/examples.md`.

## Input

The **target** is whatever represents the flow: a described workflow, a spec/PRD, UI code / routes,
screenshots/mockup, or a live app. If no target is given, ask for one. If the step order is
ambiguous, state the assumed sequence before walking — never silently invent a flow.

## Modes

### WALK (default) — `/gabe-myopic [target]` or `/gabe-myopic walk [target]`
Full panel walkthrough. Run the 8-question battery on every step for all three horizons, then
produce the full report.

### TRAP — `/gabe-myopic trap [target]`
Laser mode. Hunt **only** foresight traps (the mattress) — choices whose consequence is invisible
until ≥2 steps later. Skip overwhelm/recall/undo.

### STEP — `/gabe-myopic step [target]`
Interactive. Narrate the flow as the @1.5 user, one step per turn, first person, then stop and wait
for the human to advance.

### FIX — `/gabe-myopic fix [target-or-findings]`
For flagged items, propose the design change that collapses the required horizon (surface the future
in the present, chunk the decision, swap recall for recognition, add undo).

### HORIZON — `/gabe-myopic horizon [feature]`
30-second triage: how many steps of foresight does this feature demand? Flag if > 2. No full walk.

## Behavior

- Every report opens with the honesty caveat: simulated users approximate the population
  distribution, not a specific person — findings are hypotheses to validate, not proof.
- Flag foresight, not taste. Don't flag consequences that are immediate and visible.
- Always run the panel (all three horizons); the value is which step is fatal for whom.
