# T1 — OSS/SaaS test-dashboard scan (raw thread report)

> Produced 2026-07-10 by the T1 research agent (Sonnet 5), verified via `gh` CLI + web sources.
> Synthesis lives in `../output/01-options-report.md`; this file is the receipt.

**Scope:** Solo-operator, per-project, static-regenerated-at-checkpoints test reporting (pytest + vitest + Playwright + coverage), zero standing infrastructure, progressive disclosure, deep-linked. All claims below were checked against `gh repo view`/`gh api`/`gh search repos` and primary docs/GitHub sources, not marketing copy.

---

## 1. Allure Report (allure2 vs allure3)

**allure2** (the mature, Java-based generator) and **allure3** (2026 TypeScript rewrite with a modular plugin system, "Awesome" UI plugin enabled by default) are two live, separately-versioned products under the same org — this is a real "which one do I pick" decision, not a rename.

- (a) Drill-down: project → suite → case → step → attachment (screenshots/video/trace/logs), plus history/trends and categories (known-issue grouping). Deep.
- (b) Static fit: `allure generate --single-file` produces one self-contained HTML file openable via `file://` — this is exactly the "renders from disk" ideal. The **default multi-file report does NOT open reliably via `file://`**; it needs `allure open` (spins a local server) or a browser flag workaround.
- (c) Multi-framework: genuinely strong — official adapters exist and are actively maintained for pytest (`allure-python`), Playwright (`allure-playwright`), and now Vitest (`allure-vitest`), all writing into one `allure-results/` directory that `allure generate` turns into ONE report.
- (d) Deep-linkability: SPA-internal routing, workable when served, collapses to a single URL in single-file mode (no per-test permalink tree).
- (e) Adoption cost: moderate — needs a Java runtime (allure2) or Node (allure3) plus the `allure` CLI; per-run regen is one command.
- (f) Blind spot: no PM-layer awareness (as expected of all tools here); static single-file output is trivially iframe/link-embeddable from a parent site.
- (g) Health: allure2 is the flagship — 5,451 stars, Apache-2.0, latest release **2.44.0 published 2026-07-01**, repo pushed **2026-07-10** (today), 92 open issues. allure3 — 334 stars, latest release **v3.14.2 published 2026-07-08**, 124 open issues, high velocity but far smaller community; treat as "promising, not yet the safe default." allure-python (809★) and allure-js (279★) — both pushed **2026-07-10**, i.e. actively maintained today.

Evidence: `gh repo view allure-framework/allure2 --json ...` → 5451★, Apache-2.0, pushed 2026-07-10T06:37:08Z. `gh api repos/allure-framework/allure2/releases/latest` → tag 2.44.0, published 2026-07-01. `gh search repos allure --owner allure-framework` → confirmed allure3, allure-python, allure-js as separate live repos, all pushed within days. WebSearch on "Allure single-file mode" and "Allure3 vs Allure2" confirmed the file:// distinction and the Awesome-plugin-as-new-default claim.

---

## 2. ReportPortal

- (a) Drill-down: best-in-class — project → launch → suite → test → log line → attachment, plus cross-run history, analytics, and ML-based auto-analysis of failures. This is the richest UI in the survey.
- (b) Static fit: **fails outright.** It's a multi-container stack (UI, API, analyzer service, PostgreSQL, OpenSearch/Elasticsearch, RabbitMQ, MinIO) requiring an always-on server. Official docs specify ≥2 CPUs, **6 GB RAM minimum**, ≥20 GB disk for a single-node docker-compose deployment. This is the definition of "standing infrastructure" the requirement rules out.
- (c) Multi-framework: excellent in principle — framework-agnostic ingestion API with official pytest and JS/Playwright agents, all reports land in one launch view.
- (d) Deep-linkability: weaker than the drill-down quality suggests — an open GitHub issue confirms filtered launch views don't reflect in the browser URL, so shareable deep-links to a filtered/specific state are unreliable.
- (e) Adoption cost: highest in the survey — container orchestration, DB backups, service upgrades, ongoing ops burden for a solo operator.
- (f) Cannot be "wrapped" as static files — it's a login-gated always-on web app, the opposite of the composable static-site requirement.
- (g) Health: 2,006 stars, Apache-2.0, repo pushed 2026-06-29, release cadence roughly monthly (26.0.1 Feb → 26.0.2 Mar → 26.0.3 May 2026), 449 open issues (signals real production usage but also real maintenance surface).

Evidence: `gh repo view reportportal/reportportal --json ...` → 2006★, Apache-2.0, pushed 2026-06-29. `gh api repos/reportportal/reportportal/releases` → 26.0.3 (2026-05-28), 26.0.2 (2026-03-12), 26.0.1 (2026-02-06). WebSearch "ReportPortal hardware requirements" → reportportal.io/docs/installation-steps/HardwareRequirements confirms 2 CPU / 6GB RAM / 20GB disk minimum. WebSearch on deep links → GitHub issue #2611 ("Support deep links for filtered Launch views") open and unresolved.

**Verdict: disqualified by the zero-standing-infrastructure requirement**, despite being the deepest/richest tool surveyed.

---

## 3. Playwright built-in HTML + JSON reporters

- (a) Drill-down: suite → spec → test → step → attachment, plus an excellent interactive trace viewer (DOM snapshots, network, console). Very deep for e2e specifically.
- (b) Static fit: **weaker than it looks.** The HTML report is generated as files, but functionally you must run `npx playwright show-report` (a local server) — opening `index.html` via `file://` does not reliably work because assets/traces need HTTP serving. Confirmed by an open Playwright GitHub issue (#9702) and Playwright's own docs pointing to `show-report`.
- (c) Multi-framework: none — Playwright e2e only. JSON reporter is a clean machine-readable base other tools (CTRF, monocart) build on, but is not itself a viewer.
- (d) Deep-linkability: the report frontend uses hash-based routing (per Playwright's internal architecture), workable once served, but it is not designed to produce a static tree of pre-baked per-test URLs.
- (e) Adoption cost: near zero — built in; `merge-reports`/blob reporter lets you combine sharded runs of the SAME Playwright suite into one HTML report.
- (f) Cannot show unit/coverage results (out of scope by design); its "static" file output is a minor annoyance to wrap since a helper server step is effectively mandatory.
- (g) Health: 92,603 stars, Apache-2.0, latest release **v1.61.1 published 2026-06-23**, pushed 2026-07-10 (today) — as healthy as OSS gets.

Evidence: `gh repo view microsoft/playwright --json ...` → 92603★, pushed 2026-07-10T22:40:34Z. `gh api repos/microsoft/playwright/releases/latest` → v1.61.1, 2026-06-23. WebSearch "Playwright HTML report file:// cannot open" → confirms server requirement and cites GH issue #9702 and the `show-report` workaround. WebSearch on merge-reports → confirms blob reporter + `npx playwright merge-reports` shard-combination flow.

---

## 4. Vitest UI / HTML reporter

Two distinct things, easy to conflate:
- **Vitest UI** is interactive and requires a running Vite dev server — not usable in a regenerate-and-archive static workflow.
- **`--reporter=html`** (built from the same UI codebase) produces a genuinely static report app; with `singleFile: true` it inlines UI assets, metadata, and attachments into **one self-contained `index.html`**.

- (a) Drill-down: suite → test, decent but thinner artifact model than Playwright (mainly assertion output, not screenshots/video by default).
- (b) Static fit: the best of the built-ins for this requirement — singleFile mode is exactly "renders from disk."
- (c) Multi-framework: none — Vitest/unit-component only.
- (d) Deep-linkability: SPA-internal anchors within one document, not a tree of separate stable URLs.
- (e) Adoption cost: one config flag.
- (f) Flag worth re-verifying at implementation time: a GitHub issue (#10238, "Make coverage available in html reporter singleFile mode") indicates coverage data was NOT available in singleFile mode as of when filed — check current Vitest version before relying on this for the coverage layer.
- (g) Health: 16,829 stars, MIT, pushed 2026-07-10 (today) — very actively maintained.

Evidence: `gh repo view vitest-dev/vitest --json ...` → 16829★, MIT, pushed 2026-07-10T22:21:24Z. WebSearch "Vitest UI vs HTML reporter" → vitest.dev/guide/ui and vitest.dev/guide/reporters confirm the UI-needs-server vs HTML-reporter-is-static distinction and the `singleFile` inlining behavior; GH issue #10238 flags the coverage-in-singleFile gap.

---

## 5. Coverage HTML renderers (istanbul/nyc, coverage.py + pytest-cov)

Both are static, mature, and drill down to line/branch-level source highlighting with no server required — the strongest "static-fit" citizens in this survey, but neither aggregates across test runs or frameworks; they render coverage only.

- **istanbul/nyc**: static multi-file HTML (one page per source file), color-coded covered/missed/partial, stable per-file URLs (e.g. `lcov-report/src/foo.js.html`) — genuinely embeddable/linkable from a parent site. 1,101 stars, repo pushed 2026-04-09 (mature, slower cadence — not alarming for a feature-complete instrumentation library). **License note:** GitHub's license API returns `null` for this repo (no detected LICENSE file at root) — worth a manual check before relying on it, though the npm package has historically shipped as BSD-3-Clause.
- **coverage.py** (now living at `coveragepy/coveragepy`, migrated from `nedbat/coveragepy`) + **pytest-cov**: `pytest --cov --cov-report=html` → static `htmlcov/` directory, same line-level drill-down quality. coverage.py: 3,392 stars, Apache-2.0, pushed 2026-07-09 (yesterday). pytest-cov: 2,046 stars, MIT, pushed 2026-04-24.

Evidence: `gh repo view istanbuljs/istanbuljs --json ...` → 1101★, `licenseInfo: null`, pushed 2026-04-09. `gh api repos/istanbuljs/istanbuljs/license` → 404 Not Found (confirms no detected LICENSE file). `gh repo view coveragepy/coveragepy --json ...` → 3392★, Apache-2.0, pushed 2026-07-09. `gh repo view pytest-dev/pytest-cov --json ...` → 2046★, MIT, pushed 2026-04-24. WebSearch confirmed both produce self-contained static files with click-through per-file drill-down.

---

## 6. xunit-viewer (JUnit XML → static HTML)

- (a) Drill-down: shallow — flat searchable/filterable list of test cases from JUnit/XUnit XML, no source-line detail, no artifacts (screenshots/video/logs) beyond whatever's embedded in the XML's `<system-out>`.
- (b) Static fit: its whole pitch — outputs a single static HTML file, genuinely `file://`-friendly. Also has console and live-server (WebSocket) modes.
- (c) Multi-framework: workable as a least-common-denominator — since it consumes any JUnit-XML-shaped input, it CAN take pytest's `--junitxml`, a Vitest JUnit reporter, and Playwright's JUnit reporter output and merge them into one view, but only at the shallow pass/fail/duration level.
- (d) Deep-linkability: no stable per-test anchors found.
- (e) Adoption cost: trivial — single `npx xunit-viewer` invocation.
- (g) Health: **real staleness risk.** 209 stars, MIT, but the latest tagged release is **v10.1.1 from 2023-06-23**, repo `pushed_at` is **2024-05-02** (over a year stale relative to 2026-07-10), 17 open issues, and per a repo README/TODO scan the maintainer's own backlog lists an unshipped "Release v11." Usable today, but a maintenance-risk pick for a multi-year project.

Evidence: `gh api repos/lukejpreston/xunit-viewer/releases/latest` → tag v10.1.1, published 2023-06-23T10:10:50Z. `gh api repos/lukejpreston/xunit-viewer --jq ...` → 209★, pushed 2024-05-02T11:25:21Z, 17 open issues. WebFetch of the repo confirmed single-file static HTML output and the "Release v11" TODO signal.

---

## 7. CTRF (Common Test Report Format)

CTRF is a schema, not a renderer — its promise is "the same JSON structure no matter the test framework," meant to be the aggregation layer feeding a downstream viewer.

- (a) Drill-down: the schema itself renders nothing. The closest thing to a viewer, `ctrf-io/github-test-reporter`, produces GitHub Actions job summaries / PR comments (markdown-shaped) — there's reportedly a Handlebars-templated single-file HTML formatter too, but evidence for its drill-down depth is thin.
- (b) Static fit: the JSON itself is trivially static; consuming tools like `github-test-reporter` can emit single-file HTML.
- (c) Multi-framework — **uneven in practice, despite the marketing.** The Playwright reporter is official and healthy (`playwright-ctrf-json-reporter`, 103★, MIT, pushed 2026-07-05). Vitest and pytest support are **not first-party**: the only Vitest CTRF reporters found are tiny community packages (`avinyaweb/vitest-ctrf-json-reporter`, `david2tm/d2t-vitest-ctrf-json-reporter`, 4★ each), and pytest is served by a separately-branded, non-CTRF-native package (`pytest-json-ctrf` on PyPI, via `qamania/pytest-common-test-report-json`) rather than an `ctrf-io`-org reporter. Treat the "pytest+vitest+playwright unification" story as aspirational, not proven, outside of Playwright.
- (d) Deep-linkability: nothing in the ecosystem today offers persistent deep-linked per-test pages — it's CI-summary shaped.
- (e) Adoption cost: more DIY than Allure — you must wire N separate per-framework reporters plus a renderer of your choosing.
- (g) Health: core schema repo (`ctrf-io/ctrf`) — 82★, MIT, pushed 2026-02-07, only 1 open issue (normal for a spec repo). `github-test-reporter` — 361★, MIT, pushed 2026-07-05, 27 open issues (the most-starred thing in the whole org). Ecosystem is fragmented across ~19 small repos with wildly uneven star counts (0–361).

Evidence: `gh search repos ctrf --owner ctrf-io` → full list of 19 repos with star counts/dates. `gh api repos/ctrf-io/ctrf --jq ...` → 82★, MIT, pushed 2026-02-07. `gh api repos/ctrf-io/playwright-ctrf-json-reporter` → 103★, pushed 2026-07-05. `gh search repos "vitest ctrf"` and `"pytest ctrf"` → only low-star, non-`ctrf-io`-org results returned, confirming the gap. WebFetch of ctrf.io confirmed the schema-first framing and lack of a documented dashboard tool.

---

## 8. Test-observability SaaS (context only)

- **Currents.dev** — drop-in Playwright/Cypress dashboard: records every run, captures traces/screenshots/video to the cloud, flaky-test detection with quarantine, parallel-run orchestration. Free tier + usage-based paid tiers keyed on recorded results/retention. Requires sending results to a third-party cloud and gives a login-gated hosted URL — directly conflicts with "zero standing infrastructure" and "self-contained static files deployable next to staging."
- **Argos CI** — visual regression/screenshot-diff tool (pixel diffing, baseline governance, PR-embedded review) plugging into Playwright/Cypress/Storybook/WebdriverIO. Open-source core exists but the review workflow lives on their hosted SaaS. Narrow scope (visual diffs only) and same login-gated-cloud objection.
- **Trunk.io Flaky Tests** — cross-language, cross-CI flaky-test detection with auto-quarantine, AI-based failure clustering, and trend metrics (part of the broader Trunk CI-analytics/merge-queue platform). Broadest framework reach of the three, but same SaaS objection — no pricing specifics surfaced beyond "contact sales" for paid tiers.

All three are complementary trend/orchestration layers at best (worth revisiting later for flaky-test triage at scale) — none can be the static self-contained site itself.

Evidence: WebSearch on each product's docs/pricing pages (currents.dev/pricing, docs.currents.dev/billing-and-pricing, argos-ci.com/pricing, trunk.io/flaky-tests) — all confirm cloud-hosted, account-gated delivery models.

---

## 9. monocart-reporter, and the search for a multi-framework aggregator

**monocart-reporter** (Playwright-only, JS): a strong, focused alternative/companion to Playwright's built-in HTML reporter.
- (a) Drill-down: suite → test → line-level coverage (merges V8/Istanbul coverage into the same report) → screenshots/video/trace, plus side-by-side/slider visual-diff tabs (added v2.7.0).
- (b) Static fit: single self-contained HTML file output — genuinely static.
- (c) Multi-framework: none — Playwright/JS only, but it does combine coverage + test results + attachments into ONE report, and its `merge()` API imports multiple shard reports (JSON/ZIP) into a single merged output including attachments — the best-designed merge story of any tool surveyed.
- (e) Adoption cost: one reporter config line.
- (g) Health: 314★, MIT, pushed 2026-06-30, only **5 open issues** — an excellent signal-to-noise ratio for a smaller project.

**GitHub Actions test-summary tooling** (`dorny/test-reporter` 1,168★/MIT/pushed 2026-07-10, `mikepenz/action-junit-report` 422★/Apache-2.0/pushed 2026-07-06, `test-summary/action` 439★/MIT/pushed 2026-05-08): render JUnit XML as GitHub Checks annotations / job-summary tables. Zero extra hosting since they render inside GitHub's own UI, framework-agnostic via JUnit XML — but shallow (pass/fail/duration only, no artifacts, no coverage) and NOT a portable static site; the report lives inside a GitHub Actions run page, not a file tree you can deploy next to staging. Useful as a lightweight "did CI pass" glance layer alongside the real static site, not a substitute for it.

**Search for a general multi-framework static aggregator:** `gh search repos "test report" dashboard static --sort stars` returned only an unrelated SAST dashboard project; `"unified test report"` and `"test results dashboard"` searches surfaced nothing with meaningful adoption (top hits: 0–1 stars, hobby/student projects; one nascent entry, `tracemind`, self-describes as "Unified test reporting platform... local via Docker" but has 0 stars and is unverifiable as battle-tested). **This is itself a real finding**: there is no well-adopted OSS tool that natively aggregates pytest + vitest + Playwright into one drill-down static site today. Allure (renderer, real multi-framework adapters) and CTRF (schema, uneven adapter maturity) are the two building blocks people actually reach for — the "one tool that does it all" doesn't exist yet.

Evidence: `gh repo view cenfun/monocart-reporter --json ...` → 314★, MIT, pushed 2026-06-30. `gh api repos/cenfun/monocart-reporter --jq '.open_issues_count'` → 5. `gh search repos "test report" dashboard static --sort stars` and two follow-up phrasings → no credible aggregator found. `gh repo view dorny/test-reporter`, `mikepenz/action-junit-report`, `test-summary/action` → all confirmed actively maintained but CI-summary-shaped, not deep artifact browsers.

---

## Comparison Table

Scale 1 (weak) – 5 (strong). `f` = parent-site embeddability (all tools score low on PM-layer awareness by design — none know about phases/review verdicts/pending items; that layer must live in your wrapper regardless of tool choice).

| Tool | (a) Drill-down depth | (b) Static-regen fit | (c) Multi-framework | (d) Deep-linkability | (e) Adoption cost (5=cheap) | (f) Embeddability in parent site | (g) Health receipts |
|---|---|---|---|---|---|---|---|
| **Allure2** | 4 | 3 (single-file=5, default multi-file needs server) | 4 | 3 | 3 | 4 | 5 (5,451★, released 2026-07-01) |
| **Allure3** | 4 | 4 | 4 | 3 | 3 | 4 | 3 (334★, young but daily-active) |
| **ReportPortal** | 5 | 1 (containers/DB/RAM, always-on) | 5 | 2 (filters don't hit URL) | 1 | 1 (login-gated app) | 4 (2,006★, 449 open issues) |
| **Playwright HTML/JSON** | 4 | 2 (needs `show-report` server) | 1 (e2e only) | 3 | 5 | 3 | 5 (92.6k★, v1.61.1) |
| **Vitest HTML (singleFile)** | 3 | 5 | 1 (unit only) | 3 | 5 | 4 | 5 (16.8k★, pushed today) |
| **istanbul/nyc coverage HTML** | 3 (coverage only) | 5 | 1 | 4 (per-file URLs) | 4 | 5 | 3 (1,101★, license unverified via API) |
| **coverage.py + pytest-cov HTML** | 3 (coverage only) | 5 | 1 | 4 | 5 | 5 | 4 (3,392★ / 2,046★) |
| **xunit-viewer** | 2 | 5 | 3 (via JUnit XML LCD) | 2 | 4 | 4 | 2 (release stale since 2023) |
| **CTRF ecosystem** | 2 | 4 | 3 (real only for Playwright) | 2 | 3 | 3 | 3 (fragmented, 82–361★ across repos) |
| **monocart-reporter** | 5 (Playwright-only) | 5 | 1 | 3 | 4 | 5 | 4 (314★, 5 open issues) |
| **GH Actions test-summary** | 1 | 1 (lives in GH UI) | 4 (JUnit XML LCD) | 1 | 5 | 1 | 4 (1,168★/422★/439★) |
| **Currents.dev (SaaS)** | 5 | 1 (cloud) | 2 (PW/Cypress) | 4 | 5 | 1 (login-gated) | N/A — SaaS |
| **Argos CI (SaaS)** | 4 | 1 (cloud) | 2 (visual only) | 4 | 5 | 1 (login-gated) | N/A — SaaS |
| **Trunk Flaky Tests (SaaS)** | 3 | 1 (cloud) | 4 (any CI/lang) | 3 | 5 | 1 (login-gated) | N/A — SaaS |

---

## Synthesis for the Testing Command Center

No single tool clears every bar. The pattern that emerges from the evidence:

1. **ReportPortal and all three SaaS options are disqualified outright** by the zero-standing-infrastructure / static-deployable requirement — they're architecturally login-gated servers, not file trees.
2. **The strongest per-framework static building blocks** are: Playwright's own HTML report (accept the `show-report`-serving quirk, or swap in **monocart-reporter** for a genuinely static single-file Playwright report with merged coverage), **Vitest's `--reporter=html` with `singleFile: true`** for unit/component tests, and **coverage.py/pytest-cov's `htmlcov/`** plus **istanbul/nyc's** HTML for coverage — all four are pure static output today.
3. **Allure (2 or 3, single-file mode)** is the only tool that natively ingests all three frameworks (pytest, Playwright, Vitest) into one report via maintained official adapters — it's the best candidate for the "one aggregated view" layer if you're willing to accept its moderate adoption cost (Java/Node runtime + CLI) and its SPA-collapsed deep-linking.
4. **CTRF is worth adopting as a raw data-interchange layer, not (yet) as a finished dashboard** — its Playwright adapter is solid, but Vitest/pytest adapters are third-party and low-adoption; if you go this route, budget for writing your own thin static renderer over the CTRF JSON rather than trusting an off-the-shelf CTRF viewer.
5. **Nobody offers the progressive-disclosure "big picture → suite → group → spec → test → artifact" hierarchy across all three frameworks in one static site** — confirmed by the empty `gh search repos` results for aggregator projects. Given that plus the universal blind spot on PM-layer context (phases, review verdicts, pending items), the realistic architecture is: **generate per-framework static artifacts** (Vitest singleFile HTML, monocart/Playwright HTML, coverage.py+istanbul HTML) at each checkpoint, **land them in fixed subfolders of one site**, and **hand-roll a thin parent index/shell** (plain static HTML, no framework needed) that iframes/links into each — which is exactly the "composable, self-contained, deploy next to staging" shape the requirement describes, and is the only path none of the surveyed tools block.
