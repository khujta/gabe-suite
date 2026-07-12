# Testing Command Center — navigation-graph crawl inventory

Source crawled (read-only): `/home/khujta/projects/apps/gustify/docs/site/center/`
Method: static grep/read of the four HTML pages (each is a single generated
artifact, 38–46 lines, all markup on one line per section), cross-checked
against disk via `find`/`ls`, plus a read of the two generator scripts
(`scripts/build_center_docs.py`, `scripts/_center_data.py`) and
`center.config.json`. No JS was executed — the radio-button lens tabs and
CSS `:target` anchors are static HTML/CSS, so what's below is exactly what a
browser would show without JS.

Pages: `index.html` (HUB), `board.html` (BOARD), `tests.html` (TESTS),
`drill-safety-recipes.html` (one DRILL page). `leaf/` holds two vendored
coverage-report trees (`api-htmlcov/`, `web-coverage/`) — 371 files total,
not enumerated below beyond their entry points.

---

## 1. Per-page `<a href>` inventory

### index.html (HUB) — 9 unique hrefs + 4 img src (icons)

| href | class | target exists? |
|---|---|---|
| `index.html` | internal-center page (self, nav "on" state) | yes |
| `board.html` | internal-center page | yes |
| `tests.html` | internal-center page | yes |
| `tests.html#pytest` | internal-center page + anchor | yes (anchor `id="pytest"` present in tests.html) |
| `tests.html#journeys` | internal-center page + anchor | yes (`id="journeys"` present) |
| `tests.html#gates` | internal-center page + anchor | yes (`id="gates"` present) |
| `tests.html#deployed` | internal-center page + anchor | **NO — dead anchor.** tests.html has no element with `id="deployed"` (the "deployed" concept only appears as prose inside the `#journeys` group card `api-loop`, and its `staging-e2e-*` specs; there is no `id="deployed"` anywhere in tests.html). Clicking this pyramid segment scrolls to the top of tests.html, not to a "deployed" section. |
| `drill-safety-recipes.html` | internal-center page | yes |
| `assets/center.css` | stylesheet (not a nav link but only other href) | yes |

Img srcs are 4 distinct icon files under `assets/icons/` (kind-unit, kind-journey, kind-integration, kind-gate), all decorative, used 3/2/1/1 times respectively. Not checked individually below since they're stylesheet-adjacent, but `assets/icons/` exists and is referenced consistently across all 4 pages.

**Total distinct navigable hrefs on index.html: 8** (excluding the CSS link). 7 of 8 land correctly; 1 (`tests.html#deployed`) is a dead anchor.

### board.html — 4 unique hrefs

| href | class | exists? |
|---|---|---|
| `index.html` | internal-center page | yes |
| `board.html` | internal-center page (self) | yes |
| `tests.html` | internal-center page | yes |
| `assets/center.css` | stylesheet | yes |

**That is the entire href surface of board.html.** No other element on this page — not one of the 32 phase cards, not one of the 57 ticket cards — carries an `href`. See §8 below.

### tests.html — 4 unique hrefs

| href | class | exists? |
|---|---|---|
| `index.html` | internal-center page | yes |
| `board.html` | internal-center page | yes |
| `tests.html` | internal-center page (self) | yes |
| `assets/center.css` | stylesheet | yes |

Same story as board.html: the nav strip is the entire href surface. 8 journey-group cards, 21 individual spec lines inside them, 12+12 shown test-file rows (pytest/vitest), 14 gate rows, 5 hand-run rows — none of these ~72 rendered rows/cards carry a link. See §8.

### drill-safety-recipes.html — 9 unique hrefs + 6 evidence `<img src>` (real files, not icons)

| href | class | exists? |
|---|---|---|
| `index.html` (nav) | internal-center page | yes |
| `index.html` (breadcrumb "hub") | internal-center page (duplicate target, different link text) | yes |
| `board.html` | internal-center page | yes |
| `tests.html` | internal-center page | yes |
| `drill-safety-recipes.html` | internal-center page (self, nav "on") | yes |
| `leaf/api-htmlcov/index.html` | leaf/ report | yes — vendored coverage.py HTML report |
| `../../../tests/results/pw-report.json` | external file path (repo root via 3×`..`) | yes — `tests/results/pw-report.json` (19,423 bytes) |
| `../../../tests/web-e2e/web-journey-facets.spec.ts` | external file path | yes |
| `../../../tests/web-e2e/proof/cook-state/manifest.json` | external file path | yes |

Evidence gallery `<img>` sources (not `<a>`, but the page's only other live pointers into the repo):

| src | exists on disk? |
|---|---|
| `../../../tests/web-e2e/artifacts/web-journey/facets/01-origin-country-picker.png` | yes |
| `.../facets/02-region-latam-selected.png` | yes |
| `.../facets/03-region-latam-run-card-visible.png` | yes |
| `.../phase64/01-seed-banner-visible.png` | yes |
| `.../phase64/02-diet-change-light-confirm.png` | yes |
| `.../phase64/03-diet-single-persisted.png` | yes |

All 6 evidence images actually exist right now, despite each `<img>` carrying an `onerror="this.setAttribute('data-absent',1)"` handler and a caption reading "placeholder · resolves live." That copy is generic/always-on (the generator has no way to know at build time whether the image will exist at view time — see §6), so today it's slightly stale messaging: these aren't placeholders, they're live, current screenshots, but the UI universally hedges as if they might not resolve.

**Dead/nonexistent targets found across all 4 pages: 1** — `tests.html#deployed` on index.html. Every other href/src target (including all 9 relative `../../../` paths reaching outside `docs/site/center/`) resolves to a real file.

**No other `drill-*.html` file exists anywhere under `center/`** — confirmed via `find center/ -iname 'drill-*.html'`, one hit only (`drill-safety-recipes.html`).

---

## 2. Major sections (h2/section landmarks) — interactive vs static

### index.html (HUB)
| Section (h2/id) | Content type |
|---|---|
| stat-row (5 tiles: backend/web checks, dress rehearsals, hand-run stations, coverage) | **STATIC** — numbers + LED dots, zero hrefs on any tile (including the coverage %, which does have a real target elsewhere — leaf/api-htmlcov — but isn't linked from here) |
| lens-wrap (3-tab risk/levels/recency, CSS-radio driven, no JS) | **MIXED** — see §3 |
| `#on-the-pass` (drill preview panel) | **STATIC** — 3 suite rows (pytest suite, 2 journey specs), no hrefs on the rows themselves; only escape hatch is the nav's "DRILL" link, mentioned only in the h2's italic subtitle text |
| `#history` (per-source sparkline panel) | **STATIC** — 3 rows (journeys/pytest/vitest counts + spark bars), no hrefs |
| `#kdbp-strip` (board-at-a-glance one-liner + ticker) | **STATIC** — text summary ("18 of 32 phases... current: CC1... 57 open tickets — full rail on BOARD"); "BOARD" is plain text, not a link, despite being an obvious pointer to board.html |

### board.html
| Section | Content type |
|---|---|
| `#on-the-burner` (featured current-phase card, CC1) | **STATIC** — one card, no href |
| `#orders-served` (32-phase cards-grid) | **STATIC** — 32 `.gcard` divs, zero hrefs (see §3/§8) |
| review-debt note | STATIC text |
| `#order-rail` (57 open PENDING ticket cards) | **STATIC** — 57 `.gcard` divs, zero hrefs |
| "parked by design" (2 ticket cards) | **STATIC** |

### tests.html
| Section | Content type |
|---|---|
| filters pill row (journeys/pytest/vitest/gates/hand-run counts) | **STATIC** — pills, no hrefs, one has `class="on"` suggesting filter interactivity that doesn't exist (no JS, nothing to click) |
| `#journeys` (8 journey-group cards, 21 spec lines) | **STATIC** — cards/rows, zero hrefs |
| `#pytest` (file table, 12 rows + "…73 more" rollup) | **STATIC** |
| `#vitest` (file table, 12 rows + "…32 more" rollup) | **STATIC** |
| `#gates` (14-row hook/CI table) | **STATIC** |
| `#hand-run` (5-row table) | **STATIC** — "last hand-run" column shows the runner command as plain text (e.g. `npx playwright test tests/mockups`) when never run, but it is text, not a link/copy-button |

### drill-safety-recipes.html
| Section | Content type |
|---|---|
| stat-row (3 tiles: checks/freshest/stalest) | STATIC |
| `#stations` (5 suite rows: pytest, 2 journeys, 1 deployed replay, 1 gate) | STATIC — same shape as the HUB preview panel, no hrefs |
| `#evidence` (6-image gallery) | **INTERACTIVE-adjacent** — not links, but real `<img>` pointing at real files (only page in the whole center subtree that renders actual evidence content rather than a text summary of it) |
| `#history` (sparkline) | STATIC |
| `#leaves` (`.leafbtns` — 4 buttons) | **INTERACTIVE** — the only genuinely link-rich section in the entire site: coverage leaf, pw-report.json, spec source, proof manifest |

**Overall pattern:** every page has exactly one link-rich zone (HUB's lens-wrap tabs + risk-grid/pyramid; DRILL's leaf buttons + evidence gallery) surrounded by large blocks of pure static text/number rendering. BOARD and TESTS have **no link-rich zone at all** beyond the 3-item top nav — every card, row, and cell on those two pages is inert.

---

## 3. index.html — the three lenses, cell by cell

All three lenses share one `<div class="lens-wrap">` with CSS-only radio-button tabs (`#lensA/B/C`), so all three are always present in the DOM; only CSS `display` toggles visibility. No JS is involved.

### Lens A — risk grid (`★ risk — criticality × area`)
Rendered as `<table class="cgrid">`, 5 tiers (rows) × 6 areas (columns) = 30 cells.

- **8 cells carry real data** (non-`void`): T1×recipes(59), T2×pantry(31), T2×platform(26), T3×ai-pipeline(120), T4×recipes(51), T4×cooking(81), T4×platform(64), T5×ui/i18n(33).
- **22 cells are `void`**, rendered as `<span class="cell void">—</span>` — plain `<span>`, never a link (there is genuinely nothing to link to for these, so this is not a dead end, just an honest empty marker).
- Of the 8 data-bearing cells, **exactly 1 is a clickable `<a>`**: T1×recipes → `<a class="cell ok" href="drill-safety-recipes.html">`. This is the only cell in the entire 30-cell grid with a real `href`.
- **The other 7 data-bearing cells are plain `<span class="cell ok">` / `<span class="cell void">`** — they show a bold count and a "N sources" subtitle exactly like the clickable cell, visually identical in every way except they are `<span>`, not `<a>` (no different cursor, no different styling beyond what CSS gives `.cell` generically — a user cannot tell by looking which cells are clickable without hovering to check for a hand cursor).
- This is driven directly by `center.config.json`'s `drills` array (currently length 1) — see §6. The `map` array that assigns tier×area buckets has 8 rules (one more area/tier pairing than cells with data, since 2 rules both map to platform: t2 and t4), but only 1 of those 8 mapped cells has a matching `drills` entry.

### Lens B — level pyramid (`levels — the pyramid`)
Rendered as `<div class="pyr">` containing 4 `<a>` elements, each width-styled as a pyramid tier:
- `<a href="tests.html#deployed">` — 6 deployed (staging-e2e replay) — **dead anchor, see §1**
- `<a href="tests.html#journeys">` — 81 journeys — resolves correctly
- `<a href="tests.html#pytest">` — 1,525 unit & route checks — resolves correctly
- `<a href="tests.html#gates">` — 14 gates — resolves correctly

All 4 pyramid rows ARE `<a>` links (unlike the risk grid, every row here is clickable) — 3 of 4 work, 1 is broken.

### Lens C — recency table (`recency — how fresh is each green`)
Rendered as `<table class="ftable">`, 5 rows (every commit / every push / main gate / on-demand / hand-run), **plain `<td>` cells throughout, zero `<a>` elements**. Hook ids, CI job ids, and journey-group names (e.g. "api-loop · browse · cooking · core · i18n · profile · settings · storage" in the on-demand row) are rendered as comma/dot-separated plain text inside a `<td>` — none of these individually-named entities link anywhere, even though several of them (the 8 group names) are the exact same strings used as `id="group-X"` anchors on tests.html.

**Summary: of the three lenses, only the risk grid (1/8 data cells) and the level pyramid (3/4 rows, 1 broken) have any interactivity. The recency table is 100% static.**

---

## 4. tests.html — how suites/files/tests render

- **Journey groups → files → tests**: rendered as 8 `.gcard` divs (`id="group-<name>"`), each containing one `<p class="sub">` description and N `.row-line` divs — one per spec file, showing `spec-key (passed/total · duration · retried?)` and a freshness stamp. **Neither the group card nor any individual spec row-line carries an `href`.** Test file *names* (e.g. `web-journey-facets`) are plain text inside a `<span class="nm">`.
- **pytest / vitest tables**: each file gets one `<tr>` with filename, test count, a visual pass-rate bar, a PASS/FAIL chip, and a freshness stamp. **No `<a>` anywhere in either table** — not on the filename, not on the count. Files beyond the top 12 (by test count) collapse into a single "… N more files" rollup row with an aggregate count and nothing else (no way to see what those files are from this page).
- **Per-spec or per-group pages**: **none exist.** The only individual-entity detail page anywhere in the center subtree is the single DRILL page (`drill-safety-recipes.html`), which is keyed by risk-grid cell (tier×area), not by journey group or spec file. There is no `group-browse.html`, no `spec-web-journey-core.html`, nothing of that shape. The only way from tests.html to an actual spec's source file is indirectly: DRILL → leaf buttons → `web-journey-facets.spec.ts` (and even that link is hardcoded to whichever spec is `drill['journey_specs'][0]`, i.e. always the drill's first configured journey spec — see `drill_leaves()` in `build_center_docs.py`).
- **Gates and hand-run tables**: same pattern — plain `<tr>` rows, gate/suite name as text, no links to the underlying `.pre-commit-config.yaml` / `.github/workflows/*.yml` / run scripts, even though the generator parsed those exact files to produce the rows (`load_precommit_hooks()`, `load_ci_jobs()` in `_center_data.py`).

---

## 5. drill-safety-recipes.html — what it links to, and sibling-page check

- Links out to: 1 leaf report (`leaf/api-htmlcov/index.html`), 1 external JSON (`pw-report.json`), 1 external spec source file (`.spec.ts`), 1 external JSON proof manifest — all 4 confirmed to exist on disk (§1).
- Evidence gallery: 6 `<img>` tags pointing directly at raw per-shot PNGs under `tests/web-e2e/artifacts/web-journey/{facets,phase64}/` — **not** at the curated `tests/web-e2e/proof/cook-state/` directory (whose *manifest.json* is linked as a leaf button, but whose *images* are never `<img>`-rendered anywhere in the center subtree; see §7).
- Breadcrumb (`<p class="crumbbar">`) has one extra internal link back to `index.html` (in addition to the nav-strip's own `index.html` link) — text "hub".
- **No other `drill-*.html` page exists** anywhere under `docs/site/center/` (confirmed by `find`). **No generated per-cell page exists for any of the other 7 data-bearing risk-grid cells** (T2×pantry, T2×platform, T3×ai, T4×recipes, T4×cooking, T4×platform, T5×ui) — they have real counts and real underlying data sources (journey groups / junit files, per `center.config.json`'s `map` array) but zero drill page, because `drills` in `center.config.json` currently has exactly one entry.

---

## 6. Generator capability — `scripts/build_center_docs.py` (777 lines) + `scripts/_center_data.py` (478 lines), total **1,255 lines**

**Page-emission capability (this is the key finding): `drill-safety-recipes.html` is NOT hardcoded — it is fully parameterized.**

```python
# build_center_docs.py, main()
for drill in CONFIG.get("drills", []):
    pages[f"drill-{drill['slug']}.html"] = build_drill(drill)
```

`build_drill(drill)` takes a `drill` dict with `tier`, `area`, `slug`, `title`, `promise`, `journey_specs`, `deployed_specs`, `junit_file_glob`, `gate` — everything needed is data, nothing is hand-authored per page. The generator will emit **one `drill-<slug>.html` per entry in `center.config.json`'s `drills` array**, with correct nav, breadcrumb, stations, evidence gallery (via `spec_shots()`, which regex-scans each spec's `.spec.ts` source for `new Evidence('subdir')` + `.shot(...)` calls to derive expected screenshot filenames), history sparkline, and leaf buttons — fully mechanically.

**The bottleneck is `center.config.json`, not the generator.** Right now that file's `drills` array has **exactly 1 entry** (`t1`/`recipes`/`safety-recipes`), while its `map` array (which buckets journey groups + junit files into tier×area cells) has **8 rules**, 7 of which produce a real, non-void, counted cell on the HUB risk grid with **no corresponding drill** — so those 7 cells render as inert `<span>` instead of `<a>`, and no drill page is ever generated for them. Adding a `drills` entry for each of those 7 (T2×pantry, T2×platform, T3×ai, T4×recipes, T4×cooking, T4×platform, T5×ui) would cause the *next* regeneration to emit 7 more fully-formed `drill-*.html` pages with zero code changes — this is a config-only gap, not an engineering one.

**Data sources read** (all machine-derived, single editorial overlay = `center.config.json`, per the file's own header comment "anti-curation guardrail"):
- `.kdbp/PLAN.json`, `.kdbp/PENDING.md`, `.kdbp/LEDGER.md` (KDBP layer)
- `tests/web-e2e/journey-groups.json`, `tests/web-e2e/artifacts/run-status.json` (journey layer — "single grouping source" per the code's own comment)
- `.pre-commit-config.yaml`, `.github/workflows/*.yml` (gates layer, regex-parsed, never hand-listed)
- `tests/results/api-junit.xml`, `tests/results/web-junit.xml` (JUnit — graceful-absent until captured)
- `docs/site/center/run-history.jsonl` (A5 — self-appended, capped at 50 lines, committed)
- `tests/results/api-coverage.json`, `tests/results/web-coverage/coverage-summary.json` (A6 coverage)
- `tests/results/pw-report.json` (A7 — Playwright JSON reporter, spec duration/retry enrichment)
- `docs/site/center/local-checks.jsonl` (A9 — hand-run station dates, written by `scripts/run-local-checks.sh`)
- Filesystem existence checks for hand-run suites (storybook via `vitest.config.ts` sniff, `tests/mockups/*.spec.ts`, `tests/web-e2e-layout/*.spec.ts`)
- `docs/site/center/center.config.json` — the one editorial file, schema-validated at load time (`load_config()` raises `SystemExit` loudly on any `tier`/`area` id typo in `map`/`drills`, rather than silently rendering a void cell)

Every A4+ source (junit, history, coverage, pw-report, local-checks) is explicitly designed to parse **gracefully absent** — pages render "arrives at A\<n\>" states rather than erroring — per the module docstring.

---

## 7. Evidence artifacts: exist vs surfaced

### `tests/web-e2e/proof/` (the curated "living proof" directory)
- One feature directory: `cook-state/`
- 13 PNGs (curated subset — `manifest.json` explicitly documents it as "curated step subset; full run output stays gitignored under tests/web-e2e/artifacts/"): `02-ongoing-detail.png`, `03-steps-1-2-marked.png`, `05-steps-survive-reload.png`, `06-unmark-confirm-open.png`, `08-unmark-confirmed.png`, `09-paso-0-marked.png`, `11-timer-started.png`, `13-timer-ticking-in-focus-mode.png`, `16-photo-task-ready.png`, `18-photo-survives-reload.png`, `22-portions-survive-reload.png`, `24-log-draft-filled.png`, `25-log-draft-restored.png`
- `manifest.json` content summary: `feature` = "cook-state persistence (H7/H8) — session survives navigation, reload, and cancel"; `spec` = `tests/web-e2e/web-journey-cook-state.spec.ts`; `proof_form` = "journey — curated step subset"; `legs` = 7 named checkpoints (step-marks, unmark-confirm, paso-0, timer, "photos (H8, leg 05)", portions+mode, log-draft) mapping to specific shot numbers; `source_run` = "artifacts/web-journey/cook-state (25 shots; journey green ×2, CI cook-state job)"; `curated` = "2026-07-10 (suite-upgrade interlude SU1)"; `convention` = "replace in place on refresh — never dated copies; demo GIF/MP4 regenerated via capture mode, not committed."
- **Surfaced?** Only the manifest.json is linked (1 leaf button on the DRILL page: "proof manifest ↗"). **None of the 13 curated PNGs are `<img>`-rendered anywhere in the center subtree** — the DRILL page's own evidence gallery instead points at raw (uncurated) shots from `artifacts/web-journey/facets/` and `artifacts/web-journey/phase64/`, which belong to a *different* feature (allergen/exclusion facets) than the one this proof/ directory curates (cook-state). The curated evidence set and the DRILL page's evidence gallery are, today, about two different features entirely.

### `tests/web-e2e/artifacts/` top level
- `capture/` — capture-mode output directory, 1 feature subdir (`cook-state/`), containing exactly **2 files: 1 `.mp4` + 1 `.webm`** (`page@c502f599713cc45edc86b42f4e53ead2.mp4`/`.webm`). **Zero references to `mp4`, `webm`, or `capture/` anywhere across all 4 center HTML pages** (grepped directly — no hits). This is the newest evidence mechanism (per the recent commit `19d5c58 docs(evidence): capture-mode contract`) and it produces real video output today that the command center has no rendering path for at all.
- `web-journey/` — **27 feature subdirectories**, **185 PNG files total** (`find ... -iname '*.png' | wc -l`).
- `run-status.json` / `run-status.js` — the machine-readable run ledger the whole TESTS page and risk grid are built from.
- **Gap between what's on disk and what journey-groups.json (the "single grouping source") declares**: `journey-groups.json` registers 8 groups covering 21 spec files, each spec declaring one `Evidence()` subdir. Comparing those 21 declared subdirs against the 27 directories actually present on disk, **10 directories have no matching entry in the current 21 registered specs**: `combined-cook`, `cookloop`, `fixsmoke`, `mixing-edges`, `mixnav`, `serverstep`, `stepsave`, `storage-expiry`, `usability`, `uxfix` (this is a heuristic name-match, not a byte-for-byte trace through every spec file — treat as approximate). These read as artifacts from earlier/renamed/removed journey specs — orphaned evidence that predates the current grouping and is invisible to every page in the center subtree (it isn't in any group card, isn't in any drill gallery, isn't linked from anywhere).

### `tests/results/` (referenced, not asked for directly, but relevant to §1/§6)
Contains `api-coverage.json`, `api-htmlcov/` (source of the `leaf/api-htmlcov` copy), `api-junit.xml`, `pw-report.json`, `web-coverage/` (source of `leaf/web-coverage`), `web-junit.xml` — i.e. every one of the generator's A4/A6/A7 data sources is present and populated (nothing is in a graceful-absence state right now).

### Net evidence-exists-vs-surfaced gap
| Artifact class | Exists on disk | Rendered/linked from center pages |
|---|---|---|
| Curated proof PNGs (`proof/cook-state/`) | 13 | 0 images (1 manifest.json link only) |
| Capture-mode video (`capture/cook-state/`) | 2 (mp4+webm) | 0 |
| Raw per-shot PNGs (`artifacts/web-journey/*`) | 185 across 27 dirs | 6 (all from DRILL page, 2 of 27 dirs touched) |
| Orphaned/unregistered artifact dirs | ~10 of 27 dirs | 0 |

---

## 8. Dead-end count — rendered entities with no href where a user would expect one

| Page | Entity type | Count | Notes |
|---|---|---|---|
| index.html | risk-grid data cells without a drill link | 7 | T2×pantry(31), T2×platform(26), T3×ai(120), T4×recipes(51), T4×cooking(81), T4×platform(64), T5×ui(33) — visually identical to the 1 clickable cell |
| index.html | coverage stat-row tile ("93.8% / 41.5%") | 1 | real leaf targets exist (`leaf/api-htmlcov`, `leaf/web-coverage`) but aren't linked from this tile |
| index.html | level-pyramid dead anchor | 1 | `tests.html#deployed` — anchor doesn't exist |
| index.html | "on the pass" preview panel rows | 3 | pytest suite + 2 journey specs, no href (panel previews the DRILL page but isn't itself a link) |
| index.html | history panel rows | 3 | journeys/pytest/vitest counts, static |
| index.html | recency-table named entities (hook ids, job ids, group names) | ~20 | all plain text inside one `<td>` per row across 5 rows |
| index.html | "BOARD" mention in kdbp-strip text | 1 | plain text, not a link, despite board.html existing one click away in the nav |
| **board.html** | **phase cards** (32, incl. the 1 featured/current CC1 card) | **32** | phase id, name, tier badge, E/R/C/P chips — none clickable; ids exist (`id="phase-N"`) but nothing on the page or index.html links *to* them either |
| **board.html** | **PENDING ticket cards** (57 open + 2 parked) | **59** | ticket #, title, file path, priority/scale chips — none clickable; **`id="ticket-77"` is duplicated** (two distinct PENDING rows both rendered with the same DOM id — an HTML validity bug, not just a missing-link issue) |
| **tests.html** | **journey-group cards** | 8 | group name + pass/total count, no href |
| **tests.html** | **individual spec row-lines inside those cards** | 21 | spec key, pass/total, duration, freshness — no href to spec source (only 1 of these 21 specs is reachable at all, indirectly, via the DRILL page's leaf button) |
| **tests.html** | **pytest file rows shown** | 12 | + 1 aggregate "…73 more files" row with no breakdown |
| **tests.html** | **vitest file rows shown** | 12 | + 1 aggregate "…32 more files" row with no breakdown |
| **tests.html** | **gate rows** (5 pre-commit hooks + 9 CI jobs) | 14 | hook id / job name / workflow file shown as text, no link to the actual `.yaml`/`.yml` |
| **tests.html** | **hand-run suite rows** | 5 | suite label + detail + runner command (as text) — no link/copy affordance |

**Approximate total dead-end entities across the four pages: ~200** (7+1+1+3+3+~20+1 on HUB ≈ 36; 32+59 = 91 on BOARD; 8+21+12+12+14+5 = 72 on TESTS; 0 on DRILL, which is the one page where nearly everything rendered either links out or is itself the live evidence). These are conservative counts of rendered rows/cards with visually "entity-like" presentation (a bold id/number + a title/label, styled like the site's one working card pattern) that carry no `href`.

**BOARD and TESTS are the two pages with a link-rich nav strip and otherwise zero interactivity in their body content** — every phase, every ticket, every test file, every journey spec, every gate is presented as a static fact rather than a door into more detail.
