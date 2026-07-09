---
name: gabe-myopic
description: "Role-play a short-sighted user with a shallow planning horizon (1 / 1.5 / 2 steps — never 3+) and walk a flow step by step to flag foresight traps (consequences landing 2+ steps later), overwhelm points, recall demands, and no-undo dead-ends. The INVERSE of an expert panel: what would a beginner fail to see coming? Runs 3 horizons at once and reports each one's fatal step. Works on a described workflow, spec, UI code, screenshots, or a live app. Usage: /gabe-myopic [walk|trap|step|fix|horizon] [target]"
when_to_use: "Review a UX flow / onboarding / checkout / wizard / form for whether normal people get confused, overwhelmed, or trapped; 'feels fine to us but users drop off'; sanity-check a spec before building; before shipping any multi-step flow."
context: fork
metadata:
  version: 1.1.0
  origin: "Neo case 20260701_myopic-user-skill"
  method: "Cognitive Walkthrough (NN/g) tuned by bounded planning horizon / present-bias myopia"
---

# Gabe Myopic — the short-sighted user, simulated

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Real people run a greedy, depth-limited search — they optimize the next one or two moves and get overwhelmed by anything that asks for more. This skill role-plays that short-sighted user on purpose, walking an app step by step while staying dumb, and flags exactly where the design assumes foresight a normal person doesn't have. Where `/gabe-roast` attacks from a named expert perspective, `/gabe-myopic` attacks from the one perspective an expert can't fake: a user who genuinely can't see the trap coming. It hunts one thing — Planning-Horizon Debt (the mattress trap): a choice that's locally fine but seeds a consequence 2+ steps later, invisible at decision time.

## Usage / modes

`/gabe-myopic [walk|trap|step|fix|horizon] [target]` — target can be a described workflow, a spec/PRD, UI code/routes, screenshots, or a live app.

The panel — 3 horizons run together, none sees 3+ steps ahead:

| Horizon | Sees ahead | Breaks when… |
|---------|------------|---------------|
| @1 | this step + the very next action | asked to prep for a later step |
| @1.5 (the normal person) | + one fuzzy pending intention | a 2nd pending thing appears |
| @2 | two concrete moves ahead | the payoff is 3+ steps out |

| Verb | What it does |
|------|---------------|
| **walk** (default) | Full panel walkthrough — 8-question battery per step, all 3 horizons |
| **trap** | Laser mode — foresight traps (mattresses) only, skips overwhelm/recall/undo |
| **step** | Interactive — narrates one step at a time as the @1.5 user, then waits |
| **fix** | For flagged items, proposes the design change that lowers the demanded horizon |
| **horizon** | Fast triage — "how many steps of foresight does this demand?" (30s gut-check) |

Four flag types: 🛏️ foresight trap, 🌊 overwhelm point, 🧠 recall demand, 🚪 no-undo dead-end. Severity combines how deep the panel is caught with the blast radius of the consequence (CRITICAL: even @2 is trapped or the consequence is irreversible/money/data; HIGH: @1.5 is trapped; MEDIUM: only @1 falls; LOW: all three recover).

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (a verb + target).
2. Read `references/myopic-spec.md` IN FULL before executing — the binding spec (8-question battery, panel mechanics, severity scoring, output template, guardrails). If missing, E6 applies — STOP.
3. Reconstruct the step sequence from whatever representation is given; if the order is ambiguous, state the assumed sequence first — never silently invent a flow.
4. Run the requested verb (default: walk).
5. For walk/trap: classify each flagged step by severity, citing an Evidence line quoting only sources opened this session; an empty or unquoted Evidence line deletes the finding, never merely downgrades it.
6. Respect the information state — a horizon-N user only knows what steps 1..N have shown; never let them "remember" what a lower-horizon user would drop. Only flag consequences that land beyond the horizon — immediate, visible consequences are not traps.
7. Render the verb's output format ending with the verify-pass line (`raw N → killed X → downgraded Y → survived Z`) and the one-line handle.
8. Load `method.md`, `examples.md`, or `reference.md` (sibling files, not under `references/`) on demand — see the spec's "References" section for what each holds.

## Output contract (summary)

WALK/TRAP: a Myopic Walk report — Panel result table (fatal step per horizon), Step ledger, Findings ordered most-severe-first (What the user does / Why it's beyond horizon / Who it catches / Evidence / Fix), and a one-line handle. STEP mode narrates one step per turn and stops for the human to advance. FIX mode returns the horizon-collapsing change per flagged item. HORIZON mode returns a one-line foresight-depth verdict. Every finding is a testable hypothesis, not proof, and the report header says so. The full output contract in the spec is binding.
