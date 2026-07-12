# Testing Command Center — spike plan v2 (gustify guinea pig)

- **Date:** 2026-07-10 (v2 consolidates the v1 base + 3 addenda after the operator's round-7 consistency review — no separate amendments to reconcile; this document is self-contained and current)
- **Status:** APPROVED — all decisions closed (D1–D10 + final skin, rounds 1–11). Executed by the GUSTIFY session; start from `../CENTER-KICKSTART.md`.
- **Hard rules:** gustify app code untouched. Writable: `tests/`, `docs/site/`, `scripts/` (doc-generator layer, same as today's `build_e2e_docs.py`), plus test configs/deps anywhere per broadened D1 (`pyproject.toml` dev-deps, `vitest.config.ts`, `playwright.config.ts`). gastify untouched. Suite (`skills/`, `install.sh`, `~/.claude`) unchanged — Wave-2 owns that.
- **Locked constraints that bind every step:** static, regenerated, opens over `file://` · **NO new GitHub-Actions steps of any kind** (CI-minutes constraint) — everything below runs locally · anti-curation guardrail: pages render only machine-derived data; the ONLY editorial artifact allowed is one small overlay file (`center.config.json`, area→criticality-tier map) · IDs derive from names, never run data.
- **Skin (FINAL, round 11 — "Use J"):** **"Station Card" (J), LIGHT-ONLY** — no theme toggle, no dark mode, no media query. Spec = `05-skin-spec.md` (tokens + 13 rules: two-voice type, state left-rails, tab-chip headers, tabular numerals; all CSS on custom properties). Skin source to port: `mockups/center-skins.css` base components + the `[data-skin="j"]` block (collapse into defaults). Layout references (port, don't design): the FOUR multi mockups **viewed in skin J** — `center-hub-multi.html` (incl. the three lenses: risk/levels/recency) · `center-board-multi.html` · `center-tests-multi.html` · `center-drill-multi.html`. The skin-switcher is mockup-only tooling — do not port it. G-only mockups = historical record.
- **Pricing:** THROWAWAY. Proves the shape on gustify; promotion (likely a gustify project-local skill first, suite skill at the gastify n=2 window) is a rewrite decision, not a port (D7).

## Lifecycle bookkeeping (do this FIRST, before A0)

Open a KDBP phase for the spike via `/gabe-plan` (the SU1 precedent): e.g. **CC1 — "testing command center spike"**, tier `mvp`, `types: ["tooling","docs"]`, with a declared proof, e.g.
`proof: "center: file://docs/site/center/index.html renders hub→board→tests→leaf; journey-group totals match run-status.json"`.
Without this, `/gabe-next` routes to DL1, the evidence-freshness gate checks the wrong phase's proof, and LEDGER rows have no home. **Sequencing (operator call at planning time): CC1 before DL1 (recommended — 2–3 sessions, decisions hot, DL1 then benefits from the center) or DL1 first.**

## Steps (order matters; each independently verifiable)

| # | Step | Writes | Proves |
|---|---|---|---|
| A0 | **Pre-flight:** resolve the README-vs-LEDGER conflict — README-web-journey.md documents a live 500 on `POST /setup/complete` + `/_e2e/seed` (ExplorationBlock None-columns) blocking the api-loop group; LEDGER `6eb81526` (2026-07-09) records that exact fix. Run the api-loop group once (or inspect) and correct the stale document (README is tests-surface, writable). Also sanity-check that the docs-budget WARN gate doesn't fire on `docs/site/center/**` outputs (it targets markdown docs; if it warns anyway, accept-and-log — gates are WARN-only Stage 1; a real exemption is suite work → Wave-2 note). | `tests/web-e2e/README-web-journey.md` (if stale) | The e2e lane's true state is known before anything renders it |
| A1 | **Generator `scripts/build_center_docs.py`** (stdlib-only; no CDN assets — vendored/hand-rolled only). Emits `docs/site/center/index.html` (hub) per the J-skinned hub mockup (center-hub-multi.html, incl. the three lenses) from: PLAN.json (phase-cell summary strip), PENDING.md (open-row count, tolerant status-string parser), LEDGER.md (latest 5 rows verbatim), run-status.js (per-group totals **with per-source `ranAt` shown** — mixed-run honesty). Coverage tile renders real % once A6 lands; before that, a graceful "coverage: arrives at A6" state. Skin CSS ported from the mockups into `center/assets/center.css`. | `scripts/`, `docs/site/center/` | KDBP altitude renders statically; L0 hub exists in the locked skin |
| A2 | **Board page `center/board.html`** per the J-skinned board mockup: PLAN.json phases as cards with 4 lifecycle-cell chips (exec/review/commit/push; todo/deferred/done/obsolete coloring), current phase featured; PENDING open rows as ticket cards (priority/scale/age/file). Read-only (gabe commands are the write path); deep-links wherever prose already names a path. | same generator | Family A board over unmodified KDBP files |
| A3 | **Single grouping source:** the generator reads `tests/web-e2e/journey-groups.json` for journey grouping. **Acceptance criterion: the `FAMILIES` duplicate in `scripts/_docs_e2e_data.py` is deleted or reduced to a derived view** — the live drift bug dies here. | `scripts/` | The anti-drift guardrail is real |
| A4 | **pytest + vitest results, zero new deps:** `pytest --junitxml=tests/results/api-junit.xml` and vitest's built-in junit reporter → `tests/results/web-junit.xml`. **Custody: `tests/results/` is gitignored** (transient inputs; committed artifacts are only the generated HTML under `docs/site/center/` and A5's history file). Generator renders suite→file→test tables into `center/tests.html` per the J-skinned tests mockup. Runs ride existing local invocations — no new CI. | `tests/results/` (gitignored), `docs/site/center/` | The 1,095+408 invisible tests become visible |
| A5 | **History JSONL (D3: committed + capped-50):** each generator run appends one line per source (`{ts, source, totals}`) to `docs/site/center/run-history.jsonl`, dropping the oldest beyond 50. Hub renders last-N sparklines/status-grid from it. | `docs/site/center/` | The carried-forward-history mechanism at our scale |
| A6 | **Coverage as normal dev-deps (D1 broadened):** add `pytest-cov` to `apps/api/pyproject.toml` dev extras and `@vitest/coverage-v8` to `apps/web` devDependencies; run `pytest --cov --cov-report=json --cov-report=html` and `vitest --coverage`. Generator bakes `totals.percent_covered` into the hub tile and links the full `htmlcov/` + istanbul HTML copied under `center/leaf/` (leaf reports LINKED, never reskinned). Coverage output dirs gitignored except the copies under `center/leaf/`. | test configs, `tests/`, `docs/site/center/leaf/` | The coverage dimension + the leaf-linking pattern |
| A7 | **Playwright JSON reporter (D5):** add `['json', {outputFile: 'tests/results/pw-report.json'}]` alongside the custom run-status reporter in `playwright.config.ts`; generator prefers it (durations, retries, attachment paths), falls back to run-status.js. | `tests/` | Richer e2e data, custom reporter's consumers untouched |
| A8 | **Regen wiring:** one entry command (`python3 scripts/build_center_docs.py`), footer provenance stamp (timestamp + git SHA), documented next to the existing docs-site regen commands. Honest limitation, stated on the page: regeneration is manual/local this phase (no CI, no suite hooks) — the center displays its own regen date so staleness is visible, enforcement is Wave-2. | `scripts/` | Checkpoint-regeneration story end-to-end |
| A9 | **D10 orphan-suite wiring (LOCAL only):** a small runner (e.g. `scripts/run-local-checks.sh`) that executes the vitest `storybook` project, `pip-audit`, and `npm audit`, writing one summary line each into a machine-readable file the generator reads; hub/tests pages show each suite's **last local run date** (mockups/layout stay manual but become visible the same way). NO ci-rebuild.yml changes. | `scripts/`, `tests/` | "Manual" stops meaning "invisible" |

## Acceptance (the spike passes when…)
1. `file:///…/docs/site/center/index.html` renders hub (3 lenses) → board → tests → drill → a leaf report — all altitudes, no server, light-only, in the locked skin.
2. Zero new hand-curated editorial tables (`git diff` inspected); the only editorial artifact is `center.config.json` (area→tier).
3. `journey-groups.json` is the only grouping source (A3 criterion met — FAMILIES duplicate gone/derived).
4. Re-running journeys refreshes screenshots/status with NO rebuild (live-probe preserved); re-running the generator refreshes totals + history.
5. IDs derive from names: regen twice, diff anchors — zero churn.
6. gabe-commit gates still pass on gustify (docs-budget/evidence-freshness WARNs, if any, accepted-and-logged, not suppressed).
7. The CC1 phase's declared proof holds and its cells advance through the normal lifecycle.

**Size estimate:** generator ≤800 lines (size-budget aware) + one CSS asset + the two page templates, ~2–3 sessions. **Stop-loss:** if A1–A3 exceed one session, halt, write findings to COMMS, reassess against Spike B — that's the guardrail's canary.

## Spike B — fallback (Allure single-file as the testing surface)
Only if Spike A's stop-loss fires or the operator overrules toward O2. B1: trial deps without touching manifests (`npm i --no-save allure-commandline`, `uv run --with allure-pytest`) + allure reporters in test configs; B2: `allure generate --single-file` → `center/leaf/allure.html`, linked from the hub; B3: judge vs A4's tests.html on drill-down depth, deep-linkability, regen cost, skin alienness. **B cannot cover regardless:** KDBP layer, journey groups, proof galleries, capture MP4s, live-probe freshness — hub/board stay custom in every world.

## Board escape hatch (pre-priced, D2)
If read-only PENDING triage fails the two-week test: `gh auth refresh -s project,read:project` + a ~100-line one-way push script (`gh project item-create/item-edit` from PLAN.json + PENDING.md; full JSON dump for reconciliation). The mirror is disposable; drift priced in `01-options-report.md` §3.

## Explicitly out of scope (Wave-2, suite-side)
- KDBP schema enrichment (structured `proof`, per-cell timestamps, phase↔PENDING↔LEDGER back-links) — D6.
- Generator promotion (gustify project-local skill → suite skill at the gastify window) — D7.
- Regen/orphan-suite *enforcement* (hooks, gates) — this phase makes staleness visible, not impossible.
- Dark mode (tokens documented in `05-skin-spec.md` §1; one-block future option).
- In-house recipe-generation validation (ex-D9 residual: generated recipes must pass R8 filters — belongs to the generation work, not the center).
