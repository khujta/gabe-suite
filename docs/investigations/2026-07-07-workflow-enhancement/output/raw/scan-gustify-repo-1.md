			# Gustify Repo Scan — Storybook, KDBP, Reuse & Test Infrastructure

Repo root: `/home/khujta/projects/apps/gustify` (git repo, commits span **2026-04-23 → 2026-07-08**, active today — uncommitted changes present at scan time).

---

## 1. Storybook Setup

**Config location:** `apps/web/.storybook/`
- `apps/web/.storybook/main.ts` — `@storybook/react-vite` framework, `stories: ["../src/**/*.stories.@(ts|tsx)"]`, addons `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest`. Vite aliases mirror the app's path aliases (`@app`, `@auth`, `@design-system`, `@features`, `@i18n`, `@layout`, `@lib`, `@routes`, `@store`, `@shared`).
- `apps/web/.storybook/preview.ts` — global `ConfirmProvider` decorator, `layout: "fullscreen"`, a11y `test: "todo"`.

**Scripts** (`apps/web/package.json`): `storybook` (dev :6006), `build-storybook`, `test-storybook` (vitest project), plus custom smoke scripts `check:token-classes`, `check:mockup-baseline`, `test:storybook-navigation`, `test:storybook-live-loading`.

**Story count:** **107** `*.stories.tsx` files under `apps/web/src/**` (none in `.ts`, all `.tsx`). Zero stories elsewhere in the repo.

**Naming/title conventions** (from `title:` in story exports):
- Design system: `Design System/Atoms/<Name>`, `Design System/Molecules/<Name>`, `Design System/Organisms/<Name>` (8 atoms, 21 molecules incl. `useConfirm`/`ToastProvider`, 4 organisms — `AppShell`, `FilterFlow`, `FullSurfaceSheet`, plus a `.rangeGlyph.test.tsx`).
- Production features: `Features/<Area>/Screens/<Name>` and `Features/<Area>/Components/<Name>` — selected, "settled" UI.
- Spikes: `Lab/<Name>` (e.g. `Lab/Match Score (how the % is calculated)`, `Lab/Signal Deck (flavor + hierarchy)`, `Lab/Card Effort v4 (seam bar)`). RULES.md R9 explicitly bans `Playground`/`Layout Options`/`Spike`/`Height Options`/`Responsive Layouts` labels in **active** `Features/*` story names — that vocabulary is reserved for the `Lab/*` namespace.
- File suffix convention: active exploratory work is `*Spike.tsx` + `*Spike.stories.tsx`; retired/settled work is renamed `*.archive.tsx` (no `.stories.` — so Storybook stops indexing it) and moved to a `spikes/archive/` subfolder.

**Spike-related directories** (all under `apps/web/src/features/*/spikes/` or `design-system/assets/spike/`), with git first/last-commit evidence:

| Dir | Contents | First seen | Notes |
|---|---|---|---|
| `apps/web/src/features/cooking/spikes/` | 8 active spike subfolders (`atencion-dedicacion`, `avoid-exclude`, `card-info`, `deck-explore`, `detail-signals`, `flavor-octagon`, `mark-overlay`, `recipe-steps`, `time-effort`, `tone-wash`) + `archive/` (14 `.archive.tsx` files) | archive material from ~2026-05; active spikes dated 2026-06-22 → 2026-07-08 | **20 active `*.stories.tsx` files currently live under `spikes/**`** — see §3 for why this contradicts RULES.md R4 |
| `apps/web/src/features/settings/spikes/` | `archive/` (5 `.archive.tsx`) + `equipment/EquipmentInContextSpike.stories.tsx` | equipment spike is **untracked (new, uncommitted)** as of the scan | actively being graduated to production right now (see §3) |
| `apps/web/src/features/profile/spikes/`, `home/spikes/`, `pantry/spikes/`, `shopping/spikes/` | each holds only `archive/*.archive.tsx` | — | fully retired, nothing active |
| `apps/web/src/design-system/assets/spike/` | 4 icon-style subfolders (`bold`, `flat-retro`, `ingredient`, `rich`, `simple`) × 5 PNGs each | — | icon-style spikes, not component spikes |
| `docs/rebuild/ux/archive/spikes/` | `README.md` + `2026-05-27-final-feature-spike-archive.md` | 2026-05-27 | canonical **spike graveyard ledger** — table of old `Features/*/Spikes/*` story names → why retired → replacement screen/component |

**`docs/mockups/`** (legacy static-HTML mockup track, pre-React-Storybook era):
- First committed 2026-04-23 ("initial rebuild"), phases landed 2026-04-26–27, most recent touch 2026-06-16 (`docs(scope-atlas)` decisions doc).
- Structure: `atoms/`, `molecules/`, `screens/` (mobile/tablet/desktop triples), `icons/`, `styles/*.prompt`, `v0/gustify_v0.jsx`, `assets/` (tokens.css, generated-icons, reference-icons), `CREDITS.md`, `INDEX.md`, `MOCKUP-PLAN-LEGACY.md`.
- **`docs/mockups/playful-geometric/`** — the selected visual style, dated 2026-04-23 → 2026-06-16:
  - `screens/` — 30 canonical HTML screens (`playfulgeometric-*.html`, Spanish names — home, pantry, cooking, recipe-detail, etc.)
  - `flows/` — 6 flow diagrams (`flow-01-first-cook.html` … `flow-06-preparados.html`) + `index.html`
  - `explorations/` — 5 non-canonical HTML explorations (icon styles/iterations, typography, login-icons, taste-variations) + `briefs/` (markdown decision briefs + one Python analysis script, `analyze-fork-consolidation.py`)
- RULES.md **R2** forbids adding *new* static HTML to `docs/mockups/**` — "New Gustify mockup work belongs in `apps/web` and Storybook." Legacy HTML is reference-only.
- `tests/mockups/` is a separate Playwright suite that still exercises this legacy HTML tree (see §4) — it is a smoke harness for the frozen reference, not active design work.

---

## 2. `.kdbp/` Directory

Root: `/home/khujta/projects/apps/gustify/.kdbp/`. Files, size, last-commit date, and summary:

| File | Size | Last commit | Summary |
|---|---|---|---|
| **PLAN.md** | 64K / 402 lines | 2026-07-06 (working tree dirty as of scan) | Active KDBP plan for "5 resolved Scope-Atlas future features" — 16 numbered phases (SAFE, SENS-schema/backfill/surface, PROG-engine/trees/flavor/decay, MIXING, SCHEMA-ENRICH, VAR-lineage/diff, AVOID-EXCLUDE, EXPL-BADGE, N1/N2 UX) plus an active **U1–U5 "Recipe-Flow Clarity" UX workstream**. Dense narrative log of what shipped to staging/prod, commit hashes, and founder decisions. Currently on Phase **U4** (planned-recipes home). This is the de-facto execution source of truth — far more current/detailed than ROADMAP.md. |
| **SCOPE.md** | 52K / 431 lines | 2026-04-27 | Stable backbone: one-liner, problem statement, reference-frame table (10 refs, incl. `docs/rebuild/REBUILD-BRIEF.md`, ADRs, LESSONS.md, VALUES.md), success criteria, non-goals, REQs. Untouched since the initial scoping session — changes only flow through `/gabe-scope-change`, none recorded since. |
| **DECISIONS.md** | 232K / 1,103 lines, **94 decision rows (D1–D94+)** | 2026-07-05 | Architecture Decision Record table: date, decision, rationale, alternatives, status, review trigger. Covers everything from mockup-phase tiering (D1–D15) to dietary-profile modeling, D86 "wire don't rebuild — extract + reuse the showcase, never rebuild simpler," D87 StickyActionBar, D90 sticky bottom-nav. Actively growing — most recent entries (D142 area) cover the Recipe-Flow Clarity UX workstream. |
| **RULES.md** | 16K / 136 lines | 2026-06-01 | 11 "scar-tissue" rules (R1–R11) specifically for React Storybook mockup discipline: reuse `FilterFlow` (R1), no new static HTML (R2), frame-safe overlays (R3), **archive inactive spikes out of active Storybook (R4)**, reuse design-system geometry (R5), full-surface sheet coverage (R6), Perfil-first nav (R7), shared nav contracts (R8), selected-state story taxonomy — no `Playground`/`Spike` labels active (R9), executable token classes (R10), Gustify/Gastify runtime separation (R11). Each rule cites its evidence + a `Detection` grep/command. |
| **PENDING.md** | 132K / 98 dated finding rows | 2026-07-06 | Deferred-item ledger from `/gabe-review`, `/gabe-handoff`, etc. **63 open, 55 resolved/closed** (some rows carry multiple tags). Ranges from cosmetic mockup asset issues (2026-04-25) to the current-session note (#96, 2026-07-06) parking subscription/monetization until after full-app polish. |
| **PUSH.md** | 4K / 47 lines | 2026-06-02 | `/gabe-push` config: remote `origin` → `Brownbull/gustify.git`, pattern `[2] staging-then-prod` (staging branch → promote to `main`), CI = `github-actions`, env table for `staging`/`production`. |
| **KNOWLEDGE.md** | 12K / 90 lines | 2026-04-27 | `/gabe-teach` human-knowledge map: 7 Gravity Wells (G1 Mockups & Design System … G7 Ops & Infra) all showing **0/0/0 verified/pending/total topics** except a handful under G1 (T1–T4, mostly `skipped`). No storyline generated. Effectively a scaffold that was set up once (2026-04-26/27) and never revisited despite 2.5 months of subsequent shipped work. |
| **HANDOFF.md** | 8K / 37 lines | 2026-07-06 | Singleton, most-recent-session handoff (generated 2026-07-07 per its own header, last git-tracked 2026-07-06): resume prompt for the U4 phase, state snapshot, runbook (dev/verify/deploy commands), gotchas (shared-branch file ownership warnings), "after that" list. |
| **STRUCTURE.md** | 16K / 204 lines | 2026-07-05 | Allowed-file-location glob table used by `/gabe-commit` CHECK 9 and a PostToolUse drift hook. Enumerates every legit path under `apps/api`, `apps/web/src/**` (design-system, features, showcase, i18n, `__regression__`, layout, lib, hooks, stores/queries legacy), `shared/`, `docs/`, `tests/`, `scripts/`. |
| **ENTITIES.md** | 16K / 157 lines | 2026-06-04 | Project-noun glossary (User, Household, HouseholdMember, CatalogItem, Receipt, PantryItem, StorageLocation, Recipe, ExploreSuggestion, …) created 2026-04-27 at mockup Phase 4, referenced by `docs/mockups/INDEX.md` §4 CRUD matrix and backend data-model phases. |
| **ROADMAP.md** | 28K / 281 lines | 2026-06-03 | 7-phase high-level plan (Foundation, Pantry Bridge, AI Pipeline, Progression, …) with `phases_complete: 0`, all phases still `pending` per its own header. **Stale relative to PLAN.md** — PLAN.md shows 16 numbered phases plus a 5-phase UX workstream already shipped, while ROADMAP.md's phase table has not been reconciled to reflect any of that progress. |
| **DEPLOYMENTS.md** | 152K / 192 lines (very long rows) | 2026-06-30 | `/gabe-push` Step 7.5 deploy log — one row per push event (date, branch→target, PR, CI result, notes, operational decisions). |
| **LEDGER.md** | **1.3M / 10,457 lines** | 2026-07-06 (git); working tree active to **2026-07-08 19:24** | Append-only session ledger. Top-level entries are narrative "PHASE X" writeups (commands run, files touched, verification); tail is a raw per-tool-call activity log (`YYYY-MM-DD HH:MM | Edit | <path>`) — currently mid-edit on `RecipeFilterPanel.tsx`, `EquipmentSettingsSection.tsx`, and `EquipmentInContextSpike.stories.tsx` at scan time (see §3). By far the largest KDBP file. |
| **VALUES.md** | 4K / 10 lines | 2026-06-25 | 5 project values (V1–V5): enforce Pydantic output structure, stream AI progress via SSE/WS, route models by cost, measure every AI run, edit-parity-with-create. |
| **BEHAVIOR.md** | 4K / 32 lines | 2026-04-24 | One behavior rule (B1 — "inventory before proposing"): mandates reading `.kdbp/PLAN.md`/`SCOPE.md`/`STRUCTURE.md`/`ROADMAP.md` before answering exploratory questions; born from a 2026-04-24 incident of restating already-done analysis. |
| **DOCS.md** | 4K / 47 lines | 2026-04-26 | Source-pattern → doc-target mapping table used by `/gabe-commit` CHECK 7 (doc drift): e.g. `apps/api/models/*.py` → `docs/architecture.md`§Data Model (critical); most `apps/web/**` and `.kdbp/**` patterns are explicitly `skip`. |
| **MAINTENANCE.md** | 4K / 12 lines | 2026-04-24 | Quarterly checklist (rotate secrets, review PENDING items >60 days, audit KNOWLEDGE.md wells, etc.) — untouched since init, no evidence it's been run. |
| **DEVIATIONS.md** | 8K / 16 lines | 2026-06-03 | Table of scope-correction/signature-change/latent-bug-fix/env-blocked deviations from plan, all dated 2026-06-03 (a single dense session) — e.g. `RecipeDetailResponse.restriction_codes` type mismatch caught by a new test, a Docker Postgres verification workaround. |
| **MOCKUP-VALIDATION.md** | 8K / 151 lines | 2026-04-28 | One-time automated a11y/layout validation run (2026-04-28T14:24Z) against the legacy mockup screens — 24 findings, all `warn`, all still `pending` (image-overflow on nav icons across viewports). Never re-run since. |
| `.kdbp/archive/` | 248K | — | Two completed-plan archives: `completed_PLAN_2026-06-01_mockup-storybook-baseline.md`, `completed_PLAN_2026-06-21_gustify-product-build.md`; plus `tombstones/scope-session-2026-04-24.json`. |
| `.kdbp/research/archive/2026-04-24/` | 36K | — | Dated research snapshot from the initial scoping session. |
| `.kdbp/reviews-archive/` | 156K, 16 files | 2026-04-25 → 2026-06-04 | Resolved `/gabe-review` reports, one per phase, e.g. `REVIEW_2026-06-04_phase36-preclient-hardening_resolved.md`. |
| `.kdbp/scope-references.yaml` | 4K / 67 lines | — | Machine-readable form of the SCOPE.md §0 reference-frame table. |

**Currently uncommitted (`git status --short .kdbp/`):** `DECISIONS.md`, `HANDOFF.md`, `LEDGER.md`, `PLAN.md` are all modified right now — the session that produced this scan state is mid-flight.

---

## 3. Component Conventions & Spike→Production Evidence

**Production component homes** (per `.kdbp/STRUCTURE.md` + directory scan):
- `apps/web/src/design-system/{atoms,molecules,organisms}/` — 8 atoms, 21 molecules, 4 organisms. Shared, cross-feature UI primitives.
- `apps/web/src/features/<area>/{components,screens,model}/` — nine feature areas: `auth`, `cooking`, `home`, `me`, `pantry`, `profile`, `recipes`, `settings`, `shopping`. This is where real screens/components live; `model/` subfolders hold pure logic extracted from spikes (see below).
- `apps/web/src/flows/` — cross-feature "connected journey" stories (`Flows/App`, `Flows/Cooking`).
- `apps/web/src/showcase/` — deliberately **outside** `features/`/`design-system/` so nav-taxonomy/correspondence gates don't treat it as a live screen (e.g. `showcase/safety/` — Avisos/disclaimer draft components, marked "MARKED-FOR-REVISION").
- No top-level `components/` directory; there is no ambiguity between a generic `components/` bucket and features — everything is feature- or design-system-scoped, per Atomic Design conventions.
- Total non-story/non-test `.ts(x)` under `apps/web/src`: **308**. Stories: 107. `.archive.tsx`: 29. Active non-story spike source files: 15.

**The house convention is explicit and documented twice:**
- `CLAUDE.md` (root) §"Reuse first": "before building anything, scan for and reuse the existing module/component/service... Front-end component & Storybook reuse rules → `apps/web/CLAUDE.md`."
- `apps/web/CLAUDE.md` (24 lines, nested, auto-loads under `apps/web/`) — annotated as `<!-- learned 2026-06-30 via /claude-md learn from repeated founder corrections... "why are we trying to recreate everything in the storybook / use the components we have" -->`. States: "UI/Storybook changes are SPIKE-FIRST and reuse the REAL production components — never re-author a stand-in shell (a `FooCardShell` mimicking `FooCard` is a DEFECT)." Names five real components to reuse (`ExploreSuggestionCard`, `RecipeFilterPanel`, `CookingScreen`, `ExploreModeSelector`, `RecipePager`) and says spikes live under `features/<area>/spikes/**` with `Lab/*` titles.
- This is backed by **DECISIONS D86** ("wire don't rebuild") — 2026-06-06: a first build of an onboarding screen dropped the Storybook chrome but rebuilt a *simpler* functional version instead of reusing the actual designed showcase component; the corrected pattern is that the functional screen renders the showcase component itself with additive optional props, "byte-identical when the prop is absent." D87/D90 extend the same discipline to sticky-footer/sticky-nav live-mode behavior.
- **RULES.md R4** codifies the lifecycle: spikes get archived (`*.archive.tsx`, moved to `spikes/archive/`) once a decision is settled, with a detection command `find apps/web/src/features -path '*/spikes/*' -name '*.stories.tsx'` that "should normally return no output after the 2026-05-27 consolidation pass."

**Concrete evidence of spikes actually being lifted to production:**
1. **`docs/rebuild/ux/archive/spikes/2026-05-27-final-feature-spike-archive.md`** — a table of ~11 retired spike story surfaces (`Cooking Planning Playground`, `Recipe Card Layout Playground`, `Recipe Creation Playground`, `Recipe Filter Playground`, `Dish History Playground`, `Shopping List Playground`, etc.), each row naming the replacement live screen/component (e.g. Recipe Filter Playground → `Design System/Organisms/Filter Flow` + `Features/Cooking/Components/Recipe Filter Panel`).
2. **`flavor-octagon` graduation (commit `5ab983f1`, 2026-07-01, "spike(cooking): settle flavor-octagon spike + promote its modules to model/")** — moved three pure spike modules (`flavorModel.ts`, `flavorRanking.ts`, new `footerTones.ts`) out of `spikes/flavor-octagon/` into `apps/web/src/features/cooking/model/`, explicitly so production code could import them without depending on spike code. Confirmed real consumers: `RecipeMetadataSignals.tsx`, `RecipeDetailSignals.tsx`, `recipeEffortBar.tsx`, `CookingScreenModel.ts`, `recipeModel.ts` — all import from `model/flavorModel`/`flavorRanking`/`footerTones`. The spike files themselves (`SignalDeckSpike.tsx`, `FooterToneSpike.tsx` + stories) were kept as "Lab references."
3. **A spike currently reopening/re-lifting live at scan time**: `apps/web/src/features/cooking/spikes/flavor-octagon/` now also contains **untracked** new files (`MatchScoreSpike.tsx/.stories.tsx`, `ModeScoreSpike.tsx/.stories.tsx`, `SearchToolbarSpike.tsx/.stories.tsx`, `matchScore.ts`, `HANDOFF-MATCH-MODES.md`) — a second graduation cycle in the same spike folder for the "match-modes" feature, per `.kdbp/PLAN.md`'s 2026-07-05 entry.
4. **Live, in-progress example right now** (equipment settings): `apps/web/src/features/settings/spikes/equipment/EquipmentInContextSpike.stories.tsx` (untracked spike) sits alongside brand-new **untracked** production files `apps/web/src/features/settings/components/EquipmentSettingsSection.tsx` and `apps/web/src/features/settings/equipmentSettingsModel.ts`, wired into modified `SettingsContainer.tsx` and `SettingsScreens.stories.tsx`. `.kdbp/LEDGER.md`'s tail (through 19:24 today) shows active `Edit` calls alternating between the production component and the spike story — i.e., the reuse loop is happening live during this scan. Note in parallel: `SensorySettingsSection.{tsx,stories.tsx}` and `sensorySettingsModel.{ts,test.ts}` show as **deleted** in git status, suggesting a settings-section consolidation/rename is also underway.

**Evidence of the R4 rule currently being violated (spikes not archived):**
- R4's own detection command, re-run live: `find apps/web/src/features -path '*/spikes/*' -name '*.stories.tsx'` returns **20 active spike stories**, not zero. Git-blame shows most of these are recent (first-committed 2026-06-22 → 2026-07-08), i.e. legitimately still-open explorations rather than stale leftovers — but it means R4's stated invariant ("should normally return no output") does not currently hold, and none of these 20 have yet been archived even where their underlying decision looks settled (e.g. `avoid-exclude`, `atencion-dedicacion`, `time-effort` cluster of 6 stories comparing card-effort visual variants).

---

## 4. Test / Proof Infrastructure

**`playwright.config.ts`** (repo root, 3.6K, last touched 2026-06-25) defines **7 projects**:

| Project | testDir | Target | Notes |
|---|---|---|---|
| `mockups` | `tests/mockups/` | local `python http.server` on port 4174 serving `docs/mockups/` | smoke tests against the frozen legacy HTML |
| `web-e2e` | `tests/web-e2e/` (`staging-e2e-*.spec.ts`) | staging deployment | stateful setup/product-loop tests |
| `web-journey` | `tests/web-e2e/` (`web-journey-*.spec.ts`) | local Vite dev server (`localhost:5173`, MOCK Gemini), single-worker, mobile viewport (390×844, "D90 nav differs by tier") | the main behavioral E2E suite |
| `cleanup-e2e-recipes` | `tests/web-e2e/` | teardown | sweeps E2E-created recipe residue from staging-e2e |
| `layout-mobile` / `layout-tablet` / `layout-desktop` | `tests/web-e2e-layout/` | deployed staging web client, `video/screenshot/trace: 'on'` for all three | `WEB-LAYOUT-POLICY.md`-driven layout assertions per breakpoint |

Custom reporter (`tests/web-e2e/helpers/run-status-reporter.ts`) writes `tests/web-e2e/artifacts/run-status.json` (gitignored) that the "web-journey" HTML doc pages read to flip per-case status chips.

**`tests/` tree:**
- `tests/mockups/` — 6 spec files (`atoms`, `flows`, `icons`, `legacy-hub`, `molecules`, `screens-p6-core-loop`, `tweaks`) + `validate/` subsystem: `runner.mjs`, `screen-validator.spec.ts`, `rules.json`, and `.cache/findings/*.json` (per-screen × per-viewport a11y/layout finding caches, e.g. `auth-onboarding__desktop.json`).
- `tests/web-e2e/` — **~24 spec files**, all `web-journey-*.spec.ts` named after the feature under test (cancel-focus, cancel-normal, combined-cook, core, d108fixes, edges, facets, i18n-coverage, i18n-language, match-modes, mixing-edges, phase64, progression, quantity-localization, recipe-language, saved-modes, settings-auth, storage-ambient, storage-batch, storage) plus 2 `staging-e2e-*.spec.ts` and a `recipes-cleanup.teardown.ts`.
- `tests/web-e2e/artifacts/web-journey/` — **feature/scenario-named** (not date-named) subfolders, each with numbered PNG screenshots (`01-…png`, `02-…png`, …) + a `manifest.json`: e.g. `combined-cook/` (11 PNGs), `saved-modes/` (15 PNGs), `mixing-edges/`, `match-modes/`, `progression/`, `storage-expiry/`, `usability/`. This whole tree is **gitignored** (`.gitignore` lines 65-71: `playwright-artifacts/`, `playwright-report/`, `test-results/`, `tests/web-e2e/artifacts/`) — it's local proof-of-work evidence, not committed history.
- `tests/web-e2e-layout/layout.spec.ts` — the 3-viewport layout suite.
- `tests/CLAUDE.md` — a nested project-memory file scoping test conventions.

**`test-results/`** (repo root) — currently near-empty, just `.last-run.json` (45 bytes, last modified 2026-07-08 11:33); confirms this is a Playwright output dir that's gitignored and gets swept/regenerated per run.

**apps/api tests:** `apps/api/tests/` contains ~90 entries (pytest suite; referenced from CI as the `pytest` step running on both SQLite and, in a separate job, real Postgres).

**No literal date-stamped evidence directories** were found (e.g. no `evidence/2026-07-08/`); the only date-named path in the repo is `.kdbp/research/archive/2026-04-24/`. Evidence organization is instead **feature/scenario-named**, with dates tracked in manifests/git history rather than directory names.

**CI:** single workflow `.github/workflows/ci-rebuild.yml`. Path-filtered per-app (`dorny/paths-filter`) into: `api-lint-test` (ruff + pyright + pytest), `api-docker-smoke` (builds prod Docker image, boots against real Postgres, curls `/healthz` — the "deploy proxy" job, added after Phase 19's migration-only Postgres gate missed a `shared/` COPY bug), `api-postgres-suite` (full pytest suite on Postgres, gated to `main`/PRs-to-`main` only, cost-optimized), `web-lint-build` (npm ci → **eslint lint** → **vitest test** → `tsc --noEmit` + vite build via `npm run build` → OpenAPI-frozen check via `scripts/check_openapi_frozen.sh`), `secret-scan` (gitleaks, main-gate only), `legacy-import-check` (`scripts/check-no-legacy-imports.sh`, main-gate only). An `apps/web/eslint.config.js` (71 lines) exists and **is** wired into CI — note this contradicts an older `.kdbp/PLAN.md` narrative entry (2026-07-06) claiming "web CI runs zero tests + no eslint config anywhere"; the CI YAML's own inline comment ("H1 (CI/debt): lint … + unit tests … now gate the web build") confirms that debt item has since been closed, i.e. that PLAN.md prose is a stale historical note, not current state.

---

## 5. CLAUDE.md Content Summary

**Root `CLAUDE.md`** (176 lines) — "Gustify — Project Memory":
- **What is Gustify** — cooking companion, sister app to Gastify/Boletapp (expense tracker) via cross-app catalog exchange (ADR D1 revised); brand/market/language notes (Chile-first, Spanish-first UI).
- **Repo Origin** — this is a *rebuild*; legacy Firebase/React prototype lives at `/home/khujta/projects/bmad/gustify202604/`. "Never import legacy" — enforced by `scripts/check-no-legacy-imports.sh` (pre-commit + CI).
- **Stack table** — FastAPI/Postgres/SQLAlchemy async/Alembic/`uv` (API); React 18/Vite/TS/Tailwind, "responsive, not PWA" (web); React Native/Expo (mobile); Zustand+TanStack Query; Gemini 2.5 Flash; dual SSE/WebSocket streaming; Railway hosting; Firebase Auth.
- **Rebuild Documentation Hub** — index of `docs/rebuild/*` (REBUILD-BRIEF, EXEC, STATUS, per-phase runbooks, PLAN, UX-PLAN, ADRs, LESSONS, DEFERRED). Flags 4 "heavy gate" phases requiring `/gabe-roast architect` pre-start.
- **Mockup Counts** — canonical numbers (30 screens, 6 flows, 4 explorations, 89 UI states) reconciled 2026-04-27, with a note that HTML becomes read-only post-A4.
- **Development Conventions** — Spanish-first UI/English code, canonical-ingredient-by-ID rule, novelty guarantee (D-GU2, deterministic not prompt-based), allergen safety at SQL layer (D-GU1/R8), proficiency tier derivation (D-GU5/R10), mobile-first 375px+, the mobile/tablet/desktop triple-file mockup convention (with a note that an earlier "inline platform-variants" cascade attempt was reverted — see D18), complexity 1–5 scale, file-size discipline (500 LOC soft / 800 hard), no-legacy-imports.
- **KDBP Active section** (`<!-- KDBP-MARKER: gabe-init v1 -->`) — "what to read when" table mapping session moments to `.kdbp/*` files, the 8 active suite commands, 5 invariants (no raw commits, PLAN-before-code, STRUCTURE-before-placement, VALUES-override-defaults, verified-topics-trump-re-derivation).
- **"Reuse first" section** (appended 2026-06-30, tagged as `learned … via /claude-md learn from repeated founder "stop rebuilding from scratch" corrections`) — app-wide reuse mandate, pointer to `apps/web/CLAUDE.md` for front-end specifics, note that `shared/` code (api-types, design-tokens, schemas, locale) must be reused not duplicated.

**Nested `apps/web/CLAUDE.md`** (24 lines, auto-loads under `apps/web/`) — front-end-specific reuse contract detailed in §3 above: spike-first workflow, "never re-author a stand-in shell," 5 named real components to grep-and-reuse before building anything that resembles them, spike location convention (`features/<area>/spikes/**`, `Lab/*` titles), pointer to the `gabe-mockup` skill for the reuse-or-extend pre-flight gate procedure.

---

## Key files cited (all under `/home/khujta/projects/apps/gustify/`)

- `apps/web/.storybook/main.ts`, `apps/web/.storybook/preview.ts`
- `apps/web/CLAUDE.md`, `CLAUDE.md`
- `.kdbp/RULES.md`, `.kdbp/DECISIONS.md`, `.kdbp/PLAN.md`, `.kdbp/PENDING.md`, `.kdbp/ROADMAP.md`, `.kdbp/KNOWLEDGE.md`, `.kdbp/HANDOFF.md`, `.kdbp/LEDGER.md`, `.kdbp/STRUCTURE.md`
- `docs/rebuild/ux/archive/spikes/README.md`, `docs/rebuild/ux/archive/spikes/2026-05-27-final-feature-spike-archive.md`
- `apps/web/src/features/cooking/spikes/flavor-octagon/` (graduated + regraduating spike)
- `apps/web/src/features/settings/spikes/equipment/`, `apps/web/src/features/settings/components/EquipmentSettingsSection.tsx`, `apps/web/src/features/settings/equipmentSettingsModel.ts` (live in-progress spike→prod example)
- `playwright.config.ts`, `tests/web-e2e/`, `tests/mockups/`, `.github/workflows/ci-rebuild.yml`, `apps/web/eslint.config.js`
