# Gabe Myopic — full spec (split)

> Split from this skill's SKILL.md (B2 skills-only migration, 2026-07-09). This file is the
> binding spec; the SKILL.md core is a summary. E1–E7: see `../../gabe-docs/references/execution-contract.md`.

> **Rendering note.** Triple-backtick blocks below that hold tables/skeletons are spec material —
> render their contents as plain markdown when you present them, not as literal code.

## The one thing it hunts

```
┌─── Planning-Horizon Debt (the mattress trap) ──────────────────────┐
│  A chess beginner who sees 1 ply grabs the free pawn (locally      │
│  optimal) and never sees the mate in two. The board doesn't warn   │
│  them — the trap is legal, quiet, and fully "their fault."         │
│  HANDLE: "Beginner grabs the free pawn, walks into mate in two."   │
│  IS:      a lens for where the app needs foresight the user lacks  │
│  IS NOT:  a bug hunt, an a11y audit, or an aesthetics review       │
│  DECIDES: which "flexible / advanced / powerful" features are      │
│           actually traps for a normal person                       │
└─────────────────────────────────────────────────────────────────────┘
```

## The persona: a panel of 3 horizons (run all three at once)

Never simulate one generic user. Simulate three, each blind past their depth. **None sees 3+**,
so any consequence at depth 3+ (the mattress) is invisible to the whole panel.

```
| User   | Sees ahead                          | Can hold in head        | Breaks when…                       |
|--------|-------------------------------------|-------------------------|------------------------------------|
| @1     | this step + the very next action    | nothing pending         | asked to prep for a later step     |
| @1.5   | this step + next + a FUZZY next     | ONE pending intention   | a 2nd pending thing appears        |
| @2     | two concrete moves ahead            | a short 2-step sequence  | the payoff is 3+ steps out         |
```

`@1.5` is "the normal person." Treat a flag that traps **@1.5** as the headline result — that is
most of your users. `@1` is your fragility stress-test; `@2` is your generous-case floor.

**Report the fatal step per horizon** — the first step where each user gets overwhelmed, lost,
or trapped:

```
Panel result (checkout example):
  @1    drops off at step 2   (two decisions before any progress shows)
  @1.5  trapped at step 4     (shipping locked by a choice made on step 1)
  @2    survives to step 6    (but hits the no-undo at the end)
```

## The four flag types (the horizon-spine + its cluster)

Primary lens is **foresight**; the other three are what a short-sighted user hits *because* they
can't plan — so they travel together.

```
| # | Flag                | Emoji | Fires when…                                                         |
|---|---------------------|-------|---------------------------------------------------------------------|
| 1 | Foresight trap      | 🛏️   | a choice's real cost/consequence lands ≥2 steps later, unseen now   |
|   | (the mattress)      |       | — irreversible commits, path-dependency, "should've set X earlier"  |
| 2 | Overwhelm point     | 🌊    | one step demands >~4 simultaneous decisions/options → paralysis/guess |
| 3 | Recall demand       | 🧠    | must carry info from an earlier step in your head (recall > recognition) |
| 4 | No-undo dead-end     | 🚪    | the myopic path went wrong and there's no cheap way back            |
```

## Severity (how loud to be)

Combine **how deep the panel it catches** with **the blast radius of the consequence**:

```
| Severity  | Rule of thumb                                                            |
|-----------|--------------------------------------------------------------------------|
| CRITICAL  | even @2 is trapped, OR the consequence is irreversible / money / data loss|
| HIGH      | @1.5 (the normal person) is trapped or overwhelmed                        |
| MEDIUM    | only @1 falls; @1.5 recovers but with visible effort/frustration          |
| LOW       | all three recover; a foresight nudge would still help                     |
```

## Verbs

### WALK — full panel walkthrough (default)
Reconstruct the step sequence of the target, then run the **8-question battery** (see `../method.md`)
on every step, for all 3 horizons. Produce the report (format below). This is the main event.

### TRAP — laser mode: mattresses only
Skip the cluster (overwhelm/recall/undo). Hunt **only foresight traps** — choices whose
consequence is invisible until ≥2 steps later. Fastest way to answer "where will this bite them
later?" Use when you only care about path-dependency and irreversibility.

### STEP — interactive, one step at a time
Narrate the flow **as the @1.5 user, one step per turn**, thinking out loud in first person, and
stop. Wait for the human to advance. Best for live pairing, demos, or teaching the lens. Stay in
the user's information state — at step K you only know what steps 1..K showed you.

### FIX — collapse the required horizon
For flagged items, propose the design change that **lowers the foresight the step demands**, not
just "make it clearer." The four canonical moves:
```
| Flag            | The fix is to…                                                           |
|-----------------|--------------------------------------------------------------------------|
| Foresight trap  | pull the future consequence into the present (preview it, warn at commit,|
|                 | or defer/soften the commit so it's no longer path-dependent)              |
| Overwhelm point | chunk the decision (progressive disclosure) or supply a smart default    |
| Recall demand   | show the carried info in place (recognition), don't make them remember   |
| No-undo dead-end | add undo / back / a cheap escape, or confirm before the point of no return|
```

### HORIZON — fast triage, no full walk
Given a described feature, answer only: **"how many steps of foresight does this demand?"** and
flag if > 2. A 30-second gut-check when you don't need the whole report.

## Inputs — representation-agnostic

Works on whatever you can give it. Reconstruct the step sequence from:
- a **described workflow** ("first they pick a plan, then…") — walk it as written;
- a **spec / PRD** — walk the flow it specifies;
- **UI code / a component tree / routes** — infer the steps the code produces;
- **screenshots / a mockup** — walk the visible screens in order;
- a **live app** — if the harness can drive a browser, click through it as the myopic user.

If the step order is ambiguous, **state the assumed sequence first** (or ask), then walk it — never
silently invent a flow.

## Output format (WALK / TRAP)

```
# Myopic Walk: {target}
> Simulated short-sighted users. Findings are hypotheses to validate with real people,
> not proof — LLM synthetic users approximate the distribution, not the individual.
> Verify pass: raw {N} → killed {X} → downgraded {Y} → survived {Z}

## Panel result
| User  | Fatal step | What breaks them |
|-------|-----------|------------------|
| @1    | {step}    | {one line}       |
| @1.5  | {step}    | {one line}       |
| @2    | {step}    | {one line}       |

## Step ledger
| Step | What the user must do | Flags | Worst horizon caught |
|------|----------------------|-------|----------------------|
| 1    | …                    | 🌊    | @1                   |
| 4    | …                    | 🛏️ 🚪 | @1.5                 |

## Findings (most severe first)
### [CRITICAL] 🛏️ Step 4 — {short title}
- **What the myopic user does:** {first-person narrative of them walking into it}
- **Why it's beyond horizon:** {the consequence lands N steps later, unseen at step X}
- **Who it catches:** @1 ✓  @1.5 ✓  @2 ✓
- **Evidence:** {per the format table below — empty ⇒ finding deleted}
- **Fix:** {the horizon-collapsing change}

## The handle
"{one-line chess/mattress phrasing of the worst trap}"
```

### Evidence line (required per finding)
| Input walked | Evidence format |
|---|---|
| UI code/routes | `path:line` — "quoted rendered string/snippet (≤2 lines)" |
| spec/PRD | §section — "quoted sentence" |
| screenshots/mockup | screen id + quoted visible text |
| described flow | the quoted step from the description |

Cite only sources opened THIS session. A finding whose Evidence line is empty or unquoted is
DELETED before output — never shown, never merely downgraded.

## Guardrails (this is where the skill lives or dies)

- **Stay dumb on purpose.** The expert perspective is the failure mode, not the goal. If you
  explain why a step is *fine once you understand the system*, you've proven it needs foresight →
  flag it.
- **Respect the information state.** At step K the user knows only what steps 1..K put on screen,
  minus whatever fell out of a horizon-N memory. Do not let them "remember" what a horizon-1 user
  would have dropped.
- **Immediate + visible ≠ a trap.** If the consequence shows up right now, on this screen, no
  foresight was required — don't flag it. Only flag consequences that hide beyond the horizon.
- **Foresight, not taste.** "I don't like this layout" is out of scope. "A shallow planner can't
  see this choice will lock shipping" is in scope. Flag the second, never the first.
- **Don't overclaim.** These are simulated users; treat every finding as a testable hypothesis,
  not a verdict. Say so in the report header. (Real synthetic-user studies show LLMs match
  population *distributions*, not specific individuals.)
- **Panel, not solo.** Always run all three horizons — the value is showing *which* user each
  friction point costs you, and *which step* is fatal for whom.
- **Absence claims need a search proof.** A 🚪 / "nothing handles X" flag requires the exact
  search recorded in its Evidence line (e.g. `grep -rn useBlocker src/ → 0 hits`). No recorded
  search → no absence flag.

## References (read on demand)
- `../method.md` — the 8-question per-step battery, how to run the panel, severity scoring, and how
  to reconstruct steps from each input type.
- `../examples.md` — three worked walks (a SaaS onboarding, a checkout, a settings/permissions flow)
  showing the full output format.
- `../reference.md` — the research backbone: cognitive walkthrough, bounded planning horizon /
  depth-limited search, present-bias myopia, cognitive load, and the Nielsen heuristics each flag
  maps to — with sources.
