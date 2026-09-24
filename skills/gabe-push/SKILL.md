---
name: gabe-push
description: "Push, PR, CI watch, promotion — env-aware shipping via .kdbp/PUSH.md; detects remote drift, offers branch cleanup. Terminal-env and --epic pushes run the production gates: /gabe-health three-lens scan, findings presented, ONE blocking proceed/hold question that mints the gate marker the machine-wide push-gate-guard hook requires — a raw terminal push without it fails closed."
when_to_use: "Push, deploy, promote, ship to staging/production, babysit a pipeline after committing."
metadata:
  version: 2.7.0
---

# Gabe Push — env-aware shipping workflow

**Usage:** `/gabe-push [env-name] [--epic] [--reconfigure]`

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Env-aware shipping. One command pushes local work to the configured target env, or promotes what's already on a pre-prod env (e.g., `staging`) up to the next env (e.g., `main`/`production`). Config lives in `.kdbp/PUSH.md`; first run interviews for envs (production-only, staging-then-prod, or custom N-env), subsequent runs honor the config until `/gabe-push --reconfigure`. Every run detects remote branch drift and offers cleanup of the source branch after a successful push.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS`.
2. Read `references/push-spec.md` (in this skill directory) IN FULL before executing — it is the binding spec: PUSH.md setup, env resolution, drift detection, push/PR/CI logic, DEPLOYMENTS.md capture, bookkeeping auto-commit, and branch cleanup. If it is missing, E6 applies — STOP.
3. Summary of the spec's main flow:
   - **Step 1** — validate `gh` CLI + auth + git remote; read `.kdbp/PUSH.md` if present; open `mcp__gabe-kdbp__kdbp_snapshot` once for the branch/ahead/dirty, PLAN row and open PENDING rows the later steps otherwise re-derive — orientation only, the git commands still decide.
   - **Non-interactive defaults** — when no human answer is available, safety-critical prompts (uncommitted changes, direct-push-to-target, CI failure) default to abort/stop, never proceed.
   - **Step 2** — first-run setup: detect remote/default-branch/CI provider/PR template, ask the deploy pattern (production-only / staging-then-prod / custom), scaffold envs, ask `branch_cleanup` policy per env, write `.kdbp/PUSH.md`. `--reconfigure` clears and re-runs this step.
   - **Step 2.5** — resolve which env this invocation targets from `$ARGUMENTS` (default env, named env, or interview for an unknown env).
   - **Step 2.7** — remote branch drift detection every run: diff current remote branches against known set, prompt per unrecognized branch (`ignore-once`/`ignore-always`/`register-as-env`/`delete-remote`/`abort`), persist non-transient decisions.
   - **Step 3–4** — determine push source (promote from `promote_from` vs push local HEAD), pre-flight checks, then push. A promotion follows the env's `promotion_mode`: `direct` (remote-to-remote push, the default) or `pr-merge` (PR → checks → `gh pr merge`, Step 6.5 — proposed at setup when the target's branch protection requires a PR).
   - **Step 5** — create or update the PR (skipped for direct pushes to the target branch or a `direct` remote-to-remote promotion; in `pr-merge` mode the promotion IS the PR).
   - **Step 6** — CI watch, non-blocking, up to 75s (5 polls × 15s); on failure offers `details`/`logs`/`auto-fix`/`assess`/`ignore`; `⏳` is never treated as `✅`.
   - **Step 6.7** — deploy verify: live-target smoke probe is the closing evidence, not CI-green alone.
   - **Step 7** — final summary; promotion to a further env only happens on a separate invocation (never recurses across envs).
   - **Step 7.5 / 7.5b** — append a row to `.kdbp/DEPLOYMENTS.md` (deterministic aggregation, zero LLM) and run the operational-decision classifier (Haiku, trigger-gated on CI-config/infra/deploy-config changes, rollback commits, trunk-first pushes, skipped promotions) with interactive triage.
   - **Step 8** — record to `.kdbp/LEDGER.md` (row composed with `mcp__gabe-kdbp__ledger_row_preview`, `entry: PUSH`; a PREVIEW — the write stays a harness Write/Edit so the D7 hooks see it).
   - **Step 8.5** — auto-commit post-push bookkeeping (PUSH.md/DEPLOYMENTS.md/LEDGER.md/DECISIONS.md/PENDING.md writes) as a local, unpushed commit through the normal hook chain — never `git add -A`, never a hook bypass.
   - **Step 9** — retired (was a legacy `/gabe-teach topics` suggestion; the skill is archived and KNOWLEDGE.md left the default inventory — always a no-op now).
   - **Step 10** — auto-tick the `Push` column in PLAN.md via the shared auto-tick helper (`/gabe-plan`'s "Shared: auto-tick phase column"), only when push succeeded, CI is green, the env is the configured final environment, and promotion reached the final link; prints the decision record before ticking or skipping.
   - **Step 10.5** — branch cleanup prompt (delete/keep/always/never) after a successful push, skipped for promotion pushes and direct-to-target pushes.

## CI babysitting (runbook)

For long CI runs after push, a mechanical watch loop may babysit the pipeline instead of holding the session open — ONLY where the project's verification gates are in place; unattended auto-mode without verification is not allowed. Use `/loop` (e.g. `/loop 4m check CI on <branch> and report`) for watch-and-report only; auto-fix loops are appropriate only where the phase has runtime-journey proof in place (PLAN.json `proof`).

## Output contract (summary)

End with the `GABE PUSH COMPLETE` summary block (env, source, target, PR url or `—`, CI status) and a `Bookkeeping:` line reporting whether the bookkeeping commit happened. All state writes (PUSH.md, DEPLOYMENTS.md row, LEDGER.md entry, PLAN.md Push tick, PENDING.md/DECISIONS.md from the operational classifier) land in the same turn as the action they record (E5); a skipped Push tick prints the full decision record, never a silent skip. Safety-row prompts never silently default to proceed. The full output contract in the spec is binding.

Emit the shared beat brief (`**Gabe-Lens brief**` — ENTITY / FEATURE / DID, stated once in `../gabe-docs/references/execution-contract.md` §"The beat brief") just before the E8 tail; output-only, never persisted.

## Closing — the beat tail (E8)

End every run with the three-part beat tail, specified ONCE in
`../gabe-docs/references/execution-contract.md` §"The beat tail (E8)": `NOW:`/`NEXT:` rendered
from `node ${ECC_ROOT:-$HOME/.claude}/skills/gabe-next/scripts/next.mjs --json` (or the honest
`NEXT: blocked — <reason>` override when this beat knows the router's answer is stale) · the
conditional `CENTER:` pointer · the PULSE line last, verbatim, silent when silent.
