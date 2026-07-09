---
name: gabe-execute
description: "Execute the current phase of .kdbp/PLAN.md — implement tasks, checkpoint at commits, write Exec column state. Interactive commit checkpoints by default; auto mode with --auto-commit. Usage: /gabe-execute [task|all|<phase-number>] [--auto-commit] [--dry-run]"
when_to_use: "Implement the phase, continue the plan, keep going, do task N — execute the current KDBP phase's tasks under its tier cap with checkpoint commits and the escalation gate."
metadata:
  version: 2.1.0
---

# Gabe Execute — phase implementation runner

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Executes phase tasks from `.kdbp/PLAN.md`. Complements `/gabe-plan` (write plan) and `/gabe-commit` (quality gate) — this is the **implementation** step: reads the plan, writes code, checkpoints at commit boundaries (user-gated by default, `--auto-commit` batches), and advances Exec state. Default scope is the single Current Phase; `task` runs one task only, `all` runs remaining phases autonomously, `<N>` jumps to phase N.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/execute-spec.md` (in this skill directory) IN FULL before executing — it is the binding spec: task decomposition, tier-cap enforcement, escalation gate, commit invocation, deviation handling, and phase-complete invariants. If it is missing, E6 applies — STOP.
3. Summary of the spec's main flow:
   - **Step 0** — parse args (empty/`task`/`all`/`<N>`/`--auto-commit`/`--dry-run`); preconditions: `.kdbp/` exists, PLAN.md is active with an `Exec` column; project-type preflight redirects `mockup` plans (and mockup-typed phases of `hybrid` plans) to `/gabe-mockup` instead of proceeding.
   - **Step 1** — load execution context: Current Phase row (name, tier, complexity, Exec state, per-dim tier overrides from Phase Details YAML), BEHAVIOR.md maturity/execute mode, PENDING.md open items for this phase's files, tier-cap heuristics, and a deterministic classification of whether runtime journey evidence (and staging proof) is required for this phase's types.
   - **Step 2** — decompose the phase into tasks via deterministic heuristics first (comma/semicolon-separated actions, distinct Scope files, multiple References specs), falling back to Haiku only when heuristics yield <2 or >10 tasks; prune tasks above the effective tier unless justified; append a mandatory runtime-journey-evidence task when required.
   - **Step 3** — tick Exec ⬜ → 🔄.
   - **Step 4** — execute tasks one at a time with per-task verification.
   - **Step 4.1** — mid-phase tier escalation gate: fires on user request, a task genuinely needing a higher-tier pattern, or a drift signal; requires a mandatory one-sentence reason, updates PLAN.md's Tier cell, appends a Tier escalation entry under the phase's DECISIONS.md D-entry, reinstates pruned tasks, and logs a thin-index row to LEDGER.md. De-escalation is not supported mid-phase.
   - **Step 4.5** — commit checkpoint: MUST invoke `/gabe-commit` inline (raw `git commit` prohibited) so CHECK 6/7/8, the LEDGER thin-index row (findings/deferred/size-budget), PENDING.md updates, the teach suggestion, and the Commit-column auto-tick all fire; CRITICAL findings block advancing to the next task; confirms the Commit cell actually ticked before continuing.
   - **Step 5** — commit message enrichment (gabe-lens brief + before/after).
   - **Step 6** — deviation handling: structural deviations halt with an `update-plan`/`split-task`/`skip-task`/`abort` prompt; minor deviations are recorded in the checkpoint commit body and counted in the EXEC LEDGER row's deviations cell, and execution continues.
   - **Step 7** — phase complete: verifies the runtime-journey-evidence invariant (artifact paths must exist on disk, checked via `ls`, not claimed in prose) and the Commit-column invariant before ticking Exec 🔄 → ✅ via the shared auto-tick helper.
   - **Step 8** — interrupts/resume: an aborted phase stays `🔄`; the next invocation reads completed/remaining tasks from the PLAN.md tasks block, never from session memory.
   - Model routing: Haiku for decomposition fallback and deviation classification, Sonnet for implementation and conceptual commit messages. Non-goals: does not replace `/gabe-commit` or `/gabe-review` (invokes/surfaces via them), does not auto-push, does not write architectural docs.

## Output contract (summary)

Report per-task progress (files changed, verification result, commit hash) and end each phase with the Phases-table state line (`EXEC: … REVIEW: … COMMIT: … PUSH: …`) plus a `Next:` pointer (typically `/gabe-review` or `/gabe-next`). Emit the output-only `**Gabe-Lens block**` and `**Gabe-Lens brief — Platform progress**` — never written to PLAN.md/REVIEW.md/LEDGER.md/PENDING.md/commits/docs unless another command already owns that write. All state writes (Exec ticks, DECISIONS.md escalations, PLAN.json proof mirrors, LEDGER.md thin-index rows) happen in the same turn as the action they record (E5); a skipped write prints an enumerated skip code, never silence. The full output contract in the spec is binding.

End every completed-phase run with a single deterministic `NEXT: /gabe-review` line (checkpoint commits run inline via /gabe-commit) — the routing contract; no other suggestions.
