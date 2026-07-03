## How they fit together

Nine commands, three groups. The **core loop** (scope → plan → next → execute → review → commit → push) is the spine a project rides from first idea to shipped commit — `/gabe-next` is a pure router that reads `.kdbp/PLAN.md` and tells you which of the others to run next, so in practice you rarely choose manually. **Setup** is `/gabe-init`, run once per project to lay down `.kdbp/` and the hooks that make the rest of the suite legible. **Learning** is `/gabe-teach`, run after commits to turn the diff into understanding the human can actually recall later, rather than a blob of code they approved and forgot. Every command in all three groups sits under the same E1–E7 execution contract (see [The E1–E7 contract](contract.html)) — the gates below are each command's specific tightening of that shared floor.

:::note How to read "key gate"
These are not the only things each command does — they're the specific mechanism the hardening added or hardened, the one that turns a claim ("tests pass," "reviewed," "reused") into something that has to be demonstrated on screen before the command can proceed.
:::

## The core loop — scope → plan → next → execute → review → commit → push

This is the path every unit of work travels. Each step reads state the previous step wrote and writes state the next step will read — the chain is what makes `.kdbp/` a reliable memory instead of a pile of notes.

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-scope` | Authors `SCOPE.md` (the stable premise) and `ROADMAP.md` (the phase plan) for a new project or a scope change, one checkpoint-gated step at a time. | Strict checkpoint gating — every major step needs explicit user approval before the next runs, and final assembly reads the *current on-disk* files first: anything the human edited outside a `[PENDING APPROVAL]` marker is treated as final and diffed before any overwrite, so a session can never silently clobber a human edit. |
| `/gabe-plan` | Creates or updates the phase plan in `.kdbp/PLAN.md` — the row-per-task table every other command reads. | Per-phase template discipline: Types column plus Scope / References / Acceptance / Checkpoint fields, so `/gabe-execute`'s reads always find the same field names. Auto-tick cross-checks the phase footer and uses enumerated skip codes instead of silently ticking the wrong row. |
| `/gabe-next` | Zero-logic router — reads `.kdbp/PLAN.md` state and dispatches to whichever command comes next. No judgment, no side effects beyond the command it routes to. | Prior-row sweep: always prints any owed Review/Push debt from earlier phases before advancing — so incomplete prior work stays visible at every routing decision instead of getting buried under the current phase. |
| `/gabe-execute` | Implements the current phase's tasks from `.kdbp/PLAN.md`, checkpointing at commits. | TASK CONTRACT + REUSE LEDGER gate — quote the task text verbatim, classify it, and print a reuse verdict *before* any Write or Edit. Pairs with a persistent per-task checklist in `PLAN.md` (state survives a session dying) and a T[i] VERIFY evidence block, so "verification ✅" is unprintable without an executed command in front of it. |
| `/gabe-review` | Risk-priced code review with interactive triage, confidence scoring, and plan-alignment checking. | Mandatory verify/kill pass (Step 4.4) with a per-finding Evidence line — an absence claim ("no tests for X") needs search proof, not confidence talk. Closes both triage bypasses (a skipped CRITICAL, a mid-triage exit) so either path auto-defers instead of vanishing. |
| `/gabe-commit` | The commit quality gate — CHECK 1–9, deferred scan, doc drift — that stands between a diff and `git commit`. Never use raw `git commit`. | Executed-evidence CHECK gates: every check resolves a real command, shows the evidence row and a 3-state glyph (✅ / ❌ / ⤫ skipped-with-reason), and a hardcoded "tests pass" claim with no command run behind it is exactly the failure this closes. A skip-to-pending path keeps the commit BLOCKED unless force-commit is explicit and logged. |
| `/gabe-push` | Push, PR, CI watch, and environment promotion — env-aware via `.kdbp/PUSH.md`. | Pasted CI output required (a pending ⏳ run is never treated as a ✅ pass) plus a Step 6.7 deploy-verify smoke probe against the live target — CI can go green while the deployed app is dead, and this step is the check that would have caught it. |

## Setup — run once per project

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-init` | Initializes a project with the KDBP stack — creates `.kdbp/`, installs hooks, configures by project type. | Missing-anchor STOP for hook JSON: hook objects are read verbatim from `~/.claude/templates/gabe/hooks.json`; if that template is absent, init stops hook installation and reports it rather than composing hook JSON from memory — the worst-case failure mode being a hallucinated, destructive write to a project's `settings.json`. |

## Learning — run after commits

| Command | Purpose | Key gate it enforces |
| --- | --- | --- |
| `/gabe-teach` | Consolidates the human's architect-level understanding of recent changes — organizes topics under gravity wells, explains with analogies, verifies with Socratic questions, tracks status in `.kdbp/KNOWLEDGE.md`. | Answer-key grading gate: each Q1/Q2 pair is generated alongside a hidden expected-answer key; the human's answer is scored against that key, not against plausibility, and an uncertain call always rounds the score *down* (never up) — because an inflated "verified" row poisons `KNOWLEDGE.md` for every future session that trusts it. |

:::note Where this comes from
Each gate above is one of the 47 revisions ratified in the 2026-07 hardening pass (42 KEEP, 5 REVISE, 0 KILL) — see [Per-skill hardening reference](reference.html) for the full change log and [Why weak models drift](drift.html) for the incidents that motivated each one.
:::
