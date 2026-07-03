## What the contract actually is

Picture a strong, careful engineer working alongside a junior one. The strong engineer doesn't just happen to double-check file paths, run the command before claiming it passed, and ask before quietly doing a cheaper version of the ticket — they've internalized those habits over years. The junior engineer hasn't. Put them on the same task and the junior will, with total sincerity, write "done ✅" after skimming the code instead of running it.

Gabe's skills are run by models of varying strength — sometimes a careful one, sometimes a fast, literal-minded one. The E1–E7 contract is what happens when the suite's authors noticed that the strong-model runs were quietly doing seven things the skill text never actually asked for: citing the exact file and line for every claim, pasting real command output before checking a box, asking before delivering a cheaper version of the task, searching before building something new, writing state changes down immediately, stopping instead of guessing when a reference file was missing, and always saying exactly where to go look at the result. Those seven habits were *unwritten* — present only because a capable model happened to supply them on its own initiative. A weaker model does not supply them on its own initiative. So the fix was to stop relying on model judgment and write the habits down as seven short, literal rules, then paste that exact same block of text at the top of every skill and command file in the suite.

That's the whole mechanism: **the same 7 rules, byte-identical, in every gabe-* file** — so the strongest model's disciplined defaults become the floor every model runs on, not a lucky bonus a strong model happened to bring.

:::note Where it lives
Read the raw text at `~/.claude/gabe-hardening/PREAMBLE.txt` — that file is the single source of truth. It gets copied verbatim into the top of each skill's `SKILL.md` and each command's markdown file; nobody hand-retypes it per file.
:::

## The seven rules at a glance

Each rule targets one specific way that "I did the work" quietly becomes untrue. Scan this table first, then read the detail sections below for the exact wording and a before/after example.

| Rule | One-word name | The drift it stops |
| --- | --- | --- |
| **E1** | Evidence | Claiming something about the code without having opened it this session |
| **E2** | Run-before-✅ | Marking a check passed without actually running its command |
| **E3** | No silent downgrade | Quietly delivering a cheaper version of the task than the text asked for |
| **E4** | Reuse first | Building something new that already exists somewhere in the codebase |
| **E5** | State sync | Changing reality (a commit, a merge) without recording it in the same turn |
| **E6** | Missing anchor = stop | Inventing the contents of a template or spec file that couldn't be found |
| **E7** | Report where | Announcing "done" without saying exactly where a human can go check it |

## E1 — Evidence

> Every claim about code/state cites file:line or a command run THIS session; no citation → mark it `(assumed)` and verify before building on it. Absence claims ("no X exists") require a recorded search → 0 hits.

**Failure it prevents, in one sentence:** a model states something confidently sounding true about the codebase — "this function already validates input," "there's no existing retry logic" — because it sounds plausible, not because it was actually checked this session.

**Before → after:**

- Before (no E1): "The API already handles rate limiting."
- After (E1 applied): "The API already handles rate limiting — `api/middleware.py:41`, `@limiter.limit("10/minute")`." Or, if it wasn't actually opened: "The API probably already handles rate limiting *(assumed)* — verifying before I build on it." And a claim of absence — "no retry logic exists" — must show the search: `grep -rn "retry" api/` → 0 hits.

## E2 — Run-before-✅

> ✅ only after the command executed here (paste cmd + exit/count). Skipped = `⤫ skipped(<reason>)`, never ✅. Every printed number is copied from this run's output — never estimated.

**Failure it prevents, in one sentence:** a checklist that looks fully green even though half its checks were never executed — skimmed, guessed, or remembered from an earlier session instead of run right now.

**Before → after:**

- Before (no E2): "Tests: ✅ · Typecheck: ✅ · Lint: ✅"
- After (E2 applied): "Tests: ✅ `npm test` → exit 0, 42 passed · Typecheck: ⤫ skipped(no tsconfig for this package) · Lint: ✅ `npm run lint` → exit 0, 0 problems." Nothing gets a checkmark it didn't earn this run, and a skip says why instead of hiding as a pass.

## E3 — No silent downgrade

> Quote the task text verbatim before implementing; if your plan delivers a cheaper class (restyle≠rebuild, stub≠implement, recreate≠reuse), STOP and ask. Substitution requires an explicit user decision line.

**Failure it prevents, in one sentence:** a task asking for a full rebuild-to-reference quietly becomes a coat of paint on the existing screen, because the cheaper interpretation was easier and nobody flagged the swap.

**Before → after:**

- Before (no E3): task said "rebuild the groups screen to match the design-lab reference"; delivered result: existing screen recolored to match the palette, structure unchanged, reported as "done."
- After (E3 applied): "Task (verbatim): 'rebuild the groups screen to match the design-lab reference.' Deliverable class: **rebuild-to-reference**. My plan currently only restyles the existing component — that's a cheaper class than the text asks for. Confirm restyle is acceptable, or I proceed with the full rebuild?"

## E4 — Reuse first

> Before creating anything, print: `REUSE <path> | EXTEND <path> | NEW (searched <where> — none fit)`. Recreating an existing artifact is a defect.

**Failure it prevents, in one sentence:** hand-rolling a new dropdown, toggle, or header component that duplicates one already sitting in the shared component library, quietly forking behavior that will now drift out of sync.

**Before → after:**

- Before (no E4): builds a new `PeriodSelector` component from scratch for a report screen.
- After (E4 applied): "REUSE `src/components/SegmentedToggle.tsx` — searched `src/components/**/*.tsx` for existing period/segment selectors; this one already covers the exact interaction, extending it with an optional `periods` prop."

## E5 — State sync

> Actions that change reality (commit/merge/defer/pivot) write their state row in the SAME turn; a skipped write prints an enumerated skip code, never silence.

**Failure it prevents, in one sentence:** a merged PR or a deferred review finding that never gets logged, so the plan file quietly diverges from what actually happened until someone stumbles on the mismatch days later.

**Before → after:**

- Before (no E5): a PR merges; the plan file's phase row stays stuck on "in progress" for days because updating it fell out of scope of the merge conversation.
- After (E5 applied): the same turn that merges the PR also flips the plan row to `✅` with the commit hash — or, if the plan file can't be found, prints `ℹ PLAN.md: Exec tick skipped (no-plan)` instead of just moving on.

## E6 — Missing anchor = stop

> Referenced template/spec/catalog absent → print ⛔ and stop; never reconstruct it from memory.

**Failure it prevents, in one sentence:** a skill references a template or schema file, can't find it, and — rather than stopping — reconstructs "probably what it contained" from memory, silently drifting from whatever the real file actually specified.

**Before → after:**

- Before (no E6): a hook's JSON payload is referenced by a setup skill but the file that defines it is missing; the skill writes a plausible-looking JSON blob into `settings.json` from general knowledge of "what hooks usually look like."
- After (E6 applied): "⛔ `hooks/pre-commit.json` missing at `.claude/hooks/` — reinstall the suite or create it first. Not improvising from memory."

## E7 — Report where

> End user-visible work with: exact URL/screen · env (local :port vs deployed) · what to look at · absolute artifact paths.

**Failure it prevents, in one sentence:** a "the feature is done" message that leaves the human hunting for which screen, which port, and which environment actually shows the change — the same clarifying question asked over and over across sessions.

**Before → after:**

- Before (no E7): "Done — the new report view is implemented."
- After (E7 applied): "Done — check it at `http://localhost:5174/historial` (local dev server, NOT deployed), look at the inline period-scoped report under the Historial tab. Screenshot: `/home/user/project/tests/web-e2e/proof/historial-report.png`."

## Floors, not ceilings

:::note Precedence rule
E1–E7 are the universal minimum every gabe-* file inherits — they are **floors, not ceilings**. An individual skill's own gate is always allowed to be stricter than the shared contract (for example, gabe-mockup's reference-fidelity checklist adds requirements on top of E3), but it may never be looser — no skill can quietly opt out of citing evidence, running before ✅, or reporting where. If a skill-specific rule and the shared contract ever seem to conflict, the shared contract wins as the non-negotiable baseline; the skill's rule can only add, never subtract.
:::

## Why this is the centerpiece

Every other document in this suite — the command reference, the mechanism catalog, the per-skill hardening notes — describes machinery that sits *on top of* this contract. The mechanism catalog exists because someone traced a set of real incidents (a ten-phase rebuild that quietly became a recolor, a proof screenshot of the wrong running app, a typecheck command that was a silent no-op, a decision reversed without anyone recording the amendment) back to one root cause each time: one of these seven habits was missing from that run. The fix wasn't seven different patches to seven different skills — it was one short, shared block of text, repeated verbatim everywhere, so that no gabe-* skill or command ever runs without it. That's what makes a weaker model behave, on the habits that matter most, like the strongest model that ever ran the suite.
