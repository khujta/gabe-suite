---
name: gabe-health
description: "Codebase health analysis — god files, churn hotspots, coupling clusters, bug concentration, and scope creep vs plan. Run before epics, during retros, or when things feel fragile. Usage: /gabe-health [focus]"
when_to_use: "How healthy is the codebase, are we accumulating mess — god files, churn hotspots, coupling clusters, bug concentration, scope creep vs plan; before epics, during retros, when things feel fragile."
context: fork
agent: Explore
metadata:
  version: 1.1.0
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

The six analyses: (1) God Files — touched in >25% of commits, (2) Churn Hotspots — most lines modified, (3) Coupling Clusters — files that always change together (>60% co-change), (4) Bug-Fix Concentration — where `fix:`/`bug` commits cluster, (5) Scope Creep — planned vs actually-touched files, (6) Deferred Items & Maintenance Staleness — `.kdbp/PENDING.md` and `.kdbp/MAINTENANCE.md` health.

## Procedure

1. Treat any text after the invocation as `$ARGUMENTS` (a focus keyword or a path).
2. Read `references/health-spec.md` IN FULL before executing — the binding spec. If missing, E6 applies — STOP.
3. Resolve the lookback window (`--days`, default 60) and threshold (`--threshold`, default 5).
4. Run every git-log detection command needed for the requested analysis (or all six for full mode) — every number in the report must come from a command executed THIS run.
5. For Scope Creep, resolve the plan source in priority order (`.kdbp/PLAN.md` active phase → `.planning/phases/*/PLAN.md` → `docs/plans/*.md` → `docs/brainstorms/*-requirements.md`) and diff against `git diff --stat`.
6. For Deferred Items, read `.kdbp/PENDING.md` and `.kdbp/MAINTENANCE.md` if `.kdbp/` exists; skip silently otherwise.
7. Apply the severity legend (🔴/⚠️/✅ thresholds per analysis) and render the requested mode: full report (all applicable analyses + summary) or single-analysis mode (just the requested check).

## Output contract (summary)

Full mode: a `📊 GABE HEALTH` header (period, commit count, files touched) followed by each analysis section, then a Summary with critical/watch/stable counts and one suggested next action. Single-analysis mode renders only the requested section. Any analysis whose command didn't execute this run prints `<analysis> skipped` — never an estimate. The full output contract in the spec is binding.
