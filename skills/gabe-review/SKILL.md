---
name: gabe-review
description: "Code review with risk pricing, confidence scoring, interactive triage, and deferred item tracking. Also checks plan alignment (is this diff on-scope?), detects stale verified topics, and proposes DECISIONS.md entries for architectural changes. Surfaces the cost of NOT fixing each finding. Usage: /gabe-review [target] or /gabe-review deferred"
when_to_use: "Review this diff/PR/phase/commit before merging — risk-priced findings with triage; also plan alignment ('is this on-scope?'), stale verified topics, deferred-item follow-up."
metadata:
  version: 1.5.0
---

# Gabe Review — Code Review with Risk Pricing

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## Codex Command Bridge

Running under Codex → read `references/codex-bridge.md` now — it confirms this skill directory is the complete contract in every host (no separate command wrapper) and that command-time output contracts (Gabe-Lens block rendering, REVIEW.md reconciliation, mode-specific skips) live in `references/review-spec.md`.

## What this does

Review code changes and price every finding — what it costs to fix now, what it costs to ignore, and what you're betting by deferring. Track deferred items across reviews and escalate when the same gap gets kicked down the road.

This is NOT a generic checklist review. Every finding gets a **Defer Risk** (consequence + probability) and a **Maturity Gate** (MVP/Enterprise/Scale). The output is a risk matrix with a **Review Confidence Score** that lets humans make informed ship/defer decisions — and an interactive **Triage** loop (fix now / defer / dismiss / skip, per-finding or bulk) to resolve findings on the spot.

> **Rendering note.** Output wrapped in bare triple-backtick fences is a spec-meta delimiter — render as plain markdown at runtime (tables render as tables), not monospace code. Tagged fences (```bash, ```diff, etc.) stay fenced. See `../gabe-docs/references/docs-spec.md` § "Runtime output rendering convention".

## Usage / modes

| Mode | Target | What happens |
|---|---|---|
| (no args) | Resolved via KDBP plan + LEDGER, else `git diff HEAD` | Full review + confidence score + triage |
| `brief` | same resolution | Findings + score + verdict only (final, no triage) |
| `fix` | same resolution | Full review, then triage with "Fix all" pre-selected |
| `deferred` | none | Deferred-item dashboard (Risk Dashboard) + triage |
| `inbox` | same resolution | Writes live `.kdbp/REVIEW.md` only, no triage — for cross-CLI handoff |
| `post-review` | external review output | Ingests CE:review / BMad / ECC findings — see `references/post-review.md` |
| `<file>` / `<folder>` | explicit path | Reviews that scope directly, bypassing target resolution |

**Maturity** (MVP / Enterprise / Scale — decides which severities block merge) resolves in order: explicit `--maturity` arg → `.kdbp/BEHAVIOR.md` → ask the user → default MVP. Never auto-detected from test count or CI presence — it's a human decision.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/review-spec.md` IN FULL before executing — the binding spec for target resolution, dimension scoring, tier-drift detection, plan alignment, confidence scoring, and triage. If missing, E6 applies — STOP.
3. Resolve target (KDBP-plan-first, git-diff fallback) and maturity, then score the diff across review dimensions (security, data integrity, error handling, test coverage, runtime evidence, logic, tier drift, performance, style), pricing each finding with Fix Cost + Defer Risk + Maturity Gate + churn annotation.
4. Compute the Review Confidence Score (0-100) with fix-tier projections. When a KDBP plan is active, render the Plan Alignment sub-checks (phase compliance, stale verified topics, architectural-decision candidates, tier drift), then render the output-only Gabe-Lens block.
5. Offer Triage (severity × maturity matrix, shared next-action menu, custom expressions, one-by-one loop) — skipped in `brief`/`inbox`/`deferred`/`close`/`discard` modes. Persist deferred items to `.kdbp/PENDING.md`; archive `.kdbp/REVIEW.md` and always append a LEDGER trace on completion.
6. Cross-agent collision: an existing `.kdbp/REVIEW.md` from a DIFFERENT CLI than the current run → read `references/merge-mode.md` now (blind-first triangulation — never a silent overwrite).
7. `post-review` arg → read `references/post-review.md` now.

## Output contract (summary)

Full mode renders, in order: Findings table → Risk Dashboard → Coverage Confidence → Review Confidence (score + fix-tier projections) → Provisional Verdict (APPROVE/WARNING/BLOCK) → Session Estimate → Gabe-Lens block → Triage → Final Verdict. `brief` mode renders only Findings + score + verdict (final — triage isn't offered). `fix` mode auto-selects "Fix all" in triage. `deferred` mode renders the Risk Dashboard with confidence-cost per item.

Verdict floors: BLOCK on any CRITICAL, 2+ escalated deferrals, VERY LOW coverage, a maturity-gate overrun, or confidence < 50. WARNING on HIGH findings within tolerance, LOW coverage, or confidence 50-69. APPROVE requires zero CRITICAL, no above-gate escalated deferrals, coverage ≥ MEDIUM, and confidence ≥ 70.

The full output contract in the spec is binding.
