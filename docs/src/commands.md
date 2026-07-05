## How they fit together

Ten commands, four groups. The **core loop** (scope → plan → next → execute → review → commit → push) is the spine a project rides from first idea to shipped commit — `/gabe-next` is a pure router that reads `.kdbp/PLAN.md` and tells you which of the others to run next, so in practice you rarely choose manually. **Setup** is `/gabe-init`, run once per project to lay down `.kdbp/` and the hooks that make the rest of the suite legible. **Learning** is `/gabe-teach`, run after commits to turn the diff into understanding the human can actually recall later, rather than a blob of code they approved and forgot. **Session continuity** is `/gabe-handoff`, run when a session ends or context fills up — it writes the next-session resume prompt and syncs `.kdbp/` so the work picks up mid-phase without loss. Every command in all four groups sits under the same E1–E7 execution contract (see [The E1–E7 contract](contract.html)) — the gates below are each command's specific tightening of that shared floor.

The deep-dives below cover these workflow commands. The suite's other half — the on-demand **analysis satellites** (roast, health, debt, assess, align, myopic) — has its own page, [Analysis satellites](satellites.html), because those tools run *outside* the loop rather than as steps in it. A complete index of **all 22 commands** (workflow, satellites, scope authoring, and utilities) closes this page.

```mermaid
flowchart TD
    Init["🛠️ /gabe-init<br>one-time setup"] --> Next
    Scope["/gabe-scope"] --> Plan["/gabe-plan"]
    Plan --> Next["🔀 /gabe-next<br>router"]
    Next --> Execute["/gabe-execute"]
    Execute --> Review["/gabe-review"]
    Review --> Commit["/gabe-commit"]
    Commit --> Push["/gabe-push"]
    Push -.loops back.-> Next
    Commit --> Teach["🎓 /gabe-teach<br>learning"]
    Next -.wrap up / resume.-> Handoff["📤 /gabe-handoff<br>session continuity"]
```

:::note How to read "key gate"
These are not the only things each command does — they're the specific mechanism the hardening added or hardened, the one that turns a claim ("tests pass," "reviewed," "reused") into something that has to be demonstrated on screen before the command can proceed.
:::

:::note New here?
Start with `/gabe-init`, then let `/gabe-next` drive the loop — it reads `.kdbp/PLAN.md` and tells you which command to run. Read [The E1–E7 contract](contract.html) for the shared floor every command below tightens.
:::

## The core loop — scope → plan → next → execute → review → commit → push

This is the path every unit of work travels. Each step reads state the previous step wrote and writes state the next step will read — the chain is what makes `.kdbp/` a reliable memory instead of a pile of notes.

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-scope` | Authors `SCOPE.md` (the stable premise) and `ROADMAP.md` (the phase plan) for a new project or a scope change, one checkpoint-gated step at a time. | ![gabe-scope](assets/icons/cmd-scope.png) Strict checkpoint gating — every major step needs explicit user approval before the next runs, and final assembly reads the *current on-disk* files first: anything the human edited outside a `[PENDING APPROVAL]` marker is treated as final and diffed before any overwrite, so a session can never silently clobber a human edit. |
| `/gabe-plan` | Creates or updates the phase plan in `.kdbp/PLAN.md` — the row-per-task table every other command reads. | ![gabe-plan](assets/icons/cmd-plan.png) Per-phase template discipline: Types column plus Scope / References / Acceptance / Checkpoint fields, so `/gabe-execute`'s reads always find the same field names. Auto-tick cross-checks the phase footer and uses enumerated skip codes instead of silently ticking the wrong row. |
| `/gabe-next` | Zero-logic router — reads `.kdbp/PLAN.md` state and dispatches to whichever command comes next. No judgment, no side effects beyond the command it routes to. | ![gabe-next](assets/icons/cmd-next.png) Prior-row sweep: always prints any owed Review/Push debt from earlier phases before advancing — so incomplete prior work stays visible at every routing decision instead of getting buried under the current phase. |
| `/gabe-execute` | Implements the current phase's tasks from `.kdbp/PLAN.md`, checkpointing at commits. | ![gabe-execute](assets/icons/cmd-execute.png) TASK CONTRACT + REUSE LEDGER gate — quote the task text verbatim, classify it, and print a reuse verdict *before* any Write or Edit. Pairs with a persistent per-task checklist in `PLAN.md` (state survives a session dying) and a T[i] VERIFY evidence block, so "verification ✅" is unprintable without an executed command in front of it. |
| `/gabe-review` | Risk-priced code review with interactive triage, confidence scoring, and plan-alignment checking. | ![gabe-review](assets/icons/cmd-review.png) Mandatory verify/kill pass (Step 4.4) with a per-finding Evidence line — an absence claim ("no tests for X") needs search proof, not confidence talk. Closes both triage bypasses (a skipped CRITICAL, a mid-triage exit) so either path auto-defers instead of vanishing. |
| `/gabe-commit` | The commit quality gate — CHECK 1–9, deferred scan, doc drift — that stands between a diff and `git commit`. Never use raw `git commit`. | ![gabe-commit](assets/icons/cmd-commit.png) Executed-evidence CHECK gates: every check resolves a real command, shows the evidence row and a 3-state glyph (✅ / ❌ / ⤫ skipped-with-reason), and a hardcoded "tests pass" claim with no command run behind it is exactly the failure this closes. A skip-to-pending path keeps the commit BLOCKED unless force-commit is explicit and logged. |
| `/gabe-push` | Push, PR, CI watch, and environment promotion — env-aware via `.kdbp/PUSH.md`. | ![gabe-push](assets/icons/cmd-push.png) Pasted CI output required (a pending ⏳ run is never treated as a ✅ pass) plus a Step 6.7 deploy-verify smoke probe against the live target — CI can go green while the deployed app is dead, and this step is the check that would have caught it. |

## Setup — run once per project

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-init` | Initializes a project with the KDBP stack — creates `.kdbp/`, installs hooks, configures by project type. | ![gabe-init](assets/icons/cmd-init.png) Missing-anchor STOP for hook JSON: hook objects are read verbatim from `~/.claude/templates/gabe/hooks.json`; if that template is absent, init stops hook installation and reports it rather than composing hook JSON from memory — the worst-case failure mode being a hallucinated, destructive write to a project's `settings.json`. |

## Learning — run after commits

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-teach` | Consolidates the human's architect-level understanding of recent changes — organizes topics under **gravity wells** (the project's recurring architectural sections, e.g. auth, data layer), explains with analogies, verifies with **Socratic questions** (questions that check understanding by making the human explain it back, not just recognize it), tracks status in `.kdbp/KNOWLEDGE.md`. | ![gabe-teach](assets/icons/cmd-teach.png) Answer-key grading gate: each Q1/Q2 pair is generated alongside a hidden expected-answer key; the human's answer is scored against that key, not against plausibility, and an uncertain call always rounds the score *down* (never up) — because an inflated "verified" row poisons `KNOWLEDGE.md` for every future session that trusts it. |

:::note Where this comes from
Each gate above is one of the 47 revisions ratified in the 2026-07 hardening pass (42 KEEP, 5 REVISE, 0 KILL) — see [Per-skill hardening reference](reference.html) for the full change log and [Why weak models drift](drift.html) for the incidents that motivated each one.
:::

## Session continuity — run when wrapping up

Added after the 2026-07 hardening pass, `/gabe-handoff` is the deliberate counterpart to the automatic session summary. When a session is ending — or context is filling up toward a compaction — it captures what the mechanical transcript scrape can't: intent, the decisions made, and the exact next move.

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-handoff` | Ends a session cleanly: emits a paste-able next-session **resume prompt** (inline plus a singleton `.kdbp/HANDOFF.md`) and syncs durable `.kdbp/` state — a `HANDOFF` entry in `LEDGER.md`, in-flight items into `PENDING.md`, and the `PLAN.md` phase cells — so a fresh session, or a different model, resumes mid-phase without a hand-off conversation. | ![gabe-handoff](assets/icons/cmd-handoff.png) Sync-to-observed-reality with per-cell evidence gates — it only ticks a `PLAN.md` cell backed by a cited command, commit sha, or `git` fact, never fabricates a ✅, and never runs the commit/push gates (it records reality, it doesn't create it). The counterweight to the lossy automatic summary that would otherwise tell the next session to redo finished work. |

:::note Why it's separate from the loop
The loop's four-column tick is already a checkpoint (see [The development loop](the-loop.html) § the cadence rule). `/gabe-handoff` is for the messier reality — a session ending mid-task, with intent and half-finished work the tick alone doesn't capture. It writes the resume prompt so the *next* session starts from an accurate plan, not a lossy summary.
:::

## Every command at a glance

The full surface — all 22 commands, grouped. The **core loop**, **setup**, **learning**, and **session-continuity** commands are detailed above; the **analysis satellites** have their own [page](satellites.html); the **scope-evolution** and **utility** rows are documented by this index line (their full specs live in the command files themselves).

| Command | Group | What it does | Full write-up |
| --- | --- | --- | --- |
| `/gabe-scope` | Core loop | Authors `SCOPE.md` + `ROADMAP.md` — the stable premise and the phase plan | above |
| `/gabe-plan` | Core loop | Breaks a goal into phases, each with a tier decision, into `PLAN.md` | above |
| `/gabe-next` | Core loop | Zero-logic router over the `PLAN.md` status cells | above |
| `/gabe-execute` | Core loop | Implements the phase's tasks under the task + reuse contract | above |
| `/gabe-review` | Core loop | Risk-priced review with interactive triage | above |
| `/gabe-commit` | Core loop | The commit quality gate — CHECK 1–9 | above |
| `/gabe-push` | Core loop | Push, PR, CI watch, deploy-verify | above |
| `/gabe-init` | Setup | Lays down `.kdbp/` + the hooks, by project type | above |
| `/gabe-teach` | Learning | Consolidates understanding into `KNOWLEDGE.md` | above |
| `/gabe-handoff` | Session continuity | Resume prompt + evidence-gated `.kdbp/` sync | above |
| `/gabe-roast` | Analysis satellite | Adversarial gap review from a chosen perspective | [satellites](satellites.html) |
| `/gabe-myopic` | Analysis satellite | Short-sighted-user walkthrough — foresight traps, overwhelm, recall, no-undo | [satellites](satellites.html) |
| `/gabe-health` | Analysis satellite | Structural health — god files, churn, coupling, bugs | [satellites](satellites.html) |
| `/gabe-debt` | Analysis satellite | Architecture decision-debt scan with AP citations | [satellites](satellites.html) |
| `/gabe-assess` | Analysis satellite | Change impact — blast radius, maturity scope, prerequisites | [satellites](satellites.html) |
| `/gabe-align` | Analysis satellite | Values guardian — pre-flight checks + auto-checkpoint | [satellites](satellites.html) |
| `/gabe-scope-change` | Scope evolution | Router — classifies a scope change → addition or pivot | this index |
| `/gabe-scope-addition` | Scope evolution | Additive scope — new REQs / phases / refs, same premise | this index |
| `/gabe-scope-pivot` | Scope evolution | Direction change — archives `SCOPE.md` v{N}, opens v{N+1} | this index |
| `/gabe-help` | Utility | Context-aware guide — scans state, suggests the next command | this index |
| `/gabe-lens` | Utility | Cognitive translation — analogies, maps, constraint boxes | this index |
| `/gabe-mockup` | Utility | Mockup / UX workflow — static, React Storybook, and design-ref modes | this index |
