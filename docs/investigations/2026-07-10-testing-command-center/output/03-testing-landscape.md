# Testing landscape — kinds, infrastructure, gaps, dimensions (operator round 1)

- **Date:** 2026-07-10 · **Trigger:** operator round-1 response — "before we continue with any plan, I would like to understand the testing itself."
- **Human-facing rendering:** `03-testing-landscape.html` (open in a browser — the visual page is the primary surface).
- **Receipts:** `../threads/T5-testing-estate-inventory.md` (full read-only estate inventory, 2026-07-10).
- **Decisions recorded this round:** D1 **granted & broadened** (the entire gustify *testing* surface is writable — configs, deps, infra, full overhaul if needed; only the application itself stays untouched) · D2/D4/D5 agreed per recommendation · D3/D6/D7 pending — explained in the html page §D3/§D6-D7 with trade-offs and impact.

## 1. What we run today (the estate, verified numbers)

| Kind | Size | Why it exists | Runs | Results land |
|---|---|---|---|---|
| Static gates (ruff, pyright, eslint, tsc, gitleaks, legacy-imports, openapi-freeze, dialect-portability) | 12+ gates | catch style/type/secret/boundary/contract drift before anything runs | pre-commit + every CI push | terminal / CI logs |
| pytest backend | 85 files / 1,095 tests | business logic, routes, allergen filters, migrations (up **and down**), streaming, security (XFF spoof, log redaction, DB roles) | every api push (SQLite) · full suite on Postgres 16 at main · docker-smoke boots the real image every api push | CI logs; LEDGER prose totals |
| vitest web (unit) | 45 files / ~408 tests | web model/logic, i18n 100% key-parity gate, some component renders | every web push | CI logs |
| vitest web (storybook project) | 107 stories run as render/interaction tests in headless Chromium | component behavior at the story level | **manual only — never in CI** | terminal |
| Playwright web-journey | 19 specs / ~86 tests, 8 groups | real-browser user journeys vs staging-e2e (real Firebase, real Postgres, mock Gemini) | cook-state auto-gates staging pushes; the rest on-demand (`[e2e:group]` token / dispatch) | Evidence screenshots + manifest + run-status.json |
| Playwright web-e2e (api-loop) | 2 specs / 6 tests | deployed-API setup contract + product loop | on-demand | artifacts + 30-day CI artifact |
| Playwright layout ×3 viewports | 1 spec ×3 | WEB-LAYOUT-POLICY thresholds on the deployed client (soft assertions) | manual | video/trace |
| Playwright mockups | 9 specs / 58 tests | design-system gallery integrity (397 icon cells etc.) | manual | local report |

Environments: local (SQLite, mock AI) → staging-e2e (Railway PG, seed endpoint, shared test user, MOCK Gemini) → staging (layout target + the one auto journey gate) → production (no direct tests; docker-smoke is the deploy-shape proxy). Mobile app: zero tests (flagged, out of scope).

**Discrepancy to verify at spike time:** README-web-journey documents a live 500 on `/setup/complete` + `/_e2e/seed` blocking the api-loop group; LEDGER 2026-07-09 records that exact fix. One is stale.

## 2. Gaps vs the nature of the problem

Gustify is an **allergen-safety-relevant, data-stateful, AI-generative, bilingual** app at MVP maturity, solo-operated. Ranked:

1. **Gemini output safety/golden harness — the biggest real gap.** The mock lane replays one hand-authored fixture; the real provider's output schema was verified once, at build time, key-gated, not in CI. A generated recipe that ignores an allergen exclusion is the worst possible failure of this product. Proposal: a golden/contract suite (recorded real outputs, snapshot-diffed) + a standing safety-invariant test (generated output must pass the R8 exclusion filters) + a small key-gated nightly/weekly real-provider canary.
2. **Storybook tests exist but never run** — 107 stories are wired as tests through the vitest `storybook` project; CI runs only `unit`. Cheap fix, now allowed under broadened D1: wire it into `web-lint-build`.
3. **Coverage tooling** — absent; D1 granted; lands as normal dev-deps in the spike.
4. **Dependency audit** — no pip-audit/npm audit/Dependabot anywhere. Cheap CI add.
5. **Accessibility baseline** — absent; a cooking app is used mid-task (wet hands, glare, timers). An axe pass on the 4-5 core screens via the existing journey specs is low-cost.
6. **Unwired manual suites** (mockups, layout ×3, token-class-coverage) — decide intentional-manual vs scheduled; at minimum the command center should show their last-run date so "manual" doesn't mean "invisible".
7. Consciously out at MVP (named, not missing): perf/load (PENDING #23/#25 hold the triggers), mutation, chaos, pixel-diff visual regression (Evidence Doctrine's side-by-side + layout policy checks carry MVP).

## 3. Dimensions (the operator's core question)

Five real axes exist in the estate; recommendation = **criticality × area grid as the L0 default**, with lens toggles (the Allure three-lens pattern):

- **Criticality (primary)** — T1 SAFETY (allergen/exclusion correctness) · T2 DATA (state survival, migrations, FK parity) · T3 MONEY/ABUSE (rate limit, AI cost, auth) · T4 CORE LOOP (login→pantry→cook→shop) · T5 POLISH (i18n, layout, facets). Sources: `BEHAVIOR.md critical_paths` + PLAN.json phase `types` (e.g. "safety") + ONE ~20-line overlay file (`center.config.json` area→tier) — the single allowed editorial artifact under the anti-curation guardrail.
- **Area** — the 8 journey groups + backend areas (recipes, pantry, shopping, AI, auth/platform).
- **Level** — gate → unit → integration → journey → deployed (the classic pyramid; secondary lens).
- **Platform/engine** — SQLite / Postgres / Docker image / deployed staging-e2e (the "passes CI, fails on Railway" axis — already burned once, PENDING #28).
- **Trigger/freshness** — pre-commit / every push / main-only / on-demand / manual (staleness is a first-class display property).

Navigation: hub grid (criticality rows × area columns; cell = status color + test count + freshness) → cell page (every suite feeding that cell, across levels) → spec page → artifact. Critical concentration is always the top row — visible in one glance, which was the operator's stated need.

## 4. Visual language (catalog, direction decided by operator at build time)

- **Color = state only**: pass/fail/skip/stale (reserved status palette; never doubles as category color).
- **Icon/shape = kind**: gate/unit/integration/journey/deployed — PixelLab icon set at build time (skill available; per-project bindings), CSS letter-badges until then.
- **Size + border weight = criticality**: T1 cells physically bigger/heavier; shield badge on safety rows.
- **Opacity/desaturation + clock badge = freshness**: stale evidence literally fades (mirrors the evidence-freshness gate).
- **Motion**: one pulse on newly-changed status; nothing decorative.
- Labels stay (accessibility), but the encoding carries the meaning — matching the gustify UI philosophy the operator named.

## 5. D3 / D6 / D7 — explained (full visuals in the html)

- **D3 history custody:** committed+capped (recommended) vs gitignored. The suite already lived the failure: a gitignored run-status manifest was deleted by a cleanup and every doc page reverted to "not run" (evidence-doctrine §3). Cost of committed: ~200 bytes/checkpoint, capped last-50 ≈ 10 KB — trivial; needs one docs-budget exemption line.
- **D6 (Wave-2): proof becomes an address.** Today `proof` is a prose sentence a page can only print. D6 = teach the suite's writers (gabe-plan/execute/review/commit/push) to write structured proof (spec path + artifact dir + timestamps + back-links). Without it, board cards are prose tiles; with it, every claim is a door. Only decision now: keep it on the Wave-2 list.
- **D7 (Wave-2): when the gustify script becomes a suite skill.** Promote at n=1 = abstract from one example (house lesson: wrong abstraction locks in). Never promote = gustify's four divergent generators, again. Recommendation: decide at the gastify window (n=2) with spike lessons in hand. Only decision now: agree to that timing.

## 6. Spike-plan impact of broadened D1

`02-spike-plan.md` addendum: A6 uses normal dev-deps (no `uv run --with` / `--no-save` workarounds); two new optional steps become available under "testing overhaul allowed": wire the vitest `storybook` project into CI, add pip-audit/npm audit. The Gemini golden harness is proposed as its own new decision (D9) — it is test-suite work (allowed) but bigger than the spike.

## 7. New decision points opened this round

- **D9 · Gemini golden/safety harness** — build the recorded-output contract suite + safety-invariant test + key-gated canary? (Biggest gap; test-surface only; est. 1-2 sessions.)
- **D10 · Wire the orphan suites** — storybook project + audits into CI now (cheap), mockups/layout stay manual but surfaced with last-run dates in the center?

## 8. Round-2 outcomes (operator, 2026-07-10)

- **D9 RETIRED**: user-level Gemini generation is being deprecated (pieces remaining in the app will be removed); all
  recipes will be generated in-house (cloud session / gustify project skill). The safety invariant survives transformed:
  in-house-generated recipes must pass the R8 exclusion filters before entering the catalog — validation form TBD,
  parked on the in-house generation work. The center tracks the deprecation curve (Gemini test files/mock lane shrink).
- **D10 AGREED — LOCAL only.** New locked constraint (now BRIEF constraint 7): the GitHub Actions pipeline must NOT
  grow — private repo, CI-minutes quota exhausted previously. Storybook project + pip-audit/npm audit wire into the
  LOCAL loop; the center displays last-run dates. Zero new CI steps anywhere.
- **D3 AGREED**: committed + capped-50 history JSONL. **D6/D7 timing AGREED.**
- **Packaging direction:** site FIRST; generator likely becomes a gustify **project-local** skill afterwards
  (`.claude/skills/` pattern); the twin (gastify) gets the same kind of site; project-vs-suite stays the D7 call at
  the gastify window.
- **Style confirmations:** the title + italic analogy-subtitle pattern is house style for the center's sections, each
  section carrying one concrete worked example (the "allergy thread": one feature — a restricted user's recipe safety —
  followed through every test kind). Visual language approved; the **PixelLab kind-icon set was generated this round**
  (6 icons, 32×32, gustify style bindings, 6/2000 monthly generations; ledger at `assets/icons/icons-ledger.json`):
  clipboard=gate, tasting spoon=unit, mixing pot=integration, dinner cloche=journey, food truck=deployed,
  oven mitt=hand-run trigger marker.
