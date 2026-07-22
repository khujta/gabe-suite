---
name: gabe-plan
description: "KDBP-aware planning with lifecycle management + tier decision per phase (MVP/enterprise/scale) and optional HTML review artifacts for complex decisions. Usage: /gabe-plan [goal] [--full-catalog] [--html-artifact|--no-html-artifact]"
when_to_use: "Plan, phases, KDBP plan, tier decision, break down this goal — create, update, check, complete, defer, cancel, or replace .kdbp/PLAN.md."
metadata:
  version: 2.5.2
---

# Gabe Plan — KDBP-aware planner

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

KDBP-aware planner. Same planning logic as `/plan`, but persists to `.kdbp/PLAN.md` with lifecycle management plus a per-phase tier decision (MVP / Enterprise / Scale) rendered as a trade-off matrix. Every PLAN.md write also writes the `.kdbp/PLAN.json` machine mirror (phases, cells, tier, per-phase `proof:` field) in the same turn — read by session hooks and deterministic tooling. For complex plans it also creates a self-contained HTML review artifact as the human-facing entrypoint, while `.kdbp/PLAN.md` stays canonical.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/plan-spec.md` (in this skill directory) IN FULL before executing — it is the binding spec: subcommand dispatch, tier-decision flow, PLAN.md write format, DECISIONS/LEDGER writes, and the shared auto-tick helper. If it is missing, E6 applies — STOP.
3. Summary of the spec's main flow:
   - **Step 0** — subcommand dispatch on first token of `$ARGUMENTS`: `check` → Step CHK (structural compliance + retrofit); `update` → Step UPD (modify active plan in place); `complete`/`defer`/`cancel`/`replace` → Step 1 branches; anything else is treated as a goal.
   - **Step 0 (validate KDBP)** — require `.kdbp/`, ensure `archive/` and `PLAN.md` exist.
   - **Step 0.5 (preset dispatch)** — parses `--html-artifact`/`--no-html-artifact`/`--html-path`; `--preset=mockup-project` emits the canonical 13-phase mockup template (Step 3.PRESET) instead of free-form planning, then still runs the per-phase tier decision.
   - **Step 1** — if an active plan exists, offer complete/defer/cancel/continue/replace; `continue` stops here.
   - **Step 2** — gather context from `.kdbp/BEHAVIOR.md` (maturity, domain, tech); ask for the goal if none given.
   - **Step 3** — draft the phase list; user confirms.
   - **Step 3.5** — tier decision per phase (MVP/Enterprise/Scale): assemble the trade-off matrix from `templates/gabe/tier-sections/*` (Core always renders unfiltered; `--full-catalog` skips the Layer-2 LLM dimension filter), render the decision prompt, user picks a tier, log to DECISIONS.md (including per-dim tier overrides and suppressed dimensions), store tier + overrides in PLAN.md.
   - **Step 3.75** — decide whether to create the HTML review artifact (`--html-artifact` forces, `--no-html-artifact` disables, otherwise complexity heuristics decide).
   - **Step 4** — write `.kdbp/PLAN.md` (Goal, Context, Phases table, Phase Details, Current Phase, Dependencies, Risks, Notes, Review Artifacts, Runtime Evidence Checkpoints); **Step 4b** — write the `.kdbp/PLAN.json` machine mirror in the same turn.
   - **Step 5** — append one PLAN row to the LEDGER.md thin session index.
   - **Step 6** — archive mechanics for complete/defer/cancel/replace.
   - **Step 7** — show the result.
   - **Step CHK** (`/gabe-plan check`) — zero-LLM structural compliance check of the active plan against the current spec shape, with a retrofit offer (LLM only fires if retrofit needs content generation).
   - **Shared auto-tick helper** — used by `/gabe-execute`, `/gabe-review`, `/gabe-commit`, `/gabe-push` to tick the Phases table's Exec/Review/Commit/Push column; idempotent, never silent on mismatch, always prints an enumerated skip code on precondition failure.

## Output contract (summary)

Write `.kdbp/PLAN.md` with the full section set (Goal/Context/Phases/Phase Details/Current Phase/Dependencies/Risks/Notes/Review Artifacts/Runtime Evidence Checkpoints), the `.kdbp/PLAN.json` machine mirror, and the corresponding LEDGER.md thin-index row in the same turn (E5). Tier decisions, per-dim overrides, and suppressed dimensions get a DECISIONS.md entry with a stated reason. Emit the output-only `**Gabe-Lens block**` — never written to PLAN.md/REVIEW.md/LEDGER.md/PENDING.md/commits/docs unless another command already owns that write. When an HTML review artifact is created or refreshed, report its path. The full output contract in the spec is binding.

End every run with a single deterministic `NEXT: /gabe-execute` line (the phase's Exec command) — the routing contract; no other suggestions.
