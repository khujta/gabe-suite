# Deliverable 10 — Step 0.5a Executed: Code Audit + the `/gabe-simplify` Verdict

- **Executed:** 2026-07-09 (first plan step run, on the operator's go). Read-only on both projects; findings recorded here — landing the backlog into each twin's `PENDING.md` happens in the implementation pass.
- **Method:** deterministic sweep (full >800-line first-party census, 90-day churn, generated-file verification) + one read-only auditor per twin classifying every flagged file by *reading it* (generated / test / config / dead-surface / cohesive-but-long / true-monolith), verifying duplication by opening both sides. Raw: `output/raw/code_audit_05a.json`.

## 1. Measurements

| | gustify | gastify |
|---|---|---|
| First-party files over the projects' own 800-line hard cap | 32 | 31 |
| …of which **generated** (verified headers/codegen scripts) | 4 (api-types, taxonomy.py, mockupAssets, generatedCatalogIcons) | 3 (api-types ×2 byte-identical web/mobile, docsite.config.py) |
| …**test / config / reference data** | 5 | 5 |
| …**dead surface** | 6 archive-spike files, **~9,862 lines**, zero importers | 4 files in the abandoned `frontend/` tree (~5,400 lines) |
| …**cohesive-but-long** (one concern, honest length) | 6 | 5 |
| …**true-monolith** (mixed concerns, nameable seams) | **4** | **2** |
| Size×churn intersection | **RecipeFilterPanel.tsx: 2,881 ln · 72 commits/90d** (top-churn file in the repo); Browse 1,286/50; CookingScreen 2,146/48; DetailScreen 2,563/41; ScreenModel 2,456/40; ProfileScreens 3,805/29 | i18n.ts 1,706/60; scan_worker 998/20; transactions API 947/18 |
| Verified duplication | 3 instances (byte-identical `get*HistoryAgeInDays` pair; `getDietaryTagOption` reimplemented; 5 pantry-location labels hardcoded twice) | minor only (regex vocabularies; intentional codegen copies; design-lab vs web divergence is the port model working) |
| **Auditor verdict** | **material-accumulated-complexity** | **moderate-localized** |

The gustify signature is the important part: monoliths **keep growing at high churn** (the filter panel absorbed 72 commits without anyone splitting it), and small helpers get **re-implemented instead of shared** — growth without cross-checking. That is precisely what a lifecycle checkpoint can catch and what a one-time cleanup cannot prevent from recurring.

## 2. The verdict on `/gabe-simplify`

**It goes — in the evidence-shaped form, not the originally proposed one.**

- The skeptic's kill of the **standalone always-loaded wrapper** stands: demand-side evidence is still zero, and gastify's supply-side is moderate. A new always-on surface remains unjustified.
- The supply-side evidence (one twin material; growth-at-churn signature) justifies a **tiered simplify gate inside `gabe-commit`** — the operator's own alternative form from the original proposal:
  1. **Deterministic size-budget check** (script, runs with the commit gate): any touched file that is, or newly crosses, >800 first-party lines → visible WARN naming the file and, where RULES/audit recorded them, the split seams. Generated files (by header) exempt. Zero model cost, zero friction on clean commits.
  2. **Triggered simplify pass** (the built-in `/simplify` shape: parallel quality-only agents — reuse, simplification, efficiency; never bug-hunting): offered when the size-budget warns, when a phase touched a known monolith, or on demand. Evidence-triggered, not every commit — the Evidence Doctrine's importance-scoping applied to code quality.
- **In the B2 end state** this lands as part of the `gabe-commit` skill (the check in its skill-scoped hooks/scripts, the pass documented in its `references/`), so it adds **zero** new always-loaded surface.
- **Re-open trigger for a standalone skill:** if Wave-2 re-measurement shows the tier firing constantly (i.e., it deserves its own lane), promote it then — with usage numbers.

## 3. One-time cleanup backlog (→ each twin's PENDING.md at implementation time)

**gustify** (from the auditor's verified seams):
1. Split `ProfileScreens.tsx` (3,805) → DishHistoryScreen, IngredientHistoryScreen, NotificationsScreen, SettingsScreen (+SubscriptionPanel) — four unrelated screens in one file.
2. Split `RecipeFilterPanel.tsx` (2,881; 72 c/90d) → per-facet files + `savedFilterLookup.ts` + `buildRecipeFilterFacets.ts`. (Notably it correctly reuses FilterFlow — R1 compliant; the problem is scope, not missing abstraction.)
3. Split `CookingScreenModel.ts` (2,456) → types / taxonomy / mockData / recipeFiltering / measurementUnits.
4. Decompose `RecipeBrowseContainer.tsx` (1,286; a single 1,140-line function, 60 hooks) into the six hooks its own header comment already names.
5. Extract the 3 duplicated helpers to shared modules.
6. Delete (or move out of `src/`) the 6 zero-importer `*.archive.tsx` files (~9.9K lines); drop dead `MiCocinaScreen` aliases.

**gastify:**
1. Split `prompt_lab/statement/report.py` (3,214; ~85 functions: orchestration + diffing + reconciliation + artifact I/O + rendering).
2. Split `statement_routing.py` (1,368).
3. Decide `frontend/`'s fate (T9 — 938 files, dead since 2026-05-31, includes 4 of the 31 over-cap files); remove the dead `check-prod-bundle.sh` that points at it.

**Explicitly not actioned:** the cohesive-but-long files (11 across both twins) — honest length, splitting would be churn for its own sake. Named so nobody "cleans" them reflexively.

## 4. Plan effects

- 0.5a: **done** (this document). `/gabe-simplify` question: **resolved — tiered gate in gabe-commit; standalone wrapper stays dead** with a Wave-2 re-open trigger.
- Deliverable 9 (migration plan): gabe-commit's B2 row gains the size-budget script + triggered simplify pass.
- Target state: commit gate picture updated accordingly; god-file growth added to the payoff table.
- The cleanup backlog above rides the implementation pass (PENDING rows + ordinary phases), not this investigation.
