# method.md — how to run the myopic walk

The engine is the **Cognitive Walkthrough** (a task-based, step-by-step usability inspection from
a novice's perspective) with two modifications: (1) the novice is replaced by a **panel of three
bounded-horizon users**, and (2) a **foresight probe** is added so the walk hunts consequences that
land beyond the horizon — the thing a plain cognitive walkthrough misses.

## Step 0 — reconstruct the step sequence

Before walking, pin down the ordered steps. How, by input type:

```
| Input          | Reconstruct steps by…                                                       |
|----------------|-----------------------------------------------------------------------------|
| Described flow | take the description literally; number each user action as a step           |
| Spec / PRD     | extract the user-facing flow it specifies; ignore backend/impl detail       |
| UI code/routes | trace the route/component sequence a user traverses; one screen ≈ one step  |
| Screenshots    | order the screens; each screen (or major decision on it) is a step          |
| Live app       | click through as @1.5; log each screen you land on as a step                |
```

Then **state the assumed sequence** at the top of the walk. A step is one *user decision or action*
— keep granularity at the level where the user must choose or act. If the order is genuinely
ambiguous, ask; otherwise state your assumption and proceed.

For code input, the information state at step K = the LITERAL strings the code renders — read the
component AND its i18n/string source, and quote ≥1 on-screen string per step in the Step ledger. If
you cannot quote what the screen says, you have not reconstructed the step.

Also fix the **goal**: what is the user actually here to accomplish? Every step is judged against
whether it moves a horizon-N user toward that goal *using only what they can see and hold*.

## The 8-question battery (run per step, per horizon)

For each step, ask these. The first four are the classic cognitive-walkthrough questions, tightened
to the myopic information state; the last four are the horizon/cluster probes.

```
1. GOAL (myopic)     Using ONLY what's on screen now, does the user know what they're trying to
                     do next? (No recall of earlier context that a horizon-N memory would drop.)
2. VISIBILITY        Is the correct next action present and obvious on this screen right now?
3. MATCH             Would a shallow planner connect this action to the outcome they want —
                     WITHOUT simulating downstream steps?
4. FEEDBACK          After acting, does the screen show perceptible progress toward the goal?
5. FORESIGHT ⭐       Does a choice here set up a consequence that only becomes visible ≥2 steps
                     later? If a horizon-N user can't see it now, it's a 🛏️ trap for that user.
6. LOAD              How many simultaneous decisions/options does this step demand? >~4 distinct
                     live choices → 🌊 overwhelm risk (working memory is ~4 chunks, not 7).
7. RECALL            Must the user carry a value/decision from an earlier step in their head to do
                     this one right? → 🧠 recall demand.
8. REVERSIBILITY     If they picked the wrong branch here, is there a cheap way back? If not and the
                     branch can be wrong → 🚪 no-undo dead-end.
```

Questions 1–4: a **"no" or "only with effort"** is friction — record which horizon it stops.
Questions 5–8: a **"yes"** is a flag — record the type and which horizons it catches.

## Running the panel (three horizons, one pass)

You don't walk the flow three times. Walk it once, and at each step evaluate the battery **against
each horizon's information state**:

- **@1** knows only: this screen + the single next action. Holds nothing pending. Fails Q1/Q7 the
  instant the step assumes any carried intention or context.
- **@1.5** knows: this screen + next + a *fuzzy* sense of the one after, and can hold **exactly one**
  pending intention ("I'll need to come back and set shipping"). A *second* pending thing evicts the
  first — from then on treat that first intention as forgotten.
- **@2** knows: two concrete moves ahead, and can hold a short 2-step sequence. Still blind at depth 3+.

For every flag, record **who it catches** as `@1 ✓ · @1.5 ✓/✗ · @2 ✓/✗`. The **fatal step** for a
horizon is the *first* step where that user (a) can't answer Q1/Q2/Q3 even with effort, or (b) hits a
🛏️/🌊/🚪 that stops them. Everything after a user's fatal step, they're guessing.

### The memory-eviction rule (the heart of the simulation)
The realism comes from *forgetting on schedule*. When a step introduces a new pending thing to
remember, **the oldest pending intention beyond the horizon's capacity is gone** — the user will not
"remember to" do it later. This is what turns "set this now, it matters at checkout" into a trap:
by checkout, the myopic user has evicted the reason.

## Scoring severity

For each flag, cross **panel depth caught** with **blast radius**:

```
                     blast radius →
                 cosmetic   annoying   costly/irreversible
   only @1        LOW        MEDIUM     HIGH
   @1.5 caught    MEDIUM     HIGH       CRITICAL
   even @2 caught HIGH       CRITICAL   CRITICAL
```

- **Blast radius** = what the consequence costs: cosmetic (mild confusion) → annoying (rework, a
  detour) → costly/irreversible (lost money, lost data, a state you can't undo, a support ticket).
- A 🛏️ foresight trap with an **irreversible** consequence is **CRITICAL by default** regardless of
  depth — because even a user who *could* plan 2 steps is still blind at depth 3+.

## What NOT to flag (precision guards)

- **Immediate + visible consequences.** No horizon was required → not a trap.
- **Expert-only power features clearly marked as advanced**, off the main path, where the myopic
  user is never routed. (Flag only if the main flow *forces* them through it.)
- **Aesthetics / preference.** Out of scope. If your only argument is "I'd design it differently,"
  drop it.
- **Genuine domain complexity** the app didn't create (e.g. tax rules). Flag how the app *exposes*
  it, not the complexity itself.

## Calibration note (keep yourself honest)

LLM-simulated users approximate a *population distribution*, not a specific human — research on
synthetic usability testing is explicit that they're good for **early concept screening**, not a
substitute for real testing. So: every finding is a **hypothesis to validate**, phrased as "a
short-sighted user would likely…", and the report header says so. Do not launder simulation into
certainty.

## Verify pass (mandatory — after drafting ALL findings, before output)

For EACH drafted finding answer three kill questions:
  K1 — Beyond-horizon: is the consequence really ≥2 steps after the choice? Re-check the cited
       steps in the ledger.
  K2 — Evidence: does the cited source actually say this? Re-open the file/quote.
  K3 — Guard: does a "What NOT to flag" guard, or an existing undo/warning in the flow, already
       cover it?

Stamp each: CONFIRMED | DOWNGRADED(<reason>) | KILLED(K1|K2|K3). "Plausible but unverified" =
KILLED. Subagent mode: one verifier per flow gets ONLY the findings + cited paths, instructed to
kill. Solo mode: finish ALL drafts first, then re-open every cited source. The report header MUST
print: raw N → killed X → downgraded Y → survived Z.
