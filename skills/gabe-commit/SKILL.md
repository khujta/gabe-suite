---
name: gabe-commit
description: "Commit quality gate — deterministic checks (incl. the >800-line size-budget check), interactive triage, defer/accept/fix per finding, evidence-triggered simplify pass, and retroactive docs-audit mode for accumulated documentation drift. Usage: /gabe-commit [commit message] | /gabe-commit docs-audit"
when_to_use: "Commit, save, checkpoint, ship this work, run the quality gate before committing — any request to record completed work in git in a KDBP project; also docs-audit for accumulated documentation drift."
metadata:
  version: 2.1.0
---

# Gabe Commit — commit quality gate

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Deterministic commit quality gate. Runs checks (lint, types, tests, coverage, shape, deferred items, doc drift, structure), shows findings by severity, and lets the human act on each — defer, accept, or fix. Most actions cost zero tokens; LLM involvement (commit-message generation, simplify pass) is explicit and opt-in. Also supports a retroactive `docs-audit` subcommand for accumulated documentation drift that per-diff checks missed.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/gate-spec.md` (in this skill directory) IN FULL before executing — it is the binding spec: deterministic checks, triage flow, commit message rules, PLAN auto-tick, LEDGER writes, and the docs-audit subcommand. If it is missing, E6 applies — STOP.
3. Summary of the spec's main flow:
   - **Step 0** — dispatch: `$ARGUMENTS` starting with `docs-audit` jumps to Step A (docs-audit mode); otherwise `$ARGUMENTS` is the commit message and normal flow (Steps 1–6) runs.
   - **Step 1 / 1b** — validate git context; surface the active plan (context only).
   - **Step 2** — run deterministic checks: CHECK 1 Lint, CHECK 2 Types, CHECK 3 Tests (commands resolved via Step 2.0, never guessed), CHECK 4 Coverage (enterprise/scale maturity only), CHECK 5 Shape (active when >30 source files AND >2000 lines), CHECK 6 Deferred, CHECK 7 Doc Drift (4 layers: universal safe cards, DOCS.md pattern matching, gravity-well docs drift, mockup INDEX freshness), CHECK 8 Structure (requires STRUCTURE.md).
   - **Step 3** — assign severity to findings.
   - **Step 4** — present results.
   - **Step 5** — execute actions per finding (defer/accept/fix).
   - **Step 6** — commit + record to LEDGER.md; maturity-driven check selection governs which checks apply.
   - **Step A (docs-audit)** — A1 gather universe, A2 DOCS.md audit, A3 well-docs audit, A4 orphaned-doc detection, A5 source-coverage gap detection, A6 render report + interactive triage, A7 action handlers, A8 log to LEDGER.md, A8.5 notable-updates digest, A9 closing summary.
   - Commit message body structure, generation rules, model routing (Sonnet for conceptual changes, Haiku for mechanical/dep-bump), and override; scope-edit audit when SCOPE.md (including its `## Phases` section) is in the diff.

## Simplify tier (runs with the gate)

- Alongside the gate's deterministic checks, run `scripts/size-budget.sh` (this skill): WARN when a touched file is, or newly crosses, >800 first-party lines; generated files (by header) exempt; recorded split seams from `.kdbp/RULES.md`/`.kdbp/PENDING.md` printed with the WARN. Exit 2 = warnings present. A WARN never blocks the commit by itself — it enters triage like any other finding.
- When the check WARNs, when the phase touched a known monolith, or on request: OFFER the quality-only simplify pass per `references/simplify-pass.md` (reuse · simplification · efficiency — never bug-hunting).

## Evidence + docs discipline (runs with the gate, WARN-and-LOG stage)

- `scripts/evidence-freshness.sh` (this skill): when the current phase carries a non-null `proof` (PLAN.json), the newest artifact under the manifest's `proof_root` must be at least as new as the newest staged source change — stale/missing evidence WARNs and appends one line to `.kdbp/archive/evidence-bypass.log`. Never blocks; promotion to blocking is a Wave-2 decision made from that log. Convention: `../gabe-docs/references/evidence-doctrine.md`.
- `scripts/docs-budget.sh` (this skill): WARN on staged NEW `.md` files outside the allowed homes (`.kdbp/**`, files registered in `.kdbp/DOCS.md`) and on any new dated-name md (no dated throwaways — augment the living doc in place). Never blocks. Both WARNs enter triage like any other finding.

## Output contract (summary)

Present findings grouped by severity with a clear per-finding action prompt (defer/accept/fix); never silently skip a check — a skipped check prints an enumerated reason, not silence. On commit, write the LEDGER.md thin-index row and any PLAN auto-tick (with its PLAN.json mirror) in the same turn (E5). Emit the visible `**Gabe-Lens brief**` (commit-shaped, output-only — never written to PLAN.md/REVIEW.md/LEDGER.md/PENDING.md/docs, except when the commit-message generator already owns that body). Docs-audit mode is read-only for git and leaves any proposed file changes unstaged for the human to commit normally. The full output contract in the spec is binding.

End every normal-flow run with a single deterministic `NEXT: /gabe-push` line — the routing contract; no other suggestions.
