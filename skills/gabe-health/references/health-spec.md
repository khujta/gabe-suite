# Gabe Health — full spec (split)

> Split from this skill's SKILL.md (B2 skills-only migration, 2026-07-09). This file is the
> binding spec; the SKILL.md core is a summary. E1–E7: see `../../gabe-docs/references/execution-contract.md`.

## When to Use

**Use when:**
- Starting a new epic or milestone — know where the minefields are before walking in
- During retrospectives — "why did this sprint feel fragile?"
- After a production incident — "was this a one-off or is this area inherently unstable?"
- Before major refactoring — "which files should I split/stabilize first?"
- When things just feel fragile but you can't articulate why

**Don't use when:**
- Reviewing a specific diff (use /gabe-review)
- Looking for bugs in code (use /gabe-roast qa)
- Checking alignment with values (use /gabe-align shallow)

---

## The 5 Analyses

### 1. God Files

Files touched in >25% of PRs/commits in the lookback window. These are coupling magnets — every feature has to edit them.

**Detection:**
```bash
# Count commits per file in last N days
git log --since=N.days --name-only --format="" | sort | uniq -c | sort -rn | head -20
# Compare against total commit count
git log --since=N.days --oneline | wc -l
```

**Output:**
```
God Files (touched in >25% of commits, last 60 days):
  🔴 <path> — <X>/<Y> commits (<Z>%)
     Suggest: Extract responsibilities. Consider /gabe-roast architect on this file.
  ⚠️ <path> — <X>/<Y> commits (<Z>%)
     Borderline. Monitor.
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 2. Churn Hotspots

Files with the most modifications in the lookback window, regardless of PR count. High churn often means the design isn't stable — it keeps needing adjustment.

**Detection:**
```bash
# Lines added+removed per file
git log --since=N.days --numstat --format="" | awk '{files[$3]+=$1+$2} END {for(f in files) print files[f], f}' | sort -rn | head -20
```

**Output:**
```
Churn Hotspots (most modifications, last 60 days):
  🔴 <path> — <N> lines churned across <M> commits
  ⚠️ <path> — <N> lines churned across <M> commits
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 3. Coupling Clusters

Files that always change together. If A and B are co-modified in >60% of commits that touch either, they're coupled — changes to one likely require changes to the other.

**Detection:**
```bash
git log --since=N.days --name-only --format=--- | python3 -c '
import sys, itertools, collections
commits=[set(filter(None,c.strip().split("\n"))) for c in sys.stdin.read().split("---") if c.strip()]
pair=collections.Counter(); tot=collections.Counter()
for c in commits:
    for f in c: tot[f]+=1
    for a,b in itertools.combinations(sorted(c),2): pair[(a,b)]+=1
for (a,b),n in pair.most_common(20):
    d=min(tot[a],tot[b]); print(f"{n}/{d} ({100*n//d}%)  {a} <-> {b}")'
```

Report a pair ONLY with counts copied from this run's output. If the command did not execute this run, print `coupling analysis skipped` — never estimate or reuse the example percentages below.

**Output:**
```
Coupling Clusters (>60% co-change rate):
  <fileA> ↔ <fileB> — co-changed in <N>/<M> commits (<Z>%)
    Risk: Change one, must test both. Missing test in either = hidden breakage.

  <fileC> ↔ <fileD> — co-changed in <N>/<M> commits (<Z>%)
    Below threshold but close. Watch.
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 4. Bug-Fix Concentration

Where do `fix:` and `bug` commits cluster? If 60% of bug fixes touch the same directory, that module is structurally fragile.

**Detection:**
```bash
# Find fix/bug commits and their file distribution
git log --since=N.days --oneline --grep="fix" --grep="bug" --name-only --format="" | sort | uniq -c | sort -rn
```

**Output:**
```
Bug-Fix Concentration (where fixes cluster, last 60 days):
  🔴 <dir>/ — <N> of <M> fix commits (<Z>%)
     Top files: <path> (<n>), <path> (<n>)
     Pattern: [one-sentence summary of the fragile core]

  ⚠️ <dir>/ — <N> of <M> fix commits (<Z>%)
     Top files: <path> (<n>)
```

Examples are FORMAT ONLY — never reuse their names or numbers.

### 5. Scope Creep (Plan vs Actual)

Compare what was planned (from GSD phase plan or CE brainstorm) against what files were actually changed. Surfaces unplanned work and missed scope.

**Detection:**
- Read the plan, first match wins: `.kdbp/PLAN.md` (active phase block — extract file references from Scope/Description) → `.planning/phases/*/PLAN.md` → `docs/plans/*.md` → `docs/brainstorms/*-requirements.md`. Print the source used in the section header (`Scope Creep — Phase 3 (source: .kdbp/PLAN.md)`); if none found: `no plan found (searched 4 paths) — skipping scope analysis`.
- Extract file references from the plan
- Run `git diff --stat [base-branch]..HEAD` to get actual changed files
- Compare: planned vs touched, unplanned touches, planned but untouched

**Output:**
```
Scope Creep — Phase 3 (Recipe Detail View):
  Planned: 6 files | Touched: 9 files | Unplanned: 4 files | Missed: 1 file

  Planned and touched:
    ✅ src/pages/RecipeDetailPage.tsx
    ✅ src/components/RecipeCard.tsx
    ✅ src/services/recipes.ts
    ✅ src/stores/recipeStore.ts
    ✅ src/types/recipe.ts

  Unplanned (touched but not in plan):
    ⚠️ functions/src/rateLimiter.ts — why? Refactoring unrelated to recipe detail
    ⚠️ functions/src/suggestRecipes.ts — pulled in by rateLimiter coupling
    ⚠️ src/services/pantry.ts — 3 lines changed (minor, likely acceptable)
    ⚠️ firestore.staging.rules — shared infra, cross-app risk

  Planned but untouched:
    ❌ functions/src/recipeDetail.ts — was this dropped from scope?

  Suggest: Review unplanned touches. If rateLimiter refactor was necessary,
  it should have been a separate PR (V3 — Ship Small).
```

### 6. Deferred Items & Maintenance Staleness

Track the health of deferred technical decisions and maintenance obligations.

**Detection:**
- Read `.kdbp/PENDING.md` — count open items by priority
- Read `.kdbp/MAINTENANCE.md` — check "Last completed" date against today
- Flag items approaching escalation (Times Deferred >= 2)

**Output:**
```
Deferred Items — .kdbp/PENDING.md:
  Open: 3 items (1 critical, 1 high, 1 medium)
  ⚠️ D2 approaching escalation (deferred 2x, next defer → priority bump)
  Oldest open: D1 (45 days) — coverage gap in classify.py

Maintenance — .kdbp/MAINTENANCE.md:
  Last completed: 2025-10-01 (198 days ago)
  ⚠️ Overdue — quarterly checklist not completed in 180+ days
  Suggest: Review MAINTENANCE.md checklist items
```

**Skip if:** `.kdbp/` directory doesn't exist.

---

## Output Format

### Severity legend + evidence gate

- Churn: 🔴 >300 lines or top-10% · ⚠️ >100 · ✅ below. Fix concentration: 🔴 ≥50% of fix commits in one dir · ⚠️ ≥20%. God files: 🔴 >25% of commits · ⚠️ ≥20%. Coupling: 🔴 >60% co-change.
- Every number in the report is copy-pasted from command output produced THIS run. The header `Commits: [total]` from `git log --since=N.days --oneline | wc -l` is the checksum — if you cannot produce it, the analysis did not run; print `<analysis> skipped`, never an estimate.

### Full Mode (default)

```
📊 GABE HEALTH — [Project Name]
   Period: last [N] days | Commits: [total] | Files: [unique files touched]

[1. God Files]
[2. Churn Hotspots]
[3. Coupling Clusters]
[4. Bug-Fix Concentration]
[5. Scope Creep (if plan exists)]
[6. Deferred Items & Maintenance (if .kdbp/ exists)]

Summary:
  🔴 Critical: [count] god files, [count] fragile modules
  ⚠️ Watch: [count] coupling clusters, [count] churn hotspots
  ✅ Stable: [list of stable areas]

  Top risk: [one-sentence summary of where the codebase is most fragile]
  Suggest: [one action — e.g., /gabe-roast architect functions/src/]
```

### Single Analysis Mode

When invoked with a focus (e.g., `/gabe-health coupling`), only that analysis runs.

---

## Integration with Gabe Suite

| Health finding | Suggested action |
|----------------|-----------------|
| God file detected | `/gabe-roast architect [file]` — structural review to plan decomposition |
| Coupling cluster | `/gabe-assess` — evaluate whether to decouple now or accept the coupling |
| Bug-fix concentration | `/gabe-review` on that area — price the risk of current state |
| Scope creep | `/gabe-align shallow` — values alignment check on unplanned work |
| High churn + hot file in next PR | `/gabe-review` will show 🔴 HOT churn flag — extra scrutiny on defer decisions |

---

## When to Run

| Moment | Why |
|--------|-----|
| Before starting a new epic/milestone | Know where the minefields are |
| During sprint retrospective | "Why did this sprint feel fragile?" — data-backed answer |
| After a production incident | "Is this area inherently unstable?" |
| Before major refactoring | "Which files should I split/stabilize first?" |
| Monthly cadence | Track health trends over time |

This is NOT a per-commit tool. Run it periodically for strategic insight.

---

## What This Does NOT Do

- Does NOT review code (use /gabe-review or /gabe-roast)
- Does NOT check values alignment (use /gabe-align)
- Does NOT block commits or PRs (purely analytical)
- Does NOT require `.kdbp/` to exist (works on any git repo)
- Does NOT modify any files (read-only analysis)
