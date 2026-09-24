---
name: gabe-health
description: "The suite scanner, three lenses — codebase health (god files, churn hotspots, coupling, bug concentration, scope creep), decision-debt (absorbed from gabe-debt: decisions never made explicitly or silently contradicting), and the skill-estate sweep (usage-based promote/archive proposals, always ask-first)."
when_to_use: "How healthy is the codebase, are we accumulating mess, unexplained complexity, before a big refactor or epic, during retros — or at a production push, as its scan gate."
context: fork
agent: Explore
metadata:
  version: 1.3.0
---

# Gabe Health — Codebase Health Analysis

## Gabe execution contract (E1–E7)

This skill runs under the suite execution contract — E1 EVIDENCE · E2 RUN-BEFORE-✅ · E3 NO SILENT DOWNGRADE · E4 REUSE FIRST · E5 STATE SYNC · E6 MISSING ANCHOR = STOP · E7 REPORT WHERE — floors, not ceilings; a skill's own gate may be stricter, never looser. Full text: `../gabe-docs/references/execution-contract.md` (if that file is missing, E6 applies — STOP).

## What this does

Surfaces structural fragility in a codebase before it becomes an incident — the files that break every sprint, the modules that always change together, and the gaps between what was planned and what was actually touched. This is NOT a code review (use `/gabe-review`) and NOT a design critique (use `/gabe-roast`); it's the X-ray before the surgery. Read-only: never modifies files, never blocks commits or PRs, does not require `.kdbp/` to exist.

## Usage / modes

```
/gabe-health                    # Full analysis (all 6 checks)
/gabe-health hotspots           # Churn hotspots only
/gabe-health coupling           # Coupling clusters only
/gabe-health fragile            # Bug-fix concentration only
/gabe-health gods               # God files only
/gabe-health scope              # Plan vs actual (requires GSD or CE plan)
/gabe-health deferred           # Deferred items + maintenance staleness
/gabe-health [path]             # Analyze a specific directory
```

Optional flags: `--days N` (lookback window, default 60 days), `--threshold N` (minimum commits to flag, default 5).

The six analyses: (1) God Files — touched in >25% of commits, (2) Churn Hotspots — most lines modified, (3) Coupling Clusters — files that always change together (>60% co-change), (4) Bug-Fix Concentration — where `fix:`/`bug` commits cluster, (5) Scope Creep — planned vs actually-touched files, (6) Deferred Items & Maintenance Staleness — `.kdbp/PENDING.md` health plus `.kdbp/MAINTENANCE.md` if a legacy copy is present (retired from the default KDBP inventory in A2). Analyses 1–4 exclude `.kdbp/**` (lifecycle bookkeeping — analysis 6 covers it); 1–3 also drop mass commits (>200 files, named in the header) and paths gone from HEAD.

## Decision-debt lens (absorbed from gabe-debt, 2026-07-30)

`/gabe-health debt` — scan SCOPE + PLAN + code + commit history + retrospectives for decisions that were never made explicitly or that silently contradict each other, citing AP evidence (`templates/architecture-principles.md`). Same read-only discipline as the other lenses. In KDBP projects, open with `mcp__gabe-kdbp__kdbp_snapshot` — the phase table, the open PENDING rows, the last LEDGER rows and the DECISIONS row count in one read — then open the four KDBP surfaces (DECISIONS.md, SCOPE.md §14, RULES.md, PENDING.md) the findings target; proposed, never auto-written from the fork. Deep spec: `references/debt-spec.md` — read it IN FULL before running the lens (missing → E6, STOP); it installs with this skill (moved from the archived gabe-debt, which `install.sh` never ships).

## Estate-sweep lens (new, 2026-07-30 — ask-first, never auto)

`/gabe-health estate` — the lazy-promotion rack model applied to the skill estate: (a) PROMOTE — did recent work produce a repeated behavior worth promoting to a skill? (b) ARCHIVE — is an installed skill long-unused (no invocations across a stated window) and a candidate for `skills/_archive/`? Both directions produce PROPOSALS presented to the human with the evidence (usage counts, window, inbound references); nothing is created or archived without an explicit yes. The binding rules — scope (suite-managed skills only; a user-level skill is never proposed), one-pass invocation evidence over the transcript-retention window, HARD code/route references force KEEP, description-loaded skills judged by invocations not references, pointers removed in the same change — live in `references/health-spec.md` §Estate-sweep lens. LIVE as the PRODUCTION-push gate since 2026-07-31: /gabe-push Step 3.7 dispatches the full three-lens scan on terminal-env and --epic pushes, presents findings, and asks proceed/hold.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (a focus keyword or a path).
2. Read `references/health-spec.md` IN FULL before executing — the binding spec. If missing, E6 applies — STOP.
3. Resolve the lookback window (`--days`, default 60) and threshold (`--threshold`, default 5).
4. Run every git-log detection command needed for the requested analysis (or all six for full mode) — every number in the report must come from a command executed THIS run.
5. For Scope Creep, resolve the plan source in priority order — `.kdbp/PLAN.md` active phase via `mcp__gabe-kdbp__phase_context` (it returns the phase's declared `scope` globs, its `Cases:`/`Reach:` records and a capped excerpt of the phase section, so the file references come from a parsed record rather than a hand read; honest-empty without `.kdbp/`) → `.planning/phases/*/PLAN.md` → `docs/plans/*.md` → `docs/brainstorms/*-requirements.md` — and diff against `git diff --stat`. The globs are a FLOOR: a file named in the phase prose but outside `scope` still counts as planned.
6. For Deferred Items, ask `mcp__gabe-kdbp__kdbp_snapshot` first — its `pending` block gives open/closed counts and the top 10 rows sorted by priority then Times Deferred, closure-aware (a `<!-- P<n> resolved -->` comment counts as closed, not just a Status verdict) — then read `.kdbp/PENDING.md` for the full priority tally and row ages, which the snapshot does not carry; skip silently when `.kdbp/` is absent. Also read `.kdbp/MAINTENANCE.md` if a legacy copy is present (retired from the default KDBP inventory in A2) — skip that sub-check silently when absent.
7. Apply the severity legend (🔴/⚠️/✅ thresholds per analysis) and render the requested mode: full report (all applicable analyses + summary) or single-analysis mode (just the requested check).

## Output contract (summary)

Full mode: a `📊 GABE HEALTH` header (period, commit count, files touched) followed by each analysis section, then a Summary with critical/watch/stable counts and one suggested next action. Single-analysis mode renders only the requested section. Any analysis whose command didn't execute this run prints `<analysis> skipped` — never an estimate. The full output contract in the spec is binding.
