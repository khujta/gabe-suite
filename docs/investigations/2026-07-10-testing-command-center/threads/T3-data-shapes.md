# T3 — Data-shape inventory + aggregation-schema research (raw thread report)

> Produced 2026-07-10 by the T3 research agent (Sonnet 5) — gustify read-only inventory + schema standards.
> Synthesis lives in `../output/01-options-report.md`; this file is the receipt.

## PART 1 — Local Inventory (gustify, read-only)

### 1. `.kdbp/PLAN.json`
- **Format:** single JSON object, 528 lines, 31 phases.
- **Top-level:** `version`(1), `status`("active"), `goal`, `maturity`("mvp"), `created`, `last_updated`, `current_phase`("DL1"), `phases[]`.
- **Entity:** one row per KDBP phase (numeric IDs `1`-`16`, plus lettered tracks `U1`-`U5` UX, `H1`-`H8` Hardening, `SU1` suite-upgrade, `DL1` demand-loop).
- **Phase fields:** `id`, `name`, `tier` (`"mvp"`/`"ent"`), `complexity` (`low`/`med`/`high`), `types[]` (free tags), `cells: {exec, review, commit, push}` each one of `"done" | "todo" | "deferred" | "obsolete"`, `proof` — **either `null` or a free-text sentence** naming the spec/journey that constitutes human-readable evidence. No structured link (no file:line, no test-id) — just prose a reader must resolve manually.
- **Update trigger:** written by /gabe-plan, /gabe-execute, /gabe-review, /gabe-commit, /gabe-push as each phase's cell flips.
- **Gaps:** `proof` is unstructured prose; no timestamp per cell (only whole-file `last_updated`); no link from a phase to a PENDING # or LEDGER row.

### 2. `.kdbp/PENDING.md`
- **Format:** one Markdown table, 121 lines, header: `| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |`.
- **Entity:** a deferred finding/decision-debt item. `#` is a stable numeric id (non-contiguous). `Status` is free text: `open`, `open (far)`, `resolved <date> — <prose>`, `partially addressed …`, `WAIVED (D##)…`.
- **Update trigger:** /gabe-debt, /gabe-review, /gabe-commit triage; resolved items get Status rewritten in place (not deleted).
- **Gaps:** Status is not an enum — open/closed requires string-matching; no phase-id back-link.

### 3. `.kdbp/LEDGER.md`
- **Format:** Markdown table, 20 lines (thin index; rich history in `archive/LEDGER-2026H1.md`, 1.3 MB), header: `| Date | Entry | Theme / scope | Commits | Gates / results |`.
- **Entity:** one row per command checkpoint (PUSH / REVIEW / COMMIT / PLAN / HANDOFF).
- **Deep-links to:** commit SHAs (git show), CI run ids (gh run view).
- **Gaps:** `Gates / results` is unstructured prose — green/red rollup requires parsing free text; no explicit link to a PLAN.json phase id or PENDING #.

### 4. `.kdbp/archive/evidence-bypass.log`
- Plain text, one line so far: `2026-07-10 18:40 | phase SU1 | newest proof artifact is OLDER than staged change .claude/skills/gabe-e2e/SKILL.md | newest_src=1783723019 | newest_proof=1783721409`.
- Appended by the Evidence-Doctrine freshness gate when a bypass is accepted at commit time.
- **Gaps:** pipe-delimited not JSON; 1 entry so format stability unproven; no commit SHA link.

### 5. `tests/web-e2e/journey-groups.json`
- Single JSON object: `_comment` + `groups: {<name>: {guards, specs[]}}` — 8 groups (cooking, storage, browse, i18n, profile, settings, core, api-loop).
- Read by `scripts/run-journeys.sh` AND `.github/workflows/e2e-journeys.yml` (single source of truth for runners).
- **Gap:** **not read by the docs-site generator at all** (`grep -rn "journey-groups.json" scripts/` → zero hits). The generator's FAMILIES/FEATURES grouping (`_docs_e2e_data.py`) is a separately hand-curated mapping that can silently drift; no cross-check exists.

### 6. `tests/web-e2e/artifacts/run-status.json` (+ writer)
- JSON, 300 lines, gitignored, keyed by spec-file stem: `{ "<spec-stem>": { "env", "ranAt" (ISO8601), "tests": { "<full test title>": "passed"|"failed"|"skipped" } } }`.
- Sibling `run-status.js`: byte-identical data as `window.__GUSTIFY_RUN_STATUS__ = {...}` — a `<script src>`-loadable mirror so docs pages work over `file://` (fetch/XHR blocked there; script src isn't).
- **Writer:** `tests/web-e2e/helpers/run-status-reporter.ts`, a custom Playwright Reporter in `playwright.config.ts`. On `onTestEnd` buckets `{stem: {title: status}}` (last retry wins); on `onEnd` **merge-updates** the file — untouched specs keep old entries, re-run specs get their bucket fully replaced. Writes .json + .js together, always in sync.
- **Gaps:** Playwright-only (pytest and vitest write nothing comparable); `env` is a single global from GUSTIFY_ENVIRONMENT, not per-test; no duration; gitignored → per-machine/ephemeral.

### 7. `tests/web-e2e/proof/cook-state/manifest.json`
- Hand-curated JSON: `feature`, `spec` (path), `proof_form` (prose), `legs: {<leg-name>: [<shot-number>...]}`, `artifacts: [<filename>...]`, `source_run` (prose), `curated` (date+phase), `convention` (prose).
- The committed curated living-proof subset (13 shots) for one feature; raw runs stay gitignored.
- **Gaps:** only one feature has this today; no schema validation; `legs` references `artifacts` by positional shot-number indirection.

### 8. `tests/web-e2e/artifacts/` layout
```
artifacts/
  run-status.js / run-status.json          # gitignored
  web-journey/<spec-subdir>/NN-<name>.png  # ~28 subdirs, ordered screenshots
  capture/cook-state/page@<hash>.webm|.mp4 # raw + ffmpeg-rendered video
```
- Entirely gitignored; only `tests/web-e2e/proof/<feature>/` is committed.

### 9. Coverage tooling — **NONE CONFIGURED**
- `apps/api/pyproject.toml` dev deps: pytest, pytest-asyncio, httpx, ruff, pyright — **no pytest-cov**, no `--cov` args.
- `apps/web/vitest.config.ts` + `package.json`: **no @vitest/coverage-v8 / coverage-istanbul**, no coverage block.
- Only "coverage" hits are unrelated (a design-token lint + a CI comment). **Hard gap: gustify produces no code coverage today.**

### 10. Playwright config
- `reporter: [['list'], ['./tests/web-e2e/helpers/run-status-reporter.ts']]` — **no built-in json/html reporter configured.** screenshot/trace/video per-project (only-on-failure / retain-on-failure mostly; layout-* projects full-on). 6 projects: mockups, web-e2e, web-journey, cleanup-e2e-recipes, layout-mobile/tablet/desktop.

### 11. `docs/site/` — gustify docs site
- ~26 flat HTML pages + assets/. Generated by **four separate stdlib-only Python generators**: `build_docs_site.py` (markdown→HTML via MANIFEST, mirrors gabe-docsite contract), `build_e2e_docs.py` (E2E coverage index), `build_journey_docs.py` (per-journey detail pages), `build_screen_docs.py`. Shared chrome in `scripts/_docs_shell.py` (Cifra visual system) + per-generator data/asset modules.
- **`build_e2e_docs.py` in depth (load-bearing prior art):** statically regex-parses every spec (`test.describe`, `new Evidence('<subdir>')`, `.shot(page,'<literal>')`, test counts) into Spec records; a run-written manifest.json under an Evidence subdir supersedes the static parse; renders stats line + per-spec Tests table (Feature/Entities/CRUD/Captures/Status — CRUD from hand-curated API_SURFACE) + dual-axis Mermaid coverage map + screenshot carousels (client-side `data-src` probing with placeholder fallback — build never needs images) + run-status chips flipped client-side from `run-status.js`. Ships a `_reconcile()` drift-WARN pass (orphan titles, unmapped specs, dynamic shots, orphan evidence dirs).
- **Functionally a hand-built command center already, scoped to E2E only** — zero connection to PLAN.json, PENDING.md, LEDGER.md, pytest, vitest, or coverage.

### 12. `skills/gabe-docsite/generator/`
- `build_docsite.py`: project-agnostic; inputs = `docs/docsite.config.py` exporting SITE + SECTIONS (`{key,label,difficulty,docs:[{slug,source_md,...}]}`); resolves md links → .html, copies images to `_assets/`, renders via `_markdown.py`, wraps in `_shell.py` chrome. **No JSON/data ingestion path exists — unit of content is "one markdown file → one HTML page."**
- `_markdown.py`: hand-rolled CommonMark subset (headings w/ auto-number + stable slug ids, lists, tables, fenced code incl. mermaid, `:::note`, blockquotes). **`render_inline` HTML-escapes body text — raw HTML widgets cannot be authored through markdown.**
- **Extend-vs-fork facts:** command-center content is structured JSON → needs a structurally new "data page" kind (not a config tweak), and cuts against the skill's markdown-is-truth guardrail. `_shell.py`/`site.css`/`mermaid.min.js` reusable regardless.
- **SKILL.md conventions actually found:** four numbered conventions (placement-by-intent, generated shell, progressive disclosure via difficulty tiers, myopic split-decision) + 4-step procedure + guardrails. **The "C1–C9 / claims-with-receipts / data-verify-* DOM / page manifests / provenance stamps" convention does NOT exist anywhere in the suite** — zero grep hits; it appears only as a planned concept in the 2026-07-07 investigation outputs.

## PART 2 — Schema Standards Research

### CTRF (ctrf.io)
- Top level: `{reportFormat:"CTRF", specVersion, reportId, timestamp, generatedBy, extra, results:{tool, summary, tests[], environment, extra}, insights, baseline}`. Tests require only `name/status/duration`; rich optional set (suite[], attachments[]{name,contentType,path}, steps[]{name,status}, retries, flaky, filePath, tags, labels, browser, screenshot, stdout/stderr, …). Extensibility via namespaced `extra` at every level; everything else `additionalProperties: false`.
- Reporters: Playwright official+healthy (`ctrf-io/playwright-ctrf-json-reporter`, 103★, pushed 2026-07-05). pytest via community `pytest-json-ctrf` (fork chain infopulse→qamania, v0.5.2 June 2026, 3-20★). **Vitest: no first-party reporter** — only 4★ community packages. Spec repo `ctrf-io/ctrf` 82★, 1 open issue. Consumers: `github-test-reporter` (361★), generic `ctrf` CLI (merge/validate/compare).
- Fit gaps: journey groups → labels/extra only (suite[] models file hierarchy, not orthogonal grouping); ordered captioned screenshot carousels → attachments+steps partially, needs extra; **coverage: no field exists at all**; KDBP phases: no analog — a phase is a 4-state-cells object, not a pass/fail test; representing it means dumping PLAN.json into `results.extra`, at which point CTRF is just an envelope.

### Playwright JSON reporter
- `--reporter=json` → `{config, suites[] (recursive), errors[], stats}`; specs carry `title,file,line,column,tests[]`; tests carry `expectedStatus, projectName, results[]` (per attempt: status/outcome, duration, error, stdout/stderr, retry, attachments[]{name,path,contentType,body}). Strict superset of gustify's custom reporter data (adds duration, retries, file:line, attachment paths). Not currently produced in gustify.

### pytest-json-report
- `--json-report` → `.report.json`: `{created, duration, exitcode, root, environment, summary, collectors, tests[], warnings[]}`; tests carry nodeid, lineno, keywords, outcome + per-phase (setup/call/teardown) `{duration, outcome, longrepr, stdout/stderr, log}` + metadata hook. **Stale: last pushed 2023-07-31** (155★). The CTRF-flavored `pytest-json-ctrf` is the actively-released alternative (mid-2026). Neither installed in gustify.

### coverage.py JSON report
- `coverage json` → per-file `summary` + whole-report `totals` with `percent_covered` pre-computed (`data["totals"]["percent_covered"]`, `data["files"][path]["summary"]["percent_covered"]`). Cheap to parse. Not currently produced in gustify.

### istanbul `coverage-final.json`
- Per-file `{path, statementMap, fnMap, branchMap, s{}, f{}, b{}}` hit maps — **no pre-computed percentage**; consumer must derive % via istanbul-lib-coverage helpers or hand-rolled reduction. Not currently produced in gustify.

## (a) Gap Table

| Must show | Existing file | What's missing |
|---|---|---|
| Test runs (pass/fail/skip) | run-status.json/.js | Playwright-only; no duration; no pytest or vitest results anywhere; gitignored/per-machine |
| Journeys (grouped specs) | journey-groups.json | Not read by any doc generator — HTML site grouping is a separate hand-curated copy that can silently drift |
| Artifacts (screenshots/video) | artifacts/web-journey/*, capture/*, proof/<feature>/manifest.json | Raw tree 100% gitignored; only cook-state has a committed curated slice; no manifest schema; site shows placeholders unless the viewing machine ran the suite |
| Coverage (%) | none | Total gap — no pytest-cov, no vitest coverage plugin, nothing |
| Phases (KDBP) | PLAN.json | proof is prose not a resolvable link; no per-cell timestamps; no back-links to LEDGER/PENDING |
| Review verdicts | LEDGER.md REVIEW rows | Free-text Gates/results cell; no structured link to reviewed diff beyond adjacent Commits cell |
| Pending debt | PENDING.md | Status free-text (resolved/WAIVED/partially… string-matching); no phase back-link |
| Ledger history | LEDGER.md + archive/LEDGER-2026H1.md | Two shapes/eras; thin index prose-only; archive unindexed for machines |

## (b) Three candidate generator placements (facts only)

1. **Extend gabe-docsite generator** — Pro: reuses Cifra shell + existing config/build/verify workflow every suite project could adopt. Con: data model is markdown→page; needs a structurally new data-driven page kind; cuts against the skill's markdown-is-truth guardrail.
2. **New suite skill** — Pro: purpose-built per-project config pointing at PLAN.json/PENDING/LEDGER/run-status/journey-groups; matches one-skill-per-capability. Con: net-new codebase; build_e2e_docs.py proves how much hand-curated editorial data (FAMILIES, FEATURES, API_SURFACE, hues) is needed — generalizing that curation layer across projects is unsolved, not just unbuilt.
3. **Per-project script (extend gustify's build_e2e_docs.py in place)** — Pro: ~80% of an E2E-scoped command center already runs today; fastest path for this one project. Con: zero suite reuse; gustify already has four divergent generators (~3,400+ lines in the first two); deepens divergence, gives the suite nothing back.
