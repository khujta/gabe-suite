# T5 — Gustify testing-estate inventory (raw thread report)

> Produced 2026-07-10 by the estate-inventory agent (Sonnet 5), read-only, static counts (no suites executed).
> Human-facing rendering: `../output/03-testing-landscape.html`. This file is the receipt.

## 1. pytest (apps/api/tests/)
- **85 test files**, flat dir; **1,095 `def test_` functions** (static grep count).
- ASGI-level integration via httpx AsyncClient + ASGITransport (real routing/DI, fake network).
- Largest files: exploration_preferences 69 · recipe_seed 68 · recipe_facets 59 · explore_bias 41 · recipes 39 · ai_pipeline 35 · meal_plan 30 · cooking 28.
- Categories: route/integration (test_*_routes + most feature files) · service-level (setup_service, postgres_parity, reconciliation, fuzzy_match, ingredient_resolution) · models/schemas · security (test_db_security 3, test_log_redaction, test_client_ip 20, test_cors) · parity (test_postgres_parity 11 — ::jsonb @>, JSON round-trip, NULL-guard idioms) · dialect portability (2, offline ORM-metadata Boolean/server_default walk) · streaming (20 — SSE+WS same event vocabulary) · rate-limit (12, injected clock) · **migrations (15 — per-revision alembic upgrade+DOWNGRADE round-trips on temp SQLite)** · AI/Gemini (gemini_real 24, ai_pipeline 35, credits/spend — SDK mocked at _build_genai_client; error taxonomy/breaker/cost; "schema-compat verified live once at build time, key-gated, not in CI") · contracts (test_openapi_contract 3, test_gastify_contract 8).
- conftest.py: in-memory SQLite + StaticPool default; `GUSTIFY_TEST_DATABASE_URL` swaps to real Postgres (CI parity job); **PRAGMA foreign_keys=ON default** (proxy for PG FK enforcement); fixtures db_engine/db_session/client; autouse `_no_live_gemini` (hard-fails un-mocked Gemini client construction); test-time Gemini key hard-cleared.
- CI: `api-lint-test` (ruff → pyright → pytest on SQLite; every push/PR w/ api path filter) · `api-postgres-suite` (FULL suite on Postgres 16, main-only, --ignore only test_db_security — its skip-on-SQLite assertion can't hold on superuser PG) · `api-docker-smoke` (build prod image, boot vs PG16 exactly as Railway: alembic upgrade head → uvicorn → poll /healthz 40×3s; every api push, ~1 min).

## 2. vitest (apps/web)
- **45 test files**, **~408–409 `it(`/`test(`** call sites (+3 `.each`), 106 describes.
- Areas: mostly pure model/logic (cooking model ranges/filters/dietary sync/facets/saved modes; pantry model/aliases/mutations; i18n locale parity/sync/unit conversion), some component renders (AuthProvider, PersistGate, ExploreModeSelector, RecipeFilterPanel, PantryItemDetailSheet), data layer (api/query cache-policy/persist).
- **`src/i18n/localeParity.test.ts` = the 100% bilingual completeness gate** (identical key sets es-CL/en-US, matching {placeholder} tokens, no empty values).
- vitest.config.ts: 2 projects — `unit` (jsdom; `__regression__/` excluded ONLY when CI env set — intentionally-RED TODO tracker runs locally, hidden from CI) and `storybook` (@storybook/addon-vitest + playwright provider, headless Chromium — **stories ARE tests**).
- CI `web-lint-build`: eslint → `vitest run --project unit` (**storybook project NOT run in CI**) → tsc+vite build → check_openapi_frozen.sh.
- **Storybook: 107 `*.stories.*` files.** `test-storybook`, `test:storybook-navigation` (chains token-classes + mockup-baseline + navigation checks), `test:storybook-live-loading` — ALL npm-run-only, wired to no CI job or hook.

## 3. Playwright (7 project entries)
| Project | Target | Specs/tests | Purpose / notes |
|---|---|---|---|
| mockups | local http.server :4174 over docs/mockups (auto webServer) | 9 files, 58 tests | design-system gallery smoke (icons.spec: exactly 397 icon cells, 4 super-groups in order, zero console errors). **Manual only — not in CI.** |
| web-e2e | DEPLOYED staging-e2e API | 2 files, 6 tests | setup contract + full product loop, API-level. teardown: cleanup-e2e-recipes. |
| web-journey | local Vite :5173 → staging-e2e API; real Firebase; MOCK Gemini | 19 files, ~86 tests | stateful browser journeys, shared e2e user ⇒ workers=1. |
| cleanup-e2e-recipes | teardown | recipes-cleanup.teardown.ts | delegates to cleanup_e2e_recipes.py (dry-run default, title+slug-guarded, refuses production). |
| layout-mobile/tablet/desktop | DEPLOYED staging web client | 1 file × 3 viewports | WEB-LAYOUT-POLICY.md thresholds (gutter ≥12px, top-inset ≥8, nav-drift ≤1px, desktop fill ≥92%, no mock-data strings) — SOFT assertions, video+trace on. **Manual only.** |
- journey-groups.json: 8 groups (cooking 3 / storage 3 / browse 6 / i18n 3 / profile 1 / settings 1 / core 2 / api-loop 2). `_comment` claims measured 2026-07-09 durations but **no duration numbers are stored anywhere**.
- run-journeys.sh: `<groups…>|all|--list|--capture` (CAPTURE=1 → recordVideo + cursor overlay, cook-state pilot only; ffmpeg → H.264 mp4 post-render); needs `.secrets/staging-e2e-user.env` (absent → specs skip); Vite :5173 required for non-staging specs.
- e2e-journeys.yml: on-demand ONLY — `[e2e]`/`[e2e:groups]` commit token on staging push, or workflow_dispatch w/ groups input; concurrency-serialized with the ONE automatic journey gate in ci-rebuild.yml (`web-journey-cook-state`, fires on cooking-path staging pushes); waits for staging-e2e /healthz to report the pushed SHA; uploads artifacts 30 days.
- staging-e2e infra: POST /_e2e/seed (+seed-catalogs) guarded by seed_controls_enabled (hard-forbidden in production, allowed {local, staging-e2e}); Firebase test user via .secrets + identitytoolkit token mint w/ UID assert; ProviderMode MOCK/FIXTURE/REAL, mock = deterministic MOCK_SUGGESTION_OUTPUT.
- **README-web-journey.md documents a live 500 on /setup/complete + /_e2e/seed for the shared user (ExplorationBlock None-columns) blocking the api-loop group — but LEDGER 2026-07-09 (`6eb81526`) records that exact fix ("journey suite fully repaired + ExplorationBlock None-columns 500 fix"). One of the two is stale; verify at spike time.**
- Evidence helpers (503 lines): Evidence class (NN-name.png + manifest.json rewritten after EVERY shot), run-status-reporter (merge-update run-status.json+.js), capture.ts.

## 4. Static/deterministic gates
| Gate | Wired |
|---|---|
| ruff (E,F,I,N,UP,B,SIM; line 100) | pre-commit (--fix) + CI api-lint-test |
| ruff-format | pre-commit only |
| pyright strict | CI only (not pre-commit) |
| eslint 9 + ts-eslint + react-hooks | CI only |
| tsc --noEmit && vite build | CI web-lint-build |
| gitleaks (+D83 allowlist) | pre-commit every commit + CI main-only backstop |
| check-no-legacy-imports.sh | pre-commit per-file + CI main-only full-tree |
| check-token-class-coverage.mjs (tokens ↔ built Storybook drift) | **UNWIRED** (npm-run-only) |
| check_openapi_frozen.sh (offline contract freeze, additive-only) | CI web-lint-build |
| check_openapi_drift.sh | dead/unwired |
| block-generated-edits | pre-commit |
| test_dialect_portability / test_migrations | inside pytest suite |
| api-docker-smoke | CI every api push |

## 5. Environments (config.py::Environment)
local (SQLite; mock AI) → staging-e2e (Railway PG; MOCK Gemini; seed endpoint; shared test user) → staging (Railway PG; layout-* target; cook-state auto-gate; api-postgres-suite/secret-scan/legacy-import gate promotions to main) → production (Railway PG; REAL Gemini hard-guarded; NO test suite runs against it; docker-smoke is the deploy-shape proxy; /healthz gates deploys).
- Hosting docs drift: CLAUDE.md says Railway for web (D66 supersedes D-GU6); README.md still says Vercel (stale).
- apps/mobile (Expo): **zero test files.**

## 6. Latest known-green counts
- LEDGER 2026-07-09 `0b6153bd`: **ruff 0 · pyright 0 · pytest 1109 · vitest 415** (most recent full-suite row).
- Live-tree static count today: pytest 1,095 functions / vitest ~408 — matches the second-most-recent row (1095); difference plausibly parametrized-case counting vs function grep. Fact, not judgment.

## 7. Absence check (facts)
| Category | Present? |
|---|---|
| Accessibility (axe/pa11y) | **Absent** (only package-lock transitive noise) |
| Performance/load (k6/locust/lighthouse) | **Absent** |
| Visual regression beyond layout-* DOM-geometry | **Absent** (no percy/argos/chromatic/pixelmatch; stories run as render/interaction tests, no snapshot diff) |
| Gemini golden/contract tests | **Partial** — hand-authored MOCK_SUGGESTION_OUTPUT fixture reused everywhere; error taxonomy well-tested; real-schema compat "verified live once at build time (key-gated, not in CI)" |
| Alembic DOWN-migration tests | **Present** (test_migrations.py, ≥12 revisions, explicit downgrade round-trips) |
| Mutation testing | Absent |
| Chaos/fault injection | Absent |
| OpenAPI contract tests | **Present ×2** (pytest test_openapi_contract + check_openapi_frozen.sh CI gate) |
| i18n completeness | **Present ×2** (localeParity vitest gate = 100% keys; journey i18n-coverage = 5 live spot-checks) |
| Security beyond gitleaks+db_security | client_ip (20, XFF spoof), log_redaction, cors; **no pip-audit/npm audit/bandit/Dependabot in CI** |

## Summary table
| Kind | Files | Tests | Guards against | Trigger | Results land |
|---|---|---|---|---|---|
| pytest | 85 | 1,095 | backend logic/routes/safety/migrations/streaming | every api push (SQLite) + main (PG16) + docker-smoke | CI logs; LEDGER prose totals |
| vitest unit | 45 | ~408 | web model/logic, i18n parity | every web push | CI logs; LEDGER |
| vitest storybook | 107 stories | uncounted | component render/interaction | **manual only** | terminal |
| PW mockups | 9 | 58 | design-system gallery | manual | local report |
| PW web-e2e | 2 | 6 | deployed API contract/loop | on-demand token/dispatch | artifacts + run-status.json + 30d CI artifact |
| PW web-journey | 19 | ~86 | runtime UX journeys | cook-state auto on staging; rest on-demand | Evidence shots + manifest + run-status.json |
| PW layout ×3 | 1×3 | 3 | layout policy on deployed client | manual | video/trace |
| Static gates | 12+ | — | style/type/secrets/boundaries/contract/dialect | pre-commit + CI | terminal/CI logs |
